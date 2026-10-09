import { sensitiveRateLimit } from "./rate-limit.js";
import worker from "./worker/index.js";
import { authenticatedUser, handleAuth } from "./auth.js";
import { createPrivateFiles } from "./database.js";

export function createApplication(db) {
  const env = { DB: db, IDENTITY_FILES: createPrivateFiles(db) };
  return async (request) => {
    try {
      const url = new URL(request.url);
      const limited = await sensitiveRateLimit(request);
      if (limited) return limited;
      if (url.pathname.startsWith("/api/auth/"))
        return await handleAuth(request, db);
      const user = await authenticatedUser(request, db);
      if (user && (db.dialect === "postgres" || process.env.NODE_ENV === "production" || process.env.VERCEL || process.env.REQUIRE_ADMIN_MFA === "1") && !["/api/customer", "/api/catalogue", "/api/coupons"].includes(url.pathname)) {
        const admin = await db.prepare("SELECT user_id FROM admin_access WHERE user_id=?").bind(user.id).first();
        if (admin) {
          const mfa = await db.prepare("SELECT enabled FROM auth_mfa WHERE user_id=?").bind(user.id).first();
          if (!mfa?.enabled) return Response.json({ error: "Activez la double authentification dans Profil → Paramètres → Sécurité du compte avant d’accéder à l’administration.", code: "ADMIN_MFA_REQUIRED" }, { status: 403 });
        }
      }
      if (user) {
        const target = url.searchParams.get('country') === 'CG' ? 'cg:' + user.id : user.id;
        const control = await db.prepare('SELECT suspended FROM account_controls WHERE user_id=?').bind(target).first();
        if (control?.suspended) return Response.json({error:'Votre compte est suspendu. Contactez le service client.'},{status:403});
      }
      const headers = new Headers(request.headers);
      // Never trust an identity supplied by the browser or another proxy.
      for (const key of [
        "yaviya-user-id",
        "yaviya-user-email",
        "oai-authenticated-user-id",
        "oai-authenticated-user-email",
      ])
        headers.delete(key);
      if (user) headers.set("yaviya-user-id", user.id);
      // Administrator access is provisioned explicitly, never granted by signup/email.
      const response=await worker.fetch(new Request(request, { headers }), env);
      if(user && request.method !== 'GET' && response.ok) {
        try {
          await db.prepare('INSERT INTO audit_events(id,actor_user_id,country,action,target,detail,created_at) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),headers.get('yaviya-user-id'),url.searchParams.get('country')==='CG'?'CG':'CD',request.method+' '+url.pathname,url.pathname,JSON.stringify({httpStatus:response.status}),Date.now()).run();
        } catch(error) { console.error('Action audit write failed',error.message); }
      }
      return response;
    } catch (error) {
      console.error("YAVIYA request failed", error.message);
      return Response.json(
        { error: "Service temporairement indisponible" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
}
