-- =============================================================
-- Migration : contrainte UNIQUE sur tax_provisions
-- Pourquoi : garantit au niveau DB qu'il ne peut pas exister deux provisions
--            IR pour le même utilisateur / année / trimestre.
--            Le code (useURSSAFDeclarations) gère déjà la déduplication via
--            un pattern check-then-insert/update, mais cette contrainte ajoute
--            une protection DB supplémentaire.
-- =============================================================

ALTER TABLE public.tax_provisions
  ADD CONSTRAINT tax_provisions_user_year_quarter_type_key
  UNIQUE (user_id, year, quarter, provision_type);