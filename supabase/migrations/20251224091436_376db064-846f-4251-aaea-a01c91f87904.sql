-- Add user investment thresholds/targets to user_profile
ALTER TABLE public.user_profile
ADD COLUMN IF NOT EXISTS cash_target_pct integer DEFAULT 25,
ADD COLUMN IF NOT EXISTS max_position_pct integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_asset_class_pct integer DEFAULT 70;

-- Add comments for documentation
COMMENT ON COLUMN public.user_profile.cash_target_pct IS 'Target cash percentage of portfolio (default 25%)';
COMMENT ON COLUMN public.user_profile.max_position_pct IS 'Maximum single position concentration threshold (default 10%)';
COMMENT ON COLUMN public.user_profile.max_asset_class_pct IS 'Maximum asset class concentration threshold (default 70%)';