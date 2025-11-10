-- 1) Create a brand-new enum without EQUITY
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_class_new') THEN
    CREATE TYPE public.asset_class_new AS ENUM ('STOCK','ETF','CRYPTO','BOND','REIT','CASH');
  END IF;
END $$;

-- 2) Re-type the column to the new enum, mapping EQUITY -> STOCK defensively
ALTER TABLE public.securities
  ALTER COLUMN asset_class TYPE public.asset_class_new
  USING CASE
         WHEN asset_class::text = 'EQUITY' THEN 'STOCK'::public.asset_class_new
         ELSE asset_class::text::public.asset_class_new
       END;

-- 3) Drop the old enum and rename the new one to the canonical name
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_class') THEN
    DROP TYPE public.asset_class;
  END IF;
END $$;

ALTER TYPE public.asset_class_new RENAME TO asset_class;

-- 4) Default (recommended)
ALTER TABLE public.securities
  ALTER COLUMN asset_class SET DEFAULT 'STOCK';