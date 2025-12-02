-- Fix Security Definer Views: Recreate all views with security_invoker = true
-- This ensures views use the permissions of the calling user, not the view creator

-- Drop existing views
DROP VIEW IF EXISTS v_latest_alloc_by_account CASCADE;
DROP VIEW IF EXISTS v_latest_alloc_by_asset_class CASCADE;
DROP VIEW IF EXISTS v_latest_alloc_by_region CASCADE;
DROP VIEW IF EXISTS v_latest_alloc_by_sector CASCADE;
DROP VIEW IF EXISTS v_latest_market_price CASCADE;
DROP VIEW IF EXISTS v_snapshot_totals CASCADE;
DROP VIEW IF EXISTS v_latest_snapshot CASCADE;

-- Recreate v_latest_snapshot with security_invoker
CREATE VIEW v_latest_snapshot
WITH (security_invoker = true) AS
SELECT DISTINCT ON (user_id) 
  id,
  user_id,
  snapshot_ts,
  total_invested_eur,
  total_value_eur,
  pnl_eur,
  pnl_pct,
  meta,
  created_at
FROM snapshots s
ORDER BY user_id, snapshot_ts DESC;

-- Recreate v_snapshot_totals with security_invoker
CREATE VIEW v_snapshot_totals
WITH (security_invoker = true) AS
SELECT 
  user_id,
  snapshot_ts AS d,
  total_value_eur,
  total_invested_eur
FROM snapshots s
ORDER BY user_id, snapshot_ts;

-- Recreate v_latest_market_price with security_invoker
CREATE VIEW v_latest_market_price
WITH (security_invoker = true) AS
SELECT DISTINCT ON (security_id) 
  security_id,
  last_px_eur,
  updated_at
FROM market_data md
ORDER BY security_id, updated_at DESC;

-- Recreate v_latest_alloc_by_account with security_invoker
CREATE VIEW v_latest_alloc_by_account
WITH (security_invoker = true) AS
SELECT 
  l.user_id,
  l.account_id,
  COALESCE(a.name, 'Unknown') AS account_name,
  COALESCE(a.type::text, 'OTHER') AS account_type,
  SUM(l.market_value_eur) AS value_eur
FROM snapshot_lines l
JOIN v_latest_snapshot s ON s.id = l.snapshot_id
LEFT JOIN accounts a ON a.id = l.account_id
GROUP BY l.user_id, l.account_id, a.name, a.type;

-- Recreate v_latest_alloc_by_asset_class with security_invoker
CREATE VIEW v_latest_alloc_by_asset_class
WITH (security_invoker = true) AS
SELECT 
  l.user_id,
  COALESCE(l.asset_class::text, 'OTHER') AS asset_class,
  SUM(l.market_value_eur) AS value_eur
FROM snapshot_lines l
JOIN v_latest_snapshot s ON s.id = l.snapshot_id
GROUP BY l.user_id, l.asset_class;

-- Recreate v_latest_alloc_by_region with security_invoker
CREATE VIEW v_latest_alloc_by_region
WITH (security_invoker = true) AS
WITH latest_snapshots AS (
  SELECT DISTINCT ON (user_id) 
    id,
    user_id,
    snapshot_ts
  FROM snapshots
  ORDER BY user_id, snapshot_ts DESC
)
SELECT 
  ls.user_id,
  COALESCE(NULLIF(TRIM(sl.region), ''), 'Non classifié') AS region,
  SUM(sl.market_value_eur) AS value_eur
FROM snapshot_lines sl
JOIN latest_snapshots ls ON sl.snapshot_id = ls.id
GROUP BY ls.user_id, COALESCE(NULLIF(TRIM(sl.region), ''), 'Non classifié');

-- Recreate v_latest_alloc_by_sector with security_invoker
CREATE VIEW v_latest_alloc_by_sector
WITH (security_invoker = true) AS
WITH latest_snapshots AS (
  SELECT DISTINCT ON (user_id) 
    id,
    user_id,
    snapshot_ts
  FROM snapshots
  ORDER BY user_id, snapshot_ts DESC
)
SELECT 
  ls.user_id,
  COALESCE(NULLIF(TRIM(sl.sector), ''), 'Non classifié') AS sector,
  SUM(sl.market_value_eur) AS value_eur
FROM snapshot_lines sl
JOIN latest_snapshots ls ON sl.snapshot_id = ls.id
GROUP BY ls.user_id, COALESCE(NULLIF(TRIM(sl.sector), ''), 'Non classifié');