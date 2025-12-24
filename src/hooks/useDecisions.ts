import { useMemo } from 'react';
import { useDiversification } from './useDiversification';
import { useSnapshots } from './useSnapshots';

// Decision thresholds (fixed for V1)
const THRESHOLDS = {
  singlePosition: 10, // % - single position concentration
  assetClass: 70, // % - asset class concentration
  liquidity: 20, // % - excess liquidity (CASH/LIVRETS)
  diversificationScore: 40, // score - under-diversification
  weeklyVariation: 10, // % - unusual weekly change
};

export interface Decision {
  id: string;
  type: 'concentration' | 'liquidity' | 'diversification' | 'variation';
  severity: 'high' | 'medium' | 'low';
  title: string;
  explanation: string;
  impact: string;
  relatedHoldings?: string[];
}

interface DecisionsData {
  decisions: Decision[];
  lastAnalysisDate: string;
  loading: boolean;
  error: string | null;
}

export function useDecisions(): DecisionsData {
  const { data: diversificationData, loading: divLoading, error: divError } = useDiversification();
  const { snapshots, loading: snapLoading, error: snapError } = useSnapshots();

  const result = useMemo<DecisionsData>(() => {
    const decisions: Decision[] = [];
    const now = new Date();

    if (!diversificationData) {
      return {
        decisions: [],
        lastAnalysisDate: now.toISOString(),
        loading: divLoading || snapLoading,
        error: divError || snapError,
      };
    }

    // Rule 1: Single position concentration > 10%
    diversificationData.holdings
      .filter(h => h.weight > THRESHOLDS.singlePosition)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2) // Max 2 position alerts
      .forEach((holding, index) => {
        decisions.push({
          id: `concentration-position-${index}`,
          type: 'concentration',
          severity: holding.weight > 20 ? 'high' : holding.weight > 15 ? 'medium' : 'low',
          title: `Position concentrée : ${holding.ticker}`,
          explanation: `${holding.name} représente ${holding.weight.toFixed(1)}% de votre portefeuille, dépassant le seuil de ${THRESHOLDS.singlePosition}%. Une forte concentration augmente le risque spécifique.`,
          impact: `${holding.weight.toFixed(1)}% du portefeuille`,
          relatedHoldings: [holding.ticker],
        });
      });

    // Rule 2: Asset class concentration > 70%
    diversificationData.byAssetClass
      .filter(ac => ac.name !== 'Unknown' && ac.name !== 'Non classifié')
      .filter(ac => ac.percentage > THRESHOLDS.assetClass)
      .forEach((assetClass, index) => {
        decisions.push({
          id: `concentration-class-${index}`,
          type: 'concentration',
          severity: assetClass.percentage > 85 ? 'high' : assetClass.percentage > 75 ? 'medium' : 'low',
          title: `Surexposition : ${assetClass.name}`,
          explanation: `La classe d'actifs "${assetClass.name}" représente ${assetClass.percentage.toFixed(1)}% de votre portefeuille. Une diversification vers d'autres classes d'actifs pourrait réduire le risque global.`,
          impact: `${assetClass.percentage.toFixed(1)}% du portefeuille`,
          relatedHoldings: assetClass.holdings.slice(0, 3).map(h => h.ticker),
        });
      });

    // Rule 3: Excess liquidity (CASH + LIVRETS)
    const liquidityClasses = ['CASH', 'Livrets', 'Monétaire', 'Épargne'];
    const liquidityTotal = diversificationData.byAssetClass
      .filter(ac => liquidityClasses.some(lc => ac.name?.toLowerCase().includes(lc.toLowerCase())))
      .reduce((sum, ac) => sum + ac.percentage, 0);

    if (liquidityTotal > THRESHOLDS.liquidity) {
      decisions.push({
        id: 'liquidity-excess',
        type: 'liquidity',
        severity: liquidityTotal > 40 ? 'high' : liquidityTotal > 30 ? 'medium' : 'low',
        title: 'Excès de liquidités',
        explanation: `Vous détenez ${liquidityTotal.toFixed(1)}% de votre patrimoine en liquidités. Ce niveau peut être justifié pour un projet à court terme, mais réduit le potentiel de rendement à long terme.`,
        impact: `${liquidityTotal.toFixed(1)}% en cash`,
        relatedHoldings: [],
      });
    }

    // Rule 4: Under-diversification (score < 40)
    if (diversificationData.score < THRESHOLDS.diversificationScore) {
      decisions.push({
        id: 'diversification-low',
        type: 'diversification',
        severity: diversificationData.score < 25 ? 'high' : diversificationData.score < 35 ? 'medium' : 'low',
        title: 'Diversification insuffisante',
        explanation: `Votre score de diversification est de ${diversificationData.score}/100 (${diversificationData.scoreLabel}). Une meilleure répartition entre régions, secteurs et classes d'actifs renforcerait la résilience de votre portefeuille.`,
        impact: `Score ${diversificationData.score}/100`,
        relatedHoldings: [],
      });
    }

    // Rule 5: Unusual weekly variation (if snapshots available)
    if (snapshots && snapshots.length >= 2) {
      const latestSnapshot = snapshots[0];
      const previousSnapshot = snapshots[1];
      
      const latestValue = Number(latestSnapshot?.total_value_eur || 0);
      const previousValue = Number(previousSnapshot?.total_value_eur || 0);
      
      if (previousValue > 0) {
        const weeklyChange = ((latestValue - previousValue) / previousValue) * 100;
        
        if (Math.abs(weeklyChange) > THRESHOLDS.weeklyVariation) {
          const isPositive = weeklyChange > 0;
          decisions.push({
            id: 'variation-unusual',
            type: 'variation',
            severity: Math.abs(weeklyChange) > 20 ? 'high' : Math.abs(weeklyChange) > 15 ? 'medium' : 'low',
            title: isPositive ? 'Hausse significative récente' : 'Baisse significative récente',
            explanation: isPositive
              ? `Votre portefeuille a progressé de ${weeklyChange.toFixed(1)}% sur la dernière période. C'est peut-être l'occasion de rééquilibrer vers vos allocations cibles.`
              : `Votre portefeuille a reculé de ${Math.abs(weeklyChange).toFixed(1)}% sur la dernière période. Cette variation peut être due à la volatilité normale des marchés.`,
            impact: `${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)}%`,
            relatedHoldings: [],
          });
        }
      }
    }

    // Sort by severity and limit to 6 decisions
    const sortedDecisions = decisions
      .sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, 6);

    return {
      decisions: sortedDecisions,
      lastAnalysisDate: now.toISOString(),
      loading: divLoading || snapLoading,
      error: divError || snapError,
    };
  }, [diversificationData, snapshots, divLoading, snapLoading, divError, snapError]);

  return result;
}
