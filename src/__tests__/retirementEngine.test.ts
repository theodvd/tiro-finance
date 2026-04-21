/**
 * Tests unitaires — retirementEngine.ts
 *
 * Couvre :
 *   - futureValue : formule de base, cas taux 0, cas n=0
 *   - computeRetirementProjection :
 *       · longueur des tableaux
 *       · valeur initiale (index 0)
 *       · ordre des scénarios (prudent < balanced < dynamic)
 *       · targetCapital (règle des 4 %)
 *       · gapAtRetirement (positif = déficit, négatif = surplus)
 *       · monthlyDeltaNeeded (0 si surplus)
 *       · targetScenario atteint ≈ targetCapital
 *       · erreur si retirementAge <= currentAge
 *       · cas extrêmes (0 épargne, 0 patrimoine)
 */

import { describe, it, expect } from 'vitest';
import {
  futureValue,
  computeRetirementProjection,
  RETIREMENT_RATES,
  type RetirementInput,
} from '@/lib/retirementEngine';

// ─────────────────────────────────────────────────────────────
// futureValue
// ─────────────────────────────────────────────────────────────

describe('futureValue', () => {
  it('retourne le capital initial si n=0', () => {
    expect(futureValue(10_000, 0.05 / 12, 0, 500)).toBe(10_000);
  });

  it('taux 0 : croissance linéaire (épargne seule)', () => {
    // 0 € initial, taux 0, 12 mois, 1000 €/mois → 12 000 €
    expect(futureValue(0, 0, 12, 1_000)).toBeCloseTo(12_000, 2);
  });

  it('taux 0 : capital initial + épargne linéaire', () => {
    // 5000 initial + 1000/mois × 10 mois = 15 000 €
    expect(futureValue(5_000, 0, 10, 1_000)).toBeCloseTo(15_000, 2);
  });

  it('sans épargne : croissance pure par intérêts composés', () => {
    // 10 000 € à 12 %/an pendant 1 an (12 mois)
    const r = 0.12 / 12; // 1 %/mois
    const fv = futureValue(10_000, r, 12, 0);
    // (1.01)^12 ≈ 1.12682503…
    expect(fv).toBeCloseTo(11_268.25, 1);
  });

  it('avec épargne mensuelle : formule standard annuité', () => {
    // Cas simple vérifiable à la main :
    // W₀=0, r=1%/mois, n=2 mois, M=1000
    // Mois 1 : 0×1.01 + 1000 = 1000
    // Mois 2 : 1000×1.01 + 1000 = 2010
    const r = 0.01;
    expect(futureValue(0, r, 2, 1_000)).toBeCloseTo(2_010, 2);
  });

  it('valeurs croissent avec le temps', () => {
    const r = 0.05 / 12;
    const fv12 = futureValue(50_000, r, 12, 500);
    const fv24 = futureValue(50_000, r, 24, 500);
    expect(fv24).toBeGreaterThan(fv12);
  });
});

// ─────────────────────────────────────────────────────────────
// computeRetirementProjection — structure des tableaux
// ─────────────────────────────────────────────────────────────

describe('computeRetirementProjection — structure', () => {
  const base: RetirementInput = {
    currentAge: 30,
    retirementAge: 65,
    currentWealth: 50_000,
    monthlyInvestment: 1_000,
    targetMonthlyIncome: 3_000,
  };

  it('longueur des tableaux = (retirementAge - currentAge + 1)', () => {
    const result = computeRetirementProjection(base);
    const expected = base.retirementAge - base.currentAge + 1; // 36
    expect(result.scenarios.prudent).toHaveLength(expected);
    expect(result.scenarios.balanced).toHaveLength(expected);
    expect(result.scenarios.dynamic).toHaveLength(expected);
    expect(result.targetScenario).toHaveLength(expected);
    expect(result.years).toHaveLength(expected);
  });

  it('index 0 = currentWealth pour tous les scénarios', () => {
    const result = computeRetirementProjection(base);
    expect(result.scenarios.prudent[0]).toBe(base.currentWealth);
    expect(result.scenarios.balanced[0]).toBe(base.currentWealth);
    expect(result.scenarios.dynamic[0]).toBe(base.currentWealth);
    expect(result.targetScenario[0]).toBe(base.currentWealth);
  });

  it('axe X commence à currentAge et finit à retirementAge', () => {
    const result = computeRetirementProjection(base);
    expect(result.years[0]).toBe(base.currentAge);
    expect(result.years[result.years.length - 1]).toBe(base.retirementAge);
  });

  it('les âges se succèdent pas à pas de 1', () => {
    const result = computeRetirementProjection(base);
    for (let i = 1; i < result.years.length; i++) {
      expect(result.years[i]).toBe(result.years[i - 1] + 1);
    }
  });

  it('lève une erreur si retirementAge <= currentAge', () => {
    expect(() =>
      computeRetirementProjection({ ...base, retirementAge: 30 })
    ).toThrow();
    expect(() =>
      computeRetirementProjection({ ...base, retirementAge: 25 })
    ).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// computeRetirementProjection — ordre des scénarios
// ─────────────────────────────────────────────────────────────

describe('computeRetirementProjection — ordre des scénarios', () => {
  const base: RetirementInput = {
    currentAge: 35,
    retirementAge: 65,
    currentWealth: 20_000,
    monthlyInvestment: 800,
    targetMonthlyIncome: 2_500,
  };

  it('prudent < balanced < dynamic à chaque année (hors année 0)', () => {
    const { scenarios } = computeRetirementProjection(base);
    for (let i = 1; i < scenarios.balanced.length; i++) {
      expect(scenarios.prudent[i]).toBeLessThan(scenarios.balanced[i]);
      expect(scenarios.balanced[i]).toBeLessThan(scenarios.dynamic[i]);
    }
  });

  it('tous les scénarios croissent dans le temps', () => {
    const { scenarios } = computeRetirementProjection(base);
    for (let i = 1; i < scenarios.balanced.length; i++) {
      expect(scenarios.prudent[i]).toBeGreaterThan(scenarios.prudent[i - 1]);
      expect(scenarios.balanced[i]).toBeGreaterThan(scenarios.balanced[i - 1]);
      expect(scenarios.dynamic[i]).toBeGreaterThan(scenarios.dynamic[i - 1]);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// computeRetirementProjection — targetCapital (règle des 4 %)
// ─────────────────────────────────────────────────────────────

describe('computeRetirementProjection — targetCapital', () => {
  it('3000 €/mois → 900 000 € (règle des 4 %)', () => {
    const result = computeRetirementProjection({
      currentAge: 30,
      retirementAge: 65,
      currentWealth: 0,
      monthlyInvestment: 0,
      targetMonthlyIncome: 3_000,
    });
    expect(result.targetCapital).toBeCloseTo(900_000, 0);
  });

  it('2500 €/mois → 750 000 €', () => {
    const result = computeRetirementProjection({
      currentAge: 30,
      retirementAge: 65,
      currentWealth: 0,
      monthlyInvestment: 0,
      targetMonthlyIncome: 2_500,
    });
    expect(result.targetCapital).toBeCloseTo(750_000, 0);
  });

  it('targetCapital = targetMonthlyIncome × 12 / 0.04', () => {
    const income = 4_200;
    const result = computeRetirementProjection({
      currentAge: 40,
      retirementAge: 67,
      currentWealth: 100_000,
      monthlyInvestment: 1_500,
      targetMonthlyIncome: income,
    });
    expect(result.targetCapital).toBeCloseTo((income * 12) / 0.04, 2);
  });
});

// ─────────────────────────────────────────────────────────────
// computeRetirementProjection — gap et monthlyDeltaNeeded
// ─────────────────────────────────────────────────────────────

describe('computeRetirementProjection — gap & delta', () => {
  it('gapAtRetirement positif si objectif non atteint (0 épargne)', () => {
    const result = computeRetirementProjection({
      currentAge: 30,
      retirementAge: 65,
      currentWealth: 0,
      monthlyInvestment: 0,     // aucune épargne → certain déficit
      targetMonthlyIncome: 3_000,
    });
    expect(result.gapAtRetirement).toBeGreaterThan(0);
    expect(result.monthlyDeltaNeeded).toBeGreaterThan(0);
  });

  it('gapAtRetirement négatif si objectif largement dépassé', () => {
    // 1 M€ investi à 5 %/an pendant 30 ans sans épargne ≈ 4,3 M€ >> 900 k€
    const result = computeRetirementProjection({
      currentAge: 30,
      retirementAge: 60,
      currentWealth: 1_000_000,
      monthlyInvestment: 0,
      targetMonthlyIncome: 3_000, // targetCapital = 900 k€
    });
    expect(result.gapAtRetirement).toBeLessThan(0);
    expect(result.monthlyDeltaNeeded).toBe(0);
  });

  it('monthlyDeltaNeeded est 0 si pas de gap', () => {
    const result = computeRetirementProjection({
      currentAge: 30,
      retirementAge: 60,
      currentWealth: 2_000_000,  // patrimoine très élevé
      monthlyInvestment: 5_000,
      targetMonthlyIncome: 3_000,
    });
    expect(result.monthlyDeltaNeeded).toBe(0);
  });

  it('targetScenario termine ≈ targetCapital (tolérance +monthlyDelta arrondi)', () => {
    const result = computeRetirementProjection({
      currentAge: 30,
      retirementAge: 65,
      currentWealth: 10_000,
      monthlyInvestment: 500,
      targetMonthlyIncome: 3_000,
    });
    const finalTarget = result.targetScenario[result.targetScenario.length - 1];
    // Le delta est arrondi au € supérieur → le final peut dépasser légèrement targetCapital
    expect(finalTarget).toBeGreaterThanOrEqual(result.targetCapital - 1);
    // Tolérance raisonnable : au plus quelques milliers d'euros d'arrondi
    expect(finalTarget).toBeLessThan(result.targetCapital + 50_000);
  });

  it('targetScenario >= balanced à chaque point si gap > 0', () => {
    const result = computeRetirementProjection({
      currentAge: 35,
      retirementAge: 65,
      currentWealth: 5_000,
      monthlyInvestment: 300,
      targetMonthlyIncome: 3_000,
    });
    if (result.gapAtRetirement > 0) {
      for (let i = 0; i < result.scenarios.balanced.length; i++) {
        expect(result.targetScenario[i]).toBeGreaterThanOrEqual(
          result.scenarios.balanced[i] - 1 // tolérance arrondi
        );
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// computeRetirementProjection — cas extrêmes
// ─────────────────────────────────────────────────────────────

describe('computeRetirementProjection — cas extrêmes', () => {
  it('1 an de projection (currentAge = retirementAge - 1)', () => {
    const result = computeRetirementProjection({
      currentAge: 64,
      retirementAge: 65,
      currentWealth: 500_000,
      monthlyInvestment: 2_000,
      targetMonthlyIncome: 3_000,
    });
    expect(result.years).toHaveLength(2); // [64, 65]
    expect(result.scenarios.balanced).toHaveLength(2);
  });

  it('0 patrimoine initial et 0 épargne → tableaux constants à 0', () => {
    const result = computeRetirementProjection({
      currentAge: 30,
      retirementAge: 65,
      currentWealth: 0,
      monthlyInvestment: 0,
      targetMonthlyIncome: 3_000,
    });
    expect(result.scenarios.balanced.every((v) => v === 0)).toBe(true);
    expect(result.scenarios.prudent.every((v) => v === 0)).toBe(true);
    expect(result.scenarios.dynamic.every((v) => v === 0)).toBe(true);
  });

  it('épargne très élevée → scenarios cohérents et positifs', () => {
    const result = computeRetirementProjection({
      currentAge: 25,
      retirementAge: 45,
      currentWealth: 0,
      monthlyInvestment: 10_000,
      targetMonthlyIncome: 5_000,
    });
    const finalBalanced = result.scenarios.balanced[result.scenarios.balanced.length - 1];
    expect(finalBalanced).toBeGreaterThan(0);
    expect(Number.isFinite(finalBalanced)).toBe(true);
  });

  it('taux de rentabilité : RETIREMENT_RATES exportés avec bonnes valeurs', () => {
    expect(RETIREMENT_RATES.prudent).toBe(0.03);
    expect(RETIREMENT_RATES.balanced).toBe(0.05);
    expect(RETIREMENT_RATES.dynamic).toBe(0.07);
  });
});
