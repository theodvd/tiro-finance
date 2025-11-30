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
    "-5%": 1,
    "-10%": 2,
    "-20%": 4,
    "-30% ou plus": 5,
  };
  return mapping[value] || 2;
}

function mapRiskVision(value: string): number {
  const mapping: Record<string, number> = {
    "Je vends": 0,
    "J'attends": 2,
    "C'est normal": 4,
    "Je remets de l'argent": 5,
  };
  return mapping[value] || 2;
}

function mapVolatility(value: string): number {
  const mapping: Record<string, number> = {
    "Stress extrême": 0,
    "Inconfort": 2,
    "Je m'en fiche": 4,
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
    "Inexistants": 0,
    "Irréguliers": 1,
    "Variables": 2,
    "Stables": 5,
  };
  return mapping[value] || 2;
}

function mapSafetyMonths(value: string): number {
  const mapping: Record<string, number> = {
    "< 1 mois": 0,
    "1-3 mois": 2,
    "3-6 mois": 3,
    "6-12 mois": 4,
    "> 12 mois": 5,
  };
  return mapping[value] || 2;
}

function mapLossImpact(value: string): number {
  const mapping: Record<string, number> = {
    "Ton quotidien": 0,
    "Ton loyer": 1,
    "Ton projet principal": 2,
    "Rien du tout": 5,
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
    "Je veux acheter": 0,
    "J'hésite": 2,
    "Je m'en fiche": 4,
    "Je méfie": 5,
  };
  return mapping[value] || 2;
}

function mapEmotionalStability(value: string): number {
  const mapping: Record<string, number> = {
    "Impulsif": 0,
    "Réactif": 2,
    "Calme": 4,
    "Très stable": 5,
  };
  return mapping[value] || 2;
}

function mapGainReaction(value: string): number {
  const mapping: Record<string, number> = {
    "Je sécurise tout de suite": 2,
    "Je prends une partie": 3,
    "Je laisse tourner": 4,
    "Je renforce": 5,
  };
  return mapping[value] || 3;
}

// D. Horizon d'investissement (max 10 points)
function calculateHorizon(data: RiskProfileData): number {
  const value = data.investment_horizon || "";
  
  if (value === "< 1 an") return 0;
  if (value === "1-2 ans") return 2;
  if (value === "3-5 ans") return 5;
  if (value === "> 5 ans") return 10;
  
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
  if (exp === "> 1 an") base += 1;
  if (exp === "< 6 mois") base -= 1;
  if (exp === "Jamais") base -= 2;
  
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
