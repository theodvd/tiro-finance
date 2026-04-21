/**
 * retirementEngine.ts — moteur de projection retraite.
 *
 * Fichier pur TypeScript : zéro React, zéro import Supabase.
 * Toutes les fonctions sont pures et déterministes.
 *
 * Hypothèses de taux (composés mensuellement) :
 *   Prudent  : 3 %/an
 *   Équilibré : 5 %/an
 *   Dynamique : 7 %/an
 *
 * Règle des 4 % (Bengen, 1994) :
 *   Capital cible = revenu mensuel cible × 12 / 0.04
 *   → taux de retrait sûr sur 30 ans (horizon retraite standard)
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface RetirementInput {
  /** Âge actuel de l'utilisateur (entier ≥ 18). */
  currentAge: number;
  /** Âge cible de départ à la retraite (entier > currentAge). */
  retirementAge: number;
  /** Patrimoine investissable actuel en €. */
  currentWealth: number;
  /** Épargne mensuelle investie en € (valeur ≥ 0). */
  monthlyInvestment: number;
  /** Revenu mensuel souhaité à la retraite en € (base règle des 4 %). */
  targetMonthlyIncome: number;
}

export interface RetirementScenarios {
  /** Valeurs patrimoniales année par année, taux prudent (3 %/an). */
  prudent: number[];
  /** Valeurs patrimoniales année par année, taux équilibré (5 %/an). */
  balanced: number[];
  /** Valeurs patrimoniales année par année, taux dynamique (7 %/an). */
  dynamic: number[];
}

export interface RetirementResult {
  /**
   * Trois scénarios de projection.
   * Chaque tableau a `(retirementAge - currentAge + 1)` éléments.
   * Index 0 = currentAge (= currentWealth), dernier index = retirementAge.
   */
  scenarios: RetirementScenarios;

  /** Capital cible selon la règle des 4 % : targetMonthlyIncome × 12 / 0.04. */
  targetCapital: number;

  /**
   * Écart entre l'objectif et le scénario équilibré à la retraite.
   * Positif → déficit (il manque ce montant).
   * Négatif → surplus (objectif dépassé).
   */
  gapAtRetirement: number;

  /**
   * Épargne mensuelle supplémentaire à investir (en plus de monthlyInvestment)
   * pour atteindre exactement targetCapital dans le scénario équilibré.
   * 0 si le surplus est déjà atteint.
   */
  monthlyDeltaNeeded: number;

  /**
   * Trajectoire "rêvée" : même taux équilibré mais avec
   * monthlyInvestment + monthlyDeltaNeeded.
   * Atteint exactement targetCapital à l'âge de retraite.
   */
  targetScenario: number[];

  /** Axe X : tableau des âges de currentAge à retirementAge. */
  years: number[];
}

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

export const RETIREMENT_RATES = {
  prudent: 0.03,
  balanced: 0.05,
  dynamic: 0.07,
} as const;

// ─────────────────────────────────────────────────────────────
// Fonctions internes
// ─────────────────────────────────────────────────────────────

/**
 * Valeur future d'un capital avec épargne mensuelle constante.
 *
 * Formule (annuité de fin de période) :
 *   FV = W₀ × (1 + r)ⁿ + M × ((1 + r)ⁿ − 1) / r
 *
 * @param initialWealth  Patrimoine initial W₀ (€)
 * @param monthlyRate    Taux mensuel r (ex. 0.05/12)
 * @param months         Nombre de mois n
 * @param monthlyInvestment  Versement mensuel M (€)
 */
export function futureValue(
  initialWealth: number,
  monthlyRate: number,
  months: number,
  monthlyInvestment: number
): number {
  if (months <= 0) return initialWealth;
  if (monthlyRate === 0) {
    return initialWealth + monthlyInvestment * months;
  }
  const factor = Math.pow(1 + monthlyRate, months);
  return (
    initialWealth * factor +
    monthlyInvestment * (factor - 1) / monthlyRate
  );
}

/**
 * Construit le tableau de valeurs patrimoniales année par année.
 * Index 0 = patrimoine de départ (aucune croissance appliquée).
 *
 * @param yearsCount  Nombre d'années de projection (retirementAge - currentAge)
 */
function buildYearlyScenario(
  currentWealth: number,
  annualRate: number,
  yearsCount: number,
  monthlyInvestment: number
): number[] {
  const r = annualRate / 12;
  const result: number[] = [currentWealth];
  for (let year = 1; year <= yearsCount; year++) {
    result.push(futureValue(currentWealth, r, year * 12, monthlyInvestment));
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// Fonction principale
// ─────────────────────────────────────────────────────────────

/**
 * Calcule la projection de retraite pour les 3 scénarios + l'analyse du gap.
 *
 * @throws si retirementAge <= currentAge
 */
export function computeRetirementProjection(
  input: RetirementInput
): RetirementResult {
  const { currentAge, retirementAge, currentWealth, monthlyInvestment, targetMonthlyIncome } =
    input;

  if (retirementAge <= currentAge) {
    throw new Error(
      `retirementAge (${retirementAge}) doit être supérieur à currentAge (${currentAge})`
    );
  }

  const yearsCount = retirementAge - currentAge;

  // ── Capital cible (règle des 4 %) ─────────────────────────
  const targetCapital = (targetMonthlyIncome * 12) / 0.04;

  // ── Trois scénarios ───────────────────────────────────────
  const prudent = buildYearlyScenario(
    currentWealth,
    RETIREMENT_RATES.prudent,
    yearsCount,
    monthlyInvestment
  );
  const balanced = buildYearlyScenario(
    currentWealth,
    RETIREMENT_RATES.balanced,
    yearsCount,
    monthlyInvestment
  );
  const dynamic = buildYearlyScenario(
    currentWealth,
    RETIREMENT_RATES.dynamic,
    yearsCount,
    monthlyInvestment
  );

  // ── Analyse du gap ────────────────────────────────────────
  const balancedFinal = balanced[balanced.length - 1];
  const gapAtRetirement = targetCapital - balancedFinal;

  // ── Épargne supplémentaire pour combler le gap ────────────
  // Inversion de la formule d'annuité :
  //   gap = monthlyDelta × ((1 + r)ⁿ − 1) / r
  //   monthlyDelta = gap × r / ((1 + r)ⁿ − 1)
  let monthlyDeltaNeeded = 0;
  if (gapAtRetirement > 0) {
    const totalMonths = yearsCount * 12;
    const r = RETIREMENT_RATES.balanced / 12;
    const annuityFactor = (Math.pow(1 + r, totalMonths) - 1) / r;
    monthlyDeltaNeeded = annuityFactor > 0
      ? Math.ceil(gapAtRetirement / annuityFactor)
      : 0;
  }

  // ── Trajectoire cible ─────────────────────────────────────
  const targetScenario = buildYearlyScenario(
    currentWealth,
    RETIREMENT_RATES.balanced,
    yearsCount,
    monthlyInvestment + monthlyDeltaNeeded
  );

  // ── Axe X : âges ──────────────────────────────────────────
  const years = Array.from({ length: yearsCount + 1 }, (_, i) => currentAge + i);

  return {
    scenarios: { prudent, balanced, dynamic },
    targetCapital,
    gapAtRetirement,
    monthlyDeltaNeeded,
    targetScenario,
    years,
  };
}
