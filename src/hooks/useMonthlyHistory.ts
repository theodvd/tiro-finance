/**
 * useMonthlyHistory — données historiques des 6 derniers mois pour le
 * graphique comparaison "net investissable vs investi" de la revue mensuelle.
 *
 * Pour chaque mois, on récupère en parallèle :
 *   1. Le CA encaissé (pro_cashflow_entries type 'revenue')
 *   2. Le montant investi (holdings.created_at dans le mois)
 *
 * Le net investissable par mois est calculé côté client via computeNetInvestable
 * une fois le profil fiscal disponible — aucune requête supplémentaire.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFiscalProfile } from '@/hooks/useFiscalProfile';
import { computeNetInvestable } from '@/lib/fiscalEngine';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface MonthlyHistoryPoint {
  label: string;          // "avr. 2026"
  year: number;
  month: number;
  netInvestable: number;  // net calculé via fiscalEngine
  invested: number;       // montant réellement investi
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

interface MonthRaw {
  year: number;
  month: number;
  revenue: number;
  invested: number;
}

function monthBounds(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 1);
  return {
    startISO: start.toISOString().slice(0, 10),   // pour entry_date (date)
    endISO:   end.toISOString().slice(0, 10),
    startTS:  start.toISOString(),                 // pour created_at (timestamp)
    endTS:    end.toISOString(),
  };
}

/** Retourne les 6 derniers mois (courant inclus), du plus ancien au plus récent. */
function last6Months(): Array<{ year: number; month: number }> {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}

// ─────────────────────────────────────────────────────────────
// Fetch — une seule paire de requêtes groupées
// ─────────────────────────────────────────────────────────────

async function fetchHistory(userId: string): Promise<MonthRaw[]> {
  const months = last6Months();

  // Plage globale : premier jour du mois le plus ancien → dernier jour de ce mois
  const oldest = months[0];
  const newest = months[months.length - 1];
  const globalStart = new Date(oldest.year, oldest.month - 1, 1).toISOString().slice(0, 10);
  const globalEnd   = new Date(newest.year, newest.month, 1).toISOString().slice(0, 10);

  // Deux requêtes groupées sur la plage complète (6 mois d'un coup).
  const [cashflowRes, holdingsRes] = await Promise.all([
    supabase
      .from('pro_cashflow_entries')
      .select('entry_date, amount, entry_type')
      .eq('user_id', userId)
      .eq('entry_type', 'revenue')
      .gte('entry_date', globalStart)
      .lt('entry_date', globalEnd),
    supabase
      .from('holdings')
      .select('created_at, amount_invested_eur')
      .eq('user_id', userId)
      .gte('created_at', new Date(oldest.year, oldest.month - 1, 1).toISOString())
      .lt('created_at', new Date(newest.year, newest.month, 1).toISOString()),
  ]);

  if (cashflowRes.error) throw cashflowRes.error;

  // Agréger par mois
  return months.map(({ year, month }) => {
    const { startISO, endISO, startTS, endTS } = monthBounds(year, month);

    const revenue = (cashflowRes.data ?? [])
      .filter((e) => e.entry_date >= startISO && e.entry_date < endISO)
      .reduce((s, e) => s + e.amount, 0);

    const invested = (holdingsRes.data ?? [])
      .filter((h) => h.created_at >= startTS && h.created_at < endTS)
      .reduce((s, h) => s + (Number(h.amount_invested_eur) || 0), 0);

    return { year, month, revenue, invested };
  });
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useMonthlyHistory() {
  const { user } = useAuth();
  const { profile } = useFiscalProfile();

  const query = useQuery({
    queryKey: ['monthlyHistory', user?.id ?? ''],
    queryFn: () => fetchHistory(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const points = useMemo((): MonthlyHistoryPoint[] => {
    if (!query.data) return [];
    return query.data.map(({ year, month, revenue, invested }) => {
      // Net investissable calculé via fiscalEngine si profil disponible
      let netInvestable = 0;
      if (profile) {
        const bd = computeNetInvestable({
          monthlyRevenue: revenue,
          regime: profile.regime,
          versement_liberatoire: profile.versement_liberatoire,
          personalExpenses: 0,
        });
        netInvestable = Math.max(0, bd.netAfterDeductions);
      }
      return {
        label: format(new Date(year, month - 1, 1), 'MMM yy', { locale: fr }),
        year,
        month,
        netInvestable,
        invested,
      };
    });
  }, [query.data, profile]);

  return {
    points,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}
