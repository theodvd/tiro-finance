-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Custom types
DO $$ BEGIN
  CREATE TYPE public.account_type AS ENUM ('PEA', 'CTO', 'AV', 'CRYPTO', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.asset_class AS ENUM ('STOCK', 'ETF', 'CRYPTO', 'BOND', 'REIT', 'CASH');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.pricing_source AS ENUM ('YFINANCE', 'COINGECKO', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 1. ACCOUNTS
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type public.account_type NOT NULL DEFAULT 'OTHER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);

-- 2. SECURITIES
CREATE TABLE IF NOT EXISTS public.securities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_class public.asset_class NOT NULL DEFAULT 'STOCK',
  currency_quote TEXT NOT NULL DEFAULT 'EUR',
  pricing_source public.pricing_source NOT NULL DEFAULT 'MANUAL',
  region TEXT,
  sector TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_securities_user ON public.securities(user_id);
CREATE INDEX IF NOT EXISTS idx_securities_symbol ON public.securities(symbol);
CREATE UNIQUE INDEX IF NOT EXISTS ux_securities_user_symbol ON public.securities(user_id, symbol);

-- 3. HOLDINGS
CREATE TABLE IF NOT EXISTS public.holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES public.securities(id) ON DELETE CASCADE,
  shares NUMERIC NOT NULL DEFAULT 0,
  avg_buy_price_native NUMERIC,
  amount_invested_eur NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holdings_user ON public.holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_account ON public.holdings(account_id);
CREATE INDEX IF NOT EXISTS idx_holdings_security ON public.holdings(security_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_holdings_user_account_security ON public.holdings(user_id, account_id, security_id);

-- 4. FX_RATES
CREATE TABLE IF NOT EXISTS public.fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base TEXT NOT NULL DEFAULT 'EUR',
  quote TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  asof DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_fx_rates_base_quote_asof ON public.fx_rates(base, quote, asof);

-- 5. MARKET_DATA
CREATE TABLE IF NOT EXISTS public.market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES public.securities(id) ON DELETE CASCADE,
  native_ccy TEXT NOT NULL,
  last_px_native NUMERIC NOT NULL,
  eur_fx NUMERIC NOT NULL DEFAULT 1,
  last_px_eur NUMERIC NOT NULL,
  last_close_dt TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_md_security ON public.market_data(security_id);
CREATE INDEX IF NOT EXISTS idx_md_updated ON public.market_data(updated_at DESC);

-- 6. SNAPSHOTS
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

-- Function for immutable date extraction
CREATE OR REPLACE FUNCTION public.extract_date_immutable(ts TIMESTAMPTZ)
RETURNS DATE
LANGUAGE SQL
IMMUTABLE
SET search_path = public
AS $$
  SELECT ts::date;
$$;

-- Unique constraint: 1 snapshot per user per day
CREATE UNIQUE INDEX IF NOT EXISTS ux_snapshots_user_day
ON public.snapshots (user_id, extract_date_immutable(snapshot_ts));

-- 7. SNAPSHOT_LINES
CREATE TABLE IF NOT EXISTS public.snapshot_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  snapshot_id UUID REFERENCES public.snapshots(id) ON DELETE CASCADE,
  valuation_date DATE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  security_id UUID REFERENCES public.securities(id) ON DELETE SET NULL,
  asset_class public.asset_class,
  region TEXT,
  sector TEXT,
  shares NUMERIC NOT NULL DEFAULT 0,
  last_px_eur NUMERIC,
  market_value_eur NUMERIC NOT NULL DEFAULT 0,
  cost_eur NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sl_user ON public.snapshot_lines(user_id);
CREATE INDEX IF NOT EXISTS idx_sl_snapshot ON public.snapshot_lines(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_sl_valuation ON public.snapshot_lines(valuation_date);

-- Trigger to sync valuation_date with snapshot header
CREATE OR REPLACE FUNCTION public.set_snapshot_line_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.snapshot_id IS NOT NULL THEN
    SELECT snapshot_ts::date INTO NEW.valuation_date
    FROM public.snapshots WHERE id = NEW.snapshot_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_snapshot_line_date ON public.snapshot_lines;
CREATE TRIGGER trg_set_snapshot_line_date
BEFORE INSERT ON public.snapshot_lines
FOR EACH ROW EXECUTE FUNCTION public.set_snapshot_line_date();

-- Trigger for updated_at on accounts
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accounts_updated ON public.accounts;
CREATE TRIGGER trg_accounts_updated
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_securities_updated ON public.securities;
CREATE TRIGGER trg_securities_updated
BEFORE UPDATE ON public.securities
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_holdings_updated ON public.holdings;
CREATE TRIGGER trg_holdings_updated
BEFORE UPDATE ON public.holdings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.securities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ACCOUNTS
DROP POLICY IF EXISTS acc_sel ON public.accounts;
DROP POLICY IF EXISTS acc_ins ON public.accounts;
DROP POLICY IF EXISTS acc_upd ON public.accounts;
DROP POLICY IF EXISTS acc_del ON public.accounts;

CREATE POLICY acc_sel ON public.accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY acc_ins ON public.accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY acc_upd ON public.accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY acc_del ON public.accounts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for SECURITIES
DROP POLICY IF EXISTS sec_sel ON public.securities;
DROP POLICY IF EXISTS sec_ins ON public.securities;
DROP POLICY IF EXISTS sec_upd ON public.securities;
DROP POLICY IF EXISTS sec_del ON public.securities;

CREATE POLICY sec_sel ON public.securities
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY sec_ins ON public.securities
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY sec_upd ON public.securities
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY sec_del ON public.securities
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for HOLDINGS
DROP POLICY IF EXISTS h_sel ON public.holdings;
DROP POLICY IF EXISTS h_ins ON public.holdings;
DROP POLICY IF EXISTS h_upd ON public.holdings;
DROP POLICY IF EXISTS h_del ON public.holdings;

CREATE POLICY h_sel ON public.holdings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY h_ins ON public.holdings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY h_upd ON public.holdings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY h_del ON public.holdings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for FX_RATES (public read, no write from client)
DROP POLICY IF EXISTS fx_sel ON public.fx_rates;
CREATE POLICY fx_sel ON public.fx_rates
  FOR SELECT USING (true);

-- RLS Policies for MARKET_DATA (via securities ownership)
DROP POLICY IF EXISTS md_sel ON public.market_data;
DROP POLICY IF EXISTS md_ins ON public.market_data;
DROP POLICY IF EXISTS md_upd ON public.market_data;

CREATE POLICY md_sel ON public.market_data
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.securities s
            WHERE s.id = market_data.security_id AND s.user_id = auth.uid())
  );
CREATE POLICY md_ins ON public.market_data
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.securities s
            WHERE s.id = security_id AND s.user_id = auth.uid())
  );
CREATE POLICY md_upd ON public.market_data
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.securities s
            WHERE s.id = market_data.security_id AND s.user_id = auth.uid())
  );

-- RLS Policies for SNAPSHOTS
DROP POLICY IF EXISTS s_sel ON public.snapshots;
DROP POLICY IF EXISTS s_ins ON public.snapshots;

CREATE POLICY s_sel ON public.snapshots
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY s_ins ON public.snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for SNAPSHOT_LINES
DROP POLICY IF EXISTS sl_sel ON public.snapshot_lines;
DROP POLICY IF EXISTS sl_ins ON public.snapshot_lines;

CREATE POLICY sl_sel ON public.snapshot_lines
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY sl_ins ON public.snapshot_lines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- VIEWS

-- Latest market price per security
CREATE OR REPLACE VIEW public.v_latest_market_price AS
SELECT DISTINCT ON (md.security_id)
  md.security_id,
  md.last_px_eur,
  md.updated_at
FROM public.market_data md
ORDER BY md.security_id, md.updated_at DESC;

-- Latest snapshot per user
CREATE OR REPLACE VIEW public.v_latest_snapshot AS
SELECT DISTINCT ON (s.user_id)
  s.*
FROM public.snapshots s
ORDER BY s.user_id, s.snapshot_ts DESC;

-- Time-series of totals (daily)
CREATE OR REPLACE VIEW public.v_snapshot_totals AS
SELECT
  s.user_id,
  s.snapshot_ts AS d,
  s.total_value_eur,
  s.total_invested_eur
FROM public.snapshots s
ORDER BY s.user_id, s.snapshot_ts;

-- Allocation by account (latest snapshot)
CREATE OR REPLACE VIEW public.v_latest_alloc_by_account AS
SELECT
  l.user_id,
  l.account_id,
  COALESCE(a.name, 'Unknown') AS account_name,
  COALESCE(a.type::text, 'OTHER') AS account_type,
  SUM(l.market_value_eur) AS value_eur
FROM public.snapshot_lines l
JOIN public.v_latest_snapshot s ON s.id = l.snapshot_id
LEFT JOIN public.accounts a ON a.id = l.account_id
GROUP BY l.user_id, l.account_id, a.name, a.type;

-- Allocation by asset class (latest snapshot)
CREATE OR REPLACE VIEW public.v_latest_alloc_by_asset_class AS
SELECT
  l.user_id,
  COALESCE(l.asset_class::text, 'OTHER') AS asset_class,
  SUM(l.market_value_eur) AS value_eur
FROM public.snapshot_lines l
JOIN public.v_latest_snapshot s ON s.id = l.snapshot_id
GROUP BY l.user_id, l.asset_class;

-- Allocation by region (latest snapshot)
CREATE OR REPLACE VIEW public.v_latest_alloc_by_region AS
SELECT
  l.user_id,
  COALESCE(NULLIF(l.region, ''), 'Unknown') AS region,
  SUM(l.market_value_eur) AS value_eur
FROM public.snapshot_lines l
JOIN public.v_latest_snapshot s ON s.id = l.snapshot_id
GROUP BY l.user_id, l.region;

-- Allocation by sector (latest snapshot)
CREATE OR REPLACE VIEW public.v_latest_alloc_by_sector AS
SELECT
  l.user_id,
  COALESCE(NULLIF(l.sector, ''), 'Unknown') AS sector,
  SUM(l.market_value_eur) AS value_eur
FROM public.snapshot_lines l
JOIN public.v_latest_snapshot s ON s.id = l.snapshot_id
GROUP BY l.user_id, l.sector;