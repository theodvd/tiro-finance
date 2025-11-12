--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_type AS ENUM (
    'CTO',
    'PEA',
    'AV',
    'CRYPTO',
    'LIVRETS',
    'OTHER'
);


--
-- Name: asset_class; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.asset_class AS ENUM (
    'STOCK',
    'ETF',
    'CRYPTO',
    'BOND',
    'REIT',
    'CASH'
);


--
-- Name: import_job_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.import_job_status AS ENUM (
    'PENDING',
    'OK',
    'ERROR'
);


--
-- Name: import_job_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.import_job_type AS ENUM (
    'PRICE_REFRESH',
    'SNAPSHOT',
    'CSV_IMPORT'
);


--
-- Name: pricing_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pricing_source AS ENUM (
    'YFINANCE',
    'COINGECKO',
    'MANUAL'
);


--
-- Name: extract_date_immutable(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.extract_date_immutable(ts timestamp with time zone) RETURNS date
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  SELECT ts::date;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: set_snapshot_line_date(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_snapshot_line_date() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.snapshot_id IS NOT NULL THEN
    SELECT snapshot_ts::date INTO NEW.valuation_date
    FROM public.snapshots WHERE id = NEW.snapshot_id;
  END IF;
  RETURN NEW;
END $$;


SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    type public.account_type NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fx_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fx_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    base text DEFAULT 'EUR'::text NOT NULL,
    quote text NOT NULL,
    rate numeric(18,8) NOT NULL,
    asof date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: holdings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.holdings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_id uuid NOT NULL,
    security_id uuid NOT NULL,
    shares numeric(18,6) DEFAULT 0 NOT NULL,
    avg_buy_price_native numeric(18,6),
    amount_invested_eur numeric(18,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: import_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type public.import_job_type NOT NULL,
    status public.import_job_status DEFAULT 'PENDING'::public.import_job_status NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: market_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    security_id uuid NOT NULL,
    native_ccy text NOT NULL,
    last_px_native numeric(18,6) NOT NULL,
    eur_fx numeric(18,8) DEFAULT 1 NOT NULL,
    last_px_eur numeric(18,6) NOT NULL,
    last_close_dt timestamp with time zone NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: securities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.securities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    symbol text NOT NULL,
    asset_class public.asset_class DEFAULT 'STOCK'::public.asset_class NOT NULL,
    currency_quote text NOT NULL,
    pricing_source public.pricing_source NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    region text,
    sector text
);


--
-- Name: snapshot_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.snapshot_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    valuation_date date DEFAULT CURRENT_DATE NOT NULL,
    account_id uuid NOT NULL,
    security_id uuid NOT NULL,
    shares numeric(18,6) NOT NULL,
    last_px_eur numeric(18,6) NOT NULL,
    market_value_eur numeric(18,2) NOT NULL,
    cost_eur numeric(18,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    snapshot_id uuid,
    region text,
    sector text,
    asset_class public.asset_class
);


--
-- Name: snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    snapshot_ts timestamp with time zone DEFAULT now() NOT NULL,
    total_invested_eur numeric DEFAULT 0 NOT NULL,
    total_value_eur numeric DEFAULT 0 NOT NULL,
    pnl_eur numeric DEFAULT 0 NOT NULL,
    pnl_pct numeric DEFAULT 0 NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: v_latest_snapshot; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_latest_snapshot AS
 SELECT id,
    user_id,
    snapshot_ts,
    total_invested_eur,
    total_value_eur,
    pnl_eur,
    pnl_pct,
    meta,
    created_at
   FROM public.snapshots s
  WHERE (snapshot_ts = ( SELECT max(s2.snapshot_ts) AS max
           FROM public.snapshots s2
          WHERE (s2.user_id = s.user_id)));


--
-- Name: v_latest_alloc_by_account; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_latest_alloc_by_account AS
 SELECT l.user_id,
    l.account_id,
    COALESCE(a.name, 'Unknown'::text) AS account_name,
    COALESCE((a.type)::text, 'OTHER'::text) AS account_type,
    sum(l.market_value_eur) AS value_eur
   FROM ((public.snapshot_lines l
     JOIN public.v_latest_snapshot s ON ((s.id = l.snapshot_id)))
     LEFT JOIN public.accounts a ON ((a.id = l.account_id)))
  GROUP BY l.user_id, l.account_id, COALESCE(a.name, 'Unknown'::text), COALESCE((a.type)::text, 'OTHER'::text)
  ORDER BY (sum(l.market_value_eur)) DESC;


--
-- Name: v_latest_alloc_by_asset_class; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_latest_alloc_by_asset_class AS
 SELECT l.user_id,
    COALESCE((l.asset_class)::text, 'OTHER'::text) AS asset_class,
    sum(l.market_value_eur) AS value_eur
   FROM (public.snapshot_lines l
     JOIN public.v_latest_snapshot s ON ((s.id = l.snapshot_id)))
  GROUP BY l.user_id, l.asset_class
  ORDER BY (sum(l.market_value_eur)) DESC;


--
-- Name: v_latest_alloc_by_region; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_latest_alloc_by_region AS
 SELECT l.user_id,
    COALESCE(NULLIF(l.region, ''::text), 'Unknown'::text) AS region,
    sum(l.market_value_eur) AS value_eur
   FROM (public.snapshot_lines l
     JOIN public.v_latest_snapshot s ON ((s.id = l.snapshot_id)))
  GROUP BY l.user_id, l.region
  ORDER BY (sum(l.market_value_eur)) DESC;


--
-- Name: v_latest_alloc_by_sector; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_latest_alloc_by_sector AS
 SELECT l.user_id,
    COALESCE(NULLIF(l.sector, ''::text), 'Unknown'::text) AS sector,
    sum(l.market_value_eur) AS value_eur
   FROM (public.snapshot_lines l
     JOIN public.v_latest_snapshot s ON ((s.id = l.snapshot_id)))
  GROUP BY l.user_id, l.sector
  ORDER BY (sum(l.market_value_eur)) DESC;


--
-- Name: v_latest_market_price; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_latest_market_price AS
 SELECT DISTINCT ON (security_id) security_id,
    last_px_eur,
    updated_at
   FROM public.market_data md
  ORDER BY security_id, updated_at DESC;


--
-- Name: v_snapshot_totals; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_snapshot_totals AS
 SELECT user_id,
    date_trunc('day'::text, snapshot_ts) AS d,
    total_value_eur,
    total_invested_eur
   FROM public.snapshots s
  ORDER BY (date_trunc('day'::text, snapshot_ts));


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_user_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_name_key UNIQUE (user_id, name);


--
-- Name: fx_rates fx_rates_base_quote_asof_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fx_rates
    ADD CONSTRAINT fx_rates_base_quote_asof_key UNIQUE (base, quote, asof);


--
-- Name: fx_rates fx_rates_base_quote_asof_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fx_rates
    ADD CONSTRAINT fx_rates_base_quote_asof_unique UNIQUE (base, quote, asof);


--
-- Name: fx_rates fx_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fx_rates
    ADD CONSTRAINT fx_rates_pkey PRIMARY KEY (id);


--
-- Name: holdings holdings_account_id_security_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holdings
    ADD CONSTRAINT holdings_account_id_security_id_key UNIQUE (account_id, security_id);


--
-- Name: holdings holdings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holdings
    ADD CONSTRAINT holdings_pkey PRIMARY KEY (id);


--
-- Name: import_jobs import_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_pkey PRIMARY KEY (id);


--
-- Name: market_data market_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_data
    ADD CONSTRAINT market_data_pkey PRIMARY KEY (id);


--
-- Name: market_data market_data_security_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_data
    ADD CONSTRAINT market_data_security_id_key UNIQUE (security_id);


--
-- Name: securities securities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.securities
    ADD CONSTRAINT securities_pkey PRIMARY KEY (id);


--
-- Name: securities securities_user_id_symbol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.securities
    ADD CONSTRAINT securities_user_id_symbol_key UNIQUE (user_id, symbol);


--
-- Name: snapshot_lines snapshot_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshot_lines
    ADD CONSTRAINT snapshot_lines_pkey PRIMARY KEY (id);


--
-- Name: snapshot_lines snapshot_lines_user_id_valuation_date_account_id_security_i_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshot_lines
    ADD CONSTRAINT snapshot_lines_user_id_valuation_date_account_id_security_i_key UNIQUE (user_id, valuation_date, account_id, security_id);


--
-- Name: snapshots snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshots
    ADD CONSTRAINT snapshots_pkey PRIMARY KEY (id);


--
-- Name: idx_accounts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_user_id ON public.accounts USING btree (user_id);


--
-- Name: idx_fx_rates_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fx_rates_quote ON public.fx_rates USING btree (quote, asof DESC);


--
-- Name: idx_holdings_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holdings_account_id ON public.holdings USING btree (account_id);


--
-- Name: idx_holdings_security_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holdings_security_id ON public.holdings USING btree (security_id);


--
-- Name: idx_holdings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holdings_user_id ON public.holdings USING btree (user_id);


--
-- Name: idx_import_jobs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_jobs_created_at ON public.import_jobs USING btree (created_at DESC);


--
-- Name: idx_import_jobs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_jobs_user_id ON public.import_jobs USING btree (user_id);


--
-- Name: idx_market_data_security_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_data_security_id ON public.market_data USING btree (security_id);


--
-- Name: idx_securities_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_securities_user_id ON public.securities USING btree (user_id);


--
-- Name: idx_snapshot_lines_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snapshot_lines_account_id ON public.snapshot_lines USING btree (account_id);


--
-- Name: idx_snapshot_lines_security_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snapshot_lines_security_id ON public.snapshot_lines USING btree (security_id);


--
-- Name: idx_snapshot_lines_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snapshot_lines_snapshot ON public.snapshot_lines USING btree (snapshot_id);


--
-- Name: idx_snapshot_lines_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snapshot_lines_user_id ON public.snapshot_lines USING btree (user_id);


--
-- Name: idx_snapshot_lines_valuation_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snapshot_lines_valuation_date ON public.snapshot_lines USING btree (valuation_date);


--
-- Name: idx_snapshots_user_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_snapshots_user_ts ON public.snapshots USING btree (user_id, snapshot_ts DESC);


--
-- Name: ux_snapshots_user_day; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_snapshots_user_day ON public.snapshots USING btree (user_id, public.extract_date_immutable(snapshot_ts));


--
-- Name: accounts accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: holdings holdings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER holdings_updated_at BEFORE UPDATE ON public.holdings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: securities securities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER securities_updated_at BEFORE UPDATE ON public.securities FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: snapshot_lines trg_set_snapshot_line_date; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_snapshot_line_date BEFORE INSERT ON public.snapshot_lines FOR EACH ROW EXECUTE FUNCTION public.set_snapshot_line_date();


--
-- Name: accounts accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: holdings holdings_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holdings
    ADD CONSTRAINT holdings_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: holdings holdings_security_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holdings
    ADD CONSTRAINT holdings_security_id_fkey FOREIGN KEY (security_id) REFERENCES public.securities(id) ON DELETE CASCADE;


--
-- Name: holdings holdings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holdings
    ADD CONSTRAINT holdings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: import_jobs import_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: market_data market_data_security_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_data
    ADD CONSTRAINT market_data_security_id_fkey FOREIGN KEY (security_id) REFERENCES public.securities(id) ON DELETE CASCADE;


--
-- Name: securities securities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.securities
    ADD CONSTRAINT securities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: snapshot_lines snapshot_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshot_lines
    ADD CONSTRAINT snapshot_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: snapshot_lines snapshot_lines_security_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshot_lines
    ADD CONSTRAINT snapshot_lines_security_id_fkey FOREIGN KEY (security_id) REFERENCES public.securities(id) ON DELETE CASCADE;


--
-- Name: snapshot_lines snapshot_lines_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshot_lines
    ADD CONSTRAINT snapshot_lines_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.snapshots(id) ON DELETE CASCADE;


--
-- Name: snapshot_lines snapshot_lines_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshot_lines
    ADD CONSTRAINT snapshot_lines_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: fx_rates Anyone can view FX rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view FX rates" ON public.fx_rates FOR SELECT TO authenticated USING (true);


--
-- Name: fx_rates Block all client access to fx_rates writes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block all client access to fx_rates writes" ON public.fx_rates TO authenticated USING (false) WITH CHECK (false);


--
-- Name: accounts Users can delete their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own accounts" ON public.accounts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: holdings Users can delete their own holdings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own holdings" ON public.holdings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: securities Users can delete their own securities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own securities" ON public.securities FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: market_data Users can insert market data for their securities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert market data for their securities" ON public.market_data FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.securities
  WHERE ((securities.id = market_data.security_id) AND (securities.user_id = auth.uid())))));


--
-- Name: accounts Users can insert their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own accounts" ON public.accounts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: holdings Users can insert their own holdings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own holdings" ON public.holdings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: import_jobs Users can insert their own import jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own import jobs" ON public.import_jobs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: securities Users can insert their own securities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own securities" ON public.securities FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: snapshot_lines Users can insert their own snapshot lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own snapshot lines" ON public.snapshot_lines FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: snapshots Users can insert their own snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own snapshots" ON public.snapshots FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: market_data Users can update market data for their securities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update market data for their securities" ON public.market_data FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.securities
  WHERE ((securities.id = market_data.security_id) AND (securities.user_id = auth.uid())))));


--
-- Name: accounts Users can update their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own accounts" ON public.accounts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: holdings Users can update their own holdings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own holdings" ON public.holdings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: import_jobs Users can update their own import jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own import jobs" ON public.import_jobs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: securities Users can update their own securities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own securities" ON public.securities FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: market_data Users can view market data for their securities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view market data for their securities" ON public.market_data FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.securities
  WHERE ((securities.id = market_data.security_id) AND (securities.user_id = auth.uid())))));


--
-- Name: accounts Users can view their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own accounts" ON public.accounts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: holdings Users can view their own holdings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own holdings" ON public.holdings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: import_jobs Users can view their own import jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own import jobs" ON public.import_jobs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: securities Users can view their own securities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own securities" ON public.securities FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: snapshot_lines Users can view their own snapshot lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own snapshot lines" ON public.snapshot_lines FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: snapshots Users can view their own snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own snapshots" ON public.snapshots FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: fx_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: holdings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

--
-- Name: import_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: market_data; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;

--
-- Name: market_data market_data_select_via_security; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY market_data_select_via_security ON public.market_data FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.securities s
  WHERE ((s.id = market_data.security_id) AND (s.user_id = auth.uid())))));


--
-- Name: securities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.securities ENABLE ROW LEVEL SECURITY;

--
-- Name: snapshot_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.snapshot_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


