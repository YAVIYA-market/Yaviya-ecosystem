export async function api(path, { country = "CD", body, method, signal } = {}) {
  const url = new URL(
    path,
    typeof window === "undefined" ? "http://localhost" : window.location.origin,
  );
  if (!url.pathname.startsWith("/api/auth/"))
    url.searchParams.set("country", country);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(url.pathname + url.search, {
      method: method || (body ? "POST" : "GET"),
      credentials: "same-origin",
      headers:
        body && !(body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {},
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
      signal: controller.signal,
    });
    const value = await response.json();
    if (!response.ok) {
      const error = new Error(
        value.error || "Service indisponible. Réessayez.",
      );
      error.status = response.status;
      error.code = value.code;
      throw error;
    }
    return value;
  } catch (error) {
    if (error.name === "AbortError")
      throw new Error(
        "Le service met trop de temps à répondre. Vérifiez vos commandes avant de réessayer.",
      );
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
export function imageUrl(src) {
  return src?.startsWith("/api/")
    ? src
    : "/" + String(src || "hero.png").replace(/^\//, "");
}
export function amount(value, country = "CD") {
  return (
    new Intl.NumberFormat("fr-FR").format(Number(value || 0)) +
    (country === "CG" ? " FCFA" : " FC")
  );
}
