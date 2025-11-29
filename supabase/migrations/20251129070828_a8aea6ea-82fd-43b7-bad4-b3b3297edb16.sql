-- Create or replace the update_updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing user_profile table and recreate with new schema
DROP TABLE IF EXISTS public.user_profile CASCADE;

CREATE TABLE public.user_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- 1. OBJECTIFS
  priorities JSONB, -- Array of {label: string, rank: number}
  main_project TEXT,
  project_budget NUMERIC,
  project_horizon_months INTEGER,
  
  -- 2. QUI TU ES
  first_name TEXT,
  age INTEGER,
  city TEXT,
  current_situation TEXT,
  housing_situation TEXT,
  
  -- 3. TON ARGENT AUJOURD'HUI
  monthly_income JSONB,
  monthly_expenses JSONB,
  remaining_monthly NUMERIC,
  saveable_monthly NUMERIC,
  current_savings JSONB,
  existing_investments JSONB,
  debts JSONB,
  
  -- 4. PROFIL INVESTISSEUR
  knowledge_levels JSONB,
  investment_experience TEXT,
  risk_vision TEXT,
  max_acceptable_loss TEXT,
  investment_horizon TEXT,
  
  -- 5. MODULE COMPORTEMENTAL
  reaction_to_gains TEXT,
  reaction_to_volatility TEXT,
  fomo_tendency TEXT,
  panic_selling_history BOOLEAN,
  regretted_purchases_history BOOLEAN,
  emotional_stability TEXT,
  loss_impact TEXT,
  income_stability TEXT,
  financial_resilience_months TEXT,
  risk_percentage_on_main_goal INTEGER,
  
  -- 6. STYLE, PRÉFÉRENCES ET CONTRAINTES
  management_style TEXT,
  available_time TEXT,
  learning_topics TEXT[],
  upcoming_constraints TEXT[],
  esg_importance TEXT,
  sectors_to_avoid TEXT[],
  sectors_of_interest TEXT[],
  ai_expectations JSONB,
  communication_tone TEXT,
  
  -- 7. ENGAGEMENT
  commitment_apply_advice BOOLEAN,
  commitment_regular_learning BOOLEAN,
  commitment_long_term_investing BOOLEAN
);

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.user_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profile FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();