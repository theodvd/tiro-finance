-- Add ISIN column to securities table for reliable cross-broker matching
ALTER TABLE public.securities
ADD COLUMN IF NOT EXISTS isin TEXT;

-- ISIN should be unique per user (one user can't have duplicate ISINs)
CREATE UNIQUE INDEX IF NOT EXISTS ux_securities_user_isin
ON public.securities(user_id, isin)
WHERE isin IS NOT NULL;

-- Index for fast ISIN lookups
CREATE INDEX IF NOT EXISTS idx_securities_isin
ON public.securities(isin)
WHERE isin IS NOT NULL;