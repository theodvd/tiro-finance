/**
 * useNetInvestable — hook React pour le calcul du net investissable mensuel.
 *
 * Sources de CA, par ordre de priorité :
 *   1. monthlyRevenue passé en option (override manuel)
 *   2. CA réel des factures payées ce mois (pro_cashflow_entries type 'revenue')
 *   3. Fallback : annual_revenue_target / 12 du profil fiscal
 *
 * L'indicateur revenueSource indique la source utilisée pour l'affichage :
 *   'real'    → factures payées ce mois (N factures)
 *   'target'  → CA cible annuel ÷ 12
 *   'manual'  → override passé en option
 */

import { useMemo } from 'react';
import { useFiscalProfile } from '@/hooks/useFiscalProfile';
import { useProCashflow } from '@/hooks/useProCashflow';
import {
  computeNetInvestable,
  type NetInvestableBreakdown,
  type NetInvestableInput,
} from '@/lib/fiscalEngine';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type RevenueSource = 'real' | 'target' | 'manual';

export interface UseNetInvestableOptions {
  /**
   * Override manuel du CA mensuel (en euros HT).
   * Prend la priorité absolue sur les sources automatiques.
   */
  monthlyRevenue?: number;
  /** Dépenses personnelles mensuelles (loyer, courses…). */
  personalExpenses?: number;
}

export interface UseNetInvestableResult {
  /** Décomposition complète. null si le profil fiscal est absent. */
  breakdown: NetInvestableBreakdown | null;
  /** CA effectivement utilisé pour le calcul. */
  monthlyRevenueUsed: number;
  /** Source du CA utilisé. */
  revenueSource: RevenueSource;
  /** Nombre de factures payées ce mois (si revenueSource = 'real'). */
  paidInvoicesCount: number;
  /**
   * Provisions URSSAF déclarées ce mois (valeur absolue).
   * 0 si aucune déclaration enregistrée ce mois.
   */
  urssafThisMonth: number;
  /** true si une déclaration URSSAF a été enregistrée pour le mois courant. */
  hasUrssafDeclaration: boolean;
  /** true si le profil fiscal est chargé et le calcul disponible. */
  isReady: boolean;
  /** true pendant le chargement du profil ou du cashflow. */
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useNetInvestable(
  options: UseNetInvestableOptions = {}
): UseNetInvestableResult {
  const { monthlyRevenue: manualRevenue, personalExpenses } = options;
  const { profile, isLoading: profileLoading } = useFiscalProfile();
  const { summary, isLoading: cashflowLoading } = useProCashflow();

  const isLoading = profileLoading || cashflowLoading;

  const result = useMemo((): Omit<UseNetInvestableResult, 'isLoading'> => {
    if (!profile) {
      return {
        breakdown: null,
        monthlyRevenueUsed: 0,
        revenueSource: 'target',
        paidInvoicesCount: 0,
        urssafThisMonth: 0,
        hasUrssafDeclaration: false,
        isReady: false,
      };
    }

    // ── Résolution du CA mensuel ──────────────────────────────

    let revenueToUse: number;
    let revenueSource: RevenueSource;
    let paidInvoicesCount = 0;

    if (manualRevenue !== undefined) {
      // Priorité 1 : override manuel
      revenueToUse = manualRevenue;
      revenueSource = 'manual';
    } else if (summary && summary.revenueThisMonth > 0) {
      // Priorité 2 : CA réel des factures payées ce mois
      revenueToUse = summary.revenueThisMonth;
      revenueSource = 'real';
      paidInvoicesCount = summary.paidInvoicesCount;
    } else {
      // Priorité 3 : CA cible annuel ÷ 12
      revenueToUse =
        profile.annual_revenue_target != null
          ? Math.round((profile.annual_revenue_target / 12) * 100) / 100
          : 0;
      revenueSource = 'target';
    }

    // ── Calcul fiscal ─────────────────────────────────────────
    const input: NetInvestableInput = {
      monthlyRevenue: revenueToUse,
      regime: profile.regime,
      versement_liberatoire: profile.versement_liberatoire,
      personalExpenses: personalExpenses ?? 0,
    };

    return {
      breakdown: computeNetInvestable(input),
      monthlyRevenueUsed: revenueToUse,
      revenueSource,
      paidInvoicesCount,
      urssafThisMonth: summary?.urssafThisMonth ?? 0,
      hasUrssafDeclaration: summary?.hasUrssafDeclaration ?? false,
      isReady: true,
    };
  }, [profile, summary, manualRevenue, personalExpenses]);

  return { ...result, isLoading };
}
