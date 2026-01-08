/**
 * Investor Profile Engine - Single Source of Truth
 * 
 * Implements a multi-dimensional scoring system aligned with MIFID II and robo-advisor standards.
 * Three dimensions: Capacity, Tolerance, Objectives
 * Five profiles: Prudent, Équilibré, Croissance, Dynamique, Conviction
 */

// ============= TYPES =============

export type InvestorProfile = 'Prudent' | 'Équilibré' | 'Croissance' | 'Dynamique' | 'Conviction';

export interface DimensionScore {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  factors: string[];
}

export interface ProfileThresholds {
  // Cash / liquidity
  cashTargetPct: { min: number; max: number };
  // Position concentration - differentiated by asset type
  maxStockPositionPct: number;
  maxEtfPositionPct: number;
  // Asset class concentration
  maxAssetClassPct: number;
  // Target diversification score range
  targetScoreRange: { min: number; max: number };
}

export interface ProfileResult {
  profile: InvestorProfile;
  scores: {
    capacity: DimensionScore;
    tolerance: DimensionScore;
    objectives: DimensionScore;
    total: number;
  };
  thresholds: ProfileThresholds;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string[];
}

export interface OnboardingAnswers {
  // A. Capacity questions
  portfolioShare?: string;        // Part du patrimoine
  emergencyFund?: string;         // Épargne de précaution
  incomeStability?: string;       // Stabilité des revenus
  
  // B. Objectives
  investmentHorizon?: string;     // Horizon
  mainObjective?: string;         // Objectif principal
  
  // C. Tolerance (behavioral)
  reactionToLoss?: string;        // Réaction à -20%
  riskVision?: string;            // Vision du risque
  
  // D. Knowledge & involvement
  experienceLevel?: string;       // Niveau
  timeCommitment?: string;        // Temps à consacrer
  
  // E. Allocation preferences
  preferredStyle?: string;        // ETF vs Actions
  concentrationAcceptance?: string; // Positions concentrées
}

// ============= CONSTANTS =============

export const PROFILE_LABELS: Record<InvestorProfile, string> = {
  Prudent: 'Prudent',
  Équilibré: 'Équilibré',
  Croissance: 'Croissance',
  Dynamique: 'Dynamique',
  Conviction: 'Conviction',
};

export const PROFILE_DESCRIPTIONS: Record<InvestorProfile, string> = {
  Prudent: 'Priorité à la stabilité. Aversion forte aux pertes, diversification élevée. Vous préférez la tranquillité d\'esprit à la performance maximale.',
  Équilibré: 'Compromis rendement / risque. Diversification structurée avec une exposition modérée aux marchés. Horizon moyen terme.',
  Croissance: 'Horizon long. Volatilité acceptée, concentration modérée. Vous visez la croissance du patrimoine sur le long terme.',
  Dynamique: 'Recherche de performance. Concentration assumée, forte exposition actions. Vous acceptez les fluctuations importantes.',
  Conviction: 'Investisseur avancé. Concentration élevée possible sur vos convictions. Le score sert d\'indicateur, pas de contrainte.',
};

export const PROFILE_ICONS: Record<InvestorProfile, string> = {
  Prudent: 'Shield',
  Équilibré: 'Balance',
  Croissance: 'TrendingUp',
  Dynamique: 'Rocket',
  Conviction: 'Target',
};

// Default thresholds by profile
export const PROFILE_THRESHOLDS: Record<InvestorProfile, ProfileThresholds> = {
  Prudent: {
    cashTargetPct: { min: 15, max: 25 },
    maxStockPositionPct: 5,
    maxEtfPositionPct: 20,
    maxAssetClassPct: 60,
    targetScoreRange: { min: 80, max: 100 },
  },
  Équilibré: {
    cashTargetPct: { min: 8, max: 15 },
    maxStockPositionPct: 10,
    maxEtfPositionPct: 25,
    maxAssetClassPct: 70,
    targetScoreRange: { min: 70, max: 85 },
  },
  Croissance: {
    cashTargetPct: { min: 5, max: 10 },
    maxStockPositionPct: 15,
    maxEtfPositionPct: 40,
    maxAssetClassPct: 80,
    targetScoreRange: { min: 60, max: 80 },
  },
  Dynamique: {
    cashTargetPct: { min: 2, max: 5 },
    maxStockPositionPct: 20,
    maxEtfPositionPct: 50,
    maxAssetClassPct: 90,
    targetScoreRange: { min: 50, max: 70 },
  },
  Conviction: {
    cashTargetPct: { min: 0, max: 5 },
    maxStockPositionPct: 30,
    maxEtfPositionPct: 100,
    maxAssetClassPct: 100,
    targetScoreRange: { min: 40, max: 65 },
  },
};

// ============= SCORING FUNCTIONS =============

/**
 * Calculate capacity score (objective financial situation)
 * Max 35 points - Weights financial ability to take risk
 */
function calculateCapacityScore(answers: OnboardingAnswers): DimensionScore {
  let score = 0;
  const factors: string[] = [];
  const maxScore = 35;
  
  // Portfolio share (max 12 pts)
  const portfolioShare = answers.portfolioShare?.toLowerCase() || '';
  if (portfolioShare.includes('< 20') || portfolioShare.includes('moins de 20')) {
    score += 12;
    factors.push('Portefeuille < 20% du patrimoine (+12)');
  } else if (portfolioShare.includes('20') && portfolioShare.includes('50')) {
    score += 7;
    factors.push('Portefeuille 20-50% du patrimoine (+7)');
  } else if (portfolioShare.includes('> 50') || portfolioShare.includes('plus de 50')) {
    score += 3;
    factors.push('Portefeuille > 50% du patrimoine (+3)');
  }
  
  // Emergency fund (max 12 pts)
  const emergencyFund = answers.emergencyFund?.toLowerCase() || '';
  if (
    emergencyFund.includes('12') ||
    emergencyFund.includes('> 6') ||
    emergencyFund.includes('>6') ||
    emergencyFund.includes('plus de 6') ||
    emergencyFund.includes('6 mois') ||
    emergencyFund.includes('1 an')
  ) {
    score += 12;
    factors.push('Épargne de précaution > 6 mois (+12)');
  } else if (emergencyFund.includes('3') && emergencyFund.includes('6')) {
    score += 7;
    factors.push('Épargne de précaution 3-6 mois (+7)');
  } else if (emergencyFund.includes('< 3') || emergencyFund.includes('moins de 3')) {
    score += 2;
    factors.push('Épargne de précaution < 3 mois (+2)');
  }
  
  // Income stability (max 11 pts)
  const incomeStability = answers.incomeStability?.toLowerCase() || '';
  if (incomeStability.includes('très stable') || incomeStability.includes('multiples')) {
    score += 11;
    factors.push('Revenus très stables (+11)');
  } else if (incomeStability.includes('stable') && !incomeStability.includes('in')) {
    score += 8;
    factors.push('Revenus stables (+8)');
  } else if (incomeStability.includes('variable')) {
    score += 4;
    factors.push('Revenus variables (+4)');
  } else if (incomeStability.includes('instable') || incomeStability.includes('inexistan') || incomeStability.includes('aucun')) {
    score += 1;
    factors.push('Revenus instables ou inexistants (+1)');
  }
  
  return {
    name: 'Capacité au risque',
    score,
    maxScore,
    weight: 0.35,
    factors,
  };
}

/**
 * Calculate tolerance score (subjective/behavioral)
 * Max 35 points - Measures emotional reaction to risk
 */
function calculateToleranceScore(answers: OnboardingAnswers): DimensionScore {
  let score = 0;
  const factors: string[] = [];
  const maxScore = 35;
  
  // Reaction to -20% loss (max 18 pts) - KEY question
  const reactionToLoss = answers.reactionToLoss?.toLowerCase() || '';
  if (reactionToLoss.includes('investirais') || reactionToLoss.includes('achèterais')) {
    score += 18;
    factors.push('Face à -20%: investirait davantage (+18)');
  } else if (
    reactionToLoss.includes('rien') ||
    reactionToLoss.includes('attendre') ||
    reactionToLoss.includes("m'en fiche") ||
    reactionToLoss.includes('men fiche') ||
    reactionToLoss.includes('m en fiche')
  ) {
    score += 12;
    factors.push('Face à -20%: ne ferait rien (+12)');
  } else if (reactionToLoss.includes('vendr') || reactionToLoss.includes('limiter')) {
    score += 4;
    factors.push('Face à -20%: vendrait pour limiter (+4)');
  }
  
  // Risk vision (max 17 pts)
  const riskVision = answers.riskVision?.toLowerCase() || '';
  if (
    (riskVision.includes('volatilité') && riskVision.includes('ne me dérange')) ||
    riskVision.includes('remets') ||
    riskVision.includes('remet') ||
    riskVision.includes('rajoute')
  ) {
    score += 17;
    factors.push('Volatilité acceptée si thèse long terme (+17)');
  } else if (riskVision.includes('accepte') || riskVision.includes('fluctuation')) {
    score += 11;
    factors.push('Accepte les fluctuations pour le rendement (+11)');
  } else if (riskVision.includes('préfère éviter') || riskVision.includes('limité')) {
    score += 4;
    factors.push('Préfère éviter les pertes (+4)');
  }
  
  return {
    name: 'Tolérance émotionnelle',
    score,
    maxScore,
    weight: 0.35,
    factors,
  };
}

/**
 * Calculate objectives score (horizon + goals)
 * Max 30 points
 */
function calculateObjectivesScore(answers: OnboardingAnswers): DimensionScore {
  let score = 0;
  const factors: string[] = [];
  const maxScore = 30;
  
  // Investment horizon (max 18 pts)
  const horizon = answers.investmentHorizon?.toLowerCase() || '';
  if (horizon.includes('plus de 10') || horizon.includes('> 10') || horizon.includes('>10')) {
    score += 18;
    factors.push('Horizon > 10 ans (+18)');
  } else if (
    horizon.includes('8') ||
    horizon.includes('5-10') ||
    horizon.includes('5 à 10') ||
    horizon.includes('> 5') ||
    horizon.includes('>5')
  ) {
    score += 13;
    factors.push('Horizon 5-10 ans (+13)');
  } else if (horizon.includes('3') || horizon.includes('2-5') || horizon.includes('2 à 5')) {
    score += 7;
    factors.push('Horizon 2-5 ans (+7)');
  } else if (horizon.includes('< 3') || horizon.includes('moins de 2')) {
    score += 2;
    factors.push('Horizon court < 3 ans (+2)');
  }
  
  // Main objective (max 12 pts)
  const objective = answers.mainObjective?.toLowerCase() || '';
  if (objective.includes('maximiser') || objective.includes('performance')) {
    score += 12;
    factors.push('Objectif: performance maximale (+12)');
  } else if (objective.includes('patrimoine') || objective.includes('croître')) {
    score += 10;
    factors.push('Objectif: croissance du patrimoine (+10)');
  } else if (objective.includes('retraite') || objective.includes('passifs')) {
    score += 6;
    factors.push('Objectif: retraite/revenus passifs (+6)');
  } else if (objective.includes('préserver') || objective.includes('précaution') || objective.includes('immobilier')) {
    score += 3;
    factors.push('Objectif: préservation/projet (+3)');
  } else {
    // Free-text projects (ex: "voyager") should not zero out the score
    score += 6;
    factors.push('Objectif non précisé (+6)');
  }
  
  return {
    name: 'Objectifs & Horizon',
    score,
    maxScore,
    weight: 0.30,
    factors,
  };
}

/**
 * Determine profile from weighted scores with knowledge/preference modifiers
 */
function determineProfile(
  capacity: DimensionScore,
  tolerance: DimensionScore,
  objectives: DimensionScore,
  answers: OnboardingAnswers
): { profile: InvestorProfile; reasoning: string[]; confidence: 'high' | 'medium' | 'low' } {
  const reasoning: string[] = [];
  
  // Calculate weighted total (0-100)
  const weightedTotal = 
    (capacity.score / capacity.maxScore) * 100 * capacity.weight +
    (tolerance.score / tolerance.maxScore) * 100 * tolerance.weight +
    (objectives.score / objectives.maxScore) * 100 * objectives.weight;
  
  // Base profile from score
  let profile: InvestorProfile;
  
  if (weightedTotal >= 85) {
    profile = 'Conviction';
    reasoning.push(`Score global élevé (${Math.round(weightedTotal)}/100)`);
  } else if (weightedTotal >= 70) {
    profile = 'Dynamique';
    reasoning.push(`Score global dynamique (${Math.round(weightedTotal)}/100)`);
  } else if (weightedTotal >= 50) {
    profile = 'Croissance';
    reasoning.push(`Score global croissance (${Math.round(weightedTotal)}/100)`);
  } else if (weightedTotal >= 30) {
    profile = 'Équilibré';
    reasoning.push(`Score global équilibré (${Math.round(weightedTotal)}/100)`);
  } else {
    profile = 'Prudent';
    reasoning.push(`Score global prudent (${Math.round(weightedTotal)}/100)`);
  }
  
  // Apply capacity floor: low capacity = cap profile
  const capacityPct = (capacity.score / capacity.maxScore) * 100;
  if (capacityPct < 30) {
    if (profile === 'Conviction' || profile === 'Dynamique') {
      profile = 'Croissance';
      reasoning.push('⚠️ Capacité financière limitée → profil plafonné');
    }
  }
  
  // Experience modifier for Conviction
  const experience = answers.experienceLevel?.toLowerCase() || '';
  const concentrationAcceptance = answers.concentrationAcceptance?.toLowerCase() || '';
  
  if (profile === 'Conviction' && !experience.includes('avancé')) {
    profile = 'Dynamique';
    reasoning.push('Profil Conviction requiert expérience avancée');
  }
  
  // Allow upgrade to Conviction if experienced + concentration OK
  if (profile === 'Dynamique' && experience.includes('avancé') && 
      (concentrationAcceptance.includes('oui') && concentrationAcceptance.includes('sans problème'))) {
    profile = 'Conviction';
    reasoning.push('Expérience avancée + concentration acceptée → Conviction');
  }
  
  // Tolerance floor: very low tolerance = cap at Équilibré
  const tolerancePct = (tolerance.score / tolerance.maxScore) * 100;
  if (tolerancePct < 25) {
    if (profile !== 'Prudent' && profile !== 'Équilibré') {
      profile = 'Équilibré';
      reasoning.push('⚠️ Tolérance émotionnelle faible → profil modéré');
    }
  }
  
  // Confidence based on data completeness
  const answeredQuestions = Object.values(answers).filter(v => v && v.trim()).length;
  let confidence: 'high' | 'medium' | 'low';
  if (answeredQuestions >= 8) {
    confidence = 'high';
  } else if (answeredQuestions >= 5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
    reasoning.push('⚠️ Questionnaire incomplet - affiner le profil');
  }
  
  // Add dimension insights
  reasoning.push(`Capacité: ${Math.round(capacityPct)}% | Tolérance: ${Math.round(tolerancePct)}% | Objectifs: ${Math.round((objectives.score / objectives.maxScore) * 100)}%`);
  
  return { profile, reasoning, confidence };
}

// ============= MAIN EXPORT =============

/**
 * Compute investor profile from onboarding answers
 * Single source of truth for profile determination and thresholds
 */
export function computeInvestorProfile(answers: OnboardingAnswers): ProfileResult {
  const capacity = calculateCapacityScore(answers);
  const tolerance = calculateToleranceScore(answers);
  const objectives = calculateObjectivesScore(answers);
  
  const { profile, reasoning, confidence } = determineProfile(
    capacity, tolerance, objectives, answers
  );
  
  const totalScore = capacity.score + tolerance.score + objectives.score;
  
  return {
    profile,
    scores: {
      capacity,
      tolerance,
      objectives,
      total: totalScore,
    },
    thresholds: PROFILE_THRESHOLDS[profile],
    confidence,
    reasoning,
  };
}

/**
 * Get thresholds for a specific profile
 */
export function getProfileThresholds(profile: InvestorProfile): ProfileThresholds {
  return { ...PROFILE_THRESHOLDS[profile] };
}

/**
 * Get all profiles for selection UI
 */
export function getAllProfiles(): Array<{
  key: InvestorProfile;
  label: string;
  description: string;
  thresholds: ProfileThresholds;
}> {
  return (Object.keys(PROFILE_THRESHOLDS) as InvestorProfile[]).map(key => ({
    key,
    label: PROFILE_LABELS[key],
    description: PROFILE_DESCRIPTIONS[key],
    thresholds: PROFILE_THRESHOLDS[key],
  }));
}

/**
 * Map legacy risk_profile strings to new InvestorProfile
 */
export function mapLegacyProfile(riskProfile: string | null): InvestorProfile {
  if (!riskProfile) return 'Équilibré';
  
  const lower = riskProfile.toLowerCase();
  
  if (lower.includes('prudent') || lower.includes('défensif') || lower.includes('defensive')) {
    return 'Prudent';
  }
  if (lower.includes('conviction')) {
    return 'Conviction';
  }
  if (lower.includes('dynamique') || lower.includes('highvolatility') || lower.includes('très dynamique')) {
    return 'Dynamique';
  }
  if (lower.includes('croissance') || lower.includes('growth')) {
    return 'Croissance';
  }
  // Neutre, Balanced, Équilibré
  return 'Équilibré';
}

/**
 * Get profile-specific recommendations based on portfolio state
 */
export function getProfileRecommendations(
  profile: InvestorProfile,
  context: {
    currentScore?: number;
    cashPct?: number;
    maxPositionPct?: number;
    overConcentratedCount?: number;
  }
): string[] {
  const thresholds = PROFILE_THRESHOLDS[profile];
  const recommendations: string[] = [];
  
  // Score-based recommendations
  if (context.currentScore !== undefined) {
    const { min: targetMin, max: targetMax } = thresholds.targetScoreRange;
    
    if (context.currentScore < targetMin) {
      if (profile === 'Conviction') {
        recommendations.push(`Score de ${context.currentScore}/100 — acceptable pour un profil Conviction, mais surveillez les risques.`);
      } else if (profile === 'Prudent') {
        recommendations.push(`Score de ${context.currentScore}/100 — améliorez la diversification pour correspondre à votre profil prudent.`);
      } else {
        recommendations.push(`Score de ${context.currentScore}/100 — en dessous de la cible ${targetMin}-${targetMax} pour votre profil.`);
      }
    } else if (context.currentScore > targetMax && profile !== 'Prudent') {
      recommendations.push(`Score de ${context.currentScore}/100 — excellente diversification, vous pouvez envisager plus de concentration si souhaité.`);
    }
  }
  
  // Cash recommendations
  if (context.cashPct !== undefined) {
    const { min: cashMin, max: cashMax } = thresholds.cashTargetPct;
    if (context.cashPct < cashMin) {
      recommendations.push(`Liquidités (${context.cashPct.toFixed(0)}%) inférieures à la cible ${cashMin}-${cashMax}% — renforcez l'épargne de précaution.`);
    } else if (context.cashPct > cashMax * 1.5) {
      recommendations.push(`Liquidités élevées (${context.cashPct.toFixed(0)}%) — envisagez de déployer une partie en investissements.`);
    }
  }
  
  // Concentration recommendations
  if (context.overConcentratedCount !== undefined && context.overConcentratedCount > 0) {
    if (profile === 'Prudent') {
      recommendations.push(`${context.overConcentratedCount} position(s) trop concentrée(s) — réduisez pour limiter le risque.`);
    } else if (profile === 'Conviction') {
      recommendations.push(`${context.overConcentratedCount} position(s) concentrée(s) — acceptable si vous avez une conviction forte.`);
    } else {
      recommendations.push(`${context.overConcentratedCount} position(s) au-dessus du seuil — à surveiller.`);
    }
  }
  
  return recommendations;
}
