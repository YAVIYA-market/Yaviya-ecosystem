import test from "node:test";
import assert from "node:assert/strict";
import { handleCoins } from "../backend/worker/coins.js";
import { createDatabase } from "../backend/database.js";
import { migrate } from "../scripts/migrate.mjs";
test("coupon gains require an owned received order and use server prices, excluding delivery", async () => {
  const db = await createDatabase({ SQLITE_PATH: ":memory:" });
  await migrate(db);
  try {
    const user = "buyer:test";
    await db
      .prepare(
        "INSERT INTO customers(user_id,name,phone,email,address,account_type,privacy_version,privacy_accepted_at) VALUES (?,'Test','+243999999999','','Test','buyer','2026-10-02',?)",
      )
      .bind(user, Date.now())
      .run();
    const order = {
      id: "YV-COUPON-TEST",
      buyerConfirmed: false,
      cancelled: false,
      items: [{ price: 85000, q: 1 }],
      total: 95000,
    };
    await db
      .prepare(
        "INSERT INTO market_orders(id,country,buyer_user_id,request_key,revision,snapshot,created_at,updated_at) VALUES (?,'CD',?,? ,0,?,?,?)",
      )
      .bind(
        order.id,
        user,
        order.id,
        JSON.stringify(order),
        Date.now(),
        Date.now(),
      )
      .run();
    const call = (identity, reference = order.id, amount = 99999999) =>
      handleCoins(
        new Request("https://yaviya.test/api/coupons", {
          method: "POST",
          headers: {
            Origin: "https://yaviya.test",
            "yaviya-user-id": identity,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ kind: "earn", reference, amount }),
        }),
        { DB: db },
      );
    assert.equal((await call(user)).status, 409);
    order.buyerConfirmed = true;
    await db
      .prepare("UPDATE market_orders SET snapshot=? WHERE id=?")
      .bind(JSON.stringify(order), order.id)
      .run();
    const accepted = await call(user);
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).balance, 42);
    assert.equal(
      (await (await call(user)).json()).balance,
      42,
      "replay cannot double credit",
    );
    assert.equal((await call(user, "YV-NOT-FOUND")).status, 409);
  } finally {
    await db.close();
  }
});
