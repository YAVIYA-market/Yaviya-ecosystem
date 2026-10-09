import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../backend/database.js";
import { createApplication } from "../backend/application.js";
import { migrate } from "../scripts/migrate.mjs";
import { ensureSeeds } from "../backend/worker/commerce.js";
test("public catalogue exposes only approved products, with no account or order data", async () => {
  const db = await createDatabase({ SQLITE_PATH: ":memory:" });
  await migrate(db);
  await ensureSeeds({ DB: db }, { owner: "demo:catalogue", country: "CD" });
  try {
    const app = createApplication(db);
    const r = await app(new Request("https://yaviya.test/api/catalogue"));
    assert.equal(r.status, 200);
    const value = await r.json();
    assert.equal(value.catalogue.length, 60);
    const promo = value.catalogue.find(p => p.id === 3);
    assert.equal(promo.price, 85500);
    assert.equal(promo.regularPrice, 95000);
    assert.equal(value.catalogue[0].stock, 15);
    assert.equal(Object.hasOwn(value.catalogue[0], "owner_user_id"), false);
    assert.equal(Object.hasOwn(value, "orders"), false);
    const p = value.catalogue[0];
    await db
      .prepare("UPDATE market_products SET data=? WHERE key=?")
      .bind(JSON.stringify({ ...p, approved: false }), "CD:1")
      .run();
    const filtered = await (
      await app(new Request("https://yaviya.test/api/catalogue"))
    ).json();
    assert.equal(filtered.catalogue.length, 59);
    assert.ok(!filtered.catalogue.some((v) => v.id === 1));
    assert.equal(
      (
        await app(
          new Request("https://yaviya.test/api/catalogue", { method: "POST" }),
        )
      ).status,
      405,
    );
    assert.equal(
      (await app(new Request("https://yaviya.test/api/marketplace?view=admin")))
        .status,
      401,
    );
  } finally {
    await db.close();
  }
});
