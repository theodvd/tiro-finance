-- Add columns for persisting computed investor profile scores
-- This enables the Settings page to show consistent scores

-- Score persistence columns
ALTER TABLE public.user_profile
ADD COLUMN IF NOT EXISTS score_capacity_computed integer,
ADD COLUMN IF NOT EXISTS score_tolerance_computed integer,
ADD COLUMN IF NOT EXISTS score_objectives_computed integer,
ADD COLUMN IF NOT EXISTS score_total_computed integer,
ADD COLUMN IF NOT EXISTS profile_confidence text,
ADD COLUMN IF NOT EXISTS profile_computed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS onboarding_answers jsonb;

-- Add comments for clarity
COMMENT ON COLUMN public.user_profile.score_capacity_computed IS 'Computed capacity score (0-35) from investor profile engine';
COMMENT ON COLUMN public.user_profile.score_tolerance_computed IS 'Computed tolerance score (0-35) from investor profile engine';
COMMENT ON COLUMN public.user_profile.score_objectives_computed IS 'Computed objectives score (0-30) from investor profile engine';
COMMENT ON COLUMN public.user_profile.score_total_computed IS 'Total computed score (0-100)';
COMMENT ON COLUMN public.user_profile.profile_confidence IS 'Confidence level: high, medium, low';
COMMENT ON COLUMN public.user_profile.profile_computed_at IS 'Timestamp when profile was last computed';
COMMENT ON COLUMN public.user_profile.onboarding_answers IS 'Raw answers from onboarding for reproducibility';