import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { JSDOM, CookieJar, VirtualConsole } from "jsdom";
import { createDatabase } from "../backend/database.js";
import { createApplication } from "../backend/application.js";
import { migrate } from "./migrate.mjs";
const directory = await mkdtemp(path.join(tmpdir(), "yaviya-workspaces-"));
const sqlite = path.join(directory, "test.sqlite"),
  root = "http://127.0.0.1:3021";
const db = await createDatabase({ SQLITE_PATH: sqlite });
await migrate(db);
const app = createApplication(db);
const fixtureCall = (endpoint, cookie, body) =>
  app(
    new Request(root + endpoint, {
      method: body ? "POST" : "GET",
      headers: {
        Origin: root,
        Cookie: cookie || "",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
const accounts = {};
for (const role of ["buyer", "seller", "courier", "admin", "pendingSeller"]) {
  const response = await fixtureCall("/api/auth/signup", "", {
    login: role + "@workspace.example.test",
    password: "Workspace-test-password-2026!",
  });
  assert.equal(response.status, 200);
  const user = (await response.json()).user;
  const cookie = response.headers.getSetCookie()[0].split(";")[0];
  const profile = await fixtureCall("/api/customer", cookie, {
    firstName: "Test",
    lastName: role,
    name: "Test " + role,
    phone: "+243999999999",
    email: "",
    address: "Adresse fictive",
    accountType: ["admin", "pendingSeller"].includes(role) ? "buyer" : role,
    privacyConsent: true,
    privacyVersion: "2026-10-02",
  });
  assert.equal(profile.status, 200);
  accounts[role] = { ...user, cookie };
  if (role === "admin")
    await db
      .prepare("INSERT INTO admin_access(id,user_id) VALUES ('owner',?)")
      .bind(user.id)
      .run();
  if (["seller", "courier"].includes(role))
    await db
      .prepare(
        "INSERT INTO identity_checks(user_id,kind,document_type,object_key,file_name,status,issuing_country,document_mime,submitted_at) VALUES (?,?,'identity','fixture','fixture','approved','CD','image/jpeg',?)",
      )
      .bind(user.id, role, Date.now())
      .run();
  if (role === "seller")
    await db
      .prepare(
        "INSERT INTO owned_stores(id,user_id,name,country) VALUES (1,?,'Boutique test','CD')",
      )
      .bind(user.id)
      .run();
  if (role === "courier")
    await db
      .prepare(
        "INSERT INTO market_couriers(user_id,country,available,payout_method,payout_account,benefits_accepted) VALUES (?,'CD',1,'cash','',1)",
      )
      .bind(user.id)
      .run();
  if (role === "pendingSeller")
    await db.prepare("INSERT INTO identity_checks(user_id,kind,company_name,unregistered,seller_plan,document_type,object_key,file_name,status,issuing_country,document_mime,submitted_at) VALUES (?,'seller','Atelier Kivu · démo',1,'free','identity','fixture','piece-test.jpg','pending','CD','image/jpeg',?)").bind(user.id, Date.now()).run();
}
const opportunityOrder = {
  id: "YV-WORKSPACE-MISSION",
  createdAt: Date.now(),
  city: "Kinshasa",
  commune: "Gombe",
  address: "Adresse de test",
  buyerUserId: accounts.buyer.id,
  requestedCourier: "yaviya",
  courierUserId: null,
  courierStatus: "unassigned",
  cancelled: false,
  buyerConfirmed: false,
  step: 1,
  paymentId: "cod",
  paymentStatus: "cash_due",
  cashBuyerConfirmed: false,
  cashCourierConfirmed: false,
  items: [
    { id: 1, title: "Mission test native", seller: 10001, price: 85000, q: 1 },
  ],
  total: 95000,
  delivery: { mode: "home", fee: 10000 },
  sellerAccepted: { 10001: true },
  sellerSteps: { 10001: 1 },
  sellerCashConfirmed: { 10001: false },
  courierEarnings: 10000,
  courierExpenses: 0,
  courierNet: 10000,
  courierPayout: { status: "awaiting_delivery", reference: null },
  events: ["Mission de test prête"],
  shared: true,
};
await db
  .prepare(
    "INSERT INTO market_orders(id,country,buyer_user_id,request_key,revision,snapshot,created_at,updated_at) VALUES (?,'CD',?,?,0,?,?,?)",
  )
  .bind(
    opportunityOrder.id,
    accounts.buyer.id,
    opportunityOrder.id,
    JSON.stringify(opportunityOrder),
    Date.now(),
    Date.now(),
  )
  .run();
await db.close();
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3021",
  ],
  {
    env: {
      ...process.env,
      NODE_ENV: "development",
      SQLITE_PATH: sqlite,
      POSTGRES_URL: "",
      DATABASE_URL: "",
      TURSO_DATABASE_URL: "",
      VERCEL: "",
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
  throw Error(label);
}
try {
  await until(async () => {
    try {
      return (await fetch(root)).ok;
    } catch {
      return false;
    }
  }, "Next démarre");
  const publicPage = await (await fetch(root + "/publicite.html")).text();
  assert.match(publicPage, /partner-payment.jpg/);
  assert.match(publicPage, /Campagnes illustratives/);
  for (const role of ["seller", "courier", "admin"]) {
    const jar = new CookieJar();
    jar.setCookieSync(accounts[role].cookie + "; Path=/", root);
    const errors = [],
      console = new VirtualConsole();
    console.on("jsdomError", (e) => {
      if (!e.message.includes("Not implemented")) errors.push(e.message);
    });
    dom = await JSDOM.fromURL(root + "/?role=" + role, {
      cookieJar: jar,
      resources: "usable",
      runScripts: "dangerously",
      pretendToBeVisual: true,
      virtualConsole: console,
      beforeParse(w) {
        w.fetch = async (input, options = {}) => {
          const url = new URL(input, root),
            headers = new Headers(options.headers);
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
    const document = dom.window.document;
    const click = (label) => {
      const host =
        document.querySelector(".yv-dashboard") ||
        document.querySelector("dialog") ||
        document;
      const button = [...host.querySelectorAll("button")].find(
        (b) => b.textContent.trim() === label && !b.disabled,
      );
      assert.ok(button, label + " " + role);
      button.click();
    };
    await until(
      () => document.querySelector(".yv-workspace-intro"),
      "accueil rôle " + role,
    );
    // Wait for the authenticated profile to be hydrated.
    await new Promise((r) => setTimeout(r, 500));
    click("Ouvrir mon espace");
    await until(
      () => document.querySelector(".yv-dashboard"),
      "tableau de bord " + role,
    );
    assert.match(
      document.querySelector(".yv-dashboard")?.textContent,
      /Vue d’ensemble/,
    );
    click("Commandes");
    await until(
      () =>
        document
          .querySelector(".yv-dashboard")
          ?.textContent.includes(
            role === "courier"
              ? "MISSION DISPONIBLE"
              : role === "admin"
                ? "Mission test native"
                : "Aucune commande",
          ),
      "commandes " + role,
    );
    if (role === "seller") {
      click("Produits");
      await until(
        () =>
          document
            .querySelector(".yv-dashboard")
            ?.textContent.includes("Gestion du catalogue"),
        "catalogue vendeur",
      );
      click("Ajouter un produit");
      await until(
        () => document.querySelector('input[name="photos"]'),
        "éditeur photos",
      );
      assert.equal(
        document.querySelector('input[name="photos"]').multiple,
        true,
      );
      click("Abonnements");
      await until(
        () => document.querySelector(".yv-plan-grid"),
        "forfaits vendeur",
      );
      assert.equal(
        document.querySelectorAll(".yv-plan-grid article").length,
        5,
      );
      click("Paiements");
      await until(
        () =>
          document
            .querySelector(".yv-dashboard")
            ?.textContent.includes("Commandes et paiements"),
        "finances vendeur",
      );
    } else if (role === "courier") {
      assert.ok(
        document.querySelector(".yv-opportunity"),
        "résumé mission sans crash",
      );
      click("Accepter cette mission");
      await until(
        () =>
          document
            .querySelector(".yv-order:not(.yv-opportunity)")
            ?.textContent.includes("Mission test native"),
        "mission affectée et détails complets",
      );
      click("Disponibilité");
      await until(
        () => document.querySelector('input[name="available"]'),
        "disponibilité livreur",
      );
      click("Discussions");
      await until(
        () =>
          document
            .querySelector(".yv-dashboard")
            ?.textContent.includes("Message"),
        "messagerie livreur",
      );
    } else {
      click("Produits");
      await until(
        () =>
          document.querySelectorAll(".yv-dashboard table tbody tr").length > 0,
        "catalogue administrateur",
      );
      click("Modifier");
      await until(
        () => document.querySelector('select[name="seller"]'),
        "éditeur administrateur",
      );
      assert.ok(
        Number(document.querySelector('select[name="seller"]').value) > 0,
        "boutique conservée pendant modération",
      );
      click("Vérifications");
      await until(
        () => document.querySelector(".yv-review-card"),
        "contrôle identité",
      );
      const review = document.querySelector(".yv-review-card");
      const approve = review.querySelector('button[type="submit"], .yv-primary');
      assert.equal(approve.disabled, true, "validation bloquée avant les contrôles manuels");
      const decision = review.querySelector('[name="decision"]');
      decision.value = "reject";
      decision.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
      await until(() => review.querySelector('[name="note"]').required, "motif obligatoire pour un refus");
      decision.value = "approve";
      decision.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
      review.querySelector('[name="identityChecked"]').click();
      review.querySelector('[name="companyChecked"]').click();
      await until(() => !approve.disabled, "contrôles complets autorisent la décision");
      approve.click();
      await until(() => document.querySelector('[role="status"]')?.textContent.includes("Dossier validé"), "décision de validation enregistrée");
      const reviewed = await fetch(root + "/api/verification/reviews", { headers: { Cookie: accounts.admin.cookie } });
      assert.equal(reviewed.status, 200);
      assert.equal((await reviewed.json()).find((r) => r.userId === accounts.pendingSeller.id).status, "approved");
      click("Boutiques");
      await until(
        () =>
          document
            .querySelector(".yv-dashboard")
            ?.textContent.includes("Boutique test"),
        "boutiques admin",
      );
      click("Finance");
      await until(
        () =>
          document
            .querySelector(".yv-dashboard")
            ?.textContent.includes("Finance et règlements"),
        "finance admin",
      );
      click("Publicités");
      await until(
        () =>
          document
            .querySelector(".yv-dashboard")
            ?.textContent.includes("Publicités et partenariats"),
        "publicités admin",
      );
    }
    assert.deepEqual(errors, []);
    dom.window.close();
    dom = null;
  }
  // The real HTTP handlers refuse privileged views to a buyer.
  for (const role of ["seller", "courier", "admin"])
    assert.equal(
      (
        await fetch(root + "/api/marketplace?view=" + role, {
          headers: { Cookie: accounts.buyer.cookie },
        })
      ).status,
      403,
    );
  process.stdout.write(
    "Next.js : espaces vendeur, livreur et admin rendus et utilisés avec comptes distincts ; acheteur sans accès privilégié.\n",
  );
} catch (error) {
  process.stderr.write(logs.join("").slice(-2000));
  throw error;
} finally {
  dom?.window.close();
  child.kill();
  await new Promise((r) => child.once("exit", r));
  await rm(directory, { recursive: true, force: true });
}
