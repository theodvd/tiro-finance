/**
 * useFiscalProfile — hook CRUD pour le profil fiscal de l'utilisateur.
 *
 * Ce hook est la seule interface pour lire et sauvegarder le profil fiscal
 * (régime, type d'activité, TVA, CA cible, versement libératoire).
 * Il est utilisé par FiscalProfileForm et par Dashboard (onboarding check).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type FiscalRegime =
  | 'micro_bnc'
  | 'micro_bic'
  | 'ei_reel'
  | 'sasu'
  | 'eurl';

export type ActivityType = 'service' | 'commerce' | 'liberal';

export type TvaRegime =
  | 'franchise_base'
  | 'reel_simplifie'
  | 'reel_normal';

export interface FiscalProfile {
  id: string;
  user_id: string;
  regime: FiscalRegime;
  activity_type: ActivityType | null;
  tva_regime: TvaRegime | null;
  annual_revenue_target: number | null;
  year: number;
  versement_liberatoire: boolean;
  created_at: string;
  updated_at: string;
}

export interface FiscalProfileInput {
  regime: FiscalRegime;
  activity_type: ActivityType | null;
  tva_regime: TvaRegime | null;
  annual_revenue_target: number | null;
  versement_liberatoire: boolean;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear();

async function fetchFiscalProfile(userId: string): Promise<FiscalProfile | null> {
  const { data, error } = await supabase
    .from('fiscal_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('year', currentYear)
    .maybeSingle();

  if (error) {
    console.error('[useFiscalProfile] fetch error:', error);
    throw error;
  }

  return data as FiscalProfile | null;
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useFiscalProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Fetch ──────────────────────────────────────────────────
  const query = useQuery({
    queryKey: queryKeys.fiscalProfile(user?.id ?? ''),
    queryFn: () => fetchFiscalProfile(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,  // 5 minutes — le profil fiscal change rarement
    gcTime: 30 * 60 * 1000,
  });

  // ── Upsert ─────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (input: FiscalProfileInput) => {
      if (!user) throw new Error('Utilisateur non authentifié');

      const payload = {
        user_id: user.id,
        year: currentYear,
        regime: input.regime,
        activity_type: input.activity_type,
        tva_regime: input.tva_regime,
        annual_revenue_target: input.annual_revenue_target,
        versement_liberatoire: input.versement_liberatoire,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('fiscal_profiles')
        .upsert(payload, { onConflict: 'user_id,year' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.fiscalProfile(user?.id ?? ''),
      });
      toast.success('Profil fiscal enregistré');
    },
    onError: (error: Error) => {
      console.error('[useFiscalProfile] save error:', error);
      toast.error("Erreur lors de l'enregistrement du profil fiscal");
    },
  });

  return {
    profile: query.data ?? null,
    hasProfile: !!query.data,
    isLoading: query.isLoading,
    isSaving: saveMutation.isPending,
    error: query.error?.message ?? null,
    save: saveMutation.mutateAsync,
    refetch: query.refetch,
  };
}
