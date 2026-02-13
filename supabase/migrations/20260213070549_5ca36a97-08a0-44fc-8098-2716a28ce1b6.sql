
CREATE TABLE public.broker_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  broker TEXT NOT NULL,
  credentials JSONB NOT NULL,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, broker)
);

ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broker_conn_sel" ON public.broker_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "broker_conn_ins" ON public.broker_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "broker_conn_upd" ON public.broker_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "broker_conn_del" ON public.broker_connections FOR DELETE USING (auth.uid() = user_id);
