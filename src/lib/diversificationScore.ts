/**
 * Single Source of Truth for Diversification Score Calculation
 * 
 * This module provides a deterministic, transparent scoring system using:
 * - HHI (Herfindahl-Hirschman Index) for measuring concentration
 * - 4 sub-scores of 25 points each (asset class, region, sector, position concentration)
 * - Optional look-through mode for ETF decomposition
 */

export interface ScorePosition {
  ticker: string;
  name: string;
  valueEUR: number;
  weightPct: number;
  assetClass: string | null;
  region: string | null;
  sector: string | null;
  isClassified: boolean;
}

export interface ScoreOptions {
  useLookThrough: boolean;
  maxPositionPct: number;
  weights?: {
    assetClass: number;
    region: number;
    sector: number;
    concentration: number;
  };
}

export interface SubScoreBreakdown {
  name: string;
  score: number;
  maxScore: number;
  hhi: number;
  hhiNormalized: number;
  itemCount: number;
  description: string;
}

export interface ConcentrationPenalty {
  code: string;
  label: string;
  points: number;
  details: string;
}

export interface ScoreCoverage {
  totalPositions: number;
  classifiedPositions: number;
  classifiedPct: number;
  missingTickers: string[];
}

export interface AllocationEntry {
  name: string;
  value: number;
  percentage: number;
}

export interface ScoreDebug {
  allocByClass: AllocationEntry[];
  allocByRegion: AllocationEntry[];
  allocBySector: AllocationEntry[];
  positionWeights: Array<{ ticker: string; weight: number }>;
  rawHHI: { assetClass: number; region: number; sector: number };
}

export interface DiversificationScoreResult {
  totalScore: number;
  label: 'Faible' | 'Moyen' | 'Bon' | 'Excellent';
  subscores: SubScoreBreakdown[];
  penalties: ConcentrationPenalty[];
  coverage: ScoreCoverage;
  debug: ScoreDebug;
}

const DEFAULT_WEIGHTS = {
  assetClass: 25,
  region: 25,
  sector: 25,
  concentration: 25,
};

// Values that indicate unclassified metadata (for score calculations that filter these out)
// NOTE: 'Monde' and 'Diversifié' are VALID values for global ETFs, not unclassified!
const UNCLASSIFIED_VALUES = ['Non classifié', 'Unknown', 'Non défini', null, undefined, ''];

/**
 * Calculate HHI (Herfindahl-Hirschman Index)
 * Range: 0 (perfect diversity) to 10000 (complete monopoly)
 * Formula: sum of squared percentage shares
 */
function calculateHHI(allocations: AllocationEntry[]): number {
  // Filter out unclassified items for HHI calculation
  const validAllocations = allocations.filter(
    a => !UNCLASSIFIED_VALUES.includes(a.name) && a.percentage > 0
  );
  
  if (validAllocations.length === 0) return 10000; // Max concentration if nothing classified
  if (validAllocations.length === 1) return 10000; // Single item = max concentration
  
  // Recalculate percentages based only on classified items
  const totalValidPct = validAllocations.reduce((sum, a) => sum + a.percentage, 0);
  
  if (totalValidPct === 0) return 10000;
  
  const hhi = validAllocations.reduce((sum, a) => {
    const normalizedPct = (a.percentage / totalValidPct) * 100;
    return sum + Math.pow(normalizedPct, 2);
  }, 0);
  
  return Math.round(hhi);
}

/**
 * Convert HHI to a 0-maxScore scale (higher is better = more diverse)
 * Uses a curved scale for better differentiation in the middle range
 */
function hhiToScore(hhi: number, maxScore: number): number {
  // HHI 0 -> maxScore (perfectly diverse)
  // HHI 10000 -> 0 (perfectly concentrated)
  // Using square root for a more balanced curve
  const normalized = Math.sqrt(Math.max(0, 1 - hhi / 10000));
  return Math.round(normalized * maxScore);
}

/**
 * Calculate concentration penalty score based on position weights exceeding threshold
 */
function calculateConcentrationScore(
  positions: ScorePosition[],
  maxPositionPct: number,
  maxScore: number
): { score: number; penalties: ConcentrationPenalty[] } {
  const penalties: ConcentrationPenalty[] = [];
  
  if (positions.length === 0) return { score: 0, penalties };
  
  const overConcentrated = positions.filter(p => p.weightPct > maxPositionPct);
  
  if (overConcentrated.length === 0) {
    return { score: maxScore, penalties };
  }
  
  let totalPenalty = 0;
  
  overConcentrated.forEach(p => {
    const excess = p.weightPct - maxPositionPct;
    const penaltyPoints = Math.min(excess * 0.5, maxScore / 3);
    totalPenalty += penaltyPoints;
    
    penalties.push({
      code: `POSITION_${p.ticker}`,
      label: `${p.ticker} > ${maxPositionPct}%`,
      points: Math.round(penaltyPoints * 10) / 10,
      details: `${p.ticker} représente ${p.weightPct.toFixed(1)}% (excès: ${excess.toFixed(1)}%)`,
    });
  });
  
  const score = Math.max(0, Math.round(maxScore - totalPenalty));
  return { score, penalties };
}

/**
 * Build allocation breakdown by a given key
 */
function buildAllocation(
  positions: ScorePosition[],
  keyFn: (p: ScorePosition) => string | null
): AllocationEntry[] {
  const map = new Map<string, number>();
  let total = 0;
  
  positions.forEach(p => {
    const key = keyFn(p) || 'Non classifié';
    map.set(key, (map.get(key) || 0) + p.valueEUR);
    total += p.valueEUR;
  });
  
  return Array.from(map.entries())
    .map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Get the score label based on total score
 */
function getScoreLabel(score: number): DiversificationScoreResult['label'] {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Bon';
  if (score >= 40) return 'Moyen';
  return 'Faible';
}

/**
 * Main scoring function - Single Source of Truth
 */
export function computeDiversificationScore(
  positions: ScorePosition[],
  options: ScoreOptions
): DiversificationScoreResult {
  const weights = options.weights || DEFAULT_WEIGHTS;
  
  // Build allocations
  const allocByClass = buildAllocation(positions, p => p.assetClass);
  const allocByRegion = buildAllocation(positions, p => p.region);
  const allocBySector = buildAllocation(positions, p => p.sector);
  
  // Calculate HHI for each dimension
  const hhiClass = calculateHHI(allocByClass);
  const hhiRegion = calculateHHI(allocByRegion);
  const hhiSector = calculateHHI(allocBySector);
  
  // Convert HHI to scores
  const classScore = hhiToScore(hhiClass, weights.assetClass);
  const regionScore = hhiToScore(hhiRegion, weights.region);
  const sectorScore = hhiToScore(hhiSector, weights.sector);
  
  // Calculate concentration score with penalties
  const { score: concentrationScore, penalties } = calculateConcentrationScore(
    positions,
    options.maxPositionPct,
    weights.concentration
  );
  
  // Count items per dimension (excluding unclassified)
  const classCount = allocByClass.filter(a => !UNCLASSIFIED_VALUES.includes(a.name)).length;
  const regionCount = allocByRegion.filter(a => !UNCLASSIFIED_VALUES.includes(a.name)).length;
  const sectorCount = allocBySector.filter(a => !UNCLASSIFIED_VALUES.includes(a.name)).length;
  const overConcentratedCount = positions.filter(p => p.weightPct > options.maxPositionPct).length;
  
  // Build subscores
  const subscores: SubScoreBreakdown[] = [
    {
      name: "Classes d'actifs",
      score: classScore,
      maxScore: weights.assetClass,
      hhi: hhiClass,
      hhiNormalized: Math.round((1 - hhiClass / 10000) * 100),
      itemCount: classCount,
      description: `Répartition entre ${classCount} classe${classCount > 1 ? 's' : ''}`,
    },
    {
      name: 'Régions',
      score: regionScore,
      maxScore: weights.region,
      hhi: hhiRegion,
      hhiNormalized: Math.round((1 - hhiRegion / 10000) * 100),
      itemCount: regionCount,
      description: `Répartition entre ${regionCount} région${regionCount > 1 ? 's' : ''}`,
    },
    {
      name: 'Secteurs',
      score: sectorScore,
      maxScore: weights.sector,
      hhi: hhiSector,
      hhiNormalized: Math.round((1 - hhiSector / 10000) * 100),
      itemCount: sectorCount,
      description: `Répartition entre ${sectorCount} secteur${sectorCount > 1 ? 's' : ''}`,
    },
    {
      name: 'Concentration',
      score: concentrationScore,
      maxScore: weights.concentration,
      hhi: 0,
      hhiNormalized: overConcentratedCount === 0 ? 100 : Math.max(0, 100 - overConcentratedCount * 20),
      itemCount: positions.length - overConcentratedCount,
      description: overConcentratedCount === 0 
        ? `Aucune position > ${options.maxPositionPct}%`
        : `${overConcentratedCount} position${overConcentratedCount > 1 ? 's' : ''} > ${options.maxPositionPct}%`,
    },
  ];
  
  // Calculate total score
  const totalScore = classScore + regionScore + sectorScore + concentrationScore;
  
  // Build coverage info
  const classifiedPositions = positions.filter(p => p.isClassified).length;
  const missingTickers = positions
    .filter(p => !p.isClassified)
    .map(p => p.ticker);
  
  const coverage: ScoreCoverage = {
    totalPositions: positions.length,
    classifiedPositions,
    classifiedPct: positions.length > 0 ? (classifiedPositions / positions.length) * 100 : 0,
    missingTickers,
  };
  
  // Build debug info
  const debug: ScoreDebug = {
    allocByClass,
    allocByRegion,
    allocBySector,
    positionWeights: positions.map(p => ({ ticker: p.ticker, weight: p.weightPct })),
    rawHHI: { assetClass: hhiClass, region: hhiRegion, sector: hhiSector },
  };
  
  return {
    totalScore: Math.max(0, Math.min(100, totalScore)),
    label: getScoreLabel(totalScore),
    subscores,
    penalties,
    coverage,
    debug,
  };
}

/**
 * Check if a position is properly classified
 */
/**
 * Check if a position is properly classified
 * A position is classified if it has BOTH region AND sector that are not placeholders.
 * 'Monde' and 'Diversifié' are VALID values (for global ETFs).
 */
export function isPositionClassified(
  region: string | null,
  sector: string | null,
  assetClass: string | null
): boolean {
  // Values that indicate MISSING classification
  const unclassified = ['Non classifié', 'Unknown', 'Non défini', null, undefined, ''];
  
  const hasRegion = region && !unclassified.includes(region);
  const hasSector = sector && !unclassified.includes(sector);
  
  return Boolean(hasRegion && hasSector);
}
