import { NextResponse } from "next/server";
import { loadListings } from "@/lib/loadListings";

type PriceBucket = "any" | "200-500" | "500-1000" | "1000+";
type SortBy = "cap" | "priceLow" | "noiHigh";

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

export async function GET(req: Request) {
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

  const all = loadListings();

  let filtered = all.filter((x: any) => {
    const addr = (x.address || "").toLowerCase();
    const loc = parseLocation(x.address || "");

    if (q && !addr.includes(q)) return false;

    if (country !== "any" && loc.country !== country) return false;
    if (province !== "any" && loc.province !== province) return false;
    if (city !== "any" && loc.city !== city) return false;

    if (!inPriceBucket(x.price ?? null, priceBucket)) return false;

    if (minCap > 0) {
      const cr = Number(x.capRate);
      if (!Number.isFinite(cr) || cr < minCap) return false;
    }

    return true;
  });

  filtered.sort((a: any, b: any) => {
    if (sortBy === "cap") return (Number(b.capRate) || -999) - (Number(a.capRate) || -999);
    if (sortBy === "priceLow") return (a.price ?? 9e18) - (b.price ?? 9e18);
    if (sortBy === "noiHigh") return (b.noi ?? -999) - (a.noi ?? -999);
    return 0;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  // Options for dropdowns (based on filtered set)
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
}
