import { NextResponse } from "next/server";
import { loadListings } from "@/lib/loadListings";

// This should match your hard rules in find-good-roi
const HARD_MIN_PRICE = 200000;

function num(v: any): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseLocation(address: string) {
  if (!address) return { city: "Unknown", province: "Unknown", country: "Unknown" };
  const parts = String(address).split(",").map((s) => s.trim()).filter(Boolean);
  const country = "Canada";
  const last = parts[parts.length - 1] || "";
  const provMatch = last.match(/\b(BC|AB|SK|MB|ON|QC|NB|NS|NL|PE|NT|NU|YT)\b/i);
  const province = provMatch ? provMatch[1].toUpperCase() : "Unknown";

  const first = parts[0] || "";
  const looksLikeStreet =
    /\d/.test(first) ||
    /\b(ave|avenue|st|street|rd|road|blvd|boulevard|dr|drive|way|lane|ln|pl|place|cres|court|ct)\b/i.test(first);

  let city = "Unknown";
  if (looksLikeStreet && parts[1]) city = parts[1];
  else if (parts[0]) city = parts[0];

  return { city, province, country };
}

function avg(nums: number[]) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const country = url.searchParams.get("country") || "any";
    const province = url.searchParams.get("province") || "any";
    const city = url.searchParams.get("city") || "any";

    const all = loadListings();

    const filtered = (all as any[])
      .filter((x) => {
        const loc = parseLocation(x.address || "");
        const price = num(x.price);
        const beds = num(x.beds);
        const baths = num(x.baths);

        if (price == null || price < HARD_MIN_PRICE) return false;
        if (beds == null || beds <= 0) return false;
        if (baths == null || baths <= 0) return false;

        if (country !== "any" && loc.country !== country) return false;
        if (province !== "any" && loc.province !== province) return false;
        if (city !== "any" && loc.city !== city) return false;

        return true;
      });

    const capRates = filtered.map((x) => num(x.capRate)).filter((v): v is number => v != null);
    const prices = filtered.map((x) => num(x.price)).filter((v): v is number => v != null);
    const rents = filtered.map((x) => num(x.estRent)).filter((v): v is number => v != null);

    return NextResponse.json({
      count: filtered.length,
      avgCapRate: avg(capRates),
      avgPrice: avg(prices),
      avgRent: avg(rents),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "GET /api/market-summary failed", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
