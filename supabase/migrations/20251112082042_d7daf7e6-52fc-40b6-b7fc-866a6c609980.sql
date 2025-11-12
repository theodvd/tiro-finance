-- Create user_profile table for investor questionnaire
CREATE TABLE public.user_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Section 1: Objectifs financiers
  financial_goals text[], -- Q1: 3 objectifs prioritaires
  concrete_project text, -- Q2: projet concret (description, montant, échéance)
  investment_horizon text, -- Q11: court/moyen/long terme
  
  -- Section 2: Situation actuelle
  current_status text, -- Q3: étudiant, salarié, entrepreneur...
  monthly_income numeric, -- Q4: revenus mensuels
  monthly_expenses numeric, -- Q5: dépenses mensuelles
  monthly_saving_capacity numeric, -- Q6: capacité d'épargne
  
  -- Section 3: Patrimoine et placements
  emergency_fund numeric, -- Q7: somme disponible immédiatement
  existing_investments text[], -- Q8: PEA, AV, CTO, crypto, immobilier
  investment_experience text, -- Q9: depuis combien de temps
  
  -- Section 4: Risque et profil
  risk_tolerance text, -- Q10: -10%, -20%, -30%
  preferred_assets text[], -- Q12: actions, ETF, crypto, immobilier
  responsible_investing boolean, -- Q18: sensible à l'investissement responsable
  investment_exclusions text[], -- Q19: ce qu'il veut éviter
  
  -- Section 5: Apprentissage et motivation
  learning_priorities text[], -- Q13: ce qu'il veut apprendre
  management_style text, -- Q14: autonomie, accompagnement, automatique
  time_commitment text, -- Q15: temps par semaine
  wants_reminders boolean, -- Q16: rappels et alertes
  main_difficulty text, -- Q20: plus grande difficulté avec l'argent
  main_motivation text, -- Q21: ce qui le motiverait le plus
  
  -- Section 6: Vision long terme
  planned_expenses text, -- Q17: dépenses prévues dans 12 mois
  one_year_goal text, -- Q22: objectif à 1 an
  five_year_goal text, -- Q23: situation souhaitée à 5 ans
  financial_dream text, -- Q24: rêve financier ultime
  committed boolean, -- Q25: prêt à suivre des conseils
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own profile"
  ON public.user_profile
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profile
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profile
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();