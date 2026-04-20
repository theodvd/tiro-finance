/**
 * useNetInvestable — hook React pour le calcul du net investissable mensuel.
 *
 * Combine le profil fiscal (useFiscalProfile) et le moteur de calcul
 * (fiscalEngine) pour exposer la décomposition complète :
 *   CA → URSSAF → IR → net après charges → net investissable
 *
 * Utilisation :
 *   const { breakdown, isReady } = useNetInvestable({
 *     monthlyRevenue: 5000,      // CA réel ou saisi manuellement
 *     personalExpenses: 2000,    // dépenses perso optionnelles
 *   });
 *
 * Si monthlyRevenue n'est pas fourni, le hook utilise le fallback
 * annual_revenue_target / 12 stocké dans le profil fiscal.
 */

import { useMemo } from 'react';
import { useFiscalProfile } from '@/hooks/useFiscalProfile';
import {
  computeNetInvestable,
  type NetInvestableBreakdown,
  type NetInvestableInput,
} from '@/lib/fiscalEngine';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface UseNetInvestableOptions {
  /**
   * CA HT encaissé ce mois, en euros.
   * Si absent, utilise annual_revenue_target / 12 du profil fiscal.
   */
  monthlyRevenue?: number;
  /**
   * Dépenses personnelles mensuelles (loyer, courses, abonnements…).
   * Si absent, le net investissable = net après charges.
   */
  personalExpenses?: number;
}

export interface UseNetInvestableResult {
  /** Décomposition complète du calcul. null si le profil fiscal est absent. */
  breakdown: NetInvestableBreakdown | null;
  /** CA utilisé pour le calcul (override ou fallback annual_revenue_target/12). */
  monthlyRevenueUsed: number;
  /**
   * true si le revenu vient du fallback (annual_revenue_target/12) plutôt
   * que d'un montant réel — à signaler dans l'UI.
   */
  usingFallbackRevenue: boolean;
  /** true si le profil fiscal est chargé et le calcul disponible. */
  isReady: boolean;
  /** true pendant le chargement du profil. */
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useNetInvestable(
  options: UseNetInvestableOptions = {}
): UseNetInvestableResult {
  const { monthlyRevenue, personalExpenses } = options;
  const { profile, isLoading } = useFiscalProfile();

  const result = useMemo((): Omit<UseNetInvestableResult, 'isLoading'> => {
    // Profil absent : pas encore configuré
    if (!profile) {
      return {
        breakdown: null,
        monthlyRevenueUsed: 0,
        usingFallbackRevenue: false,
        isReady: false,
      };
    }

    // Résolution du CA mensuel
    const fallbackRevenue =
      profile.annual_revenue_target != null
        ? Math.round((profile.annual_revenue_target / 12) * 100) / 100
        : 0;

    const revenueToUse = monthlyRevenue ?? fallbackRevenue;
    const usingFallback = monthlyRevenue === undefined;

    // Calcul via le moteur pur
    const input: NetInvestableInput = {
      monthlyRevenue: revenueToUse,
      regime: profile.regime,
      versement_liberatoire: profile.versement_liberatoire,
      personalExpenses: personalExpenses ?? 0,
    };

    return {
      breakdown: computeNetInvestable(input),
      monthlyRevenueUsed: revenueToUse,
      usingFallbackRevenue: usingFallback,
      isReady: true,
    };
  }, [profile, monthlyRevenue, personalExpenses]);

  return { ...result, isLoading };
}
