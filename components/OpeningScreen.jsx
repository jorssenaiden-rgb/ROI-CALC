"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import InvestorControls, { loadAssumptions } from "@/components/InvestorControls";
import { computeMetrics } from "@/lib/invest";

function money(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `$${Math.round(Number(n)).toLocaleString()}`;
}
function money2(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function pct(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Number(n).toFixed(2)}%`;
}
function pct1(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Number(n).toFixed(1)}%`;
}

const WATCH_KEY = "investroi_watchlist_v1";

function loadWatchlist() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveWatchlist(list) {
  try {
    localStorage.setItem(WATCH_KEY, JSON.stringify(list));
  } catch {}
}

function toCsv(rows) {
  const escape = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const headers = [
    "address",
    "price",
    "beds",
    "baths",
    "sqft",
    "estRent",
    "capRate",
    "cashFlowMonthly",
    "cashOnCashPct",
    "dscr",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  return lines.join("\n");
}

export default function OpeningScreen() {
  // Hero selections (options never filtered)
  const [heroCountry, setHeroCountry] = useState("Canada");
  const [heroProvince, setHeroProvince] = useState("any");
  const [heroCity, setHeroCity] = useState("any");

  // Active filters (sent to API)
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("any");
  const [province, setProvince] = useState("any");
  const [city, setCity] = useState("any");

  const [priceBucket, setPriceBucket] = useState("any");
  const [minCap, setMinCap] = useState(0);
  const [sortBy, setSortBy] = useState("cap");

  // Beds/Baths minimum filters
  const [minBeds, setMinBeds] = useState("any");
  const [minBaths, setMinBaths] = useState("any");

  // Investor assumptions
  const [assumptions, setAssumptions] = useState(loadAssumptions());

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Server results (only 50)
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Full options
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);

  // Market summary
  const [market, setMarket] = useState({ count: 0, avgCapRate: null, avgPrice: null, avgRent: null });

  // Watchlist
  const [watchlist, setWatchlist] = useState([]);
  useEffect(() => setWatchlist(loadWatchlist()), []);
  useEffect(() => saveWatchlist(watchlist), [watchlist]);

  const resultsRef = useRef(null);
  const tableTopRef = useRef(null);

  // Plotly (current page)
  const plotReadyRef = useRef(false);
  const initOrUpdatePlotly = useCallback((capRates) => {
    const Plotly = typeof window !== "undefined" ? window.Plotly : null;
    if (!Plotly) return;

    const el = document.getElementById("roiChart");
    if (!el) return;

    const buckets = [
      { label: "0-2%", lo: 0, hi: 2, count: 0 },
      { label: "2-4%", lo: 2, hi: 4, count: 0 },
      { label: "4-6%", lo: 4, hi: 6, count: 0 },
      { label: "6-8%", lo: 6, hi: 8, count: 0 },
      { label: "8-10%", lo: 8, hi: 10, count: 0 },
      { label: "10%+", lo: 10, hi: Infinity, count: 0 },
    ];

    for (const r of capRates) {
      const v = Number(r);
      if (!Number.isFinite(v)) continue;
      const b = buckets.find((x) => v >= x.lo && v < x.hi);
      if (b) b.count += 1;
    }

    const data = [{ x: buckets.map((b) => b.label), y: buckets.map((b) => b.count), type: "bar" }];
    const layout = {
      margin: { l: 30, r: 10, t: 10, b: 40 },
      height: 230,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      xaxis: { tickfont: { size: 10 } },
      yaxis: { tickfont: { size: 10 } },
    };

    if (!plotReadyRef.current) {
      plotReadyRef.current = true;
      Plotly.newPlot("roiChart", data, layout, { displayModeBar: false });
    } else {
      Plotly.react("roiChart", data, layout, { displayModeBar: false });
    }
  }, []);

  // Dropdown behavior: always full options; reset city selection when province changes
  const onHeroProvinceChange = (e) => {
    setHeroProvince(e.target.value);
    setHeroCity("any");
  };

  // Fetch one page
  const fetchPage = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const params = new URLSearchParams({
        q: query,
        country,
        province,
        city,
        priceBucket,
        minCap: String(minCap),
        sortBy,
        page: String(page),
        pageSize: String(pageSize),
        minBeds,
        minBaths,
      });

      const res = await fetch(`/api/find-good-roi?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
      }
      const data = await res.json();

      setItems(data.items || []);
      setTotal(Number(data.total || 0));
      setTotalPages(Number(data.totalPages || 1));

      if (Array.isArray(data.provinceOptions)) setProvinceOptions(data.provinceOptions);
      if (Array.isArray(data.cityOptions)) setCityOptions(data.cityOptions);

      if (data.page && Number(data.page) !== page) setPage(Number(data.page));
    } catch (err) {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setErrorMsg(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [query, country, province, city, priceBucket, minCap, sortBy, page, minBeds, minBaths]);

  // Fetch market summary for selected location (country/province/city)
  const fetchMarket = useCallback(async () => {
    try {
      const params = new URLSearchParams({ country, province, city });
      const res = await fetch(`/api/market-summary?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setMarket(data);
    } catch {}
  }, [country, province, city]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  useEffect(() => {
    fetchMarket();
  }, [fetchMarket]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, country, province, city, priceBucket, minCap, sortBy, minBeds, minBaths]);

  useEffect(() => {
    tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  useEffect(() => {
    const capRates = items.map((x) => x?.capRate).filter((v) => v != null);
    initOrUpdatePlotly(capRates);
  }, [items, initOrUpdatePlotly]);

  const pageButtons = useMemo(() => {
    const pages = new Set([1, totalPages, page - 2, page - 1, page, page + 1, page + 2]);
    const arr = Array.from(pages)
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b);

    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const cur = arr[i];
      const prev = arr[i - 1];
      if (i > 0 && cur - prev > 1) out.push("…");
      out.push(cur);
    }
    return out;
  }, [page, totalPages]);

  // Apply hero → active filters
  const onAnalyzeMarket = () => {
    setCountry(heroCountry || "any");
    setProvince(heroProvince);
    setCity(heroCity);
    setPage(1);

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const onClear = () => {
    setHeroCountry("Canada");
    setHeroProvince("any");
    setHeroCity("any");

    setQuery("");
    setCountry("any");
    setProvince("any");
    setCity("any");
    setPriceBucket("any");
    setMinCap(0);
    setSortBy("cap");
    setMinBeds("any");
    setMinBaths("any");
    setPage(1);
  };

  const toggleSave = (row) => {
    const key = row.id ?? row.address ?? JSON.stringify(row);
    const exists = watchlist.find((x) => (x.id ?? x.address) === key);
    if (exists) {
      setWatchlist((w) => w.filter((x) => (x.id ?? x.address) !== key));
    } else {
      setWatchlist((w) => [{ ...row, _key: key }, ...w].slice(0, 200));
    }
  };

  const exportWatchlist = () => {
    const rows = watchlist.map((x) => ({
      address: x.address,
      price: x.price,
      beds: x.beds,
      baths: x.baths,
      sqft: x.sqft,
      estRent: x.estRent,
      capRate: x.capRate,
      cashFlowMonthly: x._metrics?.cashFlowMonthly ?? "",
      cashOnCashPct: x._metrics?.cashOnCashPct ?? "",
      dscr: x._metrics?.dscr ?? "",
    }));

    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "watchlist.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Decorate items with investor metrics
  const viewRows = useMemo(() => {
    return items.map((x) => {
      const m = computeMetrics(
        Number(x.price) || null,
        Number(x.estRent) || null,
        Number(x.noi) || null,
        assumptions
      );
      return { ...x, _metrics: m };
    });
  }, [items, assumptions]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <Script src="https://cdn.plot.ly/plotly-3.1.1.min.js" strategy="afterInteractive" />

      <style jsx global>{`
        body {
          font-family: "Inter", sans-serif;
          background-color: #f8fafc;
        }
      `}</style>

      <div className="text-slate-800">
        <header className="fixed w-full z-50 bg-white border-b border-slate-200 shadow-sm h-16">
          <div className="container mx-auto px-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center text-white font-bold">
                <i className="fa-solid fa-chart-line" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Invest<span className="text-sky-600">ROI</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={exportWatchlist}
                className="hidden md:inline-flex px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                title="Export saved deals to CSV"
              >
                Export Watchlist ({watchlist.length})
              </button>
              <div className="hidden md:block text-xs text-slate-500">
                Page loads 50 at a time
              </div>
            </div>
          </div>
        </header>

        <main className="pt-16 min-h-screen flex flex-col">
          {/* HERO */}
          <section className="relative bg-slate-900 h-[320px] md:h-[400px] overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
                className="w-full h-full object-cover opacity-40"
                alt="City Skyline"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-900/90" />
            </div>

            <div className="relative z-10 container mx-auto px-4 pt-12 h-full flex flex-col justify-center">
              <div className="max-w-3xl mb-6">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
                  Find High Yield <span className="text-sky-400">ROI Properties</span>
                </h1>
                <p className="text-slate-300 text-lg">
                  Investor-grade metrics: cashflow, CoC return, DSCR, and market context.
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-xl max-w-6xl transform translate-y-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                  <div className="space-y-1 md:col-span-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Country
                    </label>
                    <select
                      value={heroCountry}
                      onChange={(e) => setHeroCountry(e.target.value)}
                      className="w-full h-11 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="Canada">Canada</option>
                      <option value="any">Any</option>
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Region / Province
                    </label>
                    <select
                      value={heroProvince}
                      onChange={onHeroProvinceChange}
                      className="w-full h-11 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="any">Any</option>
                      {provinceOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Municipality
                    </label>
                    <select
                      value={heroCity}
                      onChange={(e) => setHeroCity(e.target.value)}
                      className="w-full h-11 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="any">Any</option>
                      {cityOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={onAnalyzeMarket}
                    className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 md:col-span-1"
                  >
                    <i className="fa-solid fa-magnifying-glass" />
                    Analyze
                  </button>

                  <button
                    onClick={onClear}
                    className="w-full h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg md:col-span-1"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* RESULTS */}
          <section ref={resultsRef} className="mt-14 container mx-auto px-4 mb-6">
            {/* Investor assumptions */}
            <div className="mb-4">
              <InvestorControls value={assumptions} onChange={setAssumptions} />
            </div>

            {/* Market summary + status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Results</p>
                <p className="text-2xl font-bold text-slate-800">{loading ? "…" : total}</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Market Avg Cap</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {market.avgCapRate == null ? "—" : pct1(market.avgCapRate)}
                </p>
                <p className="text-xs text-slate-500">For selected area</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Market Avg Price</p>
                <p className="text-2xl font-bold text-slate-800">
                  {market.avgPrice == null ? "—" : money2(market.avgPrice)}
                </p>
                <p className="text-xs text-slate-500">For selected area</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Market Avg Rent</p>
                <p className="text-2xl font-bold text-slate-800">
                  {market.avgRent == null ? "—" : money2(market.avgRent)}
                </p>
                <p className="text-xs text-slate-500">For selected area</p>
              </div>

              {errorMsg && (
                <div className="md:col-span-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Chart */}
              <div className="w-full lg:w-1/3">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-[300px] flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-sm">Cap Rate Distribution</h3>
                    <div className="text-xs text-slate-500">Current page</div>
                  </div>
                  <div id="roiChart" className="flex-grow w-full h-full" />
                </div>
              </div>

              {/* Table + filters */}
              <div className="w-full lg:w-2/3 flex flex-col">
                <div ref={tableTopRef} />

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                  <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-3 overflow-x-auto">
                      <div className="relative">
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          type="text"
                          placeholder="Search address..."
                          className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-64"
                        />
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400 text-xs" />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
                          Beds:
                        </label>
                        <select
                          value={minBeds}
                          onChange={(e) => setMinBeds(e.target.value)}
                          className="py-2 pl-2 pr-6 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                        >
                          <option value="any">Any</option>
                          <option value="1">1+</option>
                          <option value="2">2+</option>
                          <option value="3">3+</option>
                          <option value="4">4+</option>
                          <option value="5">5+</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
                          Baths:
                        </label>
                        <select
                          value={minBaths}
                          onChange={(e) => setMinBaths(e.target.value)}
                          className="py-2 pl-2 pr-6 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                        >
                          <option value="any">Any</option>
                          <option value="1">1+</option>
                          <option value="2">2+</option>
                          <option value="3">3+</option>
                          <option value="4">4+</option>
                          <option value="5">5+</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
                          Price:
                        </label>
                        <select
                          value={priceBucket}
                          onChange={(e) => setPriceBucket(e.target.value)}
                          className="py-2 pl-2 pr-6 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                        >
                          <option value="any">Any</option>
                          <option value="200-500">$200k - $500k</option>
                          <option value="500-1000">$500k - $1M</option>
                          <option value="1000+">$1M+</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
                          Min Cap:
                        </label>
                        <select
                          value={String(minCap)}
                          onChange={(e) => setMinCap(Number(e.target.value))}
                          className="py-2 pl-2 pr-6 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                        >
                          <option value="0">Any</option>
                          <option value="3">3%</option>
                          <option value="5">5%</option>
                          <option value="7">7%</option>
                          <option value="10">10%</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Sort by:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="py-2 pl-2 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-bold text-sky-600 cursor-pointer"
                      >
                        <option value="cap">Best Cap Rate</option>
                        <option value="priceLow">Lowest Price</option>
                        <option value="noiHigh">Highest NOI</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">
                            Property
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                            Price
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                            Config
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                            Cashflow / mo
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                            CoC
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                            DSCR
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right text-sky-600">
                            Cap Rate
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                            Save
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {viewRows.map((x, idx) => {
                          const m = x._metrics;
                          const saved = watchlist.some((w) => (w._key ?? (w.id ?? w.address)) === (x.id ?? x.address));

                          const cashflow = m?.cashFlowMonthly;
                          const cashflowGood = cashflow != null && cashflow > 0;

                          return (
                            <tr key={x.id ?? `${x.address}-${idx}`} className="hover:bg-sky-50/30 transition-colors">
                              <td className="p-4">
                                <div className="text-sm font-bold text-slate-800">{x.address || "Unknown address"}</div>
                                <div className="text-xs text-slate-500">
                                  {x.sqft ? `${x.sqft} sqft` : "—"} • {x.estRent ? `Rent ${money(x.estRent)}/mo` : "Rent —"}
                                </div>
                              </td>

                              <td className="p-4 text-right">
                                <div className="text-sm font-bold text-slate-800">{money(x.price)}</div>
                                <div className="text-xs text-slate-500">
                                  {m?.monthlyMortgage != null ? `Pmt ${money(m.monthlyMortgage)}/mo` : "Pmt —"}
                                </div>
                              </td>

                              <td className="p-4 text-center">
                                <div className="text-xs font-medium text-slate-700">{x.beds} Beds</div>
                                <div className="text-xs text-slate-500">{x.baths} Baths</div>
                              </td>

                              <td className="p-4 text-right">
                                <div className={`text-sm font-bold ${cashflowGood ? "text-emerald-600" : "text-slate-700"}`}>
                                  {cashflow == null ? "—" : money(cashflow)}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  (vacancy+opex included)
                                </div>
                              </td>

                              <td className="p-4 text-right">
                                <div className="text-sm font-semibold text-slate-800">
                                  {m?.cashOnCashPct == null ? "—" : pct1(m.cashOnCashPct)}
                                </div>
                              </td>

                              <td className="p-4 text-right">
                                <div className="text-sm font-semibold text-slate-800">
                                  {m?.dscr == null ? "—" : m.dscr.toFixed(2)}
                                </div>
                              </td>

                              <td className="p-4 text-right">
                                {x.capRate != null ? (
                                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-green-100 text-green-800">
                                    {pct(x.capRate)}
                                  </div>
                                ) : (
                                  <div className="text-sm text-slate-400">—</div>
                                )}
                              </td>

                              <td className="p-4 text-center">
                                <button
                                  onClick={() => toggleSave({ ...x, _metrics: m })}
                                  className={`px-2 py-1 rounded-lg border text-xs font-semibold ${
                                    saved
                                      ? "border-sky-300 bg-sky-50 text-sky-700"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  }`}
                                  title="Save to watchlist"
                                >
                                  {saved ? "Saved" : "Save"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {viewRows.length === 0 && !loading && (
                          <tr>
                            <td className="p-6 text-sm text-slate-500" colSpan={8}>
                              No listings match your filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="bg-white px-4 py-3 border-t border-slate-200 flex items-center justify-between sm:px-6">
                    <div className="flex-1 flex items-center justify-between gap-4">
                      <div className="text-sm text-slate-700">
                        Showing{" "}
                        <span className="font-medium">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span>{" "}
                        to{" "}
                        <span className="font-medium">{Math.min(page * pageSize, total)}</span>{" "}
                        of <span className="font-medium">{total}</span> results •{" "}
                        <span className="text-slate-500">
                          Page <span className="font-medium">{page}</span> of{" "}
                          <span className="font-medium">{totalPages}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page <= 1 || loading}
                          className="px-3 py-2 rounded border border-slate-300 bg-white text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <i className="fa-solid fa-chevron-left" /> Prev
                        </button>

                        <div className="hidden sm:flex items-center gap-1">
                          {pageButtons.map((p, idx) =>
                            p === "…" ? (
                              <span key={`dots-${idx}`} className="px-2 text-slate-400">…</span>
                            ) : (
                              <button
                                key={p}
                                onClick={() => setPage(p)}
                                disabled={loading}
                                className={
                                  p === page
                                    ? "px-3 py-2 rounded border border-sky-500 bg-sky-50 text-sm font-semibold text-sky-700"
                                    : "px-3 py-2 rounded border border-slate-300 bg-white text-sm text-slate-600 hover:bg-slate-50"
                                }
                              >
                                {p}
                              </button>
                            )
                          )}
                        </div>

                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page >= totalPages || loading}
                          className="px-3 py-2 rounded border border-slate-300 bg-white text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Next <i className="fa-solid fa-chevron-right" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Investor metrics are auto-calculated from your assumptions and update instantly.
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
