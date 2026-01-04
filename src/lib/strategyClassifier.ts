/**
 * Strategy Classifier Module
 * Determines investor archetype and default thresholds based on onboarding answers
 */

export type StrategyArchetype = 'Defensive' | 'Balanced' | 'Growth' | 'HighVolatility';

export interface StrategyThresholds {
  cash_target_pct: number;
  max_position_pct: number;
  max_asset_class_pct: number;
}

export interface StrategyResult {
  archetype: StrategyArchetype;
  thresholds: StrategyThresholds;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string[];
}

export interface OnboardingAnswers {
  investment_horizon?: string | null;
  max_acceptable_loss?: string | null;
  financial_resilience_months?: string | null;
  income_stability?: string | null;
}

// Default thresholds by archetype
const ARCHETYPE_THRESHOLDS: Record<StrategyArchetype, StrategyThresholds> = {
  Defensive: {
    cash_target_pct: 15,
    max_position_pct: 7,
    max_asset_class_pct: 70,
  },
  Balanced: {
    cash_target_pct: 10,
    max_position_pct: 10,
    max_asset_class_pct: 80,
  },
  Growth: {
    cash_target_pct: 6,
    max_position_pct: 12,
    max_asset_class_pct: 90,
  },
  HighVolatility: {
    cash_target_pct: 4,
    max_position_pct: 15,
    max_asset_class_pct: 95,
  },
};

// French labels for UI
export const ARCHETYPE_LABELS: Record<StrategyArchetype, string> = {
  Defensive: 'Défensif',
  Balanced: 'Équilibré',
  Growth: 'Croissance',
  HighVolatility: 'Haute Volatilité',
};

export const ARCHETYPE_DESCRIPTIONS: Record<StrategyArchetype, string> = {
  Defensive: 'Priorité à la préservation du capital. Tolérance au risque faible, horizon court ou capacité financière limitée.',
  Balanced: 'Équilibre entre croissance et sécurité. Tolérance au risque modérée, horizon moyen.',
  Growth: 'Priorité à la croissance long terme. Tolérance au risque élevée, horizon long et bonne capacité financière.',
  HighVolatility: 'Maximisation du rendement avec volatilité acceptée. Très haute tolérance au risque.',
};

/**
 * Parse investment horizon string to months
 */
function parseHorizonMonths(horizon: string | null | undefined): number {
  if (!horizon) return 36; // default to 3 years
  
  const lower = horizon.toLowerCase();
  
  // Match French horizon strings
  if (lower.includes('moins de 2') || lower.includes('< 2') || lower.includes('court')) return 18;
  if (lower.includes('2-5') || lower.includes('2 à 5') || lower.includes('moyen')) return 42;
  if (lower.includes('5-10') || lower.includes('5 à 10')) return 84;
  if (lower.includes('plus de 10') || lower.includes('> 10') || lower.includes('long')) return 144;
  
  // Try to extract number
  const match = horizon.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    // If it looks like years, convert to months
    if (num <= 30) return num * 12;
    return num;
  }
  
  return 36;
}

/**
 * Parse max acceptable loss string to percentage
 */
function parseLossPct(loss: string | null | undefined): number {
  if (!loss) return 20; // default moderate
  
  const lower = loss.toLowerCase();
  
  // Match French loss strings
  if (lower.includes('0%') || lower.includes('aucune') || lower.includes('pas de')) return 0;
  if (lower.includes('5%') || lower.includes('très faible')) return 5;
  if (lower.includes('10%') || lower.includes('faible')) return 10;
  if (lower.includes('15%')) return 15;
  if (lower.includes('20%') || lower.includes('modéré')) return 20;
  if (lower.includes('30%') || lower.includes('élevé')) return 30;
  if (lower.includes('40%') || lower.includes('45%') || lower.includes('50%') || lower.includes('très élevé')) return 45;
  
  // Try to extract number
  const match = loss.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  
  return 20;
}

/**
 * Parse financial resilience string to months
 */
function parseResilienceMonths(resilience: string | null | undefined): number {
  if (!resilience) return 3; // default
  
  const lower = resilience.toLowerCase();
  
  if (lower.includes('moins de 3') || lower.includes('< 3') || lower.includes('1-2')) return 2;
  if (lower.includes('3-6') || lower.includes('3 à 6')) return 4;
  if (lower.includes('6-12') || lower.includes('6 à 12')) return 9;
  if (lower.includes('plus de 12') || lower.includes('> 12') || lower.includes('1 an')) return 18;
  
  // Try to extract number
  const match = resilience.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  
  return 3;
}

/**
 * Main classifier function - determines archetype from onboarding answers
 */
export function classifyStrategy(answers: OnboardingAnswers): StrategyResult {
  const horizonMonths = parseHorizonMonths(answers.investment_horizon);
  const lossPct = parseLossPct(answers.max_acceptable_loss);
  const resilienceMonths = parseResilienceMonths(answers.financial_resilience_months);
  
  const reasoning: string[] = [];
  let archetype: StrategyArchetype;
  let confidence: 'high' | 'medium' | 'low' = 'high';
  
  // Classification rules (in order of priority)
  
  // Rule 1: HighVolatility - Very high loss tolerance
  if (lossPct >= 45) {
    archetype = 'HighVolatility';
    reasoning.push(`Tolérance aux pertes très élevée (${lossPct}%)`);
    if (horizonMonths < 60) {
      confidence = 'medium';
      reasoning.push('⚠️ Horizon court pour ce niveau de risque');
    }
  }
  // Rule 2: Defensive - Short horizon OR low loss tolerance OR weak resilience
  else if (horizonMonths < 36 || lossPct <= 15 || resilienceMonths < 3) {
    archetype = 'Defensive';
    if (horizonMonths < 36) reasoning.push(`Horizon court (${Math.round(horizonMonths / 12)} ans)`);
    if (lossPct <= 15) reasoning.push(`Tolérance aux pertes limitée (${lossPct}%)`);
    if (resilienceMonths < 3) reasoning.push(`Résilience financière faible (< 3 mois)`);
  }
  // Rule 3: Growth - Long horizon AND high loss tolerance AND good resilience
  else if (horizonMonths > 84 && lossPct >= 30 && resilienceMonths >= 6) {
    archetype = 'Growth';
    reasoning.push(`Horizon long (${Math.round(horizonMonths / 12)}+ ans)`);
    reasoning.push(`Tolérance aux pertes élevée (${lossPct}%)`);
    reasoning.push(`Bonne résilience financière (${resilienceMonths}+ mois)`);
  }
  // Rule 4: Default to Balanced
  else {
    archetype = 'Balanced';
    reasoning.push('Profil équilibré entre risque et sécurité');
    if (horizonMonths >= 36 && horizonMonths <= 84) {
      reasoning.push(`Horizon moyen (${Math.round(horizonMonths / 12)} ans)`);
    }
    if (lossPct > 15 && lossPct < 30) {
      reasoning.push(`Tolérance au risque modérée (${lossPct}%)`);
    }
  }
  
  // Check for incomplete data
  if (!answers.investment_horizon || !answers.max_acceptable_loss) {
    confidence = 'low';
    reasoning.push('⚠️ Données incomplètes - répondez à l\'onboarding pour affiner');
  }
  
  return {
    archetype,
    thresholds: ARCHETYPE_THRESHOLDS[archetype],
    confidence,
    reasoning,
  };
}

/**
 * Get thresholds for a specific archetype
 */
export function getArchetypeThresholds(archetype: StrategyArchetype): StrategyThresholds {
  return { ...ARCHETYPE_THRESHOLDS[archetype] };
}

/**
 * Get all archetypes for selection UI
 */
export function getAllArchetypes(): Array<{
  key: StrategyArchetype;
  label: string;
  description: string;
  thresholds: StrategyThresholds;
}> {
  return (Object.keys(ARCHETYPE_THRESHOLDS) as StrategyArchetype[]).map(key => ({
    key,
    label: ARCHETYPE_LABELS[key],
    description: ARCHETYPE_DESCRIPTIONS[key],
    thresholds: ARCHETYPE_THRESHOLDS[key],
  }));
}
