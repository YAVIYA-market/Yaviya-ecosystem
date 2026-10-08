import { readFile, writeFile, appendFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const directory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const missing = ["EXPO_TOKEN", "EAS_PROJECT_ID", "EXPO_PUBLIC_API_URL"].filter(
  (k) => !process.env[k],
);
async function output(ready) {
  if (process.env.GITHUB_OUTPUT)
    await appendFile(process.env.GITHUB_OUTPUT, `ready=${ready}\n`);
}
if (missing.length) {
  console.log(
    `Compilation APK en attente : configurer ${missing.map(k=>k==='EXPO_PUBLIC_API_URL'?'MOBILE_API_URL':k).join(", ")} dans GitHub (EXPO_TOKEN en secret, les autres en variables).`,
  );
  await output(false);
  process.exit(0);
}
if (
  !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
    process.env.EAS_PROJECT_ID,
  )
)
  throw new Error("Identifiant du projet Expo invalide.");
const backend = new URL(process.env.EXPO_PUBLIC_API_URL);
if (
  backend.protocol !== "https:" ||
  backend.username ||
  backend.password ||
  backend.search ||
  backend.hash ||
  backend.pathname !== "/"
)
  throw new Error(
    "MOBILE_API_URL doit être une origine HTTPS sans identifiants.",
  );
const response = await fetch(new URL("/api/auth/mobile/session", backend), {
  redirect: "error",
  signal: AbortSignal.timeout(15000),
});
if (!response.ok)
  throw new Error(
    "Le backend mobile doit répondre sans écran de connexion à /api/auth/mobile/session.",
  );
const session = await response.json();
if (session.user !== null || session.sessionToken)
  throw new Error("Réponse inattendue du backend mobile public.");
const path = resolve(directory, "eas.json");
const config = JSON.parse(await readFile(path, "utf8"));
config.build.preview.env = {
  ...config.build.preview.env,
  EXPO_PUBLIC_API_URL: backend.origin,
  EAS_PROJECT_ID: process.env.EAS_PROJECT_ID,
  ...(process.env.EAS_OWNER ? { EAS_OWNER: process.env.EAS_OWNER } : {}),
};
await writeFile(path, JSON.stringify(config, null, 2) + "\n");
await output(true);
console.log("Backend mobile validé ; profil APK interne configuré.");
