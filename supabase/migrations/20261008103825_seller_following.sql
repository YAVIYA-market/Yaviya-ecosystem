-- Private compatibility schema; ownership is enforced by the authenticated API.
CREATE TABLE IF NOT EXISTS runtime.seller_follows (
 country text NOT NULL CHECK(country IN ('CD','CG')),
 buyer_user_id text NOT NULL REFERENCES runtime.customers(user_id) ON DELETE CASCADE,
 seller_id integer NOT NULL CHECK(seller_id > 0),
 followed_at bigint NOT NULL,
 PRIMARY KEY(country,buyer_user_id,seller_id)
);
CREATE INDEX IF NOT EXISTS seller_follows_store_idx ON runtime.seller_follows(country,seller_id);
CREATE INDEX IF NOT EXISTS seller_follows_buyer_idx ON runtime.seller_follows(buyer_user_id);
ALTER TABLE runtime.seller_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime.seller_follows FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='runtime' AND tablename='seller_follows' AND policyname='server_runtime_only') THEN
  CREATE POLICY server_runtime_only ON runtime.seller_follows FOR ALL TO yaviya_runtime USING(true) WITH CHECK(true);
 END IF;
END $$;
REVOKE ALL ON runtime.seller_follows FROM public,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON runtime.seller_follows TO yaviya_runtime;
