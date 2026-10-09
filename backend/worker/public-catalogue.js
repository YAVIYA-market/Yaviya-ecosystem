import { publicCampaigns } from './admin-content.js';
import { approvedRole } from './account-roles.js';
// Only approved, visible product data. No account or order identifiers are public.
export async function handlePublicCatalogue(request, env) {
  if (request.method !== "GET")
    return Response.json({ error: "Méthode non autorisée" }, { status: 405 });
  const country = new URL(request.url).searchParams.get("country") || "CD";
  if (!["CD", "CG"].includes(country))
    return Response.json({ error: "Marché invalide" }, { status: 400 });
  const rows = (
    await env.DB.prepare(
      "SELECT data,stock FROM market_products p WHERE country=? AND NOT EXISTS (SELECT 1 FROM account_controls a WHERE a.user_id=p.owner_user_id AND a.suspended=1)",
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
          "sellerKind",
          "condition",
          "rating",
        ]
          .filter((k) => p[k] !== undefined)
          .map((k) => [k, p[k]]),
      ),
    );
  const storeRows=(await env.DB.prepare('SELECT s.id,s.name,s.country,s.user_id FROM owned_stores s LEFT JOIN account_controls a ON a.user_id=s.user_id WHERE s.country=? AND COALESCE(a.suspended,0)=0').bind(country).all()).results;
  const stores=[];
  for(const row of storeRows) if(await approvedRole(env,row.user_id,'seller')) stores.push({id:row.id+10000,name:row.name,country:row.country,reviewed:true});
  return Response.json(
    { catalogue, stores, campaigns:await publicCampaigns(env,country) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
