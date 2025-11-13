-- Create bridge_accounts table for synced bank accounts
CREATE TABLE IF NOT EXISTS public.bridge_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  type TEXT NOT NULL,
  raw_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, provider_account_id)
);

-- Create bridge_transactions table
CREATE TABLE IF NOT EXISTS public.bridge_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bridge_account_id UUID NOT NULL REFERENCES public.bridge_accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  date DATE NOT NULL,
  description TEXT,
  bridge_transaction_id TEXT NOT NULL UNIQUE,
  category TEXT,
  raw_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bridge_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bridge_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bridge_accounts
CREATE POLICY "Users can view their own bridge accounts"
  ON public.bridge_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bridge accounts"
  ON public.bridge_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bridge accounts"
  ON public.bridge_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bridge accounts"
  ON public.bridge_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for bridge_transactions
CREATE POLICY "Users can view their own bridge transactions"
  ON public.bridge_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bridge transactions"
  ON public.bridge_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger for bridge_accounts
CREATE TRIGGER update_bridge_accounts_updated_at
  BEFORE UPDATE ON public.bridge_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create indices for better performance
CREATE INDEX idx_bridge_accounts_user_id ON public.bridge_accounts(user_id);
CREATE INDEX idx_bridge_transactions_user_id ON public.bridge_transactions(user_id);
CREATE INDEX idx_bridge_transactions_account_id ON public.bridge_transactions(bridge_account_id);
CREATE INDEX idx_bridge_transactions_date ON public.bridge_transactions(date DESC);