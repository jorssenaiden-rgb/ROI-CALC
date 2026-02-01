"use client";

import { useEffect, useMemo } from "react";

const STORAGE_KEY = "investroi_assumptions_v1";

const defaults = {
  downPaymentPct: 20,
  interestRatePct: 5.5,
  amortYears: 30,
  vacancyPct: 5,
  expensePct: 35,
};

export function loadAssumptions() {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function saveAssumptions(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export default function InvestorControls({ value, onChange }) {
  const v = value;

  useEffect(() => {
    saveAssumptions(v);
  }, [v]);

  const help = useMemo(() => {
    return {
      mortgage: "Used to compute payment + cashflow per listing.",
      vacancy: "Reduces rent to account for empty months.",
      expense: "Operating expenses as % of effective rent (maintenance, mgmt, utilities, etc.).",
    };
  }, []);

  const set = (key, val) => onChange({ ...v, [key]: val });

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-bold text-slate-800">Investor Assumptions</div>
          <div className="text-xs text-slate-500">
            These auto-calculate cashflow, CoC return, and DSCR.
          </div>
        </div>
        <button
          onClick={() => onChange(defaults)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Down Payment %</label>
          <input
            type="number"
            value={v.downPaymentPct}
            onChange={(e) => set("downPaymentPct", Number(e.target.value))}
            className="mt-1 w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            min={0}
            max={100}
            step={1}
          />
        </div>

        <div title={help.mortgage}>
          <label className="text-xs font-semibold text-slate-500">Interest %</label>
          <input
            type="number"
            value={v.interestRatePct}
            onChange={(e) => set("interestRatePct", Number(e.target.value))}
            className="mt-1 w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            min={0}
            step={0.1}
          />
        </div>

        <div title={help.mortgage}>
          <label className="text-xs font-semibold text-slate-500">Amort (years)</label>
          <select
            value={v.amortYears}
            onChange={(e) => set("amortYears", Number(e.target.value))}
            className="mt-1 w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm"
          >
            {[15, 20, 25, 30].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>

        <div title={help.vacancy}>
          <label className="text-xs font-semibold text-slate-500">Vacancy %</label>
          <input
            type="number"
            value={v.vacancyPct}
            onChange={(e) => set("vacancyPct", Number(e.target.value))}
            className="mt-1 w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            min={0}
            max={100}
            step={1}
          />
        </div>

        <div title={help.expense}>
          <label className="text-xs font-semibold text-slate-500">Expense %</label>
          <input
            type="number"
            value={v.expensePct}
            onChange={(e) => set("expensePct", Number(e.target.value))}
            className="mt-1 w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            min={0}
            max={100}
            step={1}
          />
        </div>
      </div>
    </div>
  );
}
