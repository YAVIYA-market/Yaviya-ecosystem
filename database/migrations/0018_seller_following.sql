CREATE TABLE seller_follows (
 country TEXT NOT NULL CHECK(country IN ('CD','CG')),
 buyer_user_id TEXT NOT NULL REFERENCES customers(user_id) ON DELETE CASCADE,
 seller_id INTEGER NOT NULL CHECK(seller_id > 0),
 followed_at INTEGER NOT NULL,
 PRIMARY KEY(country,buyer_user_id,seller_id)
);
--> statement-breakpoint
CREATE INDEX seller_follows_store_idx ON seller_follows(country,seller_id);
--> statement-breakpoint
CREATE INDEX seller_follows_buyer_idx ON seller_follows(buyer_user_id);
