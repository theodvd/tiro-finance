-- =============================================================
-- Migration : création de la table pro_cashflow_entries
-- Quoi : journal de trésorerie professionnelle (flux réels)
-- Pourquoi : c'est la table de liaison entre les encaissements
--            (factures payées) et les décaissements (URSSAF, IR,
--            dépenses pro). Elle alimente le calcul du net
--            investissable en trésorerie réelle, distinct de la
--            vue prévisionnelle calculée par useNetInvestable.
-- Dépendances : invoices (20260420100002) — FK optionnelle sur
--               invoice_id pour lier un flux à une facture
-- Ordre d'application : 6e (dernier) de la série A4
-- =============================================================

CREATE TABLE IF NOT EXISTS public.pro_cashflow_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Date réelle du flux (encaissement ou décaissement)
  entry_date   date NOT NULL,

  -- Type de flux
  entry_type   text NOT NULL CHECK (entry_type IN (
                 'revenue',    -- Encaissement client (facture payée)
                 'urssaf',     -- Paiement URSSAF
                 'ir',         -- Paiement IR (acompte ou solde)
                 'cfe',        -- Paiement CFE
                 'expense',    -- Dépense professionnelle déductible
                 'transfer'    -- Virement pro → perso (non déductible)
               )),

  -- Montant : positif = entrée de trésorerie, négatif = sortie
  -- Convention : 'revenue' → positif ; 'urssaf', 'ir', 'expense' → négatif
  amount       numeric NOT NULL,

  -- Libellé libre
  label        text,

  -- Lien optionnel vers une facture (pour les flux de type 'revenue')
  invoice_id   uuid REFERENCES public.invoices(id) ON DELETE SET NULL,

  -- Année fiscale (dénormalisée)
  year         integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),

  created_at   timestamptz NOT NULL DEFAULT now()
  -- Pas de updated_at : un flux de trésorerie est immuable.
  -- Si une correction est nécessaire, on annule et on recrée.
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.pro_cashflow_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own pro_cashflow_entries"
  ON public.pro_cashflow_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pro_cashflow_entries"
  ON public.pro_cashflow_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE intentionnellement absent : les flux de trésorerie sont immuables.
-- Pour corriger : DELETE + INSERT.

CREATE POLICY "Users can delete their own pro_cashflow_entries"
  ON public.pro_cashflow_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ── Index ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pro_cashflow_user_id
  ON public.pro_cashflow_entries (user_id);

CREATE INDEX IF NOT EXISTS idx_pro_cashflow_user_year
  ON public.pro_cashflow_entries (user_id, year);

CREATE INDEX IF NOT EXISTS idx_pro_cashflow_entry_date
  ON public.pro_cashflow_entries (user_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_pro_cashflow_invoice_id
  ON public.pro_cashflow_entries (invoice_id)
  WHERE invoice_id IS NOT NULL;
