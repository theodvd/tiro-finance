-- Test synchro GitHub → Lovable Cloud
-- À supprimer après vérification
CREATE TABLE IF NOT EXISTS _synchro_test (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);