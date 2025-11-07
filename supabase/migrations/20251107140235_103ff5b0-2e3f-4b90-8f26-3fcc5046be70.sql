-- Investment Dashboard Database Schema

-- Enums for type safety
CREATE TYPE public.account_type AS ENUM ('CTO', 'PEA', 'AV', 'CRYPTO', 'LIVRETS', 'OTHER');
CREATE TYPE public.asset_class AS ENUM ('EQUITY', 'ETF', 'CRYPTO', 'BOND', 'REIT', 'CASH');
CREATE TYPE public.pricing_source AS ENUM ('YFINANCE', 'COINGECKO', 'MANUAL');
CREATE TYPE public.import_job_type AS ENUM ('PRICE_REFRESH', 'SNAPSHOT', 'CSV_IMPORT');
CREATE TYPE public.import_job_status AS ENUM ('PENDING', 'OK', 'ERROR');

-- Accounts table (investment accounts like CTO, PEA, etc.)
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type account_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own accounts"
  ON public.accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts"
  ON public.accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
  ON public.accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
  ON public.accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Securities table (stocks, ETFs, crypto, etc.)
CREATE TABLE public.securities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  asset_class asset_class NOT NULL,
  currency_quote TEXT NOT NULL,
  pricing_source pricing_source NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, symbol)
);

CREATE INDEX idx_securities_user_id ON public.securities(user_id);

ALTER TABLE public.securities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own securities"
  ON public.securities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own securities"
  ON public.securities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own securities"
  ON public.securities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own securities"
  ON public.securities FOR DELETE
  USING (auth.uid() = user_id);

-- Holdings table (positions in each account)
CREATE TABLE public.holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES public.securities(id) ON DELETE CASCADE,
  shares DECIMAL(18, 6) NOT NULL DEFAULT 0,
  avg_buy_price_native DECIMAL(18, 6),
  amount_invested_eur DECIMAL(18, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, security_id)
);

CREATE INDEX idx_holdings_user_id ON public.holdings(user_id);
CREATE INDEX idx_holdings_account_id ON public.holdings(account_id);
CREATE INDEX idx_holdings_security_id ON public.holdings(security_id);

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own holdings"
  ON public.holdings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own holdings"
  ON public.holdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holdings"
  ON public.holdings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holdings"
  ON public.holdings FOR DELETE
  USING (auth.uid() = user_id);

-- Market Data table (current prices for each security)
CREATE TABLE public.market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES public.securities(id) ON DELETE CASCADE,
  native_ccy TEXT NOT NULL,
  last_px_native DECIMAL(18, 6) NOT NULL,
  eur_fx DECIMAL(18, 8) NOT NULL DEFAULT 1,
  last_px_eur DECIMAL(18, 6) NOT NULL,
  last_close_dt TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(security_id)
);

CREATE INDEX idx_market_data_security_id ON public.market_data(security_id);

ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view market data for their securities"
  ON public.market_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.securities
      WHERE securities.id = market_data.security_id
      AND securities.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert market data for their securities"
  ON public.market_data FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.securities
      WHERE securities.id = market_data.security_id
      AND securities.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update market data for their securities"
  ON public.market_data FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.securities
      WHERE securities.id = market_data.security_id
      AND securities.user_id = auth.uid()
    )
  );

-- FX Rates table (exchange rates cache)
CREATE TABLE public.fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base TEXT NOT NULL DEFAULT 'EUR',
  quote TEXT NOT NULL,
  rate DECIMAL(18, 8) NOT NULL,
  asof DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(base, quote, asof)
);

CREATE INDEX idx_fx_rates_quote ON public.fx_rates(quote, asof DESC);

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view FX rates"
  ON public.fx_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert FX rates"
  ON public.fx_rates FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Snapshot Lines table (monthly historical snapshots)
CREATE TABLE public.snapshot_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valuation_date DATE NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES public.securities(id) ON DELETE CASCADE,
  shares DECIMAL(18, 6) NOT NULL,
  last_px_eur DECIMAL(18, 6) NOT NULL,
  market_value_eur DECIMAL(18, 2) NOT NULL,
  cost_eur DECIMAL(18, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, valuation_date, account_id, security_id)
);

CREATE INDEX idx_snapshot_lines_user_id ON public.snapshot_lines(user_id);
CREATE INDEX idx_snapshot_lines_valuation_date ON public.snapshot_lines(valuation_date);
CREATE INDEX idx_snapshot_lines_account_id ON public.snapshot_lines(account_id);
CREATE INDEX idx_snapshot_lines_security_id ON public.snapshot_lines(security_id);

ALTER TABLE public.snapshot_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots"
  ON public.snapshot_lines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
  ON public.snapshot_lines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Import Jobs table (tracking data imports and updates)
CREATE TABLE public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type import_job_type NOT NULL,
  status import_job_status NOT NULL DEFAULT 'PENDING',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_import_jobs_user_id ON public.import_jobs(user_id);
CREATE INDEX idx_import_jobs_created_at ON public.import_jobs(created_at DESC);

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own import jobs"
  ON public.import_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own import jobs"
  ON public.import_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import jobs"
  ON public.import_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER securities_updated_at
  BEFORE UPDATE ON public.securities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER holdings_updated_at
  BEFORE UPDATE ON public.holdings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();