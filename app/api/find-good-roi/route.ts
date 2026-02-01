import { NextResponse } from "next/server";
import { loadListings } from "@/lib/loadListings";

type PriceBucket = "any" | "200-500" | "500-1000" | "1000+";
type SortBy = "cap" | "priceLow" | "noiHigh";

const HARD_MIN_PRICE = 200000; // ✅ never show below this

function num(v: any): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseLocation(address: string) {
  if (!address) return { city: "Unknown", province: "Unknown", country: "Unknown" };

  const parts = String(address)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const country = "Canada";

  const last = parts[parts.length - 1] || "";
  const provMatch = last.match(/\b(BC|AB|SK|MB|ON|QC|NB|NS|NL|PE|NT|NU|YT)\b/i);
  const province = provMatch ? provMatch[1].toUpperCase() : "Unknown";

  const first = parts[0] || "";
  const looksLikeStreet =
    /\d/.test(first) ||
    /\b(ave|avenue|st|street|rd|road|blvd|boulevard|dr|drive|way|lane|ln|pl|place|cres|court|ct)\b/i.test(
      first
    );

  let city = "Unknown";
  if (looksLikeStreet && parts[1]) city = parts[1];
  else if (parts[0]) city = parts[0];

  return { city, province, country };
}

function inPriceBucket(price: number | null, bucket: PriceBucket) {
  if (bucket === "any") return true;
  if (price == null) return false;
  if (bucket === "200-500") return price >= 200000 && price <= 500000;
  if (bucket === "500-1000") return price >= 500000 && price <= 1000000;
  if (bucket === "1000+") return price >= 1000000;
  return true;
}

function parseMinIntParam(v: string | null): number | null {
  if (!v || v === "any") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * GET /api/find-good-roi
 * Server-side pagination + filtering for fast UI.
 * Enforces:
 *  - price >= 200000
 *  - beds > 0
 *  - baths > 0
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const country = url.searchParams.get("country") || "any";
    const province = url.searchParams.get("province") || "any";
    const city = url.searchParams.get("city") || "any";

    const priceBucket = (url.searchParams.get("priceBucket") || "any") as PriceBucket;
    const minCap = Number(url.searchParams.get("minCap") || "0");
    const sortBy = (url.searchParams.get("sortBy") || "cap") as SortBy;

    const minBeds = parseMinIntParam(url.searchParams.get("minBeds"));
    const minBaths = parseMinIntParam(url.searchParams.get("minBaths"));

    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize") || "50")));

    const all = loadListings();

    // ✅ FULL options from ALL data (never shrink)
    const provSetAll = new Set<string>();
    const citySetAll = new Set<string>();
    for (const x of all as any[]) {
      const loc = parseLocation(x.address || "");
      if (loc.province !== "Unknown") provSetAll.add(loc.province);
      if (loc.city !== "Unknown") citySetAll.add(loc.city);
    }

    // ✅ Filter
    let filtered = (all as any[]).filter((x) => {
      const addr = (x.address || "").toLowerCase();
      const loc = parseLocation(x.address || "");

      // ✅ HARD RULES: price + beds + baths
      const price = num(x.price);
      if (price == null || price < HARD_MIN_PRICE) return false;

      const beds = num(x.beds);
      if (beds == null || beds <= 0) return false;

      const baths = num(x.baths);
      if (baths == null || baths <= 0) return false;

      // query
      if (q && !addr.includes(q)) return false;

      // location filters
      if (country !== "any" && loc.country !== country) return false;
      if (province !== "any" && loc.province !== province) return false;
      if (city !== "any" && loc.city !== city) return false;

      // price bucket
      if (!inPriceBucket(price, priceBucket)) return false;

      // cap rate filter
      if (minCap > 0) {
        const cr = num(x.capRate);
        if (cr == null || cr < minCap) return false;
      }

      // beds/baths minimums
      if (minBeds != null && beds < minBeds) return false;
      if (minBaths != null && baths < minBaths) return false;

      return true;
    });

    // ✅ Sort
    filtered.sort((a, b) => {
      if (sortBy === "cap") return (num(b.capRate) ?? -999) - (num(a.capRate) ?? -999);
      if (sortBy === "priceLow") return (num(a.price) ?? 9e18) - (num(b.price) ?? 9e18);
      if (sortBy === "noiHigh") return (num(b.noi) ?? -999) - (num(a.noi) ?? -999);
      return 0;
    });

    // ✅ Pagination
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);

    const start = (safePage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return NextResponse.json({
      items,
      total,
      totalPages,
      page: safePage,
      pageSize,

      // full lists (never filtered)
      provinceOptions: Array.from(provSetAll).sort(),
      cityOptions: Array.from(citySetAll).sort((a, b) => a.localeCompare(b)),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "GET /api/find-good-roi failed", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/find-good-roi
 * Keeps your older behavior. Also enforces:
 *  - price >= 200000
 *  - beds > 0
 *  - baths > 0
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const minPriceFromUser = Number(body.minPrice ?? HARD_MIN_PRICE);
    const minPrice = Math.max(minPriceFromUser, HARD_MIN_PRICE);

    const capRateMin = Number(body.capRateMin ?? 6);
    const limit = Math.min(Number(body.limit ?? 50), 200);

    const listings = loadListings();

    const analyzed = (listings as any[])
      .filter((r) => {
        const p = num(r.price);
        if (p == null || p < minPrice) return false;

        const beds = num(r.beds);
        if (beds == null || beds <= 0) return false;

        const baths = num(r.baths);
        if (baths == null || baths <= 0) return false;

        return true;
      })
      .filter((r) => {
        const cr = num(r.capRate);
        return cr != null && cr >= capRateMin;
      })
      .slice(0, limit);

    return NextResponse.json({ items: analyzed, total: analyzed.length });
  } catch (err: any) {
    return NextResponse.json(
      { error: "POST /api/find-good-roi failed", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
