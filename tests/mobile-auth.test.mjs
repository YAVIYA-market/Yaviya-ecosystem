import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { TOTP } from "otpauth";
import { createDatabase } from "../backend/database.js";
import { createApplication } from "../backend/application.js";
import { migrate } from "../scripts/migrate.mjs";
process.env.MFA_ENCRYPTION_KEY = randomBytes(32).toString("hex");
const password = "Mobile-password-2026!";
async function fixture() {
  const db = await createDatabase({ SQLITE_PATH: ":memory:" });
  await migrate(db);
  const app = createApplication(db);
  const call = (path, token = "", body, headers = {}) =>
    app(
      new Request("https://yaviya.test" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          ...(token ? { Authorization: `Bearer yv.${token}` } : {}),
          ...(body === undefined
            ? {}
            : {
                Origin: "https://yaviya.test",
                ...(body instanceof FormData
                  ? {}
                  : { "Content-Type": "application/json" }),
              }),
          ...headers,
        },
        body:
          body === undefined
            ? undefined
            : body instanceof FormData
              ? body
              : JSON.stringify(body),
      }),
    );
  const signup = async (name) => {
    const r = await call("/api/auth/mobile/signup", "", {
      login: name + "@mobile.test",
      password,
    });
    assert.equal(r.status, 200, await r.clone().text());
    assert.equal(r.headers.get("set-cookie"), null);
    const d = await r.json();
    assert.match(d.sessionToken, /^[a-f0-9]{64}$/);
    return { ...d.user, token: d.sessionToken };
  };
  const profile = async (u, role) => {
    const r = await call("/api/customer", u.token, {
      name: role,
      phone: "+243999999999",
      email: "",
      address: "Adresse de test",
      accountType: role,
      privacyConsent: true,
      privacyVersion: "2026-10-02",
    });
    assert.equal(r.status, 200, await r.clone().text());
  };
  return { db, call, signup, profile };
}
test("native session transport isolates identities, rejects browser cookies and foreign origins, expires and revokes", async () => {
  const f = await fixture();
  try {
    const a = await f.signup("alice"),
      b = await f.signup("bob");
    await f.profile(a, "buyer");
    await f.profile(b, "seller");
    assert.equal(
      (await (await f.call("/api/customer", a.token)).json()).name,
      "buyer",
    );
    assert.equal(
      (
        await f.call("/api/customer", a.token, undefined, {
          "yaviya-user-id": b.id,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await (
          await f.call("/api/customer", a.token, undefined, {
            "yaviya-user-id": b.id,
          })
        ).json()
      ).name,
      "buyer",
    );
    assert.equal(
      (
        await (
          await f.call("/api/auth/mobile/session", "", undefined, {
            Cookie: `yaviya_session=${a.token}`,
          })
        ).json()
      ).user,
      null,
    );
    assert.equal(
      (
        await f.call(
          "/api/auth/mobile/login",
          "",
          { login: a.login, password },
          { Origin: "https://evil.test" },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.call(
          "/api/auth/mobile/login",
          "",
          { login: a.login, password },
          { "Sec-Fetch-Site": "cross-site" },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await f.call("/api/auth/mobile/session", "", undefined, {
          Authorization: "Bearer yv.invalid",
          Cookie: `yaviya_session=${a.token}`,
        })
      ).status,
      401,
    );
    assert.equal((await f.call("/api/auth/mobile/google")).status, 404);
    assert.equal(
      (
        await f.call(
          "/api/auth/mobile/login",
          "",
          { login: a.login, password },
          { "Content-Type": "text/plain" },
        )
      ).status,
      415,
    );
    const hash = createHash("sha256").update(b.token).digest("hex");
    await f.db
      .prepare("UPDATE auth_sessions SET expires_at=0 WHERE token_hash=?")
      .bind(hash)
      .run();
    assert.equal((await f.call("/api/customer", b.token)).status, 401);
    const logout = await f.call("/api/auth/mobile/logout", a.token, {});
    assert.equal(logout.status, 200);
    assert.equal((await logout.json()).sessionToken, null);
    assert.equal((await f.call("/api/customer", a.token)).status, 401);
  } finally {
    f.db.close();
  }
});
test("native MFA requires a challenge, protects against TOTP replay and rotates the same web session generation", async () => {
  const f = await fixture();
  try {
    const a = await f.signup("mfa");
    await f.profile(a, "buyer");
    const setup = await (
      await f.call("/api/auth/mobile/mfa-setup", a.token, { password })
    ).json();
    assert.ok(setup.secret);
    const code = new TOTP({ secret: setup.secret }).generate();
    const enable = await f.call("/api/auth/mobile/mfa-enable", a.token, {
      password,
      code,
    });
    assert.equal(enable.status, 200, await enable.clone().text());
    const enabled = await enable.json();
    assert.ok(enabled.sessionToken);
    assert.equal((await f.call("/api/customer", a.token)).status, 401);
    const login = await f.call("/api/auth/mobile/login", "", {
      login: a.login,
      password,
    });
    const pending = await login.json();
    assert.equal(pending.requiresTwoFactor, true);
    assert.equal(pending.sessionToken, null);
    assert.ok(pending.challengeToken);
    assert.equal(
      (
        await f.call("/api/auth/mobile/mfa-verify", "", {
          code: enabled.recoveryCodes[0],
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await f.call(
          "/api/auth/mobile/mfa-verify",
          "",
          { code },
          { "X-Yaviya-Challenge": pending.challengeToken },
        )
      ).status,
      401,
    );
    const verified = await f.call(
      "/api/auth/mobile/mfa-verify",
      "",
      { code: enabled.recoveryCodes[0] },
      { "X-Yaviya-Challenge": pending.challengeToken },
    );
    assert.equal(verified.status, 200, await verified.clone().text());
    const session = await verified.json();
    assert.ok(session.sessionToken);
    assert.equal(session.challengeToken, null);
    assert.equal(
      (await f.call("/api/customer", session.sessionToken)).status,
      200,
    );
    assert.equal(
      (
        await f.call(
          "/api/auth/mobile/mfa-verify",
          "",
          { code: enabled.recoveryCodes[1] },
          { "X-Yaviya-Challenge": pending.challengeToken },
        )
      ).status,
      401,
    );
    const disabled = await f.call(
      "/api/auth/mobile/mfa-disable",
      session.sessionToken,
      { password, code: enabled.recoveryCodes[1] },
    );
    assert.equal(disabled.status, 200);
    assert.equal(
      (await f.call("/api/customer", session.sessionToken)).status,
      401,
    );
  } finally {
    f.db.close();
  }
});
test("native bearer clients share buyer, seller, courier and admin order lifecycle without mixing ownership", async () => {
  const f = await fixture();
  try {
    const accounts = {};
    for (const role of ["buyer", "seller", "courier", "admin", "outsider"]) {
      const u = await f.signup(role);
      accounts[role] = u;
      await f.profile(u, ["admin", "outsider"].includes(role) ? "buyer" : role);
      if (["seller", "courier"].includes(role))
        await f.db
          .prepare(
            "INSERT INTO identity_checks(user_id,kind,document_type,object_key,file_name,status,issuing_country,document_mime,submitted_at) VALUES (?,?,'identity','fixture','fixture','approved','CD','image/jpeg',?)",
          )
          .bind(u.id, role, Date.now())
          .run();
    }
    const { buyer, seller, courier, admin, outsider } = accounts;
    await f.db
      .prepare("INSERT INTO admin_access(id,user_id) VALUES ('owner',?)")
      .bind(admin.id)
      .run();
    await f.db
      .prepare(
        "INSERT INTO owned_stores(id,user_id,name,country) VALUES (1,?,'Mobile boutique','CD')",
      )
      .bind(seller.id)
      .run();
    await f.db
      .prepare(
        "INSERT INTO market_couriers(user_id,country,available,payout_method,payout_account,benefits_accepted) VALUES (?,'CD',1,'cash','',1)",
      )
      .bind(courier.id)
      .run();
    let response = await f.call("/api/marketplace/catalogue", seller.token, {
      id: 12345,
      seller: 10001,
      title: "Produit mobile",
      category: "Mode",
      price: 10000,
      stock: 5,
      visible: true,
      approved: false,
      img: "handbag.png",
      images: ["handbag.png"],
      desc: "Produit de test",
    });
    assert.equal(response.status, 200, await response.clone().text());
    let state = await (
      await f.call("/api/marketplace?view=admin", admin.token)
    ).json();
    const product = state.catalogue.find((p) => p.id === 12345);
    response = await f.call("/api/marketplace/catalogue", admin.token, {
      ...product,
      approved: true,
    });
    assert.equal(response.status, 200, await response.clone().text());
    const checkout = {
      requestKey: randomUUID(),
      items: [{ id: 12345, q: 1 }],
      city: "Kinshasa",
      commune: "Gombe",
      address: "Adresse de test",
      recipient: { name: "Acheteur mobile", phone: "+243999999999" },
      paymentId: "cod",
      delivery: { mode: "home" },
    };
    response = await f.call("/api/marketplace/orders", buyer.token, checkout);
    assert.equal(response.status, 201, await response.clone().text());
    let order = (await response.json()).order;
    const same = (
      await (
        await f.call("/api/marketplace/orders", buyer.token, checkout)
      ).json()
    ).order;
    assert.equal(same.id, order.id);
    const action = async (u, action, extra = {}) => {
      const r = await f.call("/api/marketplace/orders/action", u.token, {
        orderId: order.id,
        revision: order.revision,
        action,
        ...extra,
      });
      assert.equal(r.status, 200, await r.clone().text());
      order = (await r.json()).order;
    };
    assert.equal(
      (
        await f.call("/api/marketplace/orders/action", outsider.token, {
          orderId: order.id,
          revision: order.revision,
          action: "seller_accept",
          sellerId: 10001,
        })
      ).status,
      403,
    );
    await action(seller, "seller_accept", { sellerId: 10001 });
    await action(seller, "seller_prepare", { sellerId: 10001 });
    await action(courier, "courier_claim");
    await action(courier, "courier_collect");
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1cAAAAASUVORK5CYII=",
      "base64",
    );
    const proof = new FormData();
    for (const [k, v] of Object.entries({
      orderId: order.id,
      revision: String(order.revision),
      delivered: "true",
      cashCollected: "true",
    }))
      proof.append(k, v);
    proof.append(
      "photo",
      new Blob([png], { type: "image/png" }),
      "delivery.png",
    );
    response = await f.call("/api/marketplace/proof", courier.token, proof);
    assert.equal(response.status, 200, await response.clone().text());
    order = (await response.json()).order;
    await action(buyer, "buyer_receipt", { cashPaid: true });
    response = await f.call("/api/delivery-reviews", buyer.token, {
      orderId: order.id,
      sellerScores: { 10001: 5 },
      courierScore: 4,
      comment: "Livraison mobile",
    });
    assert.equal(response.status, 200, await response.clone().text());
    const rating = await f.db
      .prepare("SELECT courier_user_id FROM delivery_reviews WHERE order_id=?")
      .bind(order.id)
      .first();
    assert.equal(rating.courier_user_id, courier.id);
    const buyerOrders = (
      await (await f.call("/api/marketplace?view=buyer", buyer.token)).json()
    ).orders;
    const sellerOrders = (
      await (await f.call("/api/marketplace?view=seller", seller.token)).json()
    ).orders;
    assert.equal(buyerOrders[0].id, sellerOrders[0].id);
    assert.equal(
      (
        await (
          await f.call("/api/marketplace?view=buyer", outsider.token)
        ).json()
      ).orders.length,
      0,
    );
    assert.equal(
      (
        await f.call("/api/marketplace/messages", courier.token, {
          orderId: order.id,
          view: "courier",
          message: "Livré",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await (
          await f.call(
            "/api/marketplace/messages?orderId=" + order.id,
            buyer.token,
          )
        ).json()
      )[0].message,
      "Livré",
    );
    assert.equal(
      (
        await f.call(
          "/api/marketplace/messages?orderId=" + order.id,
          outsider.token,
        )
      ).status,
      403,
    );
  } finally {
    f.db.close();
  }
});
