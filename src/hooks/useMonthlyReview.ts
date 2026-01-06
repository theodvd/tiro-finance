import { useMemo } from 'react';
import { useDiversification } from './useDiversification';
import { useSnapshots } from './useSnapshots';
import { usePortfolioData } from './usePortfolioData';
import { useInvestorProfile } from './useInvestorProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

export interface MonthlyAction {
  id: string;
  title: string;
  reason: string;
  effort: 'low' | 'medium' | 'high';
  ctaLabel: string;
  ctaAction: 'add-investment' | 'view-decision' | 'ignore';
}

export interface MonthlyReviewData {
  // Block A: Summary
  totalValue: number;
  monthlyPnl: number;
  monthlyPnlPct: number;
  variationVsPrevious: number | null;
  topContributors: Array<{ name: string; contribution: number }>;
  
  // Block B: Situation vs objectives
  thresholds: {
    cashTargetPct: number;
    maxPositionPct: number;
    maxAssetClassPct: number;
  };
  currentCashPct: number;
  mainConcentrations: Array<{ name: string; pct: number; type: 'position' | 'asset_class' }>;
  diversificationScore: number;
  
  // Block C: Actions
  actions: MonthlyAction[];
  
  // Block D: Checkpoint
  lastCheckpointDate: string | null;
  
  // Meta
  loading: boolean;
  error: string | null;
}

export function useMonthlyReview() {
  const { user } = useAuth();
  const { data: diversificationData, loading: divLoading, error: divError } = useDiversification();
  const { snapshots, loading: snapLoading, error: snapError } = useSnapshots();
  const portfolioData = usePortfolioData();
  const { thresholds: profileThresholds, loading: profileLoading } = useInvestorProfile();
  
  const [totalLiquidity, setTotalLiquidity] = useState<number>(0);
  const [lastMonthlyCheckpoint, setLastMonthlyCheckpoint] = useState<string | null>(null);
  const [liquidityLoading, setLiquidityLoading] = useState(true);

  // Fetch liquidity and last monthly checkpoint
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLiquidityLoading(true);

      try {
        // Fetch bridge accounts liquidity
        const { data: accounts, error: accErr } = await supabase
          .from('bridge_accounts')
          .select('balance')
          .eq('user_id', user.id);

        if (!accErr && accounts) {
          setTotalLiquidity(accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0));
        }

        // Fetch last monthly snapshot
        const { data: monthlySnap, error: snapErr } = await supabase
          .from('snapshots')
          .select('snapshot_ts')
          .eq('user_id', user.id)
          .eq('snapshot_type', 'monthly')
          .order('snapshot_ts', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!snapErr && monthlySnap) {
          setLastMonthlyCheckpoint(monthlySnap.snapshot_ts);
        }
      } catch (e) {
        console.error('Error fetching monthly review data:', e);
      } finally {
        setLiquidityLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const data = useMemo<MonthlyReviewData>(() => {
    const loading = divLoading || snapLoading || portfolioData.loading || profileLoading || liquidityLoading;
    const error = divError || snapError || portfolioData.error || null;

    // Thresholds from useInvestorProfile
    const thresholds = {
      cashTargetPct: profileThresholds.cashTargetPct,
      maxPositionPct: profileThresholds.maxStockPositionPct,
      maxAssetClassPct: profileThresholds.maxAssetClassPct,
    };

    // Calculate total wealth
    const totalValue = portfolioData.totalValue + totalLiquidity;
    const currentCashPct = totalValue > 0 ? (totalLiquidity / totalValue) * 100 : 0;

    // Monthly P/L from snapshots
    let monthlyPnl = 0;
    let monthlyPnlPct = 0;
    let variationVsPrevious: number | null = null;

    if (snapshots && snapshots.length >= 1) {
      const latestValue = Number(snapshots[0]?.total_value_eur || 0);
      const latestInvested = Number(snapshots[0]?.total_invested_eur || 0);
      monthlyPnl = latestValue - latestInvested;
      monthlyPnlPct = latestInvested > 0 ? (monthlyPnl / latestInvested) * 100 : 0;

      if (snapshots.length >= 2) {
        const previousValue = Number(snapshots[1]?.total_value_eur || 0);
        if (previousValue > 0) {
          variationVsPrevious = ((latestValue - previousValue) / previousValue) * 100;
        }
      }
    }

    // Main concentrations
    const mainConcentrations: Array<{ name: string; pct: number; type: 'position' | 'asset_class' }> = [];

    if (diversificationData) {
      // Position concentrations
      diversificationData.holdings
        .filter(h => h.weight > thresholds.maxPositionPct)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 2)
        .forEach(h => {
          mainConcentrations.push({
            name: h.ticker,
            pct: h.weight,
            type: 'position',
          });
        });

      // Asset class concentrations
      diversificationData.byAssetClass
        .filter(ac => ac.name !== 'Unknown' && ac.name !== 'Non classifié')
        .filter(ac => ac.percentage > thresholds.maxAssetClassPct)
        .slice(0, 1)
        .forEach(ac => {
          mainConcentrations.push({
            name: ac.name,
            pct: ac.percentage,
            type: 'asset_class',
          });
        });
    }

    // Generate actions (max 3)
    const actions: MonthlyAction[] = [];

    // Rule 1: Excess cash
    const cashMargin = 5; // 5% margin
    if (currentCashPct > thresholds.cashTargetPct + cashMargin) {
      actions.push({
        id: 'action-excess-cash',
        title: 'Investir l\'excédent de liquidités',
        reason: `Vous détenez ${currentCashPct.toFixed(0)}% en liquidités, au-dessus de votre cible de ${thresholds.cashTargetPct}%. Un investissement progressif (DCA) permettrait de faire travailler cet argent.`,
        effort: 'low',
        ctaLabel: 'Ajouter un investissement',
        ctaAction: 'add-investment',
      });
    }

    // Rule 2: Position concentration
    const topConcentratedPosition = diversificationData?.holdings
      .filter(h => h.weight > thresholds.maxPositionPct)
      .sort((a, b) => b.weight - a.weight)[0];

    if (topConcentratedPosition && actions.length < 3) {
      actions.push({
        id: 'action-position-concentration',
        title: `Réduire l'exposition sur ${topConcentratedPosition.ticker}`,
        reason: `${topConcentratedPosition.ticker} représente ${topConcentratedPosition.weight.toFixed(1)}% de votre portefeuille, dépassant votre seuil de ${thresholds.maxPositionPct}%. Diversifier réduirait le risque spécifique.`,
        effort: 'medium',
        ctaLabel: 'Voir la décision',
        ctaAction: 'view-decision',
      });
    }

    // Rule 3: Asset class concentration (actions/ETF too high)
    const stockExposure = diversificationData?.byAssetClass
      .filter(ac => ['Actions', 'STOCK', 'ETF', 'Equity'].some(t => ac.name?.includes(t)))
      .reduce((sum, ac) => sum + ac.percentage, 0) || 0;

    if (stockExposure > thresholds.maxAssetClassPct && actions.length < 3) {
      actions.push({
        id: 'action-asset-class-concentration',
        title: 'Ajouter des actifs décorrélés',
        reason: `Votre exposition actions est de ${stockExposure.toFixed(0)}%, au-dessus de votre seuil de ${thresholds.maxAssetClassPct}%. Considérez des obligations ou de l'immobilier pour équilibrer.`,
        effort: 'medium',
        ctaLabel: 'Voir la décision',
        ctaAction: 'view-decision',
      });
    }

    // Top contributors (simplified - based on top holdings weight)
    const topContributors = diversificationData?.holdings
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map(h => ({
        name: h.ticker,
        contribution: h.weight,
      })) || [];

    return {
      totalValue,
      monthlyPnl,
      monthlyPnlPct,
      variationVsPrevious,
      topContributors,
      thresholds,
      currentCashPct,
      mainConcentrations,
      diversificationScore: diversificationData?.score ?? 0,
      actions: actions.slice(0, 3),
      lastCheckpointDate: lastMonthlyCheckpoint,
      loading,
      error,
    };
  }, [
    diversificationData,
    snapshots,
    portfolioData,
    profileThresholds,
    totalLiquidity,
    lastMonthlyCheckpoint,
    divLoading,
    snapLoading,
    profileLoading,
    liquidityLoading,
    divError,
    snapError,
  ]);

  return data;
}
