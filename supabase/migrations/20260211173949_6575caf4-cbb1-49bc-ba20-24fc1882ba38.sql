-- Drop the old problematic constraint
ALTER TABLE public.snapshot_lines
  DROP CONSTRAINT IF EXISTS snapshot_lines_user_id_valuation_date_account_id_security_i_key;

-- Add the correct constraint
ALTER TABLE public.snapshot_lines
  ADD CONSTRAINT snapshot_lines_snapshot_account_security_key
  UNIQUE (snapshot_id, account_id, security_id);