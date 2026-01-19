"use client";

import React, { useState } from "react";
import { Calculator, TrendingUp, DollarSign, Home, Loader2, Search, MapPin, Star } from "lucide-react";

function calculateQuickROI(purchasePrice: number, monthlyRent: number) {
  const down = purchasePrice * 0.20;
  const annualRate = 0.065;
  const rate = annualRate / 12;
  const term = 30 * 12;
  const loanAmount = purchasePrice - down;

  const monthlyPayment =
    rate === 0
      ? loanAmount / term
      : (loanAmount * (rate * Math.pow(1 + rate, term))) / (Math.pow(1 + rate, term) - 1);

  const propTax = (purchasePrice * 0.012) / 12;
  const insurance = 1200 / 12;
  const maint = (purchasePrice * 0.01) / 12;
  const vacancy = monthlyRent * 0.05;
  const mgmt = monthlyRent * 0.08;

  const monthlyIncome = monthlyRent - vacancy;
  const monthlyExpenses = monthlyPayment + propTax + insurance + maint + mgmt;
  const monthlyCashFlow = monthlyIncome - monthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  const totalInvestment = down + purchasePrice * 0.03;

  const cashOnCashReturn = totalInvestment > 0 ? (annualCashFlow / totalInvestment) * 100 : null;

  const capRate =
    purchasePrice > 0
      ? ((monthlyRent * 12 - (propTax * 12 + insurance * 12 + maint * 12)) / purchasePrice) * 100
      : null;

  return { cashOnCashReturn, capRate, monthlyCashFlow, annualCashFlow };
}

export default function RealEstateROIAnalyzer() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [propertyData, setPropertyData] = useState<any>(null);

  const [analyzeInputs, setAnalyzeInputs] = useState({
    location: "",
    distance: "10",
    minPrice: "",
    maxPrice: "",
    website: "zillow",
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [manualInputs, setManualInputs] = useState({
    purchasePrice: "",
    monthlyRent: "",
  });

  const fetchPropertyData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Request failed (${res.status})`);
      }

      const extracted = await res.json();
      setPropertyData(extracted);

      setManualInputs((prev) => ({
        ...prev,
        purchasePrice: extracted.purchasePrice != null ? String(extracted.purchasePrice) : prev.purchasePrice,
        monthlyRent: extracted.estimatedRent != null ? String(extracted.estimatedRent) : prev.monthlyRent,
      }));
    } catch (err) {
      console.error("Fetch error:", err);
      alert("Could not fetch property data from this URL. Please enter details manually.");
    } finally {
      setLoading(false);
    }
  };

  const analyzeAreaProperties = async () => {
    setAnalyzing(true);
    setProperties([]);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: analyzeInputs.location,
          distance: Number(analyzeInputs.distance) || 10,
          minPrice: analyzeInputs.minPrice ? Number(analyzeInputs.minPrice) : null,
          maxPrice: analyzeInputs.maxPrice ? Number(analyzeInputs.maxPrice) : null,
          website: analyzeInputs.website,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Request failed (${res.status})`);
      }

      const propertiesData = await res.json();
      if (!Array.isArray(propertiesData)) throw new Error("Search response was not an array");

      const propertiesWithROI = propertiesData
        .filter((p: any) => p && typeof p.purchasePrice === "number" && typeof p.estimatedRent === "number")
        .map((prop: any) => ({ ...prop, ...calculateQuickROI(prop.purchasePrice, prop.estimatedRent) }));

      setProperties(propertiesWithROI);
    } catch (err) {
      console.error("Analysis error:", err);
      alert("Could not analyze properties in this area. Please try adjusting your search criteria.");
    } finally {
      setAnalyzing(false);
    }
  };

  // ✅ Minimal UI just to prove it runs (we’ll paste your full UI next)
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>ROI Analyzer Loaded ✅</h1>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste listing URL"
          style={{ padding: 10, width: 360 }}
        />
        <button onClick={fetchPropertyData} disabled={!url || loading} style={{ padding: 10 }}>
          {loading ? "Fetching..." : "Fetch Data"}
        </button>
      </div>

      {propertyData && (
        <pre style={{ marginTop: 16, background: "#f5f5f5", padding: 12 }}>{JSON.stringify(propertyData, null, 2)}</pre>
      )}

      <div style={{ marginTop: 16 }}>
        <button onClick={analyzeAreaProperties} disabled={analyzing} style={{ padding: 10 }}>
          {analyzing ? "Analyzing..." : "Test Area Search"}
        </button>
      </div>

      {properties.length > 0 && (
        <pre style={{ marginTop: 16, background: "#f5f5f5", padding: 12 }}>{JSON.stringify(properties, null, 2)}</pre>
      )}
    </div>
  );
}
