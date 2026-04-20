/**
 * fiscalEngine.ts — moteur de calcul fiscal pur (sans React).
 *
 * Calcule le net investissable mensuel à partir du CA encaissé et du profil
 * fiscal de l'utilisateur.
 *
 * Régimes supportés en Phase A/B :
 *   - micro_bnc : services / professions libérales (abattement 34 %, URSSAF 24,6 %)
 *   - micro_bic : commerce / vente (abattement 50 %, URSSAF 12,8 %)
 *   - ei_reel   : charges réelles — estimation impossible sans données de charges
 *
 * IR : deux méthodes
 *   - Versement libératoire (VL) : taux forfaitaire sur CA (plus simple, plus précis)
 *   - Barème progressif : estimation annualisée selon tranches 2025 (imposition 2026)
 *     → marqué `isEstimate: true` + warning affiché à l'utilisateur
 */

import type { FiscalRegime } from '@/hooks/useFiscalProfile';

// ─────────────────────────────────────────────────────────────
// Constantes — taux 2025 (en vigueur au 01/01/2025)
// ─────────────────────────────────────────────────────────────

/**
 * Taux applicables par régime.
 * Sources :
 *   - URSSAF micro : urssaf.fr (taux 2025)
 *   - VL IR        : bofip.impots.gouv.fr (art. 151-0 CGI)
 *   - Abattements  : art. 50-0 et 102 ter CGI
 */
export const FISCAL_RATES = {
  micro_bnc: {
    urssaf: 0.246,      // cotisations sociales obligatoires
    ir_vl: 0.022,       // versement libératoire IR
    abattement: 0.34,   // abattement forfaitaire sur CA
  },
  micro_bic: {
    urssaf: 0.128,      // taux activités commerciales / vente
    ir_vl: 0.010,       // versement libératoire IR
    abattement: 0.50,
  },
} as const;

/**
 * Tranches du barème progressif IR 2025 (revenus 2025, déclaration 2026).
 * Source : Loi de finances 2025 — art. 197 CGI.
 * Chaque tranche : [borne inférieure, borne supérieure, taux]
 * La dernière tranche a Infinity comme borne supérieure.
 */
const BAREME_PROGRESSIF_2025: [number, number, number][] = [
  [0,        11_497,   0.00],
  [11_497,   29_315,   0.11],
  [29_315,   83_823,   0.30],
  [83_823,  177_106,   0.41],
  [177_106,  Infinity, 0.45],
];

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type IrMethod =
  | 'versement_liberatoire'
  | 'bareme_progressif_estimate'
  | 'not_applicable';

export interface NetInvestableInput {
  /** CA HT encaissé ce mois (en euros). */
  monthlyRevenue: number;
  regime: FiscalRegime;
  versement_liberatoire: boolean;
  /** Dépenses personnelles mensuelles (loyer, courses, etc.). Optionnel. */
  personalExpenses?: number;
}

export interface NetInvestableBreakdown {
  /** CA brut HT du mois. */
  revenue: number;
  /** Montant URSSAF déduit. */
  urssaf: number;
  /** Montant IR déduit (forfaitaire ou estimé). */
  ir: number;
  /** urssaf + ir. */
  totalDeductions: number;
  /** revenue − totalDeductions. */
  netAfterDeductions: number;
  /** Dépenses personnelles passées en paramètre (0 si absent). */
  personalExpenses: number;
  /** netAfterDeductions − personalExpenses. */
  netInvestable: number;
  /** Méthode utilisée pour l'IR. */
  irMethod: IrMethod;
  /** true si le calcul est une estimation (barème progressif ou ei_reel). */
  isEstimate: boolean;
  /** Message d'avertissement à afficher si isEstimate = true. */
  warning?: string;
  /** Taux utilisés — utiles pour l'affichage de transparence. */
  rates: {
    urssaf: number;
    ir: number;
    abattement: number;
  };
}

// ─────────────────────────────────────────────────────────────
// Helpers privés
// ─────────────────────────────────────────────────────────────

/**
 * Calcule l'IR annuel selon le barème progressif (estimation sans parts fiscales).
 * Applique les tranches sur le revenu imposable annuel fourni.
 */
function estimateIrBareme(annualRevenuImposable: number): number {
  let ir = 0;
  for (const [min, max, taux] of BAREME_PROGRESSIF_2025) {
    if (annualRevenuImposable <= min) break;
    const trancheBase = Math.min(annualRevenuImposable, max) - min;
    ir += trancheBase * taux;
  }
  return ir;
}

// ─────────────────────────────────────────────────────────────
// Fonction principale — exportée
// ─────────────────────────────────────────────────────────────

/**
 * Calcule la décomposition mensuelle net investissable.
 *
 * @example
 * const result = computeNetInvestable({
 *   monthlyRevenue: 5000,
 *   regime: 'micro_bnc',
 *   versement_liberatoire: true,
 *   personalExpenses: 2000,
 * });
 * // result.netInvestable ≈ 1640
 */
export function computeNetInvestable(input: NetInvestableInput): NetInvestableBreakdown {
  const { monthlyRevenue, regime, versement_liberatoire, personalExpenses = 0 } = input;

  // ── ei_reel : calcul impossible sans données de charges réelles ──────────
  if (regime === 'ei_reel') {
    return {
      revenue: monthlyRevenue,
      urssaf: 0,
      ir: 0,
      totalDeductions: 0,
      netAfterDeductions: monthlyRevenue,
      personalExpenses,
      netInvestable: monthlyRevenue - personalExpenses,
      irMethod: 'not_applicable',
      isEstimate: true,
      warning:
        "Le régime EI au réel nécessite vos charges déductibles réelles. " +
        "Le net investissable affiché est votre CA brut — entrez vos charges manuellement.",
      rates: { urssaf: 0, ir: 0, abattement: 0 },
    };
  }

  // ── SASU / EURL : non supporté en Phase A/B ──────────────────────────────
  if (regime === 'sasu' || regime === 'eurl') {
    return {
      revenue: monthlyRevenue,
      urssaf: 0,
      ir: 0,
      totalDeductions: 0,
      netAfterDeductions: monthlyRevenue,
      personalExpenses,
      netInvestable: monthlyRevenue - personalExpenses,
      irMethod: 'not_applicable',
      isEstimate: true,
      warning:
        "Le calcul pour SASU/EURL sera disponible en Phase C. " +
        "Le net investissable affiché est non calculé.",
      rates: { urssaf: 0, ir: 0, abattement: 0 },
    };
  }

  // ── micro_bnc / micro_bic ─────────────────────────────────────────────────
  const rates = FISCAL_RATES[regime];

  // Cotisations URSSAF (assiette = CA brut)
  const urssaf = Math.round(monthlyRevenue * rates.urssaf * 100) / 100;

  let ir = 0;
  let irMethod: IrMethod;
  let isEstimate = false;
  let warning: string | undefined;

  if (versement_liberatoire) {
    // Versement libératoire : taux forfaitaire sur CA (simple et précis)
    ir = Math.round(monthlyRevenue * rates.ir_vl * 100) / 100;
    irMethod = 'versement_liberatoire';
  } else {
    // Barème progressif : estimation annualisée, 1 part fiscale (célibataire sans enfant)
    // Revenu imposable = CA × (1 − abattement)
    const annualRevenuImposable = monthlyRevenue * 12 * (1 - rates.abattement);
    const annualIr = estimateIrBareme(annualRevenuImposable);
    ir = Math.round((annualIr / 12) * 100) / 100;
    irMethod = 'bareme_progressif_estimate';
    isEstimate = true;
    warning =
      "Estimation IR au barème progressif : calculée sur 1 part fiscale (célibataire), " +
      "sans tenir compte de vos autres revenus ni déductions. " +
      "Consultez un comptable pour un calcul précis.";
  }

  const totalDeductions = Math.round((urssaf + ir) * 100) / 100;
  const netAfterDeductions = Math.round((monthlyRevenue - totalDeductions) * 100) / 100;
  const netInvestable = Math.round((netAfterDeductions - personalExpenses) * 100) / 100;

  return {
    revenue: monthlyRevenue,
    urssaf,
    ir,
    totalDeductions,
    netAfterDeductions,
    personalExpenses,
    netInvestable,
    irMethod,
    isEstimate,
    warning,
    rates: {
      urssaf: rates.urssaf,
      ir: versement_liberatoire ? rates.ir_vl : 0,
      abattement: rates.abattement,
    },
  };
}
