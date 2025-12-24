-- Add snapshot_type column to snapshots table
ALTER TABLE public.snapshots 
ADD COLUMN IF NOT EXISTS snapshot_type text NOT NULL DEFAULT 'manual';

-- Add constraint to ensure valid snapshot types
ALTER TABLE public.snapshots 
ADD CONSTRAINT snapshots_type_check 
CHECK (snapshot_type IN ('weekly', 'monthly', 'manual'));

-- Create index for efficient querying by type and date
CREATE INDEX IF NOT EXISTS idx_snapshots_type_ts ON public.snapshots(user_id, snapshot_type, snapshot_ts DESC);

-- Create a function to check if a snapshot already exists for a given period
CREATE OR REPLACE FUNCTION public.snapshot_exists_for_period(
  p_user_id uuid,
  p_snapshot_type text,
  p_period_start timestamptz,
  p_period_end timestamptz
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.snapshots 
    WHERE user_id = p_user_id 
    AND snapshot_type = p_snapshot_type
    AND snapshot_ts >= p_period_start 
    AND snapshot_ts < p_period_end
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;