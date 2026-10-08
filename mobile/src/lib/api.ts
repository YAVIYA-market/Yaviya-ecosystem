import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { AuthResult } from "./types";
const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
export const apiBase =
  configured ||
  (Platform.OS === "web" && typeof window !== "undefined"
    ? window.location.origin
    : "");
const SESSION = "yaviya.mobile.session";
let session: string | null = null;
let challenge: string | null = null;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
export async function restoreSession() {
  if (Platform.OS !== "web") session = await SecureStore.getItemAsync(SESSION);
}
async function saveSession(value: string | null) {
  // Never write session tokens to browser storage or AsyncStorage.
  if (Platform.OS !== "web") {
    if (value)
      await SecureStore.setItemAsync(SESSION, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    else await SecureStore.deleteItemAsync(SESSION);
  }
  session = value;
}
export function sessionHeaders(): Record<string, string> {
  return session ? { Authorization: `Bearer yv.${session}` } : {};
}
function checkBase() {
  if (!apiBase)
    throw new Error(
      "Configurez EXPO_PUBLIC_API_URL pour connecter le backend YAVIYA.",
    );
  const url = new URL(apiBase);
  if (
    url.protocol !== "https:" &&
    !__DEV__ &&
    !(
      Platform.OS === "web" && ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("Le backend de production doit utiliser HTTPS.");
}
export async function api<T>(
  path: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  checkBase();
  const form = body instanceof FormData;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(`${apiBase}${path}`, {
      method: method || (body === undefined ? "GET" : "POST"),
      credentials: "omit",
      signal: controller.signal,
      headers: {
        ...sessionHeaders(),
        ...(challenge && path.startsWith("/api/auth/mobile/")
          ? { "X-Yaviya-Challenge": challenge }
          : {}),
        Origin: new URL(apiBase).origin,
        ...(body !== undefined && !form
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        body === undefined
          ? undefined
          : form
            ? (body as FormData)
            : JSON.stringify(body),
    });
    const data = await response
      .json()
      .catch(() => ({ error: "Réponse du service illisible." }));
    if (!response.ok)
      throw new ApiError(
        data.error || "Service indisponible. Réessayez.",
        response.status,
        data.code,
      );
    if (path.startsWith("/api/auth/mobile/")) {
      const auth = data as AuthResult;
      if (auth.sessionToken !== undefined) await saveSession(auth.sessionToken);
      if (auth.challengeToken !== undefined) challenge = auth.challengeToken;
      if (path.endsWith("/session") && !auth.user) await saveSession(null);
    }
    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error(
        "Connexion trop lente. Réessayez sans modifier votre commande.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
export function imageUrl(src: string) {
  return src?.startsWith("/") ? apiBase + src : `${apiBase}/${src}`;
}
