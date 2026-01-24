"use client";

import React, { useMemo, useState } from "react";

function calcNoiAndCapRate({ price, monthlyRent, annualTax }) {
  if (!price || !monthlyRent) return { noiAnnual: null, capRate: null };

  // Operating assumptions (same style as before)
  const insuranceAnnual = 1200;
  const maintAnnual = price * 0.01;

  const grossAnnual = monthlyRent * 12;

  const propTaxAnnual = annualTax ?? price * 0.012;
  const vacancyAnnual = grossAnnual * 0.05;
  const mgmtAnnual = grossAnnual * 0.08;

  const expenses = propTaxAnnual + insuranceAnnual + maintAnnual + vacancyAnnual + mgmtAnnual;
  const noiAnnual = grossAnnual - expenses;
  const capRate = (noiAnnual / price) * 100;

  return { noiAnnual, capRate };
}

export default function GreaterVancouverSearch({ listings }) {
  const [query, setQuery] = useState("");

  // Rent estimate settings (you can change these)
  const [rentRule, setRentRule] = useState({
    base: 1200,
    perBed: 700,
    fallbackBeds: 2,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return listings
      .filter((r) => (r.Price_Listing ?? 0) >= 250000)
      .filter((r) => {
        if (!q) return true;
        return String(r.Location ?? "").toLowerCase().includes(q);
      })
      .map((r) => {
        const price = r.Price_Listing ?? null;
        const beds = r.Bed ?? null;
        const tax = r.Property_Tax ?? null;

        const bedCount = beds ?? rentRule.fallbackBeds;
        const estRent = Math.max(0, Math.round(rentRule.base + bedCount * rentRule.perBed));

        const { noiAnnual, capRate } = calcNoiAndCapRate({
          price,
          monthlyRent: estRent,
          annualTax: tax,
        });

        return {
          ...r,
          estRent,
          noiAnnual,
          capRate,
        };
      })
      .sort((a, b) => (b.capRate ?? -Infinity) - (a.capRate ?? -Infinity))
      .slice(0, 500);
  }, [listings, query, rentRule]);

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        Greater Vancouver Listings (ROI + Rent)
      </h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder='Search area (e.g. "Burnaby", "Richmond", "Surrey", "Vancouver")'
        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
        autoComplete="off"
        spellCheck={false}
      />

      <div className="grid md:grid-cols-3 gap-3 mt-4">
        <label className="text-sm">
          Base Rent
          <input
            type="number"
            value={rentRule.base}
            onChange={(e) => setRentRule({ ...rentRule, base: Number(e.target.value) })}
            className="mt-1 w-full border rounded-lg px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Rent Per Bed
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

      <div className="text-xs text-gray-500 mt-2">
        Showing ≥ $250,000 • Sorted by best cap rate • Results: {filtered.length} (max 500 shown)
      </div>

      <div className="overflow-auto border rounded-xl mt-4">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">Location</th>
              <th className="p-3">Type</th>
              <th className="p-3">Price</th>
              <th className="p-3">Beds</th>
              <th className="p-3">Baths</th>
              <th className="p-3">Sqft</th>
              <th className="p-3">Tax</th>
              <th className="p-3">Est Rent</th>
              <th className="p-3">NOI/yr</th>
              <th className="p-3">Cap Rate</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">{r.Location || "—"}</td>
                <td className="p-3">{r.Property_Type || "—"}</td>
                <td className="p-3">
                  {r.Price_Listing != null ? `$${Math.round(r.Price_Listing).toLocaleString()}` : "—"}
                </td>
                <td className="p-3">{r.Bed ?? "—"}</td>
                <td className="p-3">{r.Bath ?? "—"}</td>
                <td className="p-3">{r.Property_Sqft != null ? r.Property_Sqft.toLocaleString() : "—"}</td>
                <td className="p-3">
                  {r.Property_Tax != null ? `$${Math.round(r.Property_Tax).toLocaleString()}` : "—"}
                </td>
                <td className="p-3">${r.estRent.toLocaleString()}</td>
                <td className="p-3">
                  {r.noiAnnual != null ? `$${Math.round(r.noiAnnual).toLocaleString()}` : "—"}
                </td>
                <td className="p-3 font-semibold">
                  {r.capRate != null ? `${r.capRate.toFixed(2)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
