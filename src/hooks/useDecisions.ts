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
  // Additional data for detail page
  metadata?: {
    threshold: number;
    currentValue: number;
    gap: number;
    ticker?: string;
    assetClassName?: string;
    holdingValue?: number;
    targetValue?: number;
    amountToReduce?: number;
    excessAmount?: number;
  };
}

interface DecisionsData {
  decisions: Decision[];
  lastAnalysisDate: string;
  loading: boolean;
  error: string | null;
}

// Map real asset classes to user-friendly French labels
const ASSET_CLASS_LABELS: Record<string, string> = {
  'STOCK': 'Actions',
  'ETF': 'Actions', // ETFs are grouped with stocks for decision purposes
  'CRYPTO': 'Crypto-monnaies',
  'BOND': 'Obligations',
  'REIT': 'Immobilier',
  'CASH': 'Liquidités',
};

// Classes considered as equity for concentration
const EQUITY_CLASSES = ['STOCK', 'ETF', 'Actions'];

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

    const totalValue = diversificationData.totalValue;

    // Rule 1: Single position concentration > 10%
    diversificationData.holdings
      .filter(h => h.weight > THRESHOLDS.singlePosition)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2) // Max 2 position alerts
      .forEach((holding) => {
        const targetValue = (THRESHOLDS.singlePosition / 100) * totalValue;
        const amountToReduce = Math.max(0, holding.value - targetValue);
        
        decisions.push({
          id: `pos_concentration:${holding.ticker}`, // Stable deterministic ID
          type: 'concentration',
          severity: holding.weight > 20 ? 'high' : holding.weight > 15 ? 'medium' : 'low',
          title: `Position concentrée : ${holding.ticker}`,
          explanation: `${holding.name} représente ${holding.weight.toFixed(1)}% de votre portefeuille, dépassant le seuil de ${THRESHOLDS.singlePosition}%. Une forte concentration augmente le risque spécifique.`,
          impact: `${holding.weight.toFixed(1)}% du portefeuille`,
          relatedHoldings: [holding.ticker],
          metadata: {
            threshold: THRESHOLDS.singlePosition,
            currentValue: holding.weight,
            gap: holding.weight - THRESHOLDS.singlePosition,
            ticker: holding.ticker,
            holdingValue: holding.value,
            targetValue,
            amountToReduce,
          },
        });
      });

    // Rule 2: Asset class concentration > 70% (using real asset classes)
    // Group ETF + STOCK as "Actions" for concentration check
    const assetClassGroups = new Map<string, { percentage: number; holdings: typeof diversificationData.holdings }>();
    
    diversificationData.byAssetClass
      .filter(ac => ac.name !== 'Unknown' && ac.name !== 'Non classifié')
      .forEach((assetClass) => {
        // Map to display name (ETF -> Actions)
        const isEquity = EQUITY_CLASSES.includes(assetClass.name);
        const groupName = isEquity ? 'Actions' : (ASSET_CLASS_LABELS[assetClass.name] || assetClass.name);
        
        const existing = assetClassGroups.get(groupName);
        if (existing) {
          existing.percentage += assetClass.percentage;
          existing.holdings = [...existing.holdings, ...assetClass.holdings];
        } else {
          assetClassGroups.set(groupName, {
            percentage: assetClass.percentage,
            holdings: [...assetClass.holdings],
          });
        }
      });

    // Check for concentration in grouped asset classes
    assetClassGroups.forEach((data, className) => {
      if (data.percentage > THRESHOLDS.assetClass) {
        decisions.push({
          id: `asset_class_over:${className.toLowerCase().replace(/[^a-z0-9]/g, '_')}`, // Stable ID
          type: 'concentration',
          severity: data.percentage > 85 ? 'high' : data.percentage > 75 ? 'medium' : 'low',
          title: `Surexposition : ${className}`,
          explanation: `La classe d'actifs "${className}" représente ${data.percentage.toFixed(1)}% de votre portefeuille. Une diversification vers d'autres classes d'actifs pourrait réduire le risque global.`,
          impact: `${data.percentage.toFixed(1)}% du portefeuille`,
          relatedHoldings: data.holdings.slice(0, 3).map(h => h.ticker),
          metadata: {
            threshold: THRESHOLDS.assetClass,
            currentValue: data.percentage,
            gap: data.percentage - THRESHOLDS.assetClass,
            assetClassName: className,
          },
        });
      }
    });

    // Rule 3: Excess liquidity (CASH + LIVRETS)
    const liquidityClasses = ['CASH', 'Livrets', 'Monétaire', 'Épargne'];
    const liquidityTotal = diversificationData.byAssetClass
      .filter(ac => liquidityClasses.some(lc => ac.name?.toLowerCase().includes(lc.toLowerCase())))
      .reduce((sum, ac) => sum + ac.percentage, 0);

    if (liquidityTotal > THRESHOLDS.liquidity) {
      const currentLiquidityValue = (liquidityTotal / 100) * totalValue;
      const targetLiquidityValue = (THRESHOLDS.liquidity / 100) * totalValue;
      const excessAmount = Math.max(0, currentLiquidityValue - targetLiquidityValue);
      
      decisions.push({
        id: 'cash_over', // Stable ID
        type: 'liquidity',
        severity: liquidityTotal > 40 ? 'high' : liquidityTotal > 30 ? 'medium' : 'low',
        title: 'Excès de liquidités',
        explanation: `Vous détenez ${liquidityTotal.toFixed(1)}% de votre patrimoine en liquidités. Ce niveau peut être justifié pour un projet à court terme, mais réduit le potentiel de rendement à long terme.`,
        impact: `${liquidityTotal.toFixed(1)}% en cash`,
        relatedHoldings: [],
        metadata: {
          threshold: THRESHOLDS.liquidity,
          currentValue: liquidityTotal,
          gap: liquidityTotal - THRESHOLDS.liquidity,
          excessAmount,
        },
      });
    }

    // Rule 4: Under-diversification (score < 40)
    if (diversificationData.score < THRESHOLDS.diversificationScore) {
      decisions.push({
        id: 'div_low', // Stable ID
        type: 'diversification',
        severity: diversificationData.score < 25 ? 'high' : diversificationData.score < 35 ? 'medium' : 'low',
        title: 'Diversification insuffisante',
        explanation: `Votre score de diversification est de ${diversificationData.score}/100 (${diversificationData.scoreLabel}). Une meilleure répartition entre régions, secteurs et classes d'actifs renforcerait la résilience de votre portefeuille.`,
        impact: `Score ${diversificationData.score}/100`,
        relatedHoldings: [],
        metadata: {
          threshold: THRESHOLDS.diversificationScore,
          currentValue: diversificationData.score,
          gap: THRESHOLDS.diversificationScore - diversificationData.score,
        },
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
            id: 'move_abnormal', // Stable ID
            type: 'variation',
            severity: Math.abs(weeklyChange) > 20 ? 'high' : Math.abs(weeklyChange) > 15 ? 'medium' : 'low',
            title: isPositive ? 'Hausse significative récente' : 'Baisse significative récente',
            explanation: isPositive
              ? `Votre portefeuille a progressé de ${weeklyChange.toFixed(1)}% sur la dernière période. C'est peut-être l'occasion de rééquilibrer vers vos allocations cibles.`
              : `Votre portefeuille a reculé de ${Math.abs(weeklyChange).toFixed(1)}% sur la dernière période. Cette variation peut être due à la volatilité normale des marchés.`,
            impact: `${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)}%`,
            relatedHoldings: [],
            metadata: {
              threshold: THRESHOLDS.weeklyVariation,
              currentValue: Math.abs(weeklyChange),
              gap: Math.abs(weeklyChange) - THRESHOLDS.weeklyVariation,
            },
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
