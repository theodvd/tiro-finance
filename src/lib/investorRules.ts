export const RISK_RULES = {
  Prudent: {
    summary: "Vous privilégiez la stabilité, les pertes limitées et une faible volatilité.",
    profile_message: "Votre profil indique un besoin de préservation du capital et de performances prévisibles. Vous favorisez des investissements sûrs et diversifiés avec peu de stress de marché.",
    insights: [
      "Augmentez l'allocation aux ETF couvrant les marchés développés.",
      "Conservez au moins 6 mois de dépenses en liquidités ou épargne réglementée.",
      "Réduisez l'exposition aux actifs à forte volatilité (crypto, small caps).",
      "Privilégiez l'investissement progressif (DCA) plutôt que les stratégies en une fois.",
      "Évitez la concentration dans un seul secteur ou région."
    ],
    important_action: "Vérifiez que votre exposition aux actions ne dépasse pas votre seuil de confort."
  },

  Neutre: {
    summary: "Vous équilibrez sécurité et croissance, acceptant les fluctuations à court terme.",
    profile_message: "Votre profil permet une exposition modérée aux actions tout en gardant une marge de sécurité. Vous pouvez gérer une certaine volatilité si elle est alignée avec vos objectifs à long terme.",
    insights: [
      "Visez un portefeuille équilibré entre actions et ETF diversifiés.",
      "Évitez l'excès de liquidités : le cash drag réduit la performance.",
      "Revoyez les risques de concentration dans vos positions principales.",
      "Assurez une exposition aux marchés développés et émergents.",
      "Si la volatilité vous stresse, automatisez les contributions avec le DCA."
    ],
    important_action: "Vérifiez que votre portefeuille contient au moins 50% d'ETF larges."
  },

  Dynamique: {
    summary: "Vous recherchez une forte croissance à long terme et acceptez une volatilité significative.",
    profile_message: "Votre profil est bien adapté à une exposition actions à long terme, avec une résilience face aux drawdowns moyens et un focus sur la performance.",
    insights: [
      "Augmentez l'exposition aux actions mondiales ou thématiques si sous-pondérées.",
      "Réduisez l'excès de liquidités (>20%), car cela ralentit les rendements à long terme.",
      "Vérifiez la diversification entre régions (EU, US, EM).",
      "Limitez la sur-concentration dans une action unique au-delà de 15%.",
      "Utilisez des stratégies à long terme plutôt que de réagir à la volatilité."
    ],
    important_action: "Assurez-vous que les liquidités ne dépassent pas 10-20% des actifs totaux."
  },

  "Très dynamique": {
    summary: "Vous priorisez la performance à long terme et acceptez les fortes oscillations de marché.",
    profile_message: "Votre profil indique une très haute tolérance à la volatilité, des objectifs à long terme et un état d'esprit axé sur la croissance.",
    insights: [
      "Maximisez l'exposition aux actions mondiales et diversifiez avec des tilts spécifiques (tech, EM, small caps).",
      "Évitez une exposition excessive à une seule action (>20%).",
      "Conservez un coussin de sécurité minimal (3 mois de dépenses).",
      "Surveillez régulièrement la concentration sectorielle.",
      "Alignez votre stratégie avec des convictions à long terme et évitez le trading à court terme."
    ],
    important_action: "Réduisez les positions concentrées au-delà de 20% pour minimiser le risque de queue."
  }
};

export function getRiskBasedInsights(riskProfile?: string | null) {
  if (!riskProfile || !(riskProfile in RISK_RULES)) {
    return RISK_RULES["Neutre"];
  }
  return RISK_RULES[riskProfile as keyof typeof RISK_RULES];
}
