export async function publicCampaigns(env,country) {
 const rows=(await env.DB.prepare("SELECT id,data FROM admin_content WHERE country=? AND kind='advertisement' ORDER BY updated_at DESC LIMIT 30").bind(country).all()).results;
 return rows.map(r=>({id:r.id,...JSON.parse(r.data)})).filter(r=>r.enabled===true).map(r=>({id:r.id,title:r.title,image:r.image}));
}
