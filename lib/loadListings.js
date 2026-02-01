import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

function num(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function loadListings() {
  console.log("✅ loadListings() CALLED");

  const filePath = path.join(process.cwd(), "data", "scraped-data-van.xlsx");

  if (!fs.existsSync(filePath)) {
    console.error("❌ XLSX NOT FOUND:", filePath);
    return [];
  }

  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  console.log("📄 Sheet:", sheetName);
  console.log("📊 Row count:", rows.length);
  console.log("🔑 First row keys:", Object.keys(rows[0] || {}));
  console.log("🧾 First row sample:", rows[0]);

  return rows
    .map((r, i) => ({
      id: i,

      // common columns (we’ll adjust after we see your real keys)
      address: r.Location || r.Address || r.address || r.ADDRESS || "",
      price: num(r.Price_Listing ?? r.Price ?? r.price ?? r["Purchase Price"]),
      beds: num(r.Bed ?? r.Beds ?? r.Bedrooms ?? r.bedrooms),
      baths: num(r.Bath ?? r.Baths ?? r.Bathrooms ?? r.bathrooms),
      sqft: num(r.Property_Sqft ?? r.Sqft ?? r.sqft ?? r["Square Feet"]),

      estRent: num(r.Rent ?? r.estimatedRent ?? r["Estimated Rent"]),
      noi: num(r.NOI ?? r.noi ?? r["NOI/yr"]),
      capRate: num(r["Cap Rate"] ?? r.capRate ?? r.cap_rate),

      raw: r,
    }))
    .filter((x) => x.address || x.price || x.beds || x.baths || x.sqft);
}
