// Only approved, visible product data. No account or order identifiers are public.
export async function handlePublicCatalogue(request, env) {
  if (request.method !== "GET")
    return Response.json({ error: "Méthode non autorisée" }, { status: 405 });
  const country = new URL(request.url).searchParams.get("country") || "CD";
  if (!["CD", "CG"].includes(country))
    return Response.json({ error: "Marché invalide" }, { status: 400 });
  const rows = (
    await env.DB.prepare(
      "SELECT data,stock FROM market_products WHERE country=?",
    )
      .bind(country)
      .all()
  ).results;
  const catalogue = rows
    .map((row) => ({ ...JSON.parse(row.data), stock: row.stock }))
    .filter((p) => p.visible === true && p.approved === true)
    .map((p) =>
      Object.fromEntries(
        [
          "id",
          "seller",
          "title",
          "category",
          "subcategory",
          "price",
          "regularPrice",
          "stock",
          "visible",
          "approved",
          "img",
          "images",
          "desc",
          "family",
          "rating",
        ]
          .filter((k) => p[k] !== undefined)
          .map((k) => [k, p[k]]),
      ),
    );
  const stores = (
    await env.DB.prepare(
      "SELECT s.id,s.name,s.country FROM owned_stores s JOIN identity_checks i ON i.user_id=s.user_id WHERE s.country=? AND i.status=?",
    )
      .bind(country, "approved")
      .all()
  ).results.map((s) => ({
    id: s.id + 10000,
    name: s.name,
    country: s.country,
    reviewed: true,
  }));
  return Response.json(
    { catalogue, stores },
    { headers: { "Cache-Control": "no-store" } },
  );
}
