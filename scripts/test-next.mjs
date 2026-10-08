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
  throw Error(
    "Échec : " +
      label +
      " · " +
      (dom?.window.document.querySelector("dialog")?.textContent ||
        dom?.window.document.body.textContent.slice(-300)),
  );
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
  console.on("error", (...args) =>
    process.stderr.write(args.map(String).join(" ") + "\n"),
  );
  console.on("jsdomError", (e) => {
    if (!e.message.includes("Not implemented")) {
      errors.push(e.message);
      process.stderr.write(e.message + "\n");
    }
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
        if (
          url.pathname === "/api/auth/session" &&
          !jar.getCookieStringSync(url.href)
        )
          return new Response(
            JSON.stringify({
              error:
                "Le service de compte est temporairement indisponible. Réessayez plus tard.",
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
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
  await until(
    () => document.querySelector(".yv-app")?.dataset.ready === "true",
    "hydratation React",
  );
  assert.ok(
    document.querySelector('[aria-label="Rechercher avec une photo"]'),
    "recherche photo restaurée",
  );
  assert.equal(
    document.querySelectorAll(".yv-adverts article").length,
    3,
    "publicités restaurées",
  );
  assert.ok(
    document.querySelector(
      '.yv-verified-badge[aria-label="Vendeur vérifié · démonstration"] svg',
    ),
    "badge vérifié professionnel",
  );
  const sorting = document.querySelector(".yv-heading select");
  assert.equal(sorting.options.length, 10, "options de tri");
  assert.equal(
    document.querySelectorAll(".yv-daily-grid article").length,
    2,
    "promos du jour restaurées",
  );
  assert.equal(
    document.querySelectorAll(".yv-workspace-nav button").length,
    4,
    "quatre vues séparées",
  );
  click("Vue Livreur");
  await until(
    () =>
      document
        .querySelector(".yv-workspace-intro")
        ?.textContent.includes("vos missions"),
    "présentation livreur",
  );
  document.querySelector("dialog button[aria-label]")?.click();
  await until(() => !document.querySelector("dialog"), "fermeture vue");
  assert.ok(
    document
      .querySelector(".yv-partner-campaign")
      .textContent.includes("M-PESA"),
    "grande campagne M-Pesa",
  );
  click("Partenaire logistique");
  await until(
    () =>
      document
        .querySelector(".yv-partner-campaign")
        .textContent.includes("Le dernier kilomètre"),
    "campagne logistique",
  );
  assert.ok(
    document.querySelector(".yv-popular-questions .yv-faq summary"),
    "FAQ professionnelle sur accueil",
  );
  const provinceSelect = document.querySelector('[aria-label="Province"]');
  provinceSelect.value = "Haut-Katanga";
  provinceSelect.dispatchEvent(new w.Event("change", { bubbles: true }));
  await until(
    () =>
      [...document.querySelector('[aria-label="Ville"]').options].some(
        (o) => o.value === "Lubumbashi",
      ) &&
      ![...document.querySelector('[aria-label="Ville"]').options].some(
        (o) => o.value === "Kinshasa",
      ),
    "province filtre villes",
  );
  const citySelect = document.querySelector('[aria-label="Ville"]');
  citySelect.value = "Lubumbashi";
  citySelect.dispatchEvent(new w.Event("change", { bubbles: true }));
  await until(
    () => document.querySelector('[aria-label="Commune"]').options.length > 1,
    "communes proposées",
  );
  click("Réinitialiser les lieux");
  await until(
    () => document.querySelectorAll(".yv-product").length === 60,
    "réinitialisation des filtres",
  );
  click("Acheter maintenant");
  await until(
    () => document.querySelector('[name="password"]'),
    "achat ouvre inscription même lorsque session renvoie 503",
  );
  fill("login", "next-runtime-" + Date.now() + "@example.test");
  fill("password", "Native-next-password-2026!");
  assert.ok(
    document
      .querySelector("dialog")
      .textContent.includes("Créer mon compte acheteur"),
  );
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
  document.querySelector('dialog button[aria-label="Fermer"]').click();
  await until(() => !document.querySelector("dialog"), "fermeture suivi");
  click("Paiements");
  await until(
    () =>
      document
        .querySelector(".yv-service-info")
        ?.textContent.includes("Espèces à réception"),
    "information paiements",
  );
  document.querySelector('dialog button[aria-label="Fermer"]').click();
  await until(() => !document.querySelector("dialog"), "fermeture paiements");
  const question = document.querySelector(".yv-popular-questions .yv-faq");
  question.open = true;
  question.querySelector(".yv-faq-feedback button:nth-of-type(2)").click();
  await until(
    () =>
      question.querySelector('[aria-pressed="true"]')?.textContent === "Non",
    "FAQ réponse non",
  );
  question.querySelector(".yv-faq-feedback .yv-primary").click();
  await until(
    () => document.querySelector(".yv-support-contact"),
    "contact support client restauré",
  );
  document.querySelector('dialog button[aria-label="Fermer"]').click();
  await until(() => !document.querySelector("dialog"), "fermeture support");
  click("Livraison");
  await until(
    () =>
      document
        .querySelector(".yv-service-info")
        ?.textContent.includes("Tarifs du parcours actuel"),
    "tarifs livraison restaurés",
  );
  document.querySelector('dialog button[aria-label="Fermer"]').click();
  await until(() => !document.querySelector("dialog"), "fermeture livraison");
  click("Découvrir mes avantages");
  await until(
    () =>
      document
        .querySelector(".yv-service-info")
        ?.textContent.includes("YAVIYA Prime"),
    "abonnements Prime restaurés",
  );
  click("Ouvrir mes coupons");
  await until(
    () => document.querySelector(".yv-wallet-balance"),
    "portefeuille coupons",
  );
  click("Tester avec 5 000 coupons · une seule fois");
  await until(
    () =>
      document
        .querySelector(".yv-wallet-balance strong")
        ?.textContent.replace(/\s/g, "") === "5000",
    "crédit demo coupons",
  );
  click("Choisir cette récompense");
  await until(
    () => document.querySelector(".yv-redeem-confirm"),
    "confirmation récompense",
  );
  click("Confirmer mon échange");
  await until(
    () =>
      document
        .querySelector(".yv-coupons")
        .textContent.includes("Échange de démonstration enregistré"),
    "échange persisté",
  );
  document.querySelector('dialog button[aria-label="Fermer"]').click();
  await until(() => !document.querySelector("dialog"), "fermeture coupons");
  click("Profil");
  await until(
    () => document.querySelector(".yv-account-grid"),
    "profil complet",
  );
  click("Adresse et coordonnées");
  await until(
    () => document.querySelector('[name="firstName"]'),
    "édition profil",
  );
  fill("firstName", "Profil");
  document.querySelector('dialog input[type="checkbox"]').checked = true;
  submit();
  await until(
    () =>
      document.querySelector(".yv-account-grid") &&
      document.querySelector("dialog").textContent.includes("Bonjour Profil"),
    "profil complet après sauvegarde",
  );
  assert.ok(
    document.querySelector("dialog").textContent.includes("+243999999999"),
    "téléphone conservé",
  );
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
