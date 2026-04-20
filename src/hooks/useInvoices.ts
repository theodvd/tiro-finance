/**
 * useInvoices — hook CRUD pour les factures professionnelles.
 *
 * Opérations exposées :
 *   - useQuery  : liste des factures de l'année courante (filtré user_id + year)
 *   - createInvoice : INSERT avec status='draft'
 *   - updateInvoice : UPDATE champs éditables
 *   - markAsPaid    : UPDATE status='paid' + paid_at, puis INSERT dans
 *                     pro_cashflow_entries (type 'revenue', montant = amount_ht)
 *
 * Note sur l'atomicité de markAsPaid :
 *   Supabase ne supporte pas les transactions multi-tables côté client.
 *   Les deux opérations sont séquentielles : UPDATE invoice en premier,
 *   INSERT cashflow ensuite. Si l'INSERT échoue, la facture reste 'paid'
 *   mais sans entrée cashflow — situation détectable par jointure LEFT JOIN
 *   en Phase C. Acceptable pour Phase B.
 *
 * amount_ttc n'est pas stocké en base (calculé) — il est ajouté à la lecture
 * via withTtc().
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'late';

/** Facture telle que lue depuis Supabase, avec amount_ttc calculé. */
export interface Invoice {
  id: string;
  user_id: string;
  year: number;
  client_name: string;
  invoice_number: string | null;
  issue_date: string;
  due_date: string | null;
  amount_ht: number;
  tva_rate: number;
  /** Calculé à la lecture : amount_ht × (1 + tva_rate / 100). Non stocké. */
  amount_ttc: number;
  status: InvoiceStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceInput {
  client_name: string;
  invoice_number?: string | null;
  issue_date: string;
  due_date?: string | null;
  amount_ht: number;
  tva_rate?: number;
  notes?: string | null;
}

export interface UpdateInvoiceInput {
  client_name?: string;
  invoice_number?: string | null;
  issue_date?: string;
  due_date?: string | null;
  amount_ht?: number;
  tva_rate?: number;
  status?: InvoiceStatus;
  notes?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear();

/** Ajoute amount_ttc calculé à une ligne brute de la DB. */
function withTtc(row: Omit<Invoice, 'amount_ttc'>): Invoice {
  return {
    ...row,
    amount_ttc: Math.round(row.amount_ht * (1 + row.tva_rate / 100) * 100) / 100,
    status: row.status as InvoiceStatus,
  };
}

async function fetchInvoices(userId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .eq('year', currentYear)
    .order('issue_date', { ascending: false });

  if (error) {
    console.error('[useInvoices] fetch error:', error);
    throw error;
  }

  return (data ?? []).map(withTtc);
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useInvoices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Fetch ──────────────────────────────────────────────────
  const query = useQuery({
    queryKey: queryKeys.invoices(user?.id ?? ''),
    queryFn: () => fetchInvoices(user!.id),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  // ── Helpers d'invalidation ─────────────────────────────────
  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices(user?.id ?? '') }),
      queryClient.invalidateQueries({ queryKey: queryKeys.proCashflow(user?.id ?? '') }),
    ]);
  };

  // ── Création ───────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      if (!user) throw new Error('Utilisateur non authentifié');

      const { error } = await supabase.from('invoices').insert({
        user_id: user.id,
        year: currentYear,
        client_name: input.client_name,
        invoice_number: input.invoice_number ?? null,
        issue_date: input.issue_date,
        due_date: input.due_date ?? null,
        amount_ht: input.amount_ht,
        tva_rate: input.tva_rate ?? 0,
        notes: input.notes ?? null,
        status: 'draft',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Facture créée');
    },
    onError: (error: Error) => {
      console.error('[useInvoices] create error:', error);
      toast.error('Erreur lors de la création de la facture');
    },
  });

  // ── Mise à jour ────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateInvoiceInput }) => {
      if (!user) throw new Error('Utilisateur non authentifié');

      const { error } = await supabase
        .from('invoices')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Facture mise à jour');
    },
    onError: (error: Error) => {
      console.error('[useInvoices] update error:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  // ── Marquer comme payée ────────────────────────────────────
  const markAsPaidMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      if (!user) throw new Error('Utilisateur non authentifié');

      const paidAt = new Date().toISOString();

      // 1. Mettre à jour la facture
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: paidAt,
          updated_at: paidAt,
        })
        .eq('id', invoice.id)
        .eq('user_id', user.id);

      if (invoiceError) throw invoiceError;

      // 2. Créer l'entrée cashflow correspondante
      // Note : séquentiel (pas de transaction client). Si cette étape échoue,
      // la facture reste 'paid' sans entrée cashflow → détectable par audit en Phase C.
      const { error: cashflowError } = await supabase
        .from('pro_cashflow_entries')
        .insert({
          user_id: user.id,
          year: currentYear,
          entry_date: paidAt.slice(0, 10), // format YYYY-MM-DD
          entry_type: 'revenue',
          amount: invoice.amount_ht,        // positif = encaissement
          label: invoice.client_name,
          invoice_id: invoice.id,
        });

      if (cashflowError) throw cashflowError;
    },
    onSuccess: (_, invoice) => {
      invalidateAll();
      toast.success(`Facture ${invoice.client_name} marquée comme payée`);
    },
    onError: (error: Error) => {
      console.error('[useInvoices] markAsPaid error:', error);
      toast.error('Erreur lors du marquage comme payée');
    },
  });

  return {
    invoices: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,

    createInvoice: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateInvoice: (id: string, input: UpdateInvoiceInput) =>
      updateMutation.mutateAsync({ id, input }),
    isUpdating: updateMutation.isPending,

    markAsPaid: markAsPaidMutation.mutateAsync,
    isMarkingPaid: markAsPaidMutation.isPending,
  };
}
