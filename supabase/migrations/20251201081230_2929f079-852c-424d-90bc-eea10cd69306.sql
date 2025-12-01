-- Drop existing views
DROP VIEW IF EXISTS v_latest_alloc_by_region;
DROP VIEW IF EXISTS v_latest_alloc_by_sector;

-- Recreate v_latest_alloc_by_region with proper NULL handling
CREATE VIEW v_latest_alloc_by_region AS
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
  COALESCE(NULLIF(TRIM(sl.region), ''), 'Non classifié') as region,
  SUM(sl.market_value_eur) as value_eur
FROM snapshot_lines sl
JOIN latest_snapshots ls ON sl.snapshot_id = ls.id
GROUP BY ls.user_id, COALESCE(NULLIF(TRIM(sl.region), ''), 'Non classifié');

-- Recreate v_latest_alloc_by_sector with proper NULL handling
CREATE VIEW v_latest_alloc_by_sector AS
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
  COALESCE(NULLIF(TRIM(sl.sector), ''), 'Non classifié') as sector,
  SUM(sl.market_value_eur) as value_eur
FROM snapshot_lines sl
JOIN latest_snapshots ls ON sl.snapshot_id = ls.id
GROUP BY ls.user_id, COALESCE(NULLIF(TRIM(sl.sector), ''), 'Non classifié');