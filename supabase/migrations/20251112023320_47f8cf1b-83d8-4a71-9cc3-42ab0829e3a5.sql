-- Fix search_path for functions created in previous migration

-- 1) Update extract_date_immutable function
CREATE OR REPLACE FUNCTION public.extract_date_immutable(ts timestamptz)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ts::date;
$$;

-- 2) Update set_snapshot_line_date function  
CREATE OR REPLACE FUNCTION public.set_snapshot_line_date()
RETURNS trigger 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.snapshot_id IS NOT NULL THEN
    SELECT snapshot_ts::date INTO NEW.valuation_date
    FROM public.snapshots WHERE id = NEW.snapshot_id;
  END IF;
  RETURN NEW;
END $$;