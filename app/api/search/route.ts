export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  return Response.json([
    {
      address: `456 Investment Ave (${body.location ?? "Unknown"})`,
      purchasePrice: 390000,
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1650,
      estimatedRent: 2800,
      url: "https://example.com/listing",
      listingSource: "Mock",
    },
    {
      address: `789 Cashflow Rd (${body.location ?? "Unknown"})`,
      purchasePrice: 410000,
      bedrooms: 4,
      bathrooms: 3,
      squareFeet: 2100,
      estimatedRent: 3200,
      url: "https://example.com/listing2",
      listingSource: "Mock",
    },
  ]);
}
