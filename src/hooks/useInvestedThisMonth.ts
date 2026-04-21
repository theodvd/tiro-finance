/**
 * useInvestedThisMonth — somme des amount_invested_eur des holdings
 * créés dans le mois calendaire courant.
 *
 * Utilisé par Zone 3 du Dashboard (Opportunité du mois) pour calculer
 * la différence : net investissable - déjà investi ce mois.
 *
 * Non redondant avec usePortfolioData : ce hook ne récupère qu'une seule
 * colonne (amount_invested_eur) filtrée par created_at, sans join ni prix.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function startOfCurrentMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

// ─────────────────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────────────────

async function fetchInvestedThisMonth(
  userId: string
): Promise<{ investedThisMonth: number; count: number }> {
  const { data, error } = await supabase
    .from('holdings')
    .select('amount_invested_eur')
    .eq('user_id', userId)
    .gte('created_at', startOfCurrentMonth());

  if (error) {
    console.error('[useInvestedThisMonth] fetch error:', error);
    throw error;
  }

  const rows = data ?? [];
  return {
    investedThisMonth: rows.reduce(
      (sum, h) => sum + (Number(h.amount_invested_eur) || 0),
      0
    ),
    count: rows.length,
  };
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useInvestedThisMonth() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['investedThisMonth', user?.id ?? ''],
    queryFn: () => fetchInvestedThisMonth(user!.id),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  return {
    investedThisMonth: query.data?.investedThisMonth ?? 0,
    investedCount: query.data?.count ?? 0,
    isLoading: query.isLoading,
  };
}
