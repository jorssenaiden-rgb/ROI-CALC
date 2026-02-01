import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

export type Listing = {
  id: number;
  address: string;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  estRent: number | null; // monthly
  noi: number | null; // annual
  capRate: number | null; // percent
  raw: Record<string, any>;
};

function num(v: any): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function str(v: any): string {
  if (v == null) return "";
  const s = String(v).trim();
  return s;
}

function pickFirst<T>(...vals: T[]): T | undefined {
  for (const v of vals) {
    // @ts-ignore
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

// --- Estimates (used if file doesn't provide values) ---
function estimateMonthlyRent(beds: number | null, base = 1200, perBed = 700, fallbackBeds = 2) {
  const b = beds ?? fallbackBeds;
  return Math.max(0, Math.round(base + b * perBed));
}

function estimateAnnualNOI(monthlyRent: number, expenseRatio = 0.35) {
  const gross = monthlyRent * 12;
  return Math.round(gross * (1 - expenseRatio));
}

function calcCapRate(noiAnnual: number | null, price: number | null) {
  if (!noiAnnual || !price || price <= 0) return null;
  return Math.round((noiAnnual / price) * 10000) / 100; // 2 decimals
}

// --- Cache + dev safety ---
let cached: Listing[] | null = null;
let cachedAt = 0;
const CACHE_MS = 60 * 60 * 1000; // 1 hour
const MAX_ROWS = 8000; // raise later

export function loadListings(): Listing[] {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_MS) return cached;

  const filePath = path.join(process.cwd(), "data", "scraped-data-van.xlsx");

  if (!fs.existsSync(filePath)) {
    console.error("❌ XLSX NOT FOUND:", filePath);
    cached = [];
    cachedAt = now;
    return [];
  }

  // Read as buffer (helps with OneDrive access issues)
  const fileBuf = fs.readFileSync(filePath);
  const wb = XLSX.read(fileBuf, { type: "buffer" });

  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
  const limited = rows.slice(0, MAX_ROWS);

  // Log once per cache refresh
  console.log("✅ loadListings.ts CALLED");
  console.log("📄 Sheet:", sheetName);
  console.log("📊 Row count:", rows.length, "| using:", limited.length);
  console.log("🔑 First row keys:", Object.keys(limited[0] || {}));

  const result: Listing[] = limited
    .map((r, i) => {
      const address = str(
        pickFirst(
          r.Location,
          r.Address,
          r.address,
          r.ADDRESS,
          r["Full Address"],
          r["Property Address"]
        ) ?? ""
      );

      const price = num(pickFirst(r.Price_Listing, r.Price, r.price, r["Purchase Price"]));

      const beds = num(pickFirst(r.Bed, r.Beds, r.Bedrooms, r.bedrooms));
      const baths = num(pickFirst(r.Bath, r.Baths, r.Bathrooms, r.bathrooms));
      const sqft = num(pickFirst(r.Property_Sqft, r.Sqft, r.sqft, r["Square Feet"], r.squareFeet));

      // If your file has rent/noi/caprate columns, use them.
      // Otherwise, compute estimates.
      const fileRent = num(pickFirst(r.Rent, r.rent, r.estimatedRent, r["Estimated Rent"], r["Est Rent"]));
      const estRent = fileRent ?? estimateMonthlyRent(beds);

      const fileNOI = num(pickFirst(r.NOI, r.noi, r["NOI/yr"], r["NOI Yearly"], r.noiYear));
      const noi = fileNOI ?? estimateAnnualNOI(estRent);

      const fileCap = num(pickFirst(r["Cap Rate"], r.capRate, r.cap_rate, r.CapRate));
      const capRate = fileCap ?? calcCapRate(noi, price);

      return {
        id: i,
        address,
        price,
        beds,
        baths,
        sqft,
        estRent,
        noi,
        capRate,
        raw: r,
      };
    })
    // remove empty junk rows
    .filter((x) => x.address || x.price || x.beds || x.baths || x.sqft);

  cached = result;
  cachedAt = now;
  return result;
}
