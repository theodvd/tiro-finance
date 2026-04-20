-- =============================================================
-- Migration : évolutions des tables existantes pour Phase A Solvio
-- Quoi : (1) ajout de la valeur 'PER' à l'enum account_type
--         (2) ajout de opened_at et tax_wrapper_notes sur accounts
-- Pourquoi : le PER (Plan Épargne Retraite) est une enveloppe clé
--            pour les freelances. opened_at permet de calculer
--            l'ancienneté fiscale (ex: AV > 8 ans).
-- Dépendances : aucune (modifie des objets existants)
-- Ordre d'application : 1er de la série A4
-- =============================================================

-- Ajoute la valeur PER à l'enum account_type.
-- ALTER TYPE ... ADD VALUE ne peut pas être exécuté dans une transaction
-- en cours — Supabase l'exécute normalement hors transaction.
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'PER';

-- Ajoute les colonnes fiscales sur la table accounts.
-- opened_at : date d'ouverture du compte (utile pour AV > 8 ans, PEA > 5 ans).
-- tax_wrapper_notes : note libre sur le cadre fiscal (ex: "abattement 8 ans en 2027").
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS opened_at date,
  ADD COLUMN IF NOT EXISTS tax_wrapper_notes text;
