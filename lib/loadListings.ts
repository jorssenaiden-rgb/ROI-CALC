import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

export type ListingRow = {
  Location: string;
  Property_Type: string;
  Price_Listing: number | null;
  Property_Sqft: number | null;
  Property_Tax: number | null;
  Bed: number | null;
  Bath: number | null;
};

let _cache: ListingRow[] | null = null;

function toNum(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s = String(v).replace(/,/g, "");
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;

  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

export function loadListings(): ListingRow[] {
  if (_cache) return _cache;

  const filePath = path.join(process.cwd(), "data", "scraped-data-van.xlsx");

  // helpful error if file isn't found
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found at: ${filePath}`);
  }

  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  const raw = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

  _cache = raw.map((r) => ({
    Location: String(r.Location ?? "").trim(),
    Property_Type: String(r.Property_Type ?? "").trim(),
    Price_Listing: toNum(r.Price_Listing),
    Property_Sqft: toNum(r.Property_Sqft),
    Property_Tax: toNum(r.Property_Tax),
    Bed: toNum(r.Bed),
    Bath: toNum(r.Bath),
  }));

  return _cache;
}
