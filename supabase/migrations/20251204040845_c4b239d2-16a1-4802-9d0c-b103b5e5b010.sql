-- Add source_account_id column to dca_plans table
-- This allows linking a DCA plan to a liquidity source (bridge_account)

ALTER TABLE public.dca_plans
ADD COLUMN source_account_id uuid REFERENCES public.bridge_accounts(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.dca_plans.source_account_id IS 'Optional reference to a bridge_account (liquidity source) from which funds will be deducted when DCA executes';