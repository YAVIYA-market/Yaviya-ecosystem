import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { JSDOM, CookieJar, VirtualConsole } from "jsdom";
import { createDatabase } from "../backend/database.js";
import { migrate } from "./migrate.mjs";
import { ensureSeeds } from "../backend/worker/commerce.js";
const directory = await mkdtemp(path.join(tmpdir(), "yaviya-next-test-"));
const sqlite = path.join(directory, "test.sqlite");
const db = await createDatabase({ SQLITE_PATH: sqlite });
await migrate(db);
await ensureSeeds({ DB: db }, { owner: "demo:catalogue", country: "CD" });
await db.close();
const root = "http://127.0.0.1:3019";
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3019",
  ],
  {
    env: {
      ...process.env,
      NODE_ENV: "development",
      SQLITE_PATH: sqlite,
      POSTGRES_URL: "",
      DATABASE_URL: "",
      VERCEL: "",
      TURSO_DATABASE_URL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
const logs = [];
child.stderr.on("data", (d) => logs.push(String(d)));
let dom;
async function until(check, label) {
  for (let i = 0; i < 300; i++) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw Error("Échec : " + label);
}
try {
  await until(async () => {
    try {
      return (await fetch(root)).ok;
    } catch {
      return false;
    }
  }, "démarrage Next.js");
  const catalogue = await (await fetch(root + "/api/catalogue")).json();
  assert.equal(catalogue.catalogue.length, 60);
  assert.ok(!Object.hasOwn(catalogue.catalogue[0], "owner_user_id"));
  for (const route of [
    "/",
    "/congo.html",
    "/aide.html",
    "/confidentialite.html",
    "/publicite.html",
  ])
    assert.equal((await fetch(root + route)).status, 200);
  const missing = await fetch(root + "/page-inconnue");
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /Cette page est introuvable/);
  const jar = new CookieJar(),
    errors = [],
    console = new VirtualConsole();
  console.on("jsdomError", (e) => {
    if (!e.message.includes("Not implemented")) errors.push(e.message);
  });
  dom = await JSDOM.fromURL(root, {
    cookieJar: jar,
    resources: "usable",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: console,
    beforeParse(w) {
      w.fetch = async (input, options = {}) => {
        const url = new URL(input, root);
        if (url.pathname === "/api/auth/session" && !jar.getCookieStringSync(url.href)) return new Response(JSON.stringify({error:"Le service de compte est temporairement indisponible. Réessayez plus tard."}), {status:503, headers:{"Content-Type":"application/json"}});
        const headers = new Headers(options.headers);
        headers.set("Cookie", jar.getCookieStringSync(url.href));
        if (options.method && options.method !== "GET")
          headers.set("Origin", root);
        const response = await fetch(url, {
          ...options,
          headers,
          signal: undefined,
        });
        for (const cookie of response.headers.getSetCookie())
          jar.setCookieSync(cookie, url.href);
        return response;
      };
      w.scrollTo = () => {};
      w.HTMLElement.prototype.scrollIntoView = () => {};
      w.HTMLDialogElement.prototype.showModal = function () {
        this.open = true;
      };
      w.HTMLDialogElement.prototype.close = function () {
        this.open = false;
      };
      w.crypto.randomUUID = () => crypto.randomUUID();
    },
  });
  const w = dom.window,
    document = w.document;
  const click = (label) => {
    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === label && !b.disabled,
    );
    assert.ok(button, "Bouton " + label);
    button.click();
  };
  const fill = (name, value) => {
    const input = document.querySelector(`[name="${name}"]`);
    assert.ok(input, name);
    input.value = value;
    input.dispatchEvent(new w.Event("input", { bubbles: true }));
  };
  const submit = () =>
    document
      .querySelector("dialog form")
      .dispatchEvent(
        new w.Event("submit", { bubbles: true, cancelable: true }),
      );
  await until(
    () => document.querySelectorAll(".yv-product").length === 60,
    "catalogue React",
  );
  // Wait until React attaches handlers; SSR content alone is not evidence.
  await until(
    () =>
      document.querySelector(".yv-app")?._reactRootContainer ||
      document.querySelector("header button")?.getAttribute("type") === null,
    "hydration",
  );
  await new Promise((r) => setTimeout(r, 600));
  assert.ok(document.querySelector('[aria-label="Rechercher avec une photo"]'), "recherche photo restaurée");
  assert.equal(document.querySelectorAll(".yv-adverts article").length, 3, "publicités restaurées");
  const sorting = document.querySelector(".yv-heading select");
  assert.equal(sorting.options.length, 9, "options de tri");
  click("Acheter maintenant");
  await until(
    () => document.querySelector('[name="password"]'),
    "achat ouvre inscription même lorsque session renvoie 503",
  );
  fill("login", "next-runtime-" + Date.now() + "@example.test");
  fill("password", "Native-next-password-2026!");
  assert.ok(document.querySelector("dialog").textContent.includes("Créer mon compte acheteur"));
  click("Créer mon compte");
  await until(
    () => document.querySelector('[name="firstName"]'),
    "achat reprend après inscription",
  );
  fill("firstName", "Test");
  fill("lastName", "Next");
  fill("phone", "+243999999999");
  fill("address", "Adresse fictive du test");
  document.querySelector('dialog input[type="checkbox"]').checked = true;
  submit();
  await until(
    () => document.querySelector('[data-testid="checkout-form"]'),
    "formulaire checkout React",
  );
  assert.match(
    document.querySelector(".yv-order-items").textContent,
    /Casque sans fil Essential/,
  );
  assert.equal(
    document.querySelector('[data-testid="checkout-form"] select').value,
    "Kinshasa",
  );
  submit();
  await until(
    () => document.querySelector(".yv-success"),
    "commande enregistrée",
  );
  assert.match(document.querySelector(".yv-success").textContent, /YV-/);
  click("Suivre ma commande");
  await until(() => document.querySelector(".yv-order"), "suivi");
  assert.match(
    document.querySelector(".yv-order").textContent,
    /Casque sans fil Essential/,
  );
  click("Discussion de la commande");
  await until(() => document.querySelector(".yv-chat"), "discussion partagée");
  assert.deepEqual(errors, []);
  process.stdout.write(
    "Next.js : pages, catalogue public, inscription, profil, achat, commande et suivi vérifiés via HTTP et React.\n",
  );
} catch (error) {
  process.stderr.write(logs.join("").slice(-3000));
  throw error;
} finally {
  dom?.window.close();
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
  await rm(directory, { recursive: true, force: true });
}
