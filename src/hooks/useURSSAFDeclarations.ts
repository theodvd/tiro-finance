/**
 * useURSSAFDeclarations — hook CRUD pour les déclarations URSSAF.
 *
 * Opérations :
 *   - useQuery : liste des social_contributions de l'année courante
 *   - save     : upsert social_contributions + insert tax_provisions
 *                + insert pro_cashflow_entries (type 'urssaf', montant négatif)
 *   - markPaid : update status='paid' + paid_at + insert cashflow réel
 *
 * Atomicité : trois opérations séquentielles (pas de transaction client Supabase).
 * En cas d'échec partiel, la déclaration est rollbackée manuellement (delete
 * de ce qui a été inséré) pour éviter les états incohérents.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import type { SimulationResult } from '@/components/pro/URSSAFSimulator';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type DeclarationStatus = 'pending' | 'paid' | 'late';

export interface URSSAFDeclaration {
  id: string;
  user_id: string;
  year: number;
  period_start: string;
  period_end: string;
  declared_revenue: number;
  contribution_rate: number;
  amount_due: number;
  amount_paid: number;
  status: DeclarationStatus;
  paid_at: string | null;
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear();

/**
 * Calcule les bornes ISO d'un mois donné.
 * Ex: (4, 2026) → { start: '2026-04-01', end: '2026-04-30' }
 */
function monthBounds(month: number, year: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // dernier jour du mois
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

/** Calcule le trimestre (1–4) depuis le numéro de mois. */
function quarterFromMonth(month: number): number {
  return Math.ceil(month / 3);
}

/** Libellé court de période. Ex: "Avril 2026" */
function periodLabel(month: number, year: number): string {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1));
}

async function fetchDeclarations(userId: string): Promise<URSSAFDeclaration[]> {
  const { data, error } = await supabase
    .from('social_contributions')
    .select('*')
    .eq('user_id', userId)
    .eq('year', currentYear)
    .order('period_start', { ascending: false });

  if (error) {
    console.error('[useURSSAFDeclarations] fetch error:', error);
    throw error;
  }

  return (data ?? []).map((d) => ({
    ...d,
    status: d.status as DeclarationStatus,
  }));
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useURSSAFDeclarations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.proCashflow(user?.id ?? ''),
      }),
      queryClient.invalidateQueries({
        queryKey: ['urssafDeclarations', user?.id ?? ''],
      }),
    ]);
  };

  // ── Fetch ──────────────────────────────────────────────────
  const query = useQuery({
    queryKey: ['urssafDeclarations', user?.id ?? ''],
    queryFn: () => fetchDeclarations(user!.id),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  // ── Sauvegarde d'une déclaration ───────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (result: SimulationResult) => {
      if (!user) throw new Error('Utilisateur non authentifié');

      const { start, end } = monthBounds(result.month, result.year);
      const quarter = quarterFromMonth(result.month);
      const label = `URSSAF ${periodLabel(result.month, result.year)}`;
      const now = new Date().toISOString();

      // 1. Upsert social_contributions
      const { data: contribData, error: contribError } = await supabase
        .from('social_contributions')
        .upsert(
          {
            user_id: user.id,
            year: result.year,
            period_start: start,
            period_end: end,
            declared_revenue: result.ca,
            contribution_rate: result.urssaf / result.ca, // taux effectif stocké
            amount_due: result.urssaf,
            amount_paid: 0,
            status: 'pending',
            source: 'calculated',
            updated_at: now,
          },
          { onConflict: 'user_id,period_start,period_end' }
        )
        .select('id')
        .single();

      if (contribError) throw contribError;
      const contribId = contribData.id;

      // 2. Insert/update tax_provisions (IR du mois)
      // Pattern check-then-insert/update : la table n'a pas de contrainte UNIQUE
      // sur (user_id, year, quarter, provision_type), donc on ne peut pas utiliser
      // upsert. On vérifie manuellement l'existence avant d'insérer ou mettre à jour.
      if (result.ir > 0) {
        const { data: existingTax } = await supabase
          .from('tax_provisions')
          .select('id')
          .eq('user_id', user.id)
          .eq('year', result.year)
          .eq('quarter', quarter)
          .eq('provision_type', 'ir')
          .maybeSingle();

        const taxPayload = {
          provision_amount: result.ir,
          ir_method: result.versement_liberatoire
            ? 'versement_liberatoire'
            : 'bareme_progressif',
          estimated_taxable_income: result.ca * (1 - (result.regime === 'micro_bnc' ? 0.34 : 0.5)),
          status: 'estimated',
          updated_at: now,
        };

        const { error: taxError } = existingTax
          ? await supabase
              .from('tax_provisions')
              .update(taxPayload)
              .eq('id', existingTax.id)
          : await supabase
              .from('tax_provisions')
              .insert({
                user_id: user.id,
                year: result.year,
                quarter,
                provision_type: 'ir',
                ...taxPayload,
              });

        if (taxError) {
          // Rollback : supprimer la contribution créée
          await supabase.from('social_contributions').delete().eq('id', contribId);
          throw taxError;
        }
      }

      // 3. Insert pro_cashflow_entries (URSSAF prévisionnelle, montant négatif)
      // On évite les doublons en vérifiant si une entrée existe déjà pour cette période
      const { data: existing } = await supabase
        .from('pro_cashflow_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('entry_type', 'urssaf')
        .gte('entry_date', start)
        .lte('entry_date', end)
        .maybeSingle();

      if (!existing) {
        const { error: cashflowError } = await supabase
          .from('pro_cashflow_entries')
          .insert({
            user_id: user.id,
            year: result.year,
            entry_date: end, // dernier jour du mois = date de provision
            entry_type: 'urssaf',
            amount: -result.urssaf, // négatif = décaissement
            label,
          });

        if (cashflowError) {
          // Pas de rollback ici : la social_contribution est valide même sans cashflow
          console.error('[useURSSAFDeclarations] cashflow insert warning:', cashflowError);
        }
      }
    },
    onSuccess: (_, result) => {
      invalidateAll();
      toast.success(
        `Déclaration ${periodLabel(result.month, result.year)} enregistrée`
      );
    },
    onError: (error: Error) => {
      console.error('[useURSSAFDeclarations] save error:', error);
      toast.error("Erreur lors de l'enregistrement de la déclaration");
    },
  });

  // ── Marquer comme payée ────────────────────────────────────
  const markPaidMutation = useMutation({
    mutationFn: async (declaration: URSSAFDeclaration) => {
      if (!user) throw new Error('Utilisateur non authentifié');

      const paidAt = new Date().toISOString();
      const label = `URSSAF payée — ${declaration.period_start.slice(0, 7)}`;

      // 1. Update statut de la déclaration
      const { error: updateError } = await supabase
        .from('social_contributions')
        .update({
          status: 'paid',
          paid_at: paidAt,
          amount_paid: declaration.amount_due,
          updated_at: paidAt,
        })
        .eq('id', declaration.id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // 2. Insert cashflow réel (montant effectivement décaissé)
      const { error: cashflowError } = await supabase
        .from('pro_cashflow_entries')
        .insert({
          user_id: user.id,
          year: declaration.year,
          entry_date: paidAt.slice(0, 10),
          entry_type: 'urssaf',
          amount: -declaration.amount_due, // négatif = décaissement
          label,
        });

      if (cashflowError) {
        console.error('[useURSSAFDeclarations] markPaid cashflow warning:', cashflowError);
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Cotisations URSSAF marquées comme payées');
    },
    onError: (error: Error) => {
      console.error('[useURSSAFDeclarations] markPaid error:', error);
      toast.error('Erreur lors du marquage comme payée');
    },
  });

  return {
    declarations: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,

    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,

    markPaid: markPaidMutation.mutateAsync,
    isMarkingPaid: markPaidMutation.isPending,
  };
}
