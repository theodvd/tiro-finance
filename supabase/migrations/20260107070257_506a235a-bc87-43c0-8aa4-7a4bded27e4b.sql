-- Add max_etf_position_pct column to user_profile for ETF threshold customization
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS max_etf_position_pct integer DEFAULT NULL;

-- Add thresholds_mode column to track auto vs manual mode
ALTER TABLE public.user_profile 
ADD COLUMN IF NOT EXISTS thresholds_mode text DEFAULT 'auto' 
CHECK (thresholds_mode IN ('auto', 'manual'));