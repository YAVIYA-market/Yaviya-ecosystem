import { approvedRole, preserveLegacyRoles } from './account-roles.js';
import { approvedIdentity } from "./identity-complete.js";
import marketConfig from "../data/market-config.json" with { type: "json" };
import { accountIdentifiers } from "./account-identifiers.js";
const json = (v, status = 200) =>
  Response.json(v, { status, headers: { "Cache-Control": "no-store" } });
const baseUser = (id) => (id.startsWith("cg:") ? id.slice(3) : id);
export async function handleVerification(request, env) {
  const url = new URL(request.url),
    user = request.headers.get("yaviya-user-id");
  if (!user) return json({ error: "Sign in required" }, 401);
  if (request.method !== "GET" && request.headers.get("origin") !== url.origin)
    return json({ error: "Origin rejected" }, 403);
  try {
    const admin = await env.DB.prepare(
      "SELECT user_id FROM admin_access WHERE id=?",
    )
      .bind("owner")
      .first();
    const isAdmin = admin?.user_id === baseUser(user);
    const path = url.pathname;
    if (path === "/api/verification/bootstrap") {
      if (request.method !== "POST")
        return json({ error: "Method not allowed" }, 405);
      return admin
        ? json({ isAdmin })
        : json(
            {
              error:
                "Administrator must be provisioned by the deployment owner",
            },
            403,
          );
    }
    if (path === "/api/verification/reviews") {
      if (!isAdmin) return json({ error: "Administrator only" }, 403);
      if (request.method === "GET") {
        const result = await env.DB.prepare(
          "SELECT i.user_id AS userId,i.kind,i.company_name AS companyName,i.company_rcm AS companyRcm,i.unregistered,i.seller_plan AS sellerPlan,i.courier_plan AS courierPlan,i.document_mime AS documentMime,i.issuing_country AS issuingCountry,i.document_type AS documentType,i.file_name AS fileName,i.status,i.note,i.submitted_at AS submittedAt,c.name,c.phone FROM identity_checks i JOIN customers c ON c.user_id=i.user_id ORDER BY i.submitted_at DESC",
        ).all();
        const rows = [];
        for (const row of result.results) {
          const ids = await accountIdentifiers(env, row.userId, row.kind);
          rows.push({ ...row, publicId: ids.accountId });
        }
        const archives=(await env.DB.prepare('SELECT r.user_id,r.role,r.status,r.verification,c.name,c.phone FROM account_roles r JOIN customers c ON c.user_id=r.user_id').all()).results;
        for(const archive of archives) {
          if(rows.some(row=>row.userId===archive.user_id && row.kind===archive.role)) continue;
          const check=JSON.parse(archive.verification),ids=await accountIdentifiers(env,archive.user_id,archive.role);
          rows.push({userId:archive.user_id,kind:archive.role,status:archive.status,companyName:check.company_name,companyRcm:check.company_rcm,unregistered:check.unregistered,sellerPlan:check.seller_plan,courierPlan:check.courier_plan,documentMime:check.document_mime,issuingCountry:check.issuing_country,documentType:check.document_type,fileName:check.file_name,submittedAt:check.submitted_at,note:check.note || '',name:archive.name,phone:archive.phone,publicId:ids.accountId});
        }
        return json(rows);
      }
      if (request.method !== "POST")
        return json({ error: "Method not allowed" }, 405);
      const d = await request.json();
      if (
        typeof d.userId !== "string" ||
        !["approve", "reject"].includes(d.decision)
      )
        return json({ error: "Invalid decision" }, 400);
      const check = await env.DB.prepare(
        "SELECT * FROM identity_checks WHERE user_id=?",
      )
        .bind(d.userId)
        .first();
      if (!check) return json({ error: "Request not found" }, 404);
      if (check.status !== "pending")
        return json({ error: "Request already reviewed" }, 409);
      if (
        d.decision === "approve" &&
        (d.identityChecked !== true ||
          !["image/jpeg", "image/png"].includes(check.document_mime) ||
          !marketConfig.identityCountries.some(
            (c) => c.code === check.issuing_country,
          ) ||
          (check.document_type === "licence-c" && check.kind !== "courier") ||
          (check.kind === "seller" && d.companyChecked !== true))
      )
        return json(
          { error: "Confirm document and company verification" },
          400,
        );
      if (
        d.decision === "reject" &&
        (typeof d.note !== "string" || !d.note.trim())
      )
        return json({ error: "Provide a rejection reason" }, 400);
      const note = typeof d.note === "string" ? d.note.slice(0, 500) : "";
      const statements = [
        env.DB.prepare(
          "UPDATE identity_checks SET status=?,note=?,reviewed_at=? WHERE user_id=? AND status=? AND submitted_at=? AND object_key=?",
        ).bind(
          d.decision === "approve" ? "approved" : "rejected",
          note,
          Date.now(),
          d.userId,
          "pending",
          check.submitted_at,
          check.object_key,
        ),
      ];
      if (d.decision === "approve" && check.kind === "seller")
        statements.push(
          env.DB.prepare(
            "INSERT INTO owned_stores (user_id,name,country,address) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM owned_stores WHERE user_id=?)",
          ).bind(
            d.userId,
            check.company_name,
            d.userId.startsWith("cg:") ? "CG" : "CD",
            check.activity_address || "",
            d.userId,
          ),
        );
      if (d.decision === 'approve') statements.push(env.DB.prepare('INSERT INTO account_roles(user_id,role,status,verification,updated_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM identity_checks WHERE user_id=? AND kind=? AND status=?) ON CONFLICT(user_id,role) DO UPDATE SET status=excluded.status,verification=excluded.verification,updated_at=excluded.updated_at').bind(d.userId,check.kind,'approved',JSON.stringify({...check,status:'approved'}),Date.now(),d.userId,check.kind,'approved'));
      const result = await env.DB.batch(statements);
      if (!result[0].meta.changes) return json({error:'Dossier déjà traité'},409);
      return json({ ok: true });
    }
    if (path === "/api/verification/document") {
      if (request.method !== "GET")
        return json({ error: "Method not allowed" }, 405);
      const target = url.searchParams.get("userId") || user;
      if (target !== user && !isAdmin)
        return json({ error: "Access denied" }, 403);
      let row = await env.DB.prepare(
        "SELECT object_key,kind FROM identity_checks WHERE user_id=?",
      )
        .bind(target)
        .first();
      const kind=url.searchParams.get('kind');
      if(kind && !['seller','courier'].includes(kind)) return json({error:'Rôle invalide'},400);
      if(kind && row?.kind!==kind) {
        const archive=await env.DB.prepare('SELECT verification FROM account_roles WHERE user_id=? AND role=?').bind(target,kind).first();
        row=archive?JSON.parse(archive.verification):null;
      }
      if (!row) return json({ error: "Not found" }, 404);
      const object = await env.IDENTITY_FILES.get(row.object_key);
      if (!object) return json({ error: "Not found" }, 404);
      return new Response(object.body, {
        headers: {
          "Content-Type":
            object.httpMetadata?.contentType || "application/octet-stream",
          "Content-Disposition": 'attachment; filename="identity-document"',
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (path !== "/api/verification") return json({ error: "Not found" }, 404);
    if (request.method === "GET") {
      const check = await env.DB.prepare(
        "SELECT kind,company_name AS companyName,company_rcm AS companyRcm,unregistered,seller_plan AS sellerPlan,courier_plan AS courierPlan,document_mime AS documentMime,issuing_country AS issuingCountry,document_type AS documentType,file_name AS fileName,status,note,submitted_at AS submittedAt FROM identity_checks WHERE user_id=?",
      )
        .bind(user)
        .first();
      const profile = await env.DB.prepare(
        "SELECT account_type,address FROM customers WHERE user_id=?",
      )
        .bind(user)
        .first();
      const activeCheck = check;
      const stores = await approvedRole(env,user,"seller")
        ? (
            await env.DB.prepare(
              "SELECT id,name,country FROM owned_stores WHERE user_id=?",
            )
              .bind(user)
              .all()
          ).results
        : [];
      return json({ check: activeCheck, stores, isAdmin });
    }
    if (request.method !== "POST")
      return json({ error: "Method not allowed" }, 405);
    const profile = await env.DB.prepare(
      "SELECT account_type,address FROM customers WHERE user_id=?",
    )
      .bind(user)
      .first();
    if (!profile)
      return json({ error: "Create a seller or courier profile first" }, 403);
    const form = await request.formData(),
      kind = String(form.get("kind") || profile.account_type),
      activityAddress = String(form.get("activityAddress") || profile.address || "").trim(),
      companyName = String(form.get("companyName") || "").trim(),
      companyRcm = String(form.get("companyRcm") || "").trim(),
      documentType = String(form.get("documentType") || ""),
      issuingCountry = String(form.get("issuingCountry") || ""),
      file = form.get("document"),
      unregistered = kind === "seller" && form.get("unregistered") === "true",
      sellerPlan = String(form.get("sellerPlan") || "free"),
      courierPlan = String(form.get("courierPlan") || "standard");
    if (!['seller','courier'].includes(kind)) return json({error:'Choisissez vendeur ou livreur'},400);
    await preserveLegacyRoles(env,user);
    const grant = await env.DB.prepare('SELECT status FROM account_roles WHERE user_id=? AND role=?').bind(user,kind).first();
    if (grant?.status === 'approved') return json({error:'Ce rôle est déjà approuvé. Contactez le support pour modifier votre identité.'},409);
    if (!activityAddress || activityAddress.length > 250) return json({error:"Confirmez l’adresse de votre activité"},400);
    if (courierPlan !== "standard")
      return json({ error: "Choose a courier plan" }, 400);
    if (kind === "courier") {
      const method = String(form.get("courierPayoutMethod") || ""),
        account = String(form.get("courierPayoutAccount") || "").trim();
      if (
        form.get("courierBenefitsAccepted") !== "true" ||
        !["mobile_money", "bank", "cash"].includes(method) ||
        account.length > 150 ||
        (method !== "cash" && !account)
      )
        return json(
          {
            error: "Read the courier benefits and complete settlement details",
          },
          400,
        );
    }
    if (
      !marketConfig.identityCountries.some((c) => c.code === issuingCountry) ||
      !["identity", "passport", "licence-b", "licence-c", "voter"].includes(
        documentType,
      ) ||
      (documentType === "licence-c" && kind !== "courier") ||
      (kind === "seller" && (!companyName || (!unregistered && !companyRcm))) ||
      companyName.length > 150 ||
      companyRcm.length > 100
    )
      return json({ error: "Complete company and identity details" }, 400);
    if (
      !["free", "plus", "premium", "business", "enterprise"].includes(
        sellerPlan,
      )
    )
      return json({ error: "Choose a seller plan" }, 400);
    const previous = await env.DB.prepare(
      "SELECT * FROM identity_checks WHERE user_id=?",
    )
      .bind(user)
      .first();
    if (previous?.status === 'pending' && previous.kind !== kind) return json({error:'Attendez le traitement du dossier en cours avant de demander un autre rôle.'},409);
    const newFile = file && typeof file.arrayBuffer === "function" && file.size;
    if (
      (!newFile &&
        (previous?.kind !== kind ||
          !["image/jpeg", "image/png"].includes(previous?.document_mime))) ||
      (newFile && file.size > 8 * 1024 * 1024)
    )
      return json({ error: "Provide a document smaller than 8 MB" }, 400);
    if (form.get("identityConfirmed") !== "true")
      return json({ error: "Confirm identity document ownership" }, 400);
    let objectKey = previous?.object_key,
      fileName = previous?.file_name,
      documentMime = previous?.document_mime;
    if (newFile) {
      const bytes = await file.arrayBuffer(),
        signature = new Uint8Array(bytes);
      const type =
        signature[0] === 255 && signature[1] === 216
          ? "image/jpeg"
          : signature[0] === 137 &&
              signature[1] === 80 &&
              signature[2] === 78 &&
              signature[3] === 71
            ? "image/png"
            : new TextDecoder().decode(signature.slice(0, 5)) === "%PDF-"
              ? "application/pdf"
              : null;
      if (!["image/jpeg", "image/png"].includes(type) || type !== file.type)
        return json({ error: "Use a valid JPG or PNG identity photo" }, 400);
      documentMime = type;
      objectKey = "identity/" + crypto.randomUUID();
      fileName = file.name.slice(0, 150);
      await env.IDENTITY_FILES.put(objectKey, bytes, {
        httpMetadata: { contentType: type },
      });
    }
    const effectiveRcm = unregistered ? "" : companyRcm;
    if (kind === "courier")
      await env.DB.prepare(
        "INSERT INTO market_couriers (user_id,country,available,payout_method,payout_account,benefits_accepted) VALUES (?,?,0,?,?,1) ON CONFLICT(user_id) DO UPDATE SET payout_method=excluded.payout_method,payout_account=excluded.payout_account,benefits_accepted=1",
      )
        .bind(
          user,
          user.startsWith("cg:") ? "CG" : "CD",
          String(form.get("courierPayoutMethod")),
          String(form.get("courierPayoutAccount") || "").trim(),
        )
        .run();
    if (
      !newFile &&
      previous.kind === kind &&
      previous.company_name === companyName &&
      previous.company_rcm === effectiveRcm &&
      previous.document_type === documentType &&
      previous.issuing_country === issuingCountry &&
      !!previous.unregistered === unregistered
    ) {
      await env.DB.prepare(
        "UPDATE identity_checks SET seller_plan=?,courier_plan=? WHERE user_id=?",
      )
        .bind(sellerPlan, courierPlan, user)
        .run();
      return json({ ok: true, status: previous.status });
    }
    try {
      await env.DB.prepare(
        "INSERT INTO identity_checks (user_id,kind,company_name,company_rcm,document_type,object_key,file_name,status,note,submitted_at,reviewed_at,unregistered,seller_plan,courier_plan,issuing_country,document_mime) VALUES (?,?,?,?,?,?,?,'pending','',?,NULL,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET kind=excluded.kind,company_name=excluded.company_name,company_rcm=excluded.company_rcm,unregistered=excluded.unregistered,seller_plan=excluded.seller_plan,courier_plan=excluded.courier_plan,document_mime=excluded.document_mime,issuing_country=excluded.issuing_country,document_type=excluded.document_type,object_key=excluded.object_key,file_name=excluded.file_name,status='pending',note='',submitted_at=excluded.submitted_at,reviewed_at=NULL",
      )
        .bind(
          user,
          kind,
          companyName,
          effectiveRcm,
          documentType,
          objectKey,
          fileName,
          Date.now(),
          unregistered ? 1 : 0,
          sellerPlan,
          courierPlan,
          issuingCountry,
          documentMime,
        )
        .run();
    } catch (e) {
      if (newFile) await env.IDENTITY_FILES.delete(objectKey);
      throw e;
    }
    await env.DB.prepare('UPDATE identity_checks SET activity_address=? WHERE user_id=? AND status=?').bind(activityAddress,user,'pending').run();
    if (newFile && previous?.object_key && previous.status !== "approved")
      try {
        await env.IDENTITY_FILES.delete(previous.object_key);
      } catch {}
    return json({ ok: true, status: "pending" });
  } catch (e) {
    console.error("Verification service unavailable", e);
    return json({ error: "Verification unavailable. Please retry." }, 503);
  }
}
