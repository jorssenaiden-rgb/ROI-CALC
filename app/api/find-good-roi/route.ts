import { NextResponse } from "next/server";
import { loadListings } from "@/lib/loadListings";

/** ---------- Helpers shared by GET + POST ---------- */

type PriceBucket = "any" | "200-500" | "500-1000" | "1000+";
type SortBy = "cap" | "priceLow" | "noiHigh";

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

/** ---------- NEW: GET (used by OpeningScreen) ---------- */
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

    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize") || "50")));

    // Load your normalized listings (address/price/beds/etc) from lib/loadListings.ts
    const all = loadListings();

    let filtered = all.filter((x: any) => {
      const addr = (x.address || "").toLowerCase();
      const loc = parseLocation(x.address || "");

      if (q && !addr.includes(q)) return false;

      if (country !== "any" && loc.country !== country) return false;
      if (province !== "any" && loc.province !== province) return false;
      if (city !== "any" && loc.city !== city) return false;

      if (!inPriceBucket(num(x.price), priceBucket)) return false;

      if (minCap > 0) {
        const cr = num(x.capRate);
        if (cr == null || cr < minCap) return false;
      }

      return true;
    });

    filtered.sort((a: any, b: any) => {
      if (sortBy === "cap") return (num(b.capRate) ?? -999) - (num(a.capRate) ?? -999);
      if (sortBy === "priceLow") return (num(a.price) ?? 9e18) - (num(b.price) ?? 9e18);
      if (sortBy === "noiHigh") return (num(b.noi) ?? -999) - (num(a.noi) ?? -999);
      return 0;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);

    const start = (safePage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    // Dropdown options (based on filtered set)
    const provSet = new Set<string>();
    const citySet = new Set<string>();
    for (const x of filtered) {
      const loc = parseLocation(x.address || "");
      if (loc.province !== "Unknown") provSet.add(loc.province);
      if (loc.city !== "Unknown") citySet.add(loc.city);
    }

    return NextResponse.json({
      items,
      total,
      totalPages,
      page: safePage,
      pageSize,
      provinceOptions: Array.from(provSet).sort(),
      cityOptions: Array.from(citySet).sort((a, b) => a.localeCompare(b)),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "GET /api/find-good-roi failed", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

/** ---------- KEEP: POST (your older endpoint behavior) ---------- */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Keep your old params
    const minPrice = Number(body.minPrice ?? 250000);
    const capRateMin = Number(body.capRateMin ?? 6);
    const limit = Math.min(Number(body.limit ?? 50), 200);

    // This assumes your loadListings() returns the normalized objects
    const listings = loadListings();

    // If your old logic depended on raw XLSX fields,
    // you should update it to use normalized fields instead.
    const analyzed = listings
      .filter((r: any) => (num(r.price) ?? 0) >= minPrice)
      .filter((r: any) => {
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
