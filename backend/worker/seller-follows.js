import { handlePublicCatalogue } from './public-catalogue.js';
import { seedShops, seedShopsCG } from './catalogue-seeds.js';
const json = (value, status = 200) => Response.json(value, {status, headers:{'Cache-Control':'no-store'}});
export async function handleSellerFollows(request, env) {
  const url = new URL(request.url), country = url.searchParams.get('country') || 'CD';
  if (!['CD','CG'].includes(country)) return json({error:'Marché invalide.'},400);
  const user = request.headers.get('yaviya-user-id');
  if (!user) return json({error:'Connectez-vous pour suivre une boutique.'},401);
  if (!['GET','POST'].includes(request.method)) return json({error:'Méthode non autorisée.'},405);
  try {
    if (request.method === 'POST') {
      if (request.headers.get('origin') !== url.origin) return json({error:'Origin rejected'},403);
      const body = await request.json();
      if (!Number.isSafeInteger(body.sellerId) || body.sellerId < 1 || typeof body.follow !== 'boolean') return json({error:'Boutique invalide.'},400);
      if (body.follow) {
        const profile = await env.DB.prepare('SELECT user_id FROM customers WHERE user_id=?').bind(user).first();
        if (!profile) return json({error:'Complétez votre profil avant de suivre une boutique.'},409);
        const publicData = await (await handlePublicCatalogue(new Request(url),env)).json();
        const stores = [...(country === 'CG' ? seedShopsCG : seedShops),...publicData.stores];
        if (!stores.some(s => s.id === body.sellerId)) return json({error:'Cette boutique n’est pas disponible.'},404);
        await env.DB.prepare('INSERT INTO seller_follows (country,buyer_user_id,seller_id,followed_at) VALUES (?,?,?,?) ON CONFLICT(country,buyer_user_id,seller_id) DO NOTHING').bind(country,user,body.sellerId,Date.now()).run();
      } else await env.DB.prepare('DELETE FROM seller_follows WHERE country=? AND buyer_user_id=? AND seller_id=?').bind(country,user,body.sellerId).run();
    }
    const follows = (await env.DB.prepare('SELECT seller_id AS sellerId,followed_at AS followedAt FROM seller_follows WHERE country=? AND buyer_user_id=? ORDER BY followed_at DESC').bind(country,user).all()).results;
    const counts = (await env.DB.prepare('SELECT seller_id AS sellerId,COUNT(*) AS followerCount FROM seller_follows WHERE country=? GROUP BY seller_id').bind(country).all()).results;
    return json({follows,counts});
  } catch (error) {
    console.error('Seller following unavailable',error);
    return json({error:'Le suivi des boutiques est momentanément indisponible.'},503);
  }
}
