CREATE TYPE public.transaction_type AS ENUM ('BUY', 'SELL', 'DCA_BUY', 'DIVIDEND', 'TRANSFER');

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES public.securities(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  shares NUMERIC(18,6) NOT NULL,
  price_eur NUMERIC(18,6) NOT NULL,
  total_eur NUMERIC(18,2) NOT NULL,
  fees_eur NUMERIC(18,2) DEFAULT 0,
  dca_plan_id UUID REFERENCES public.dca_plans(id) ON DELETE SET NULL,
  source_account_id UUID REFERENCES public.bridge_accounts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_account_security ON public.transactions(account_id, security_id);
CREATE INDEX idx_transactions_executed_at ON public.transactions(executed_at DESC);
CREATE INDEX idx_transactions_dca_plan ON public.transactions(dca_plan_id) WHERE dca_plan_id IS NOT NULL;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions"
  ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions"
  ON public.transactions FOR DELETE USING (auth.uid() = user_id);