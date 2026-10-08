import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { resolve, extname, dirname, sep, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { createDatabase } from "../../backend/database.js";
import { createApplication } from "../../backend/application.js";
import { migrate } from "../../scripts/migrate.mjs";
const mobile = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  repo = resolve(mobile, ".."),
  root = "http://127.0.0.1:3033";
const exportResult = spawnSync(
  process.execPath,
  [join(mobile, "node_modules/expo/bin/cli"), "export", "--platform", "web"],
  {
    cwd: mobile,
    env: { ...process.env, EXPO_OFFLINE: "1", EXPO_PUBLIC_API_URL: root },
    encoding: "utf8",
  },
);
assert.equal(
  exportResult.status,
  0,
  exportResult.stderr + "\n" + exportResult.stdout,
);
const directory = await mkdtemp(join(tmpdir(), "yaviya-mobile-"));
const db = await createDatabase({
  SQLITE_PATH: join(directory, "fixture.sqlite"),
});
await migrate(db);
const app = createApplication(db);
const password = "Mobile-password-2026!";
const call = (path, token = "", body) =>
  app(
    new Request(root + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(token ? { Authorization: `Bearer yv.${token}` } : {}),
        ...(body === undefined
          ? {}
          : { Origin: root, "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
const accounts = {};
for (const role of ["seller", "courier", "admin"]) {
  const r = await call("/api/auth/mobile/signup", "", {
    login: role + "@mobile.test",
    password,
  });
  assert.equal(r.status, 200);
  const d = await r.json();
  accounts[role] = { ...d.user, token: d.sessionToken };
  assert.equal(
    (
      await call("/api/customer", d.sessionToken, {
        name: role,
        phone: "+243999999999",
        email: "",
        address: "Adresse fictive",
        accountType: role === "admin" ? "buyer" : role,
        privacyConsent: true,
        privacyVersion: "2026-10-02",
      })
    ).status,
    200,
  );
  if (role !== "admin")
    await db
      .prepare(
        "INSERT INTO identity_checks(user_id,kind,document_type,object_key,file_name,status,issuing_country,document_mime,submitted_at) VALUES (?,?,'identity','fixture','fixture','approved','CD','image/jpeg',?)",
      )
      .bind(d.user.id, role, Date.now())
      .run();
}
await db
  .prepare("INSERT INTO admin_access(id,user_id) VALUES ('owner',?)")
  .bind(accounts.admin.id)
  .run();
await db
  .prepare(
    "INSERT INTO owned_stores(id,user_id,name,country) VALUES (1,?,'Boutique test mobile','CD')",
  )
  .bind(accounts.seller.id)
  .run();
await db
  .prepare(
    "INSERT INTO market_couriers(user_id,country,available,payout_method,payout_account,benefits_accepted) VALUES (?,'CD',1,'cash','',1)",
  )
  .bind(accounts.courier.id)
  .run();
let r = await call("/api/marketplace/catalogue", accounts.seller.token, {
  id: 12345,
  seller: 10001,
  title: "Produit recette mobile",
  category: "Mode",
  price: 10000,
  stock: 5,
  visible: true,
  approved: false,
  img: "handbag.png",
  images: ["handbag.png", "handbag-angle-2.webp"],
  desc: "Produit pour tester le parcours mobile.",
});
assert.equal(r.status, 200, await r.clone().text());
let state = await (
  await call("/api/marketplace?view=admin", accounts.admin.token)
).json();
r = await call("/api/marketplace/catalogue", accounts.admin.token, {
  ...state.catalogue.find((p) => p.id === 12345),
  approved: true,
});
assert.equal(r.status, 200);
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, root);
    if (url.pathname.startsWith("/api/")) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers))
        if (v) headers.set(k, Array.isArray(v) ? v.join(",") : v);
      const response = await app(
        new Request(url, {
          method: req.method,
          headers,
          body: ["GET", "HEAD"].includes(req.method)
            ? undefined
            : Buffer.concat(chunks),
        }),
      );
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const asset = /^\/[^/]+\.(png|webp|jpg|svg)$/.test(url.pathname);
    const base = asset
      ? join(repo, "frontend/assets/images")
      : join(mobile, "dist");
    const file = resolve(
      base,
      "." +
        (url.pathname === "/"
          ? "/index.html"
          : decodeURIComponent(url.pathname)),
    );
    if (!file.startsWith(base + sep)) {
      res.statusCode = 403;
      res.end();
      return;
    }
    let body;
    try {
      body = await readFile(file);
    } catch {
      body = await readFile(join(mobile, "dist/index.html"));
      res.setHeader("Content-Type", "text/html");
    }
    if (!res.hasHeader("Content-Type"))
      res.setHeader(
        "Content-Type",
        {
          ".js": "text/javascript",
          ".html": "text/html",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".webp": "image/webp",
          ".css": "text/css",
        }[extname(file)] || "application/octet-stream",
      );
    res.end(body);
  } catch (e) {
    res.statusCode = 500;
    res.end(e.message);
  }
});
await new Promise((resolve) => server.listen(3033, "127.0.0.1", resolve));
let browser, page;
const errors = [];
try {
  const executable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  browser = await chromium.launch({
    headless: true,
    ...(executable
      ? {
          executablePath: executable,
          args: [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
            "--no-zygote",
            "--single-process",
          ],
        }
      : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  page = await context.newPage();
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.error("Browser error:", e.message);
  });
  const button = (name) => page.getByRole("button", { name, exact: true });
  const field = (name) => page.getByRole("textbox", { name, exact: true });
  const login = async (role) => {
    await page.goto(root + "/auth");
    await page
      .getByRole("radio", { name: "Me connecter", exact: true })
      .click();
    await field("Adresse e-mail").fill(role + "@mobile.test");
    await page.getByLabel("Mot de passe", { exact: true }).fill(password);
    await button("Me connecter").click();
    await button("Historique des commandes").waitFor();
  };
  await page.goto(root);
  await field("Rechercher un produit").waitFor();
  assert.equal(await button("Panier").count(), 1);
  assert.equal(await button("Panier (0)").count(), 0);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await page.goto(root + "/product?id=12345");
  await button("Acheter maintenant").waitFor();
  await button("Suivante →").click();
  await button("← Précédente").click();
  await button("Acheter maintenant").click();
  await page.getByRole("radio", { name: "Acheteur", exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("radio", { name: "Vendeur", exact: true })
      .getAttribute("aria-disabled"),
    "true",
  );
  await field("Adresse e-mail").fill("buyer@mobile.test");
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await button("Créer mon compte").click();
  await field("Nom complet *").fill("Acheteur mobile");
  await field("Téléphone *").fill("+243999999999");
  await field("Adresse *").fill("Adresse de recette");
  await button("J’accepte la politique de confidentialité").click();
  await button("Enregistrer et continuer").click();
  await button("Ville : Choisir").click();
  await button("Kinshasa").click();
  await button("Commune : Choisir").click();
  await button("Gombe").click();
  await button("Confirmer ma commande").click();
  await page.getByText("1 × Produit recette mobile", { exact: true }).waitFor();
  const order = await db
    .prepare("SELECT id FROM market_orders ORDER BY created_at DESC LIMIT 1")
    .first();
  assert.ok(order?.id);
  await page.goto(root + "/help");
  await page.getByRole("radio", { name: "Remboursement", exact: true }).click();
  assert.ok(await page.getByText(/72 heures après réception/).count());
  await page.getByRole("radio", { name: "Non", exact: true }).click();
  await button("Contacter le support client").waitFor();
  await login("seller");
  await button("Votre espace professionnel").click();
  await page.getByRole("radio", { name: "Vendeur", exact: true }).click();
  await page.getByRole("radio", { name: "Commandes", exact: true }).click();
  await button("Accepter la commande").click();
  await button("Marquer le colis prêt").click();
  await page.getByRole("radio", { name: "Produits", exact: true }).click();
  await button("Ajouter un produit").click();
  await field("Nom du produit *").fill("Produit mobile avec deux photos");
  await page.getByLabel("Prix (FC) *", { exact: true }).fill("15000");
  const chooserPromise = page.waitForEvent("filechooser");
  await button("Ajouter plusieurs photos").click();
  const chooser = await chooserPromise;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1cAAAAASUVORK5CYII=",
    "base64",
  );
  await chooser.setFiles([
    { name: "front.png", mimeType: "image/png", buffer: png },
    { name: "side.png", mimeType: "image/png", buffer: png },
  ]);
  await button("Retirer la photo 2").waitFor();
  await button("Enregistrer le produit").click();
  await page
    .getByText("Produit mobile avec deux photos", { exact: true })
    .waitFor();
  state = await (
    await call("/api/marketplace?view=seller", accounts.seller.token)
  ).json();
  assert.equal(
    state.catalogue.find((p) => p.title === "Produit mobile avec deux photos")
      .images.length,
    2,
  );
  await login("courier");
  await button("Votre espace professionnel").click();
  await page.getByRole("radio", { name: "Livreur", exact: true }).click();
  await page.getByRole("radio", { name: "Missions", exact: true }).click();
  await button("Accepter cette mission").click();
  await button("J’ai récupéré les colis").click();
  await button("Paiement en espèces reçu").click();
  const proofChooser = page.waitForEvent("filechooser");
  await button("Confirmer la livraison avec une photo").click();
  await (
    await proofChooser
  ).setFiles({ name: "proof.png", mimeType: "image/png", buffer: png });
  await page.getByText("Livrée", { exact: true }).waitFor();
  await login("buyer");
  await button("Historique des commandes").click();
  await button("J’ai payé en espèces").click();
  await button("Confirmer la réception").click();
  await page.getByText("Évaluez votre expérience", { exact: true }).waitFor();
  const stars = page.getByRole("radio", { name: "5 ★", exact: true });
  await stars.nth(0).click();
  await stars.nth(1).click();
  await field("Votre avis").fill("Excellent parcours mobile");
  await button("Envoyer mon évaluation").click();
  await page
    .getByText("Votre évaluation a été enregistrée.", { exact: true })
    .waitFor();
  const review = await db
    .prepare("SELECT courier_user_id FROM delivery_reviews WHERE order_id=?")
    .bind(order.id)
    .first();
  assert.equal(review.courier_user_id, accounts.courier.id);
  await login("admin");
  await button("Votre espace professionnel").click();
  await page.getByRole("radio", { name: "Admin", exact: true }).click();
  await page
    .getByRole("radio", { name: "Validation des comptes", exact: true })
    .click();
  await button("Actualiser les dossiers").waitFor();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `Débordement à ${width}px`,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "Mobile UI : acheter maintenant, inscription acheteur, commande partagée, vendeur multi-photos, livraison, réception, évaluation du livreur, admin et aide validés.",
  );
} catch (error) {
  if (page) {
    console.error("Mobile page:", await page.locator("body").innerText());
    console.error("Errors:", errors);
    await page
      .screenshot({
        path:
          process.env.MOBILE_DEBUG_SCREENSHOT || "/tmp/yaviya-mobile-debug.png",
      })
      .catch(() => {});
  }
  throw error;
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
  db.close();
  await rm(directory, { recursive: true, force: true });
}
