-- Allow users to delete their own snapshots
CREATE POLICY "snapshots_delete_own"
  ON public.snapshots
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow users to delete their own snapshot lines
CREATE POLICY "snapshot_lines_delete_own"
  ON public.snapshot_lines
  FOR DELETE
  USING (auth.uid() = user_id);