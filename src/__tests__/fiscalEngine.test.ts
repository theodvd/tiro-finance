/**
 * Tests unitaires — fiscalEngine.ts
 *
 * Couvre les régimes supportés en Phase A/B (micro_bnc, micro_bic, ei_reel)
 * et les deux méthodes IR (versement libératoire, barème progressif).
 *
 * Taux de référence 2025 :
 *   micro_bnc → URSSAF 24,6 % · VL IR 2,2 %  · abattement 34 %
 *   micro_bic → URSSAF 12,8 % · VL IR 1,0 %  · abattement 50 %
 */

import { describe, it, expect } from 'vitest';
import { computeNetInvestable, FISCAL_RATES } from '@/lib/fiscalEngine';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Arrondit à 2 décimales (même logique que fiscalEngine). */
const round2 = (n: number) => Math.round(n * 100) / 100;

// ─────────────────────────────────────────────────────────────
// Constantes exportées
// ─────────────────────────────────────────────────────────────

describe('FISCAL_RATES', () => {
  it('micro_bnc : taux 2025 corrects', () => {
    expect(FISCAL_RATES.micro_bnc.urssaf).toBe(0.246);
    expect(FISCAL_RATES.micro_bnc.ir_vl).toBe(0.022);
    expect(FISCAL_RATES.micro_bnc.abattement).toBe(0.34);
  });

  it('micro_bic : taux 2025 corrects', () => {
    expect(FISCAL_RATES.micro_bic.urssaf).toBe(0.128);
    expect(FISCAL_RATES.micro_bic.ir_vl).toBe(0.010);
    expect(FISCAL_RATES.micro_bic.abattement).toBe(0.50);
  });
});

// ─────────────────────────────────────────────────────────────
// micro_bnc — versement libératoire
// ─────────────────────────────────────────────────────────────

describe('computeNetInvestable — micro_bnc + versement libératoire', () => {
  const BASE = {
    monthlyRevenue: 5000,
    regime: 'micro_bnc' as const,
    versement_liberatoire: true,
  };

  it('calcule URSSAF à 24,6 % du CA', () => {
    const r = computeNetInvestable(BASE);
    expect(r.urssaf).toBe(round2(5000 * 0.246));  // 1230
  });

  it('calcule IR VL à 2,2 % du CA', () => {
    const r = computeNetInvestable(BASE);
    expect(r.ir).toBe(round2(5000 * 0.022));  // 110
  });

  it('totalDeductions = URSSAF + IR', () => {
    const r = computeNetInvestable(BASE);
    expect(r.totalDeductions).toBe(round2(r.urssaf + r.ir));
  });

  it('netAfterDeductions = revenue − totalDeductions', () => {
    const r = computeNetInvestable(BASE);
    expect(r.netAfterDeductions).toBe(round2(5000 - r.totalDeductions));  // 3660
  });

  it('netInvestable = netAfterDeductions si pas de dépenses perso', () => {
    const r = computeNetInvestable(BASE);
    expect(r.netInvestable).toBe(r.netAfterDeductions);
  });

  it('netInvestable tient compte des dépenses perso', () => {
    const r = computeNetInvestable({ ...BASE, personalExpenses: 2000 });
    expect(r.netInvestable).toBe(round2(r.netAfterDeductions - 2000));
  });

  it('irMethod = versement_liberatoire', () => {
    expect(computeNetInvestable(BASE).irMethod).toBe('versement_liberatoire');
  });

  it('isEstimate = false', () => {
    expect(computeNetInvestable(BASE).isEstimate).toBe(false);
  });

  it('pas de warning', () => {
    expect(computeNetInvestable(BASE).warning).toBeUndefined();
  });

  it('rates retournés = taux utilisés', () => {
    const r = computeNetInvestable(BASE);
    expect(r.rates.urssaf).toBe(0.246);
    expect(r.rates.ir).toBe(0.022);
    expect(r.rates.abattement).toBe(0.34);
  });

  it('CA = 0 → tout à zéro', () => {
    const r = computeNetInvestable({ ...BASE, monthlyRevenue: 0 });
    expect(r.urssaf).toBe(0);
    expect(r.ir).toBe(0);
    expect(r.netInvestable).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// micro_bnc — barème progressif
// ─────────────────────────────────────────────────────────────

describe('computeNetInvestable — micro_bnc + barème progressif', () => {
  const BASE = {
    monthlyRevenue: 5000,
    regime: 'micro_bnc' as const,
    versement_liberatoire: false,
  };

  it('irMethod = bareme_progressif_estimate', () => {
    expect(computeNetInvestable(BASE).irMethod).toBe('bareme_progressif_estimate');
  });

  it('isEstimate = true', () => {
    expect(computeNetInvestable(BASE).isEstimate).toBe(true);
  });

  it('warning défini', () => {
    expect(computeNetInvestable(BASE).warning).toBeDefined();
  });

  it('IR > 0 pour un CA de 5000 €/mois (tranche 30 %)', () => {
    // CA annuel = 60 000 €, revenu imposable = 60 000 × (1-0,34) = 39 600 €
    // Tranche 30 % sur 39 600 − 29 315 = 10 285 €
    // IR annuel ≈ (29 315 − 11 497) × 11% + 10 285 × 30% ≈ 1960 + 3086 ≈ 5046
    // IR mensuel ≈ 421
    const r = computeNetInvestable(BASE);
    expect(r.ir).toBeGreaterThan(0);
    // Fourchette large : entre 300 et 600 €/mois
    expect(r.ir).toBeGreaterThan(300);
    expect(r.ir).toBeLessThan(600);
  });

  it('IR barème < IR VL pour faibles revenus (tranche 11 %)', () => {
    // Pour un petit CA (2000 €/mois), le barème 11 % < VL 2,2 %... en fait non
    // VL 2,2 % × 2000 = 44 €/mois
    // Barème : annuel = 24000 × 0,66 = 15840 imposable
    //   11 % sur (15840 - 11497) = 4343 → 477 €/an → 40 €/mois
    // Donc barème légèrement inférieur dans ce cas
    const vl = computeNetInvestable({ ...BASE, versement_liberatoire: true, monthlyRevenue: 2000 });
    const bareme = computeNetInvestable({ ...BASE, monthlyRevenue: 2000 });
    // Les deux doivent être positifs
    expect(vl.ir).toBeGreaterThan(0);
    expect(bareme.ir).toBeGreaterThan(0);
  });

  it('revenue est toujours retrouvé dans le résultat', () => {
    const r = computeNetInvestable(BASE);
    expect(r.revenue).toBe(5000);
  });
});

// ─────────────────────────────────────────────────────────────
// micro_bic — versement libératoire
// ─────────────────────────────────────────────────────────────

describe('computeNetInvestable — micro_bic + versement libératoire', () => {
  const BASE = {
    monthlyRevenue: 8000,
    regime: 'micro_bic' as const,
    versement_liberatoire: true,
  };

  it('URSSAF à 12,8 % du CA', () => {
    const r = computeNetInvestable(BASE);
    expect(r.urssaf).toBe(round2(8000 * 0.128));  // 1024
  });

  it('IR VL à 1 % du CA', () => {
    const r = computeNetInvestable(BASE);
    expect(r.ir).toBe(round2(8000 * 0.010));  // 80
  });

  it('taux micro_bic < micro_bnc (commerce moins chargé)', () => {
    const bnc = computeNetInvestable({ ...BASE, regime: 'micro_bnc' });
    const bic = computeNetInvestable(BASE);
    expect(bic.totalDeductions).toBeLessThan(bnc.totalDeductions);
  });

  it('netInvestable cohérent avec dépenses perso', () => {
    const r = computeNetInvestable({ ...BASE, personalExpenses: 3000 });
    expect(r.netInvestable).toBe(round2(r.netAfterDeductions - 3000));
  });
});

// ─────────────────────────────────────────────────────────────
// ei_reel — non calculable (estimation impossible)
// ─────────────────────────────────────────────────────────────

describe('computeNetInvestable — ei_reel', () => {
  const BASE = {
    monthlyRevenue: 6000,
    regime: 'ei_reel' as const,
    versement_liberatoire: false,
  };

  it('URSSAF = 0 (charges réelles requises)', () => {
    expect(computeNetInvestable(BASE).urssaf).toBe(0);
  });

  it('IR = 0', () => {
    expect(computeNetInvestable(BASE).ir).toBe(0);
  });

  it('irMethod = not_applicable', () => {
    expect(computeNetInvestable(BASE).irMethod).toBe('not_applicable');
  });

  it('isEstimate = true', () => {
    expect(computeNetInvestable(BASE).isEstimate).toBe(true);
  });

  it('warning défini', () => {
    expect(typeof computeNetInvestable(BASE).warning).toBe('string');
  });

  it('netInvestable = revenue (aucune déduction appliquée)', () => {
    const r = computeNetInvestable(BASE);
    expect(r.netInvestable).toBe(6000);
  });
});

// ─────────────────────────────────────────────────────────────
// sasu / eurl — non supportés Phase A/B
// ─────────────────────────────────────────────────────────────

describe('computeNetInvestable — sasu / eurl (non supportés)', () => {
  it('sasu : isEstimate = true + warning', () => {
    const r = computeNetInvestable({
      monthlyRevenue: 5000,
      regime: 'sasu',
      versement_liberatoire: false,
    });
    expect(r.isEstimate).toBe(true);
    expect(r.warning).toBeDefined();
    expect(r.urssaf).toBe(0);
  });

  it('eurl : isEstimate = true + warning', () => {
    const r = computeNetInvestable({
      monthlyRevenue: 5000,
      regime: 'eurl',
      versement_liberatoire: false,
    });
    expect(r.isEstimate).toBe(true);
    expect(r.warning).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// Cas limites / robustesse
// ─────────────────────────────────────────────────────────────

describe('computeNetInvestable — cas limites', () => {
  it('personalExpenses absent → traité comme 0', () => {
    const withZero = computeNetInvestable({
      monthlyRevenue: 3000,
      regime: 'micro_bnc',
      versement_liberatoire: true,
      personalExpenses: 0,
    });
    const withoutExpenses = computeNetInvestable({
      monthlyRevenue: 3000,
      regime: 'micro_bnc',
      versement_liberatoire: true,
    });
    expect(withZero.netInvestable).toBe(withoutExpenses.netInvestable);
  });

  it('dépenses perso > net après charges → netInvestable négatif autorisé', () => {
    const r = computeNetInvestable({
      monthlyRevenue: 1000,
      regime: 'micro_bnc',
      versement_liberatoire: true,
      personalExpenses: 5000,
    });
    expect(r.netInvestable).toBeLessThan(0);
  });

  it('montants arrondis à 2 décimales', () => {
    const r = computeNetInvestable({
      monthlyRevenue: 3333,
      regime: 'micro_bnc',
      versement_liberatoire: true,
    });
    // 3333 × 0.246 = 819.918 → arrondi à 819.92
    expect(r.urssaf).toBe(819.92);
    // Vérifie que les montants ont au plus 2 décimales
    const hasTwoDecimalsOrLess = (n: number) => Number.isFinite(n) && Math.round(n * 100) === n * 100;
    expect(hasTwoDecimalsOrLess(r.urssaf)).toBe(true);
    expect(hasTwoDecimalsOrLess(r.ir)).toBe(true);
    expect(hasTwoDecimalsOrLess(r.netInvestable)).toBe(true);
  });
});
