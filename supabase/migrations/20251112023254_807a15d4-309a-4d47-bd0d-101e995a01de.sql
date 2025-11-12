-- 1) Create immutable function to extract date
CREATE OR REPLACE FUNCTION public.extract_date_immutable(ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ts::date;
$$;

-- 2) Unique index: 1 snapshot per user per day (using immutable function)
DROP INDEX IF EXISTS ux_snapshots_user_day;
CREATE UNIQUE INDEX ux_snapshots_user_day
  ON public.snapshots (user_id, extract_date_immutable(snapshot_ts));

-- 3) View: latest price per security (avoids nested queries)
CREATE OR REPLACE VIEW public.v_latest_market_price AS
SELECT DISTINCT ON (md.security_id)
  md.security_id,
  md.last_px_eur,
  md.updated_at
FROM public.market_data md
ORDER BY md.security_id, md.updated_at DESC;

-- 4) RLS: allow reading prices if user owns the security
DROP POLICY IF EXISTS market_data_select_via_security ON public.market_data;
CREATE POLICY market_data_select_via_security
ON public.market_data FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.securities s
    WHERE s.id = market_data.security_id
      AND s.user_id = auth.uid()
  )
);

-- 5) Trigger: set valuation_date from snapshot header
CREATE OR REPLACE FUNCTION public.set_snapshot_line_date()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.snapshot_id IS NOT NULL THEN
    SELECT snapshot_ts::date INTO NEW.valuation_date
    FROM public.snapshots WHERE id = NEW.snapshot_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_snapshot_line_date ON public.snapshot_lines;
CREATE TRIGGER trg_set_snapshot_line_date
BEFORE INSERT ON public.snapshot_lines
FOR EACH ROW EXECUTE FUNCTION public.set_snapshot_line_date();

-- 6) Default valuation_date
ALTER TABLE public.snapshot_lines
  ALTER COLUMN valuation_date SET DEFAULT CURRENT_DATE;