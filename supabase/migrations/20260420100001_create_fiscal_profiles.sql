-- =============================================================
-- Migration : création de la table fiscal_profiles
-- Quoi : profil fiscal de l'utilisateur (régime, type d'activité,
--        régime TVA, CA cible annuel)
-- Pourquoi : socle de tous les calculs pro — URSSAF, IR, net
--            investissable. Un seul profil par utilisateur par an.
-- Dépendances : migration 20260420100000 (aucune dépendance directe,
--               mais doit être appliquée dans l'ordre)
-- Ordre d'application : 2e de la série A4
-- =============================================================

CREATE TABLE IF NOT EXISTS public.fiscal_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Régime fiscal. SASU et EURL sont présents dans le schéma dès maintenant
  -- mais leur logique métier n'est pas implémentée (Phase C).
  -- Valeurs MVP actives : micro_bnc, micro_bic, ei_reel
  regime        text NOT NULL CHECK (regime IN (
                  'micro_bnc',   -- Micro-entreprise services / libéral
                  'micro_bic',   -- Micro-entreprise vente / commerce
                  'ei_reel',     -- EI au régime réel
                  'sasu',        -- SASU (logique non implémentée — Phase C)
                  'eurl'         -- EURL (logique non implémentée — Phase C)
                )),

  -- Type d'activité (service, commerce, libéral) — affecte les taux URSSAF
  activity_type text CHECK (activity_type IN ('service', 'commerce', 'liberal')),

  -- Régime TVA
  tva_regime    text CHECK (tva_regime IN (
                  'franchise_base',    -- Franchise en base (défaut micro)
                  'reel_simplifie',    -- Réel simplifié
                  'reel_normal'        -- Réel normal
                )),

  -- Objectif de chiffre d'affaires annuel (HT), pour les projections
  annual_revenue_target numeric CHECK (annual_revenue_target >= 0),

  -- Année fiscale concernée. Permet de gérer les changements de régime d'une
  -- année sur l'autre sans écraser l'historique.
  year          integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),

  -- Option versement libératoire de l'IR (micro uniquement)
  -- true = taux forfaitaire sur CA ; false = barème progressif
  versement_liberatoire boolean NOT NULL DEFAULT true,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- Un seul profil par utilisateur par année
  UNIQUE (user_id, year)
);

-- Mise à jour automatique de updated_at
CREATE TRIGGER fiscal_profiles_updated_at
  BEFORE UPDATE ON public.fiscal_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.fiscal_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own fiscal_profiles"
  ON public.fiscal_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fiscal_profiles"
  ON public.fiscal_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fiscal_profiles"
  ON public.fiscal_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fiscal_profiles"
  ON public.fiscal_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ── Index ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fiscal_profiles_user_id
  ON public.fiscal_profiles (user_id);
