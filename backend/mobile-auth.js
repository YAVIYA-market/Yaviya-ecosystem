// Native sessions share the web session store, expiry, revocation and MFA generation.
// This transport never accepts browser cookies or caller-supplied user identities.
const readActions = new Set(["session", "mfa-status", "mfa-challenge"]);
const writeActions = new Set([
  "signup",
  "login",
  "logout",
  "mfa-verify",
  "mfa-setup",
  "mfa-enable",
  "mfa-disable",
  "mfa-recovery",
  "phone-send",
  "phone-verify",
]);
const tokenPattern = /^[a-f0-9]{64}$/;
export async function handleMobileAuth(request, db, dispatch) {
  const url = new URL(request.url);
  const action = url.pathname.slice("/api/auth/mobile/".length);
  const reject = (error, status) =>
    Response.json(
      { error },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  if (!readActions.has(action) && !writeActions.has(action))
    return reject("Introuvable", 404);
  if (request.method !== (readActions.has(action) ? "GET" : "POST"))
    return reject("Méthode refusée", 405);
  if (
    request.headers.has("origin") &&
    request.headers.get("origin") !== url.origin
  )
    return reject("Origine refusée", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return reject("Origine refusée", 403);
  if (
    request.method === "POST" &&
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    return reject("JSON requis", 415);
  const authorization = request.headers.get("authorization");
  const token = /^Bearer yv\.([a-f0-9]{64})$/.exec(authorization || "")?.[1];
  if (authorization && !token) return reject("Session invalide", 401);
  const challenge = request.headers.get("x-yaviya-challenge");
  if (challenge && !tokenPattern.test(challenge))
    return reject("Vérification invalide", 401);
  const headers = new Headers(request.headers);
  headers.delete("authorization");
  headers.delete("cookie");
  headers.delete("x-yaviya-challenge");
  headers.set("origin", url.origin);
  headers.set(
    "cookie",
    [token && `yaviya_session=${token}`, challenge && `yaviya_mfa=${challenge}`]
      .filter(Boolean)
      .join("; "),
  );
  url.pathname = `/api/auth/${action}`;
  const response = await dispatch(
    new Request(url, {
      method: request.method,
      headers,
      body: request.method === "POST" ? await request.text() : undefined,
    }),
    db,
  );
  const data = await response.json();
  const cookies = response.headers.getSetCookie();
  for (const [cookieName, field] of [
    ["yaviya_session", "sessionToken"],
    ["yaviya_mfa", "challengeToken"],
  ]) {
    for (const cookie of cookies) {
      const value = new RegExp(`^${cookieName}=([^;]*)`).exec(cookie)?.[1];
      if (value !== undefined)
        data[field] = tokenPattern.test(value) ? value : null;
    }
  }
  // Browser cookies never leave this adapter. Native tokens belong in SecureStore.
  const out = new Headers(response.headers);
  out.delete("set-cookie");
  out.set("Cache-Control", "no-store");
  out.set("Pragma", "no-cache");
  return Response.json(data, { status: response.status, headers: out });
}
