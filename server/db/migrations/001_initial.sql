CREATE TABLE IF NOT EXISTS machine (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  coins JSONB NOT NULL CHECK (jsonb_typeof(coins) = 'object'),
  cash_box_in_pence INTEGER NOT NULL CHECK (cash_box_in_pence >= 0),
  version INTEGER NOT NULL CHECK (version >= 0)
);

CREATE TABLE IF NOT EXISTS customer_rate_limit (
  customer_id TEXT PRIMARY KEY,
  attempts_ms BIGINT[] NOT NULL DEFAULT '{}' CHECK (cardinality(attempts_ms) <= 3),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO machine (id, coins, cash_box_in_pence, version)
VALUES (1, '{"200":10,"100":10,"50":10,"20":10,"10":10,"5":10,"2":10,"1":10}'::jsonb, 0, 0)
ON CONFLICT (id) DO NOTHING;
