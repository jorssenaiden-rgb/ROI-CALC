import { loadListings } from "@/lib/loadListings";

function estimateMonthlyRent(beds: number | null, base = 1200, perBed = 700, fallbackBeds = 2) {
  const b = beds ?? fallbackBeds;
  return Math.max(0, Math.round(base + b * perBed));
}

function calcNoiAndCapRate(price: number, monthlyRent: number, annualTax: number | null) {
  const grossAnnual = monthlyRent * 12;

  const propTaxAnnual = annualTax ?? price * 0.012;
  const insuranceAnnual = 1200;
  const maintAnnual = price * 0.01;
  const vacancyAnnual = grossAnnual * 0.05;
  const mgmtAnnual = grossAnnual * 0.08;

  const expenses = propTaxAnnual + insuranceAnnual + maintAnnual + vacancyAnnual + mgmtAnnual;
  const noiAnnual = grossAnnual - expenses;
  const capRate = price > 0 ? (noiAnnual / price) * 100 : null;

  return { noiAnnual, capRate };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const area = String(body.area ?? "").trim().toLowerCase();
  const minPrice = Number(body.minPrice ?? 250000);
  const capRateMin = Number(body.capRateMin ?? 6);
  const limit = Math.min(Number(body.limit ?? 50), 200);

  const rentBase = Number(body.rentBase ?? 1200);
  const rentPerBed = Number(body.rentPerBed ?? 700);
  const rentFallbackBeds = Number(body.rentFallbackBeds ?? 2);

  const listings = loadListings();

  const analyzed = listings
    .filter((r) => (r.Price_Listing ?? 0) >= minPrice)
    .filter((r) => {
      if (!area) return true;
      return String(r.Location ?? "").toLowerCase().includes(area);
    })
    .map((r) => {
      const price = r.Price_Listing ?? null;
      if (!price) return null;

      const estimatedRent = estimateMonthlyRent(r.Bed, rentBase, rentPerBed, rentFallbackBeds);
      const { noiAnnual, capRate } = calcNoiAndCapRate(price, estimatedRent, r.Property_Tax);

      return {
        Location: r.Location,
        Property_Type: r.Property_Type,
        Price_Listing: price,
        Property_Sqft: r.Property_Sqft,
        Property_Tax: r.Property_Tax,
        Bed: r.Bed,
        Bath: r.Bath,
        estimatedRent,
        noiAnnual,
        capRate,
        meetsTarget: (capRate ?? -Infinity) >= capRateMin,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => (b.capRate ?? -Infinity) - (a.capRate ?? -Infinity));

  const good = analyzed.filter((x: any) => x.meetsTarget).slice(0, limit);

  return Response.json({
    area: area || null,
    minPrice,
    capRateMin,
    scanned: listings.length,
    returned: good.length,
    results: good,
  });
}
