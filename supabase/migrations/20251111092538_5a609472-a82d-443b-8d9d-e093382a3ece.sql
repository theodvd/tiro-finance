-- A. Tables snapshots (header) et snapshot_lines améliorés
CREATE TABLE IF NOT EXISTS public.snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  snapshot_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_invested_eur NUMERIC NOT NULL DEFAULT 0,
  total_value_eur NUMERIC NOT NULL DEFAULT 0,
  pnl_eur NUMERIC NOT NULL DEFAULT 0,
  pnl_pct NUMERIC NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user_ts ON public.snapshots(user_id, snapshot_ts DESC);

-- Améliorer snapshot_lines pour inclure région et secteur
ALTER TABLE public.snapshot_lines ADD COLUMN IF NOT EXISTS snapshot_id UUID REFERENCES public.snapshots(id) ON DELETE CASCADE;
ALTER TABLE public.snapshot_lines ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.snapshot_lines ADD COLUMN IF NOT EXISTS sector TEXT;
ALTER TABLE public.snapshot_lines ADD COLUMN IF NOT EXISTS asset_class asset_class;

CREATE INDEX IF NOT EXISTS idx_snapshot_lines_snapshot ON public.snapshot_lines(snapshot_id);

-- Ajouter région et secteur à securities si pas déjà présents
ALTER TABLE public.securities ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.securities ADD COLUMN IF NOT EXISTS sector TEXT;

-- B. Vues d'agrégation

-- Dernier snapshot par user
CREATE OR REPLACE VIEW public.v_latest_snapshot AS
SELECT s.*
FROM public.snapshots s
WHERE s.snapshot_ts = (
  SELECT MAX(snapshot_ts) FROM public.snapshots s2 WHERE s2.user_id = s.user_id
);

-- Time-series des totaux (pour la courbe)
CREATE OR REPLACE VIEW public.v_snapshot_totals AS
SELECT
  s.user_id,
  DATE_TRUNC('day', s.snapshot_ts) as d,
  s.total_value_eur::numeric as total_value_eur,
  s.total_invested_eur::numeric as total_invested_eur
FROM public.snapshots s
ORDER BY d;

-- Allocations (dernier snapshot) : par compte
CREATE OR REPLACE VIEW public.v_latest_alloc_by_account AS
SELECT
  l.user_id,
  l.account_id,
  COALESCE(a.name, 'Unknown') as account_name,
  COALESCE(a.type::text, 'OTHER') as account_type,
  SUM(l.market_value_eur)::numeric as value_eur
FROM public.snapshot_lines l
JOIN public.v_latest_snapshot s ON s.id = l.snapshot_id
LEFT JOIN public.accounts a ON a.id = l.account_id
GROUP BY l.user_id, l.account_id, account_name, account_type
ORDER BY value_eur DESC;

-- Par classe d'actif
CREATE OR REPLACE VIEW public.v_latest_alloc_by_asset_class AS
SELECT
  l.user_id,
  COALESCE(l.asset_class::text, 'OTHER') as asset_class,
  SUM(l.market_value_eur)::numeric as value_eur
FROM public.snapshot_lines l
JOIN public.v_latest_snapshot s ON s.id = l.snapshot_id
GROUP BY l.user_id, asset_class
ORDER BY value_eur DESC;

-- Par région
CREATE OR REPLACE VIEW public.v_latest_alloc_by_region AS
SELECT
  l.user_id,
  COALESCE(NULLIF(l.region,''), 'Unknown') as region,
  SUM(l.market_value_eur)::numeric as value_eur
FROM public.snapshot_lines l
JOIN public.v_latest_snapshot s ON s.id = l.snapshot_id
GROUP BY l.user_id, region
ORDER BY value_eur DESC;

-- Par secteur
CREATE OR REPLACE VIEW public.v_latest_alloc_by_sector AS
SELECT
  l.user_id,
  COALESCE(NULLIF(l.sector,''), 'Unknown') as sector,
  SUM(l.market_value_eur)::numeric as value_eur
FROM public.snapshot_lines l
JOIN public.v_latest_snapshot s ON s.id = l.snapshot_id
GROUP BY l.user_id, sector
ORDER BY value_eur DESC;

-- RLS policies pour snapshots
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own snapshots" ON public.snapshots;
CREATE POLICY "Users can view their own snapshots"
  ON public.snapshots FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own snapshots" ON public.snapshots;
CREATE POLICY "Users can insert their own snapshots"
  ON public.snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policies pour snapshot_lines (mise à jour)
DROP POLICY IF EXISTS "Users can insert their own snapshots" ON public.snapshot_lines;
DROP POLICY IF EXISTS "Users can view their own snapshots" ON public.snapshot_lines;

CREATE POLICY "Users can view their own snapshot lines"
  ON public.snapshot_lines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshot lines"
  ON public.snapshot_lines FOR INSERT
  WITH CHECK (auth.uid() = user_id);