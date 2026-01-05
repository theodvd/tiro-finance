/**
 * Risk-based rules and recommendations by investor profile
 * Updated for 5-profile system: Prudent, Équilibré, Croissance, Dynamique, Conviction
 */

import { InvestorProfile } from '@/lib/investorProfileEngine';

export interface ProfileRules {
  summary: string;
  profile_message: string;
  insights: string[];
  important_action: string;
}

export const RISK_RULES: Record<InvestorProfile | 'Neutre', ProfileRules> = {
  Prudent: {
    summary: "Vous privilégiez la stabilité, les pertes limitées et une faible volatilité.",
    profile_message: "Votre profil indique un besoin de préservation du capital et de performances prévisibles. Vous favorisez des investissements sûrs et diversifiés avec peu de stress de marché.",
    insights: [
      "Privilégiez les ETFs larges et diversifiés (MSCI World, Stoxx 600).",
      "Conservez au moins 6 mois de dépenses en liquidités ou épargne réglementée.",
      "Réduisez l'exposition aux actifs volatils (crypto, small caps).",
      "Utilisez l'investissement progressif (DCA) plutôt qu'en une fois.",
      "Évitez la concentration dans un seul secteur ou région."
    ],
    important_action: "Vérifiez que votre exposition aux actions ne dépasse pas 60% du portefeuille."
  },

  Équilibré: {
    summary: "Vous équilibrez sécurité et croissance, acceptant les fluctuations à court terme.",
    profile_message: "Votre profil permet une exposition modérée aux actions tout en gardant une marge de sécurité. Vous pouvez gérer une certaine volatilité si elle est alignée avec vos objectifs à long terme.",
    insights: [
      "Visez un portefeuille équilibré entre actions et ETF diversifiés.",
      "Évitez l'excès de liquidités : le cash drag réduit la performance.",
      "Limitez les positions individuelles à 10% maximum.",
      "Assurez une exposition aux marchés développés et émergents.",
      "Si la volatilité vous stresse, automatisez les contributions avec le DCA."
    ],
    important_action: "Vérifiez que votre portefeuille contient au moins 50% d'ETF larges."
  },

  // Alias for backward compatibility
  Neutre: {
    summary: "Vous équilibrez sécurité et croissance, acceptant les fluctuations à court terme.",
    profile_message: "Votre profil permet une exposition modérée aux actions tout en gardant une marge de sécurité.",
    insights: [
      "Visez un portefeuille équilibré entre actions et ETF diversifiés.",
      "Évitez l'excès de liquidités.",
      "Limitez les positions individuelles à 10% maximum.",
      "Assurez une exposition aux marchés développés et émergents."
    ],
    important_action: "Vérifiez l'équilibre global de votre portefeuille."
  },

  Croissance: {
    summary: "Vous recherchez une croissance long terme et acceptez une volatilité modérée.",
    profile_message: "Votre profil est adapté à une exposition actions à long terme, avec une résilience face aux drawdowns moyens et un focus sur la performance.",
    insights: [
      "Augmentez l'exposition aux actions mondiales si sous-pondérées.",
      "Réduisez l'excès de liquidités (>15%), cela ralentit les rendements long terme.",
      "Diversifiez entre régions (EU, US, EM) et secteurs.",
      "Les positions jusqu'à 15% sont acceptables sur conviction.",
      "Utilisez des stratégies à long terme plutôt que de réagir à la volatilité."
    ],
    important_action: "Assurez-vous que les liquidités ne dépassent pas 10% des actifs totaux."
  },

  Dynamique: {
    summary: "Vous priorisez la performance et acceptez les fortes oscillations.",
    profile_message: "Votre profil indique une haute tolérance à la volatilité, des objectifs ambitieux et un état d'esprit axé sur la croissance.",
    insights: [
      "Maximisez l'exposition aux actions mondiales avec des tilts sectoriels.",
      "Les positions jusqu'à 20% sont acceptables sur forte conviction.",
      "Conservez un coussin de sécurité minimal (3 mois de dépenses).",
      "Surveillez régulièrement la concentration sectorielle.",
      "Alignez votre stratégie avec des convictions à long terme."
    ],
    important_action: "Vérifiez que les positions concentrées ne dépassent pas 20%."
  },

  Conviction: {
    summary: "Vous êtes un investisseur avancé, la concentration fait partie de votre stratégie.",
    profile_message: "Votre profil indique une maîtrise des marchés et une stratégie basée sur des convictions fortes. Le score de diversification sert d'indicateur, pas de contrainte.",
    insights: [
      "Votre score de diversification peut être bas par choix stratégique.",
      "Documentez vos thèses d'investissement pour chaque position majeure.",
      "Surveillez les corrélations entre vos positions concentrées.",
      "Ayez un plan de sortie défini pour chaque conviction.",
      "Les alertes de concentration sont informatives, pas contraignantes pour votre profil."
    ],
    important_action: "Assurez-vous que vos convictions sont documentées et revues régulièrement."
  },
};

// Legacy alias for Dynamique
(RISK_RULES as any)['Très dynamique'] = RISK_RULES.Dynamique;

export function getRiskBasedInsights(riskProfile?: string | null): ProfileRules {
  if (!riskProfile) {
    return RISK_RULES.Équilibré;
  }
  
  const lower = riskProfile.toLowerCase();
  
  if (lower.includes('prudent') || lower.includes('défensif') || lower.includes('defensive')) {
    return RISK_RULES.Prudent;
  }
  if (lower.includes('conviction')) {
    return RISK_RULES.Conviction;
  }
  if (lower.includes('dynamique') || lower.includes('très dynamique') || lower.includes('highvolatility')) {
    return RISK_RULES.Dynamique;
  }
  if (lower.includes('croissance') || lower.includes('growth')) {
    return RISK_RULES.Croissance;
  }
  
  return RISK_RULES.Équilibré;
}

/**
 * Get contextual recommendations based on profile AND portfolio state
 */
export function getContextualRecommendations(
  profile: InvestorProfile,
  context: {
    diversificationScore?: number;
    cashPct?: number;
    maxPositionWeight?: number;
    concentratedPositionsCount?: number;
  }
): string[] {
  const baseRules = RISK_RULES[profile];
  const recommendations: string[] = [];
  
  // Score-based recommendations
  if (context.diversificationScore !== undefined) {
    const targetMin = profile === 'Prudent' ? 80 : 
                      profile === 'Équilibré' ? 70 :
                      profile === 'Croissance' ? 60 :
                      profile === 'Dynamique' ? 50 : 40;
    
    if (context.diversificationScore < targetMin) {
      if (profile === 'Conviction') {
        recommendations.push(`Score de ${context.diversificationScore}/100 — acceptable pour votre profil Conviction.`);
      } else {
        recommendations.push(`Score de ${context.diversificationScore}/100 — en dessous de la cible ${targetMin}+ pour votre profil ${profile}.`);
      }
    }
  }
  
  // Cash recommendations  
  if (context.cashPct !== undefined) {
    const cashMax = profile === 'Prudent' ? 25 :
                    profile === 'Équilibré' ? 15 :
                    profile === 'Croissance' ? 10 :
                    profile === 'Dynamique' ? 5 : 5;
    
    if (context.cashPct > cashMax * 1.5) {
      recommendations.push(`Liquidités à ${context.cashPct.toFixed(0)}% — au-dessus de la cible ${cashMax}% pour votre profil.`);
    }
  }
  
  // Concentration recommendations
  if (context.concentratedPositionsCount && context.concentratedPositionsCount > 0) {
    if (profile === 'Conviction') {
      // Neutral for Conviction profile
      recommendations.push(`${context.concentratedPositionsCount} position(s) concentrée(s) — normal pour un profil Conviction.`);
    } else if (profile === 'Prudent') {
      recommendations.push(`${context.concentratedPositionsCount} position(s) trop concentrée(s) — à réduire pour votre profil Prudent.`);
    } else {
      recommendations.push(`${context.concentratedPositionsCount} position(s) au-dessus du seuil — à surveiller.`);
    }
  }
  
  // Add base insights if we have room
  const remaining = 5 - recommendations.length;
  if (remaining > 0) {
    recommendations.push(...baseRules.insights.slice(0, remaining));
  }
  
  return recommendations;
}
