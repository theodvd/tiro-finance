/**
 * useMonthlyReviewPerso — montant investi pour un mois donné.
 *
 * Logique : somme des `amount_invested_eur` des holdings dont `created_at`
 * tombe dans le mois sélectionné. Couvre les nouvelles positions ET les
 * augmentations de positions existantes créées ce mois-ci.
 *
 * Distinct de useInvestedThisMonth (mois courant fixe) — ce hook est
 * paramétré par (year, month) pour la revue mensuelle.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface MonthlyReviewPersoData {
  /** Montant total investi dans le mois (nouveaux holdings + apports). */
  investedThisMonth: number;
  /** Nombre de nouvelles lignes de holdings créées ce mois. */
  investmentCount: number;
}

// ─────────────────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────────────────

async function fetchPersoReview(
  userId: string,
  year: number,
  month: number,
): Promise<MonthlyReviewPersoData> {
  // Bornes ISO pour `created_at` (timestamp avec TZ).
  const start = new Date(year, month - 1, 1).toISOString();          // ex. 2026-04-01T00:00:00.000Z
  const end   = new Date(year, month, 1).toISOString();              // ex. 2026-05-01T00:00:00.000Z

  const { data, error } = await supabase
    .from('holdings')
    .select('amount_invested_eur')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lt('created_at', end);

  if (error) throw error;

  const rows = data ?? [];
  return {
    investedThisMonth: rows.reduce((s, h) => s + (Number(h.amount_invested_eur) || 0), 0),
    investmentCount: rows.length,
  };
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useMonthlyReviewPerso(year: number, month: number) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['monthlyReviewPerso', user?.id ?? '', year, month],
    queryFn: () => fetchPersoReview(user!.id, year, month),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}
