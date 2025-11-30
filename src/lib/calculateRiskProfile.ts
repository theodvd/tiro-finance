// Fonction de calcul du profil de risque investisseur
export interface RiskProfileData {
  // Tolérance au risque
  max_acceptable_loss?: string;
  reaction_to_volatility?: string;
  risk_vision?: string;
  
  // Capacité réelle
  income_stability?: string;
  financial_resilience_months?: string;
  loss_impact?: string;
  
  // Comportement
  panic_selling_history?: boolean;
  fomo_tendency?: string;
  emotional_stability?: string;
  reaction_to_gains?: string;
  regretted_purchases_history?: boolean;
  
  // Horizon
  investment_horizon?: string;
  
  // Connaissances
  knowledge_levels?: {
    livrets?: number;
    etf?: number;
    actions?: number;
    crypto?: number;
    immobilier?: number;
    assurance_vie?: number;
  };
  investment_experience?: string;
}

export interface RiskProfileResult {
  score_total: number;
  score_tolerance: number;
  score_capacity: number;
  score_behavior: number;
  score_horizon: number;
  score_knowledge: number;
  risk_profile: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// A. Tolérance au risque (max 30 points)
function calculateTolerance(data: RiskProfileData): number {
  const q1 = mapMaxLoss(data.max_acceptable_loss || "");
  const q2 = mapRiskVision(data.risk_vision || "");
  const q3 = mapVolatility(data.reaction_to_volatility || "");
  
  return ((q1 + q2 + q3) / 3) * 6;
}

function mapMaxLoss(value: string): number {
  const mapping: Record<string, number> = {
    "0%": 0,
    "Aucune perte": 0,
    "5%": 1,
    "Jusqu'à 5%": 1,
    "10%": 2,
    "Jusqu'à 10%": 2,
    "20%": 4,
    "Jusqu'à 20%": 4,
    "30%": 5,
    "Plus de 20%": 5,
    "30% ou plus": 5,
  };
  return mapping[value] || 2;
}

function mapRiskVision(value: string): number {
  const mapping: Record<string, number> = {
    "Préserver mon capital": 0,
    "Risque minimal": 0,
    "Croissance modérée": 2,
    "Équilibre": 3,
    "Croissance élevée": 4,
    "Croissance maximale": 5,
    "Maximiser mes gains": 5,
  };
  return mapping[value] || 2;
}

function mapVolatility(value: string): number {
  const mapping: Record<string, number> = {
    "Très stressé": 0,
    "Stress important": 0,
    "Inquiet": 1,
    "Inconfortable": 2,
    "Normal": 3,
    "Acceptable": 4,
    "Indifférent": 4,
    "Opportunité": 5,
    "Je renforce": 5,
  };
  return mapping[value] || 2;
}

// B. Capacité réelle de perte (max 25 points)
function calculateCapacity(data: RiskProfileData): number {
  const r1 = mapIncomeStability(data.income_stability || "");
  const r2 = mapSafetyMonths(data.financial_resilience_months || "");
  const r3 = mapLossImpact(data.loss_impact || "");
  
  return ((r1 + r2 + r3) / 3) * 5;
}

function mapIncomeStability(value: string): number {
  const mapping: Record<string, number> = {
    "Instables": 0,
    "Très variables": 1,
    "Variables": 2,
    "Assez stables": 3,
    "Stables": 4,
    "Très stables": 5,
  };
  return mapping[value] || 2;
}

function mapSafetyMonths(value: string): number {
  const mapping: Record<string, number> = {
    "Moins d'1 mois": 0,
    "<1 mois": 0,
    "1-3 mois": 2,
    "3-6 mois": 3,
    "6-12 mois": 4,
    "Plus de 12 mois": 5,
    ">12 mois": 5,
  };
  return mapping[value] || 2;
}

function mapLossImpact(value: string): number {
  const mapping: Record<string, number> = {
    "Impacterait ma vie quotidienne": 0,
    "Impact majeur": 0,
    "Compromettrait un projet": 1,
    "Impact modéré": 2,
    "Inconfort temporaire": 3,
    "Impact mineur": 3,
    "Aucun impact": 5,
    "Pas d'impact": 5,
  };
  return mapping[value] || 2;
}

// C. Comportement psychologique (max 25 points)
function calculateBehavior(data: RiskProfileData): number {
  const b1 = data.panic_selling_history === true ? 0 : 5;
  const b2 = mapFomo(data.fomo_tendency || "");
  const b3 = mapEmotionalStability(data.emotional_stability || "");
  const b4 = mapGainReaction(data.reaction_to_gains || "");
  
  return ((b1 + b2 + b3 + b4) / 4) * 5;
}

function mapFomo(value: string): number {
  const mapping: Record<string, number> = {
    "Souvent": 0,
    "Très souvent": 0,
    "Parfois": 2,
    "Occasionnellement": 2,
    "Rarement": 4,
    "Jamais": 5,
  };
  return mapping[value] || 2;
}

function mapEmotionalStability(value: string): number {
  const mapping: Record<string, number> = {
    "Impulsif": 0,
    "Très émotif": 0,
    "Réactif": 2,
    "Émotif": 2,
    "Calme": 4,
    "Rationnel": 4,
    "Très stable": 5,
    "Très rationnel": 5,
  };
  return mapping[value] || 2;
}

function mapGainReaction(value: string): number {
  const mapping: Record<string, number> = {
    "Je sécurise tout": 2,
    "Sécurise immédiatement": 2,
    "Je prends une partie": 3,
    "Prends des profits partiels": 3,
    "Je laisse tourner": 4,
    "Reste investi": 4,
    "Je renforce": 5,
    "Renforce la position": 5,
  };
  return mapping[value] || 3;
}

// D. Horizon d'investissement (max 10 points)
function calculateHorizon(data: RiskProfileData): number {
  const value = data.investment_horizon || "";
  
  if (value.includes("< 1") || value.includes("Moins de 1")) return 0;
  if (value.includes("1-2") || value.includes("1 à 2")) return 2;
  if (value.includes("3-5") || value.includes("3 à 5")) return 5;
  if (value.includes("5-10") || value.includes("5 à 10")) return 8;
  if (value.includes("> 10") || value.includes("Plus de 10")) return 10;
  
  return 5; // default
}

// E. Connaissances & expérience (max 10 points)
function calculateKnowledge(data: RiskProfileData): number {
  const levels = data.knowledge_levels || {};
  const values = [
    levels.livrets || 1,
    levels.etf || 1,
    levels.actions || 1,
    levels.crypto || 1,
    levels.immobilier || 1,
    levels.assurance_vie || 1,
  ];
  
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  let base = (avg / 5) * 10;
  
  const exp = data.investment_experience || "";
  if (exp.includes("> 1") || exp.includes("Plus d'1 an")) base += 1;
  if (exp.includes("< 6") || exp.includes("Moins de 6")) base -= 1;
  
  return clamp(base, 0, 10);
}

// Calcul du profil complet
export function calculateRiskProfile(data: RiskProfileData): RiskProfileResult {
  const score_tolerance = Math.round(calculateTolerance(data));
  const score_capacity = Math.round(calculateCapacity(data));
  const score_behavior = Math.round(calculateBehavior(data));
  const score_horizon = Math.round(calculateHorizon(data));
  const score_knowledge = Math.round(calculateKnowledge(data));
  
  const score_total = score_tolerance + score_capacity + score_behavior + score_horizon + score_knowledge;
  
  let risk_profile: string;
  if (score_total <= 30) {
    risk_profile = "Prudent";
  } else if (score_total <= 55) {
    risk_profile = "Neutre";
  } else if (score_total <= 75) {
    risk_profile = "Dynamique";
  } else {
    risk_profile = "Très dynamique";
  }
  
  return {
    score_total,
    score_tolerance,
    score_capacity,
    score_behavior,
    score_horizon,
    score_knowledge,
    risk_profile,
  };
}
