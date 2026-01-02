// Types partagés pour les composants d'investissement

export interface Account {
  id: string;
  name: string;
  type: string;
}

export interface Security {
  id: string;
  name: string;
  symbol: string;
  asset_class: string;
  currency_quote: string;
  pricing_source: string;
  created_at: string;
  market_data?: { last_px_eur: number }[];
}

export interface Holding {
  id: string;
  shares: number;
  amount_invested_eur: number | null;
  created_at: string;
  account: Account;
  security: Security;
}

export interface BridgeAccount {
  id: string;
  name: string;
  balance: number | null;
  currency: string;
  type: string;
}

export interface DcaPlan {
  id: string;
  user_id: string;
  account_id: string;
  security_id: string;
  source_account_id: string | null;
  amount: number;
  investment_mode: 'amount' | 'shares';
  frequency: 'weekly' | 'monthly' | 'interval';
  interval_days: number | null;
  weekday: number | null;
  monthday: number | null;
  start_date: string;
  next_execution_date: string | null;
  active: boolean;
  created_at: string;
  account?: Account;
  security?: Security;
  source_account?: BridgeAccount;
}

export interface EnrichedHolding extends Holding {
  marketValue: number;
  pnl: number;
  pnlPct: number;
  weight: number;
}
