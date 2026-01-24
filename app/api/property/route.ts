import * as cheerio from "cheerio";

type Extracted = {
  purchasePrice: number | null;
  squareFeet: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  address: string | null;
  estimatedRent: number | null;
};

function toNumber(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s = String(v)
    .replace(/[$,]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Handle things like "1,234 sqft" or "CAD 450000"
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;

  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function pickJsonLd($: cheerio.CheerioAPI): any[] {
  const out: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const txt = $(el).text().trim();
    if (!txt) return;
    try {
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {
      // ignore invalid JSON-LD
    }
  });
  return out;
}

function extractFromJsonLd(blocks: any[]): Partial<Extracted> {
  for (const b of blocks) {
    const type = b?.["@type"];
    const types = Array.isArray(type) ? type : [type];

    const isListingLike =
      types.some((t: string) =>
        ["Product", "Offer", "SingleFamilyResidence", "House", "Apartment", "Residence", "RealEstateListing"].includes(t)
      ) ||
      b?.offers ||
      b?.address;

    if (!isListingLike) continue;

    const addr =
      b?.address?.streetAddress
        ? `${b.address.streetAddress}, ${b.address.addressLocality ?? ""} ${b.address.addressRegion ?? ""} ${b.address.postalCode ?? ""}`
            .replace(/\s+/g, " ")
            .trim()
        : typeof b?.address === "string"
          ? b.address
          : null;

    const price =
      toNumber(b?.offers?.price) ??
      toNumber(b?.offers?.lowPrice) ??
      toNumber(b?.price);

    const beds = toNumber(b?.numberOfRooms) ?? toNumber(b?.bedrooms);
    const baths = toNumber(b?.numberOfBathroomsTotal) ?? toNumber(b?.bathrooms);

    const sqft =
      toNumber(b?.floorSize?.value) ??
      toNumber(b?.floorSize) ??
      toNumber(b?.area?.value);

    return {
      purchasePrice: price,
      bedrooms: beds,
      bathrooms: baths,
      squareFeet: sqft,
      address: addr ?? null,
    };
  }
  return {};
}

function extractFromMeta($: cheerio.CheerioAPI): Partial<Extracted> {
  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";
  const title = $("title").text() || "";

  const text = `${ogTitle} ${ogDesc} ${title}`;

  const mPrice = text.match(/\$[\s]*([\d,]{3,})/);
  const purchasePrice = mPrice ? toNumber(mPrice[1]) : null;

  // Very light address fallback (often unreliable)
  const address = ogTitle?.trim() || null;

  return { purchasePrice, address };
}

function pickNextData($: cheerio.CheerioAPI): any | null {
  const txt = $("#__NEXT_DATA__").text().trim();
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function deepFind(obj: any, keys: string[]): { key: string; value: any; context: any }[] {
  const found: { key: string; value: any; context: any }[] = [];
  const seen = new Set<any>();

  function walk(x: any) {
    if (!x || typeof x !== "object") return;
    if (seen.has(x)) return;
    seen.add(x);

    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(x, k) && x[k] != null) {
        found.push({ key: k, value: x[k], context: x });
      }
    }

    if (Array.isArray(x)) {
      for (const item of x) walk(item);
    } else {
      for (const k of Object.keys(x)) walk(x[k]);
    }
  }

  walk(obj);
  return found;
}

function extractFromRemaxNextData(nextData: any): Partial<Extracted> {
  if (!nextData) return {};

  // Add extra common keys seen in Next.js listing blobs
  const candidates = deepFind(nextData, [
    "price",
    "listPrice",
    "listingPrice",
    "currentPrice",
    "formattedPrice",
    "beds",
    "bedrooms",
    "baths",
    "bathrooms",
    "bathroomsFull",
    "bathroomsHalf",
    "squareFeet",
    "sqft",
    "livingArea",
    "lotSize",
    "address",
    "fullAddress",
    "streetAddress",
    "street",
    "city",
    "state",
    "province",
    "postalCode",
    "zip",
    "zipCode",
  ]);

  const bestNumber = (keyNames: string[]) => {
    for (const c of candidates) {
      if (!keyNames.includes(c.key)) continue;
      const n = toNumber(c.value);
      if (typeof n === "number") return n;
    }
    return null;
  };

  const purchasePrice =
    bestNumber(["listPrice", "listingPrice", "currentPrice", "price"]) ?? null;

  const bedrooms =
    bestNumber(["beds", "bedrooms"]) ?? null;

  // Bathrooms sometimes split; try totals first, then add full+half if present
  let bathrooms =
    bestNumber(["baths", "bathrooms"]) ?? null;

  if (bathrooms == null) {
    const full = bestNumber(["bathroomsFull"]);
    const half = bestNumber(["bathroomsHalf"]);
    if (full != null || half != null) bathrooms = (full ?? 0) + (half ?? 0) * 0.5;
  }

  const squareFeet =
    bestNumber(["squareFeet", "sqft", "livingArea"]) ?? null;

  // Address building
  let address: string | null = null;

  const addrObj = candidates.find(c => c.key === "address")?.value;
  if (addrObj && typeof addrObj === "object") {
    const street = addrObj.streetAddress || addrObj.street || "";
    const city = addrObj.addressLocality || addrObj.city || "";
    const region = addrObj.addressRegion || addrObj.state || addrObj.province || "";
    const postal = addrObj.postalCode || addrObj.zip || addrObj.zipCode || "";
    const assembled = `${street}, ${city} ${region} ${postal}`.replace(/\s+/g, " ").trim();
    if (assembled && assembled !== ",") address = assembled;
  }

  if (!address) {
    const full =
      candidates.find(c => c.key === "fullAddress")?.value ??
      candidates.find(c => c.key === "streetAddress")?.value;
    if (typeof full === "string" && full.trim()) address = full.trim();
  }

  return { purchasePrice, bedrooms, bathrooms, squareFeet, address };
}

export async function POST(req: Request) {
  const { url } = await req.json().catch(() => ({ url: null }));

  if (!url || typeof url !== "string") {
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    const empty: Extracted = {
      purchasePrice: null,
      squareFeet: null,
      bedrooms: null,
      bathrooms: null,
      address: null,
      estimatedRent: null,
    };
    return Response.json({ ...empty, _note: `Fetch failed (${res.status})` });
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const jsonLd = pickJsonLd($);
  const fromLd = extractFromJsonLd(jsonLd);

  const nextData = pickNextData($);
  const fromRemax = extractFromRemaxNextData(nextData);

  const fromMeta = extractFromMeta($);

  const extracted: Extracted = {
    purchasePrice: fromLd.purchasePrice ?? fromRemax.purchasePrice ?? fromMeta.purchasePrice ?? null,
    squareFeet: fromLd.squareFeet ?? fromRemax.squareFeet ?? null,
    bedrooms: fromLd.bedrooms ?? fromRemax.bedrooms ?? null,
    bathrooms: fromLd.bathrooms ?? fromRemax.bathrooms ?? null,
    address: fromLd.address ?? fromRemax.address ?? fromMeta.address ?? null,
    estimatedRent: null,
  };

  return Response.json({
    ...extracted,
    _debug: {
      hasJsonLd: jsonLd.length > 0,
      hasNextData: Boolean(nextData),
      usedJsonLd: Boolean(fromLd.purchasePrice || fromLd.address),
      usedNextData: Boolean(fromRemax.purchasePrice || fromRemax.address),
      usedMeta: Boolean(fromMeta.purchasePrice || fromMeta.address),
    },
  });
}
