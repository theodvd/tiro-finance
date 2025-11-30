-- Add scoring columns to user_profile table
ALTER TABLE public.user_profile
ADD COLUMN IF NOT EXISTS score_total integer,
ADD COLUMN IF NOT EXISTS score_tolerance integer,
ADD COLUMN IF NOT EXISTS score_capacity integer,
ADD COLUMN IF NOT EXISTS score_behavior integer,
ADD COLUMN IF NOT EXISTS score_horizon integer,
ADD COLUMN IF NOT EXISTS score_knowledge integer,
ADD COLUMN IF NOT EXISTS risk_profile text;