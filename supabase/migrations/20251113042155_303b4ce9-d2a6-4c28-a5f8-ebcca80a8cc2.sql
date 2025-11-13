-- Create DCA plans table
CREATE TABLE public.dca_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES public.securities(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'interval')),
  interval_days INTEGER CHECK (interval_days > 0),
  weekday INTEGER CHECK (weekday >= 0 AND weekday <= 6),
  monthday INTEGER CHECK (monthday >= 1 AND monthday <= 31),
  start_date DATE NOT NULL,
  next_execution_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dca_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own DCA plans"
  ON public.dca_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own DCA plans"
  ON public.dca_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own DCA plans"
  ON public.dca_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own DCA plans"
  ON public.dca_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_dca_plans_updated_at
  BEFORE UPDATE ON public.dca_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index for efficient querying
CREATE INDEX idx_dca_plans_user_id ON public.dca_plans(user_id);
CREATE INDEX idx_dca_plans_next_execution ON public.dca_plans(next_execution_date) WHERE active = true;