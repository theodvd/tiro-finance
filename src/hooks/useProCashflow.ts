/**
 * useProCashflow — lit les entrées pro_cashflow_entries du mois courant.
 *
 * Utilisé par useNetInvestable pour calculer le CA réel encaissé ce mois,
 * en priorité sur le fallback annual_revenue_target / 12.
 *
 * En Phase B, seules les entrées de type 'revenue' sont utilisées pour le
 * calcul du net investissable. Les autres types (urssaf, ir, cfe…) seront
 * consommés en Phase C pour le calcul des charges réelles décaissées.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ProCashflowEntry {
  id: string;
  user_id: string;
  year: number;
  entry_date: string;
  entry_type: string;
  amount: number;
  label: string | null;
  invoice_id: string | null;
  created_at: string;
}

export interface MonthlyCashflowSummary {
  /** CA encaissé ce mois (somme des entries type 'revenue'). */
  revenueThisMonth: number;
  /** Nombre de factures payées ce mois. */
  paidInvoicesCount: number;
  /** Toutes les entrées du mois courant. */
  entries: ProCashflowEntry[];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function currentMonthBounds(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  // Premier jour du mois suivant = borne exclusive
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .slice(0, 10);
  return { start, end };
}

async function fetchMonthlyCashflow(userId: string): Promise<MonthlyCashflowSummary> {
  const { start, end } = currentMonthBounds();

  const { data, error } = await supabase
    .from('pro_cashflow_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('entry_date', start)
    .lt('entry_date', end)
    .order('entry_date', { ascending: false });

  if (error) {
    console.error('[useProCashflow] fetch error:', error);
    throw error;
  }

  const entries = (data ?? []) as ProCashflowEntry[];
  const revenueEntries = entries.filter((e) => e.entry_type === 'revenue');

  return {
    entries,
    revenueThisMonth: revenueEntries.reduce((sum, e) => sum + e.amount, 0),
    paidInvoicesCount: revenueEntries.length,
  };
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useProCashflow() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.proCashflow(user?.id ?? ''),
    queryFn: () => fetchMonthlyCashflow(user!.id),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  return {
    summary: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}
