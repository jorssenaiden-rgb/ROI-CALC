"use client";

import { useEffect } from "react";
import Script from "next/script";

export default function OpeningScreen() {
  useEffect(() => {
    // Render the Plotly chart (simple demo chart so the panel isn't blank)
    const w = window as unknown as { Plotly?: any };

    if (!w.Plotly) return;

    const data = [
      {
        x: ["0-4%", "4-6%", "6-8%", "8-10%", "10%+"],
        y: [12, 28, 22, 14, 6],
        type: "bar",
      },
    ];

    const layout = {
      margin: { l: 30, r: 10, t: 10, b: 40 },
      height: 230,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      xaxis: { tickfont: { size: 10 } },
      yaxis: { tickfont: { size: 10 } },
    };

    w.Plotly.newPlot("roiChart", data, layout, { displayModeBar: false });

    return () => {
      try {
        w.Plotly?.purge?.("roiChart");
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <>
      {/* These <link> tags mirror your HTML head (works fine here for quick setup). */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Plotly + FontAwesome JS (mirrors your HTML head scripts) */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
      <Script
        src="https://cdn.plot.ly/plotly-3.1.1.min.js"
        strategy="afterInteractive"
      />

      {/* Inline CSS from your HTML <style> block */}
      <style jsx global>{`
        body {
          font-family: "Inter", sans-serif;
          background-color: #f8fafc;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .custom-shadow {
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.1);
        }
        .gradient-text {
          background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* === HTML BODY (converted to JSX) === */}
      <div className="text-slate-800">
        {/* Header */}
        <header
          id="header"
          className="fixed w-full z-50 bg-white border-b border-slate-200 shadow-sm h-16"
        >
          <div className="container mx-auto px-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center text-white font-bold">
                <i className="fa-solid fa-chart-line" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Invest<span className="text-sky-600">ROI</span>
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a
                href="#"
                className="text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors"
              >
                Market Trends
              </a>
              <a
                href="#"
                className="text-sm font-medium text-sky-600 transition-colors"
              >
                Listings
              </a>
              <a
                href="#"
                className="text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors"
              >
                Calculators
              </a>
              <a
                href="#"
                className="text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors"
              >
                Insights
              </a>
            </nav>

            <div className="flex items-center gap-4">
              <button className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600">
                <i className="fa-regular fa-bell" />
              </button>

              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="text-right hidden md:block">
                  <p className="text-xs font-semibold text-slate-900">
                    Alex Investor
                  </p>
                  <p className="text-[10px] text-slate-500">Premium Member</p>
                </div>
                <img
                  src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg"
                  alt="Profile"
                  className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Wrapper */}
        <main id="main-content" className="pt-16 min-h-screen flex flex-col">
          {/* Hero & Filter Section */}
          <section
            id="hero-search"
            className="relative bg-slate-900 h-[400px] overflow-hidden"
          >
            <div className="absolute inset-0 z-0">
              <img
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
                className="w-full h-full object-cover opacity-40"
                alt="City Skyline"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-900/90" />
            </div>

            <div className="relative z-10 container mx-auto px-4 pt-16 h-full flex flex-col justify-center">
              <div className="max-w-3xl mb-8">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
                  Find High Yield{" "}
                  <span className="text-sky-400">ROI Properties</span>
                </h1>
                <p className="text-slate-300 text-lg">
                  Analyze cap rates, cash flow, and market trends instantly
                  across thousands of listings.
                </p>
              </div>

              {/* Search Widget */}
              <div
                id="search-widget"
                className="bg-white rounded-xl p-4 shadow-xl max-w-5xl transform translate-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Country
                    </label>
                    <div className="relative">
                      <select className="w-full h-11 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 appearance-none cursor-pointer">
                        <option>Canada</option>
                        <option>United States</option>
                        <option>United Kingdom</option>
                      </select>
                      <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
                        <i className="fa-solid fa-chevron-down text-xs" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Region / Province
                    </label>
                    <div className="relative">
                      <select className="w-full h-11 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 appearance-none cursor-pointer">
                        <option>British Columbia</option>
                        <option>Ontario</option>
                        <option>Alberta</option>
                        <option>Quebec</option>
                      </select>
                      <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
                        <i className="fa-solid fa-chevron-down text-xs" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Municipality
                    </label>
                    <div className="relative">
                      <select className="w-full h-11 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 appearance-none cursor-pointer">
                        <option>Greater Vancouver</option>
                        <option>Surrey</option>
                        <option>Burnaby</option>
                        <option>Richmond</option>
                      </select>
                      <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
                        <i className="fa-solid fa-chevron-down text-xs" />
                      </div>
                    </div>
                  </div>

                  <button className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg transition-all shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-magnifying-glass" />
                    Analyze Market
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Overview */}
          <section
            id="stats-overview"
            className="mt-16 container mx-auto px-4 mb-8"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">
                    Avg Cap Rate
                  </p>
                  <p className="text-2xl font-bold text-emerald-500">5.8%</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-emerald-500">
                  <i className="fa-solid fa-percent" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">
                    Active Listings
                  </p>
                  <p className="text-2xl font-bold text-slate-800">1,240</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-sky-600">
                  <i className="fa-solid fa-building" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">
                    Avg Price
                  </p>
                  <p className="text-2xl font-bold text-slate-800">$845k</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                  <i className="fa-solid fa-tag" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">
                    Avg Rent
                  </p>
                  <p className="text-2xl font-bold text-slate-800">$3,200</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                  <i className="fa-solid fa-money-bill-wave" />
                </div>
              </div>
            </div>
          </section>

          {/* Workspace */}
          <section
            id="workspace"
            className="container mx-auto px-4 mb-12 flex flex-col lg:flex-row gap-6 h-auto"
          >
            {/* Left Column */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
              {/* Map Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[400px] relative group">
                <img
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1748&auto=format&fit=crop"
                  className="w-full h-full object-cover"
                  alt="Map View"
                />

                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <button className="bg-white p-2 rounded shadow-md hover:bg-slate-50 text-slate-600">
                    <i className="fa-solid fa-plus" />
                  </button>
                  <button className="bg-white p-2 rounded shadow-md hover:bg-slate-50 text-slate-600">
                    <i className="fa-solid fa-minus" />
                  </button>
                </div>

                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Heatmap Layer
                    </span>
                    <span className="text-xs text-sky-600 cursor-pointer">
                      Configure
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-1.5 text-xs font-medium bg-sky-100 text-sky-700 rounded border border-sky-200">
                      Cap Rate
                    </button>
                    <button className="flex-1 py-1.5 text-xs font-medium bg-white text-slate-600 rounded border border-slate-200 hover:bg-slate-50">
                      Price
                    </button>
                    <button className="flex-1 py-1.5 text-xs font-medium bg-white text-slate-600 rounded border border-slate-200 hover:bg-slate-50">
                      Growth
                    </button>
                  </div>
                </div>
              </div>

              {/* Analytics Chart */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-[300px] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 text-sm">
                    ROI Distribution
                  </h3>
                  <select className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1">
                    <option>Last 30 Days</option>
                    <option>Last Year</option>
                  </select>
                </div>
                <div id="roiChart" className="flex-grow w-full h-full" />
              </div>
            </div>

            {/* Right Column: Listings Table (still static like the HTML for now) */}
            <div className="w-full lg:w-2/3 flex flex-col">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
                    <div className="relative group">
                      <input
                        type="text"
                        placeholder="Filter by address..."
                        className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm w-64 focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                      />
                      <i className="fa-solid fa-filter absolute left-3 top-3 text-slate-400 text-xs" />
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200 mx-1" />

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
                        Price Range:
                      </label>
                      <select className="py-2 pl-2 pr-6 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-1 focus:ring-sky-500">
                        <option>$200k - $500k</option>
                        <option>$500k - $1M</option>
                        <option>$1M+</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
                        Min Cap Rate:
                      </label>
                      <select className="py-2 pl-2 pr-6 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-1 focus:ring-sky-500">
                        <option>5%</option>
                        <option>7%</option>
                        <option>10%</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Sort by:</span>
                    <select className="py-2 pl-2 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-bold text-sky-600 focus:ring-1 focus:ring-sky-500 cursor-pointer">
                      <option>Best Cap Rate</option>
                      <option>Lowest Price</option>
                      <option>Highest NOI</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-grow">
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
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {/* You can replace these hardcoded rows with your real listings later */}
                      <tr className="hover:bg-sky-50/30 transition-colors group cursor-pointer">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0 relative">
                              <img
                                src="https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=2070&auto=format&fit=crop"
                                className="w-full h-full object-cover"
                                alt="Property"
                              />
                              <div className="absolute top-0 right-0 bg-sky-600 text-white text-[8px] font-bold px-1 py-0.5 rounded-bl">
                                NEW
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-800">
                                60-8220 King George Blvd
                              </div>
                              <div className="text-xs text-slate-500">
                                Surrey, BC • V3W 6E1
                              </div>
                              <div className="mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                                  Manufactured Home
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-right">
                          <div className="text-sm font-bold text-slate-800">
                            $308,000
                          </div>
                          <div className="text-xs text-slate-400">$335/sqft</div>
                        </td>

                        <td className="p-4 text-center">
                          <div className="text-xs font-medium text-slate-600">
                            4 Beds
                          </div>
                          <div className="text-xs text-slate-400">
                            1 Bath • 918 sqft
                          </div>
                        </td>

                        <td className="p-4 text-right">
                          <div className="text-sm font-medium text-slate-700">
                            $4,000
                          </div>
                        </td>

                        <td className="p-4 text-right">
                          <div className="text-sm font-medium text-slate-700">
                            $37,230
                          </div>
                        </td>

                        <td className="p-4 text-right">
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-green-100 text-green-800">
                            12.09%
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <button className="text-slate-400 hover:text-sky-600 transition-colors">
                            <i className="fa-solid fa-chevron-right" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-white px-4 py-3 border-t border-slate-200 flex items-center justify-between sm:px-6">
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-700">
                        Showing <span className="font-medium">1</span> to{" "}
                        <span className="font-medium">6</span> of{" "}
                        <span className="font-medium">500</span> results
                      </p>
                    </div>

                    <div>
                      <nav
                        className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                        aria-label="Pagination"
                      >
                        <a
                          href="#"
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50"
                        >
                          <span className="sr-only">Previous</span>
                          <i className="fa-solid fa-chevron-left h-4 w-4" />
                        </a>

                        <a
                          href="#"
                          aria-current="page"
                          className="z-10 bg-sky-50 border-sky-500 text-sky-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                        >
                          1
                        </a>
                        <a
                          href="#"
                          className="bg-white border-slate-300 text-slate-500 hover:bg-slate-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                        >
                          2
                        </a>
                        <a
                          href="#"
                          className="bg-white border-slate-300 text-slate-500 hover:bg-slate-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                        >
                          3
                        </a>
                        <span className="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700">
                          ...
                        </span>
                        <a
                          href="#"
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50"
                        >
                          <span className="sr-only">Next</span>
                          <i className="fa-solid fa-chevron-right h-4 w-4" />
                        </a>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* You had more sections after this in the HTML; add them here if you want. */}
        </main>
      </div>
    </>
  );
}
