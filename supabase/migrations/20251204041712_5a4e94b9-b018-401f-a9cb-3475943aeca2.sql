-- Add investment_mode column to dca_plans table
-- 'amount' = invest exact amount in EUR (current behavior, fractional shares)
-- 'shares' = buy whole shares up to max amount budget

ALTER TABLE public.dca_plans
ADD COLUMN investment_mode text NOT NULL DEFAULT 'amount'
CHECK (investment_mode IN ('amount', 'shares'));

COMMENT ON COLUMN public.dca_plans.investment_mode IS 'Investment mode: amount (fixed EUR amount) or shares (whole shares with max budget)';