-- =============================================================
-- Migration : création de la table social_contributions
-- Quoi : cotisations sociales URSSAF déclarées ou calculées
-- Pourquoi : tracer chaque déclaration URSSAF (mensuelle ou
--            trimestrielle) avec le CA déclaré, le taux appliqué,
--            le montant dû et le statut de paiement.
-- Dépendances : invoices (20260420100002) — pas de FK directe,
--               liaison logique via la période couverte
-- Ordre d'application : 4e de la série A4
-- =============================================================

CREATE TABLE IF NOT EXISTS public.social_contributions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Période déclarée
  period_start        date NOT NULL,
  period_end          date NOT NULL,

  -- CA déclaré sur cette période (base de calcul des cotisations)
  declared_revenue    numeric NOT NULL CHECK (declared_revenue >= 0),

  -- Taux URSSAF appliqué (en %). Exemple : 24.6 pour micro-BNC,
  -- 12.8 pour micro-BIC. Stocké pour historisation — les taux changent.
  contribution_rate   numeric NOT NULL CHECK (contribution_rate >= 0 AND contribution_rate <= 100),

  -- Montant des cotisations dues = declared_revenue * contribution_rate / 100
  amount_due          numeric NOT NULL CHECK (amount_due >= 0),

  -- Montant effectivement payé (peut être partiel)
  amount_paid         numeric NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),

  -- Statut de la déclaration/paiement
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN (
                        'pending',   -- À payer
                        'paid',      -- Payé en totalité
                        'late',      -- En retard
                        'partial'    -- Payé partiellement
                      )),
  paid_at             date,

  -- Année fiscale (dénormalisée)
  year                integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),

  -- Source de la donnée : calculé par l'app ou importé depuis un avis PDF
  source              text NOT NULL DEFAULT 'calculated' CHECK (source IN (
                        'calculated',  -- Calculé par useNetInvestable
                        'imported'     -- Importé depuis un avis URSSAF PDF
                      )),

  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- Une seule ligne par période (pas de doublons)
  UNIQUE (user_id, period_start, period_end)
);

-- Mise à jour automatique de updated_at
CREATE TRIGGER social_contributions_updated_at
  BEFORE UPDATE ON public.social_contributions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.social_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own social_contributions"
  ON public.social_contributions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social_contributions"
  ON public.social_contributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social_contributions"
  ON public.social_contributions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social_contributions"
  ON public.social_contributions FOR DELETE
  USING (auth.uid() = user_id);

-- ── Index ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_social_contributions_user_id
  ON public.social_contributions (user_id);

CREATE INDEX IF NOT EXISTS idx_social_contributions_user_year
  ON public.social_contributions (user_id, year);