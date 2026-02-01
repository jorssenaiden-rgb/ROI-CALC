"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";

function money(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `$${Number(n).toLocaleString()}`;
}

function pct(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Number(n).toFixed(2)}%`;
}

export default function OpeningScreen() {
  // ---------- HERO SELECTIONS (UI only; options never filtered) ----------
  const [heroCountry, setHeroCountry] = useState("Canada");
  const [heroProvince, setHeroProvince] = useState("any");
  const [heroCity, setHeroCity] = useState("any");

  // ---------- ACTIVE FILTERS (sent to API) ----------
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("any");
  const [province, setProvince] = useState("any");
  const [city, setCity] = useState("any");
  const [priceBucket, setPriceBucket] = useState("any");
  const [minCap, setMinCap] = useState(0);
  const [sortBy, setSortBy] = useState("cap");

  // ---------- PAGINATION ----------
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // ---------- DATA (only 50 rows) ----------
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ---------- FULL OPTION LISTS (NEVER filtered by selection) ----------
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);

  // Refs
  const resultsRef = useRef(null);
  const tableTopRef = useRef(null);

  // Plotly
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

    const data = [
      { x: buckets.map((b) => b.label), y: buckets.map((b) => b.count), type: "bar" },
    ];

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

  useEffect(() => {
    return () => {
      try {
        window.Plotly?.purge?.("roiChart");
      } catch {}
    };
  }, []);

  // ---------- HERO HANDLERS (fix stuck dropdowns) ----------
  const onHeroProvinceChange = (e) => {
    const nextProv = e.target.value;
    setHeroProvince(nextProv);

    // reset selection only (options stay full)
    setHeroCity("any");
  };

  const onHeroCityChange = (e) => {
    setHeroCity(e.target.value);
  };

  // ---------- FETCH PAGE (only 50 rows) ----------
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

      // ✅ IMPORTANT: options should be FULL LISTS (not filtered)
      if (Array.isArray(data.provinceOptions)) setProvinceOptions(data.provinceOptions);
      if (Array.isArray(data.cityOptions)) setCityOptions(data.cityOptions);

      // if server clamps page
      if (data.page && Number(data.page) !== page) setPage(Number(data.page));
    } catch (err) {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setErrorMsg(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [query, country, province, city, priceBucket, minCap, sortBy, page, pageSize]);

  // load new data when page/filters change
  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [query, country, province, city, priceBucket, minCap, sortBy]);

  // scroll to table on page change
  useEffect(() => {
    tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  // plotly from current page
  useEffect(() => {
    const capRates = items.map((x) => x?.capRate).filter((v) => v != null);
    initOrUpdatePlotly(capRates);
  }, [items, initOrUpdatePlotly]);

  // page buttons
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

  // apply hero → active filters
  const onAnalyzeMarket = () => {
    setCountry(heroCountry || "any");
    setProvince(heroProvince);
    setCity(heroCity);
    setPage(1);

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  // clear everything
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
    setPage(1);
  };

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
        {/* Header */}
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
                  Analyze cap rates, cash flow, and market trends instantly across thousands of listings.
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
                      onChange={onHeroCityChange}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Results</p>
                <p className="text-2xl font-bold text-slate-800">{loading ? "…" : total}</p>
              </div>

              {errorMsg && (
                <div className="md:col-span-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                  {errorMsg}
                </div>
              )}
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* CHART */}
              <div className="w-full lg:w-1/3">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-[300px] flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-sm">Cap Rate Distribution</h3>
                    <div className="text-xs text-slate-500">Current page</div>
                  </div>
                  <div id="roiChart" className="flex-grow w-full h-full" />
                </div>
              </div>

              {/* TABLE */}
              <div className="w-full lg:w-2/3 flex flex-col">
                <div ref={tableTopRef} />

                {/* CONTROLS */}
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
                        <label className="text-xs font-medium text-slate-600 whitespace-nowrap">Price:</label>
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
                        <label className="text-xs font-medium text-slate-600 whitespace-nowrap">Min Cap:</label>
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
                            Est Rent
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                            NOI/yr
                          </th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right text-sky-600">
                            Cap Rate
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {items.map((x, idx) => (
                          <tr key={x.id ?? idx} className="hover:bg-sky-50/30 transition-colors">
                            <td className="p-4">
                              <div className="text-sm font-bold text-slate-800">{x.address || "Unknown address"}</div>
                              <div className="text-xs text-slate-500">{x.sqft ? `${x.sqft} sqft` : "—"}</div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="text-sm font-bold text-slate-800">{money(x.price)}</div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="text-xs font-medium text-slate-600">
                                {x.beds != null ? `${x.beds} Beds` : "—"}
                              </div>
                              <div className="text-xs text-slate-400">
                                {x.baths != null ? `${x.baths} Baths` : "—"}
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="text-sm text-slate-700">{money(x.estRent)}</div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="text-sm text-slate-700">{money(x.noi)}</div>
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
                          </tr>
                        ))}

                        {items.length === 0 && !loading && (
                          <tr>
                            <td className="p-6 text-sm text-slate-500" colSpan={6}>
                              No listings match your filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINATION */}
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
                  ✅ Dropdown options always stay full (never filtered after selection).
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
