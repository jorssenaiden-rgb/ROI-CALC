"use client";

import React, { useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

// ---------- Parsers ----------
function parseMoney(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s = String(v).trim();
  if (!s || !/\d/.test(s)) return null;

  const cleaned = s
    .toLowerCase()
    .replace(/cad|usd|c\$|us\$|cdn|\$/g, "")
    .replace(/,/g, "")
    .trim();

  const m = cleaned.match(/-?\d+(\.\d+)?/);
  if (!m) return null;

  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function parseNumber(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s = String(v)
    .toLowerCase()
    .replace(/sq\.?\s?f(t)?/g, "") // sqf, sqft, sq ft
    .replace(/square\s*feet/g, "")
    .replace(/[^\d.-]/g, "") // remove commas and text
    .trim();

  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;

  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function getUrlFromRow(r) {
  const candidates = [
    r.Listing_URL,
    r.ListingURL,
    r.URL,
    r.Url,
    r.url,
    r.Link,
    r.link,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const s = String(c).trim();
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
  }
  return null;
}

// Decide if row is For Sale or Rental
function getListingType(row) {
  const typeText = String(row.Property_Type ?? row.PropertyType ?? row.type ?? "").toLowerCase();
  const leaseAmt =
    row.LeaseAmount ??
    row.leaseAmount ??
    row.MonthlyRent ??
    row.monthlyRent ??
    row.Rent ??
    row.rent;

  if (
    leaseAmt != null ||
    row.LeaseAmountFrequency != null ||
    typeText.includes("rent") ||
    typeText.includes("rental") ||
    typeText.includes("lease")
  ) {
    return "RENTAL";
  }
  return "FOR SALE";
}

// NOI + Cap Rate (operating only — no mortgage)
function calcNoiAndCapRate({
  purchasePrice,
  monthlyRent,
  annualTax,
  annualInsurance,
  maintPct,
  vacancyPct,
  mgmtPct,
}) {
  if (!purchasePrice || !monthlyRent) return { noiAnnual: null, capRate: null };

  const grossAnnual = monthlyRent * 12;

  const propTaxAnnual = annualTax ?? purchasePrice * 0.012;
  const insuranceAnnual = annualInsurance ?? 1200;
  const maintAnnual = purchasePrice * (maintPct / 100);

  const vacancyAnnual = grossAnnual * (vacancyPct / 100);
  const mgmtAnnual = grossAnnual * (mgmtPct / 100);

  const expenses = propTaxAnnual + insuranceAnnual + maintAnnual + vacancyAnnual + mgmtAnnual;
  const noiAnnual = grossAnnual - expenses;
  const capRate = (noiAnnual / purchasePrice) * 100;

  return { noiAnnual, capRate };
}

export default function CsvRoiUploader() {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");

  // Rent estimate rule (used for FOR SALE estimate and RENTAL fallback)
  const [rentRule, setRentRule] = useState({
    base: 1200,
    perBed: 700,
    fallbackBeds: 2,
  });

  // Operating assumptions
  const [assumptions, setAssumptions] = useState({
    insuranceAnnual: 1200,
    maintPct: 1.0,
    vacancyPct: 5,
    mgmtPct: 8,
  });

  const loadCsv = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = Array.isArray(results.data) ? results.data : [];
        setRows(data);
      },
      error: () => alert("Could not read CSV file."),
    });
  };

  const loadXlsx = async (file) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    setRows(json);
  };

  const onUpload = async (file) => {
    if (!file) return;
    setFileName(file.name);

    const lower = file.name.toLowerCase();
    if (lower.endsWith(".csv")) loadCsv(file);
    else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) await loadXlsx(file);
    else alert("Upload a .csv or .xlsx file");
  };

  const analyzed = useMemo(() => {
    const out = [];

    for (const r of rows) {
      const location = String(r.Location ?? r.location ?? "").trim();
      const propertyType = String(r.Property_Type ?? r.propertyType ?? r.type ?? "").trim();
      const listingType = getListingType(r);

      const url = getUrlFromRow(r);

      const purchasePrice =
        listingType === "FOR SALE"
          ? parseMoney(r.Price_Listing ?? r.price ?? r.ListPrice ?? r.Price_Number ?? r.PurchasePrice)
          : null;

      const squareFeet = parseNumber(r.Property_Sqft ?? r.Square_Feet ?? r.sqft ?? r.squareFeet);
      const annualTax = parseMoney(r.Property_Tax ?? r.Property_Tax_Annual ?? r.tax ?? r.TaxAnnualAmount);
      const beds = parseNumber(r.Bed ?? r.beds ?? r.BedroomsTotal ?? r.bedrooms);
      const baths = parseNumber(r.Bath ?? r.baths ?? r.BathroomsTotalInteger ?? r.bathrooms);

      // ✅ FILTER: don’t show for-sale listings below $250,000
      if (listingType === "FOR SALE" && (purchasePrice == null || purchasePrice < 250000)) {
        continue;
      }

      const bedCount = beds ?? rentRule.fallbackBeds;

      const rentFromFile =
        parseMoney(r.MonthlyRent) ??
        parseMoney(r.Rent) ??
        parseMoney(r.LeaseAmount) ??
        parseMoney(r.monthlyRent) ??
        parseMoney(r.rent);

      const monthlyRent = rentFromFile ?? Math.max(0, Math.round(rentRule.base + bedCount * rentRule.perBed));

      // RENTAL rows: show, but don't compute ROI
      if (listingType === "RENTAL") {
        out.push({
          url,
          listingType,
          location: location || null,
          propertyType: propertyType || null,
          purchasePrice: null,
          squareFeet,
          annualTax,
          beds,
          baths,
          monthlyRent: rentFromFile ?? null,
          noiAnnual: null,
          capRate: null,
        });
        continue;
      }

      const { noiAnnual, capRate } = calcNoiAndCapRate({
        purchasePrice,
        monthlyRent,
        annualTax,
        annualInsurance: assumptions.insuranceAnnual,
        maintPct: assumptions.maintPct,
        vacancyPct: assumptions.vacancyPct,
        mgmtPct: assumptions.mgmtPct,
      });

      out.push({
        url,
        listingType,
        location: location || null,
        propertyType: propertyType || null,
        purchasePrice,
        squareFeet,
        annualTax,
        beds,
        baths,
        monthlyRent,
        noiAnnual,
        capRate,
      });
    }

    out.sort((a, b) => (b.capRate ?? -Infinity) - (a.capRate ?? -Infinity));
    return out;
  }, [rows, rentRule, assumptions]);

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Upload CSV/XLSX → ROI Ranking + Links (≥ $250,000)
      </h2>

      <div className="flex flex-col gap-3 mb-6">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => onUpload(e.target.files?.[0])}
          className="block w-full text-sm"
        />
        {fileName ? (
          <div className="text-sm text-gray-600">
            Loaded: <b>{fileName}</b>
          </div>
        ) : null}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="border rounded-xl p-4">
          <h3 className="font-bold text-gray-800 mb-3">Rent Estimate Rule (fallback)</h3>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-sm">
              Base
              <input
                type="number"
                value={rentRule.base}
                onChange={(e) => setRentRule({ ...rentRule, base: Number(e.target.value) })}
                className="mt-1 w-full border rounded-lg px-2 py-1"
              />
            </label>
            <label className="text-sm">
              Per Bed
              <input
                type="number"
                value={rentRule.perBed}
                onChange={(e) => setRentRule({ ...rentRule, perBed: Number(e.target.value) })}
                className="mt-1 w-full border rounded-lg px-2 py-1"
              />
            </label>
            <label className="text-sm">
              Fallback Beds
              <input
                type="number"
                value={rentRule.fallbackBeds}
                onChange={(e) => setRentRule({ ...rentRule, fallbackBeds: Number(e.target.value) })}
                className="mt-1 w-full border rounded-lg px-2 py-1"
              />
            </label>
          </div>
        </div>

        <div className="border rounded-xl p-4">
          <h3 className="font-bold text-gray-800 mb-3">Operating Assumptions</h3>
          <div className="grid grid-cols-4 gap-3">
            <label className="text-sm">
              Insurance/yr
              <input
                type="number"
                value={assumptions.insuranceAnnual}
                onChange={(e) => setAssumptions({ ...assumptions, insuranceAnnual: Number(e.target.value) })}
                className="mt-1 w-full border rounded-lg px-2 py-1"
              />
            </label>
            <label className="text-sm">
              Maint %
              <input
                type="number"
                step="0.1"
                value={assumptions.maintPct}
                onChange={(e) => setAssumptions({ ...assumptions, maintPct: Number(e.target.value) })}
                className="mt-1 w-full border rounded-lg px-2 py-1"
              />
            </label>
            <label className="text-sm">
              Vacancy %
              <input
                type="number"
                step="0.1"
                value={assumptions.vacancyPct}
                onChange={(e) => setAssumptions({ ...assumptions, vacancyPct: Number(e.target.value) })}
                className="mt-1 w-full border rounded-lg px-2 py-1"
              />
            </label>
            <label className="text-sm">
              Mgmt %
              <input
                type="number"
                step="0.1"
                value={assumptions.mgmtPct}
                onChange={(e) => setAssumptions({ ...assumptions, mgmtPct: Number(e.target.value) })}
                className="mt-1 w-full border rounded-lg px-2 py-1"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-700 mb-3">
        Parsed rows: <b>{rows.length}</b> • Displayed: <b>{analyzed.length}</b>
      </div>

      <div className="overflow-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">Link</th>
              <th className="p-3">Listing</th>
              <th className="p-3">Location</th>
              <th className="p-3">Price</th>
              <th className="p-3">Sqft</th>
              <th className="p-3">Beds</th>
              <th className="p-3">Baths</th>
              <th className="p-3">Est Rent</th>
              <th className="p-3">NOI/yr</th>
              <th className="p-3">Cap Rate</th>
            </tr>
          </thead>
          <tbody>
            {analyzed.slice(0, 100).map((x, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">
                  {x.url ? (
                    <a href={x.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">
                      View
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="p-3 font-semibold">{x.listingType === "FOR SALE" ? "🏠 For Sale" : "🏢 Rental"}</td>
                <td className="p-3">{x.location ?? "—"}</td>
                <td className="p-3">{x.purchasePrice != null ? `$${Math.round(x.purchasePrice).toLocaleString()}` : "—"}</td>
                <td className="p-3">{x.squareFeet ? x.squareFeet.toLocaleString() : "—"}</td>
                <td className="p-3">{x.beds ?? "—"}</td>
                <td className="p-3">{x.baths ?? "—"}</td>
                <td className="p-3">{x.monthlyRent != null ? `$${Math.round(x.monthlyRent).toLocaleString()}` : "—"}</td>
                <td className="p-3">{x.noiAnnual != null ? `$${Math.round(x.noiAnnual).toLocaleString()}` : "—"}</td>
                <td className="p-3 font-semibold">{x.capRate != null ? `${x.capRate.toFixed(2)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Showing top 100 by cap rate. Listings under $250,000 are hidden for For Sale.
      </p>
    </div>
  );
}
