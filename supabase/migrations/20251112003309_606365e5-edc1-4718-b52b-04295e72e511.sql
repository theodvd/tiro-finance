-- Fix FX rates security vulnerability
-- Drop the insecure policy that allows any authenticated user to insert FX rates
DROP POLICY IF EXISTS "System can insert FX rates" ON public.fx_rates;

-- Create a restrictive policy that blocks all client access
-- Only service role (used by edge functions) can write to this table
CREATE POLICY "Block all client access to fx_rates writes"
  ON public.fx_rates
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Add unique constraint to prevent duplicate exchange rate entries
ALTER TABLE public.fx_rates 
ADD CONSTRAINT fx_rates_base_quote_asof_unique 
UNIQUE (base, quote, asof);