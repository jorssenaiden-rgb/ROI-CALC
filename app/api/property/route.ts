export async function POST(req: Request) {
  const { url } = await req.json().catch(() => ({ url: null }));

  return Response.json({
    purchasePrice: 425000,
    squareFeet: 1800,
    bedrooms: 3,
    bathrooms: 2,
    address: url ? `Mocked from URL: ${url}` : "123 Example St, Austin, TX",
    estimatedRent: 2900,
  });
}
