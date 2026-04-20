-- =============================================================
-- Migration : création de la table invoices
-- Quoi : factures émises par l'utilisateur freelance
-- Pourquoi : une facture payée est l'événement déclencheur du
--            calcul URSSAF et de la mise à jour du net investissable.
-- Dépendances : fiscal_profiles (20260420100001) — pas de FK directe,
--               mais les factures sont liées au régime fiscal du user
-- Ordre d'application : 3e de la série A4
-- =============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Métadonnées de la facture
  invoice_number text,                          -- Numéro libre (ex: "2025-001")
  client_name    text NOT NULL,
  issue_date     date NOT NULL,
  due_date       date,

  -- Montants
  amount_ht      numeric NOT NULL CHECK (amount_ht >= 0),
  tva_rate       numeric NOT NULL DEFAULT 0 CHECK (tva_rate >= 0 AND tva_rate <= 100),

  -- Cycle de vie
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN (
                   'draft',      -- Brouillon
                   'sent',       -- Envoyée au client
                   'paid',       -- Encaissée
                   'late',       -- En retard de paiement
                   'cancelled'   -- Annulée
                 )),
  paid_at        date,           -- Date d'encaissement réel

  -- Année fiscale (dénormalisée pour faciliter les filtres par exercice)
  year           integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),

  notes          text,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Mise à jour automatique de updated_at
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
  ON public.invoices FOR DELETE
  USING (auth.uid() = user_id);

-- ── Index ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoices_user_id
  ON public.invoices (user_id);

CREATE INDEX IF NOT EXISTS idx_invoices_user_year
  ON public.invoices (user_id, year);

CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON public.invoices (user_id, status);