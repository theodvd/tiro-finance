/**
 * useMonthlyReviewPro — données revenus/charges pro pour la revue mensuelle.
 *
 * Contrairement à useProCashflow (mois courant fixe), ce hook accepte
 * year + month pour permettre la navigation entre mois.
 *
 * Sources :
 *   - pro_cashflow_entries : CA encaissé, URSSAF, dépenses du mois sélectionné
 *   - tax_provisions       : provision IR du trimestre correspondant
 *
 * Les factures en attente (status 'sent'/'late') sont calculées côté composant
 * depuis useInvoices — pas de doublon de requête.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface MonthlyReviewProData {
  /** CA encaissé sur le mois (somme entries type 'revenue'). */
  revenueEncaisse: number;
  /** Nombre de factures dont le paiement a été encaissé ce mois. */
  paidInvoicesCount: number;
  /** URSSAF payée ce mois — valeur absolue (entries type 'urssaf'). */
  urssafPaid: number;
  /** Provision IR du trimestre (tax_provisions type 'ir'). */
  irProvision: number;
  /** Trimestre correspondant au mois sélectionné (1-4). */
  quarter: number;
  /** Autres dépenses pro décaissées ce mois (entries type 'expense'). */
  otherExpenses: number;
  /** Total charges = urssaf + ir + autres. */
  totalCharges: number;
  /** Net après charges = CA encaissé − total charges. */
  netAfterCharges: number;
  /** Toutes les entrées du mois, pour détail si besoin. */
  entries: Array<{
    id: string;
    entry_type: string;
    amount: number;
    label: string | null;
    entry_date: string;
  }>;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Bornes ISO YYYY-MM-DD pour un mois donné (borne supérieure exclusive). */
function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const end = new Date(year, month, 1).toISOString().slice(0, 10);
  return { start, end };
}

/** Trimestre (1-4) correspondant à un mois (1-12). */
function quarterOf(month: number): number {
  return Math.ceil(month / 3);
}

// ─────────────────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────────────────

async function fetchProReview(
  userId: string,
  year: number,
  month: number,
): Promise<MonthlyReviewProData> {
  const { start, end } = monthBounds(year, month);
  const quarter = quarterOf(month);

  // Les deux requêtes en parallèle pour minimiser la latence.
  const [entriesRes, provisionRes] = await Promise.all([
    supabase
      .from('pro_cashflow_entries')
      .select('id, entry_type, amount, label, entry_date')
      .eq('user_id', userId)
      .gte('entry_date', start)
      .lt('entry_date', end)
      .order('entry_date', { ascending: false }),
    supabase
      .from('tax_provisions')
      .select('amount')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('quarter', quarter)
      .eq('provision_type', 'ir')
      .maybeSingle(),
  ]);

  if (entriesRes.error) throw entriesRes.error;
  // provisionRes.error ignoré volontairement — la table peut ne pas exister
  // ou l'utilisateur peut ne pas avoir de provision saisie.

  const entries = entriesRes.data ?? [];

  const revenueEntries = entries.filter((e) => e.entry_type === 'revenue');
  const urssafEntries  = entries.filter((e) => e.entry_type === 'urssaf');
  const expenseEntries = entries.filter((e) => e.entry_type === 'expense');

  const revenueEncaisse = revenueEntries.reduce((s, e) => s + e.amount, 0);
  // Les montants URSSAF et dépenses sont négatifs en base → valeur absolue.
  const urssafPaid     = urssafEntries.reduce((s, e) => s + Math.abs(e.amount), 0);
  const otherExpenses  = expenseEntries.reduce((s, e) => s + Math.abs(e.amount), 0);
  const irProvision    = Number(provisionRes.data?.amount ?? 0);
  const totalCharges   = urssafPaid + irProvision + otherExpenses;

  return {
    revenueEncaisse,
    paidInvoicesCount: revenueEntries.length,
    urssafPaid,
    irProvision,
    quarter,
    otherExpenses,
    totalCharges,
    netAfterCharges: revenueEncaisse - totalCharges,
    entries,
  };
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useMonthlyReviewPro(year: number, month: number) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['monthlyReviewPro', user?.id ?? '', year, month],
    queryFn: () => fetchProReview(user!.id, year, month),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
}
