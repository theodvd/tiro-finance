-- =============================================================
-- Migration : création de la table tax_provisions
-- Quoi : provisions fiscales IR, CFE et autres impôts
-- Pourquoi : le freelance doit mettre de côté chaque mois une
--            provision pour l'IR (et la CFE annuelle). Cette table
--            permet de suivre ces provisions et de les intégrer
--            dans le calcul du net investissable.
-- Dépendances : aucune dépendance directe sur les autres tables A4
-- Ordre d'application : 5e de la série A4
-- =============================================================

CREATE TABLE IF NOT EXISTS public.tax_provisions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Exercice fiscal
  year                    integer NOT NULL,

  -- Trimestre concerné (NULL = provision annuelle globale, 1-4 = trimestriel)
  quarter                 integer CHECK (quarter IN (1, 2, 3, 4)),

  -- Type de provision
  provision_type          text NOT NULL CHECK (provision_type IN (
                            'ir',     -- Impôt sur le revenu
                            'cfe',    -- Cotisation Foncière des Entreprises
                            'other'   -- Autre charge fiscale
                          )),

  -- Base de calcul utilisée (revenu imposable estimé, pour traçabilité)
  estimated_taxable_income numeric CHECK (estimated_taxable_income >= 0),

  -- Montant de la provision calculée ou saisie
  provision_amount        numeric NOT NULL CHECK (provision_amount >= 0),

  -- Statut de la provision
  status                  text NOT NULL DEFAULT 'estimated' CHECK (status IN (
                            'estimated',  -- Estimation (calcul auto ou saisi manuellement)
                            'confirmed',  -- Confirmé (avis d'imposition reçu)
                            'paid'        -- Payé
                          )),

  -- Méthode de calcul utilisée pour l'IR
  ir_method               text CHECK (ir_method IN (
                            'versement_liberatoire',  -- Taux forfaitaire sur CA
                            'bareme_progressif'       -- Barème IR avec abattement
                          )),

  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Mise à jour automatique de updated_at
CREATE TRIGGER tax_provisions_updated_at
  BEFORE UPDATE ON public.tax_provisions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.tax_provisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own tax_provisions"
  ON public.tax_provisions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tax_provisions"
  ON public.tax_provisions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tax_provisions"
  ON public.tax_provisions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tax_provisions"
  ON public.tax_provisions FOR DELETE
  USING (auth.uid() = user_id);

-- ── Index ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tax_provisions_user_id
  ON public.tax_provisions (user_id);

CREATE INDEX IF NOT EXISTS idx_tax_provisions_user_year
  ON public.tax_provisions (user_id, year);