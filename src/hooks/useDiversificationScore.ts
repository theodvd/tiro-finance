/**
 * Shared hook for diversification score calculation
 * Used by both /diversification and /insights pages
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { useUserProfile } from '@/hooks/useUserProfile';
import { enrichAssetMetadata } from '@/utils/assetEnrichment';
import { calculateLookThroughExposure, LookThroughResult } from '@/utils/lookThroughAnalysis';
import {
  computeDiversificationScore,
  isPositionClassified,
  ScorePosition,
  DiversificationScoreResult,
} from '@/lib/diversificationScore';

// Re-export types for convenience
export type { DiversificationScoreResult, ScorePosition, SubScoreBreakdown } from '@/lib/diversificationScore';

export interface HoldingForScore {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  valueEUR: number;
  weightPct: number;
  investedEUR: number;
  assetClass: string | null;
  region: string | null;
  sector: string | null;
  accountName: string;
  accountId: string;
  isClassified: boolean;
}

export interface AllocationBreakdown {
  name: string;
  value: number;
  percentage: number;
  holdings: HoldingForScore[];
}

export interface DiversificationScoreData {
  // Score
  score: DiversificationScoreResult;
  
  // Holdings
  holdings: HoldingForScore[];
  totalValue: number;
  lastUpdated: string | null;
  
  // Allocations (for charts)
  byAssetClass: AllocationBreakdown[];
  byRegion: AllocationBreakdown[];
  bySector: AllocationBreakdown[];
  
  // Look-through
  lookThrough: LookThroughResult | null;
  
  // For computing look-through score
  lookThroughScore: DiversificationScoreResult | null;
}

interface RawHolding {
  id: string;
  shares: number;
  amount_invested_eur: number | null;
  account_id: string;
  accounts: { id: string; name: string; type: string } | null;
  security: {
    id: string;
    symbol: string;
    name: string;
    asset_class: string | null;
    region: string | null;
    sector: string | null;
  } | null;
}

interface RawPrice {
  security_id: string;
  last_px_eur: number | null;
  updated_at: string | null;
}

const PLACEHOLDER_VALUES = ['Monde', 'Non défini', 'Unknown', 'Non classifié', 'Diversifié', null, undefined, ''];

async function fetchScoreData(userId: string) {
  const [holdingsRes, pricesRes] = await Promise.all([
    supabase
      .from('holdings')
      .select(`
        id,
        shares,
        amount_invested_eur,
        account_id,
        accounts(id, name, type),
        security:securities(id, symbol, name, asset_class, region, sector)
      `)
      .eq('user_id', userId),
    
    supabase
      .from('v_latest_market_price')
      .select('security_id, last_px_eur, updated_at'),
  ]);

  if (holdingsRes.error) throw holdingsRes.error;
  if (pricesRes.error) throw pricesRes.error;

  return {
    holdings: (holdingsRes.data || []) as RawHolding[],
    prices: (pricesRes.data || []) as RawPrice[],
  };
}

function processScoreData(
  rawHoldings: RawHolding[],
  rawPrices: RawPrice[],
  maxPositionPct: number,
  useLookThrough: boolean
): DiversificationScoreData | null {
  if (rawHoldings.length === 0) return null;

  // Build price map
  const priceMap = new Map<string, { price: number; updated: string | null }>();
  rawPrices.forEach(p => {
    if (p.security_id) {
      priceMap.set(p.security_id, {
        price: Number(p.last_px_eur ?? 0),
        updated: p.updated_at,
      });
    }
  });

  // Process holdings
  let totalValue = 0;
  let lastUpdated: string | null = null;

  const holdings: HoldingForScore[] = rawHoldings.map(h => {
    const security = h.security;
    const account = h.accounts;
    const securityId = security?.id || '';
    const shares = Number(h.shares || 0);
    const invested = Number(h.amount_invested_eur || 0);
    const priceData = priceMap.get(securityId);
    const price = priceData?.price ?? 0;
    const marketValue = shares * price;

    totalValue += marketValue;

    if (priceData?.updated && (!lastUpdated || priceData.updated > lastUpdated)) {
      lastUpdated = priceData.updated;
    }

    // Get metadata with local enrichment fallback
    const ticker = security?.symbol || 'N/A';
    const name = security?.name || 'Unknown';
    let assetClass = security?.asset_class || null;
    let region = security?.region || null;
    let sector = security?.sector || null;

    // Enrich from local database if needed
    if (PLACEHOLDER_VALUES.includes(region) || PLACEHOLDER_VALUES.includes(sector)) {
      const enriched = enrichAssetMetadata(ticker, name);
      if (PLACEHOLDER_VALUES.includes(region) && enriched.region !== 'Non classifié') {
        region = enriched.region;
      }
      if (PLACEHOLDER_VALUES.includes(sector) && enriched.sector !== 'Non classifié') {
        sector = enriched.sector;
      }
      if (!assetClass && enriched.assetClass !== 'Non classifié') {
        assetClass = enriched.assetClass;
      }
    }

    return {
      id: h.id,
      ticker,
      name,
      shares,
      valueEUR: marketValue,
      weightPct: 0, // Will be calculated after totalValue is known
      investedEUR: invested,
      assetClass: assetClass || 'Non classifié',
      region: region || 'Non classifié',
      sector: sector || 'Non classifié',
      accountName: account?.name || 'Unknown',
      accountId: h.account_id,
      isClassified: isPositionClassified(region, sector, assetClass),
    };
  });

  // Calculate weights
  holdings.forEach(h => {
    h.weightPct = totalValue > 0 ? (h.valueEUR / totalValue) * 100 : 0;
  });

  // Sort by weight
  holdings.sort((a, b) => b.valueEUR - a.valueEUR);

  // Build allocations for charts
  const buildAllocation = (keyFn: (h: HoldingForScore) => string): AllocationBreakdown[] => {
    const map = new Map<string, { value: number; holdings: HoldingForScore[] }>();

    holdings.forEach(h => {
      const key = keyFn(h);
      const existing = map.get(key) || { value: 0, holdings: [] };
      existing.value += h.valueEUR;
      existing.holdings.push(h);
      map.set(key, existing);
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        holdings: data.holdings,
      }))
      .sort((a, b) => b.value - a.value);
  };

  const byAssetClass = buildAllocation(h => h.assetClass || 'Non classifié');
  const byRegion = buildAllocation(h => h.region || 'Non classifié');
  const bySector = buildAllocation(h => h.sector || 'Non classifié');

  // Convert holdings to ScorePosition format
  const scorePositions: ScorePosition[] = holdings.map(h => ({
    ticker: h.ticker,
    name: h.name,
    valueEUR: h.valueEUR,
    weightPct: h.weightPct,
    assetClass: h.assetClass,
    region: h.region,
    sector: h.sector,
    isClassified: h.isClassified,
  }));

  // Calculate main score (nominal)
  const score = computeDiversificationScore(scorePositions, {
    useLookThrough: false,
    maxPositionPct,
  });

  // Calculate look-through exposure
  // We need to convert HoldingForScore to the format expected by calculateLookThroughExposure
  const holdingsForLookThrough = holdings.map(h => ({
    id: h.id,
    ticker: h.ticker,
    name: h.name,
    quantity: h.shares,
    value: h.valueEUR,
    weight: h.weightPct,
    sector: h.sector,
    region: h.region,
    assetClass: h.assetClass,
    accountName: h.accountName,
  }));

  const lookThrough = calculateLookThroughExposure(holdingsForLookThrough, totalValue);

  // Calculate look-through score if data available
  let lookThroughScore: DiversificationScoreResult | null = null;
  if (lookThrough.hasLookThroughData && useLookThrough) {
    // Build positions with look-through allocations
    // For look-through, we recalculate using the decomposed ETF data
    const lookThroughPositions: ScorePosition[] = [];
    
    // Add positions based on look-through geographic/sectoral breakdown
    // This is a simplified approach - in reality we'd need more complex logic
    lookThrough.realGeographic.forEach(geo => {
      geo.holdings.forEach(h => {
        const existing = lookThroughPositions.find(p => p.ticker === h.ticker);
        if (!existing) {
          lookThroughPositions.push({
            ticker: h.ticker,
            name: h.name,
            valueEUR: h.value,
            weightPct: h.weight,
            assetClass: h.assetClass,
            region: h.region,
            sector: h.sector,
            isClassified: isPositionClassified(h.region, h.sector, h.assetClass),
          });
        }
      });
    });

    // If we have look-through positions, use them; otherwise fall back
    if (lookThroughPositions.length > 0) {
      // Create synthetic positions for look-through score based on decomposed allocations
      const syntheticPositions: ScorePosition[] = [];
      
      // Use the real geographic allocation for the score
      lookThrough.realGeographic.forEach(geo => {
        // Create a synthetic position for each geographic region
        syntheticPositions.push({
          ticker: `LT_${geo.name}`,
          name: geo.name,
          valueEUR: geo.value,
          weightPct: geo.percentage,
          assetClass: 'ETF',
          region: geo.name,
          sector: 'Diversifié',
          isClassified: !PLACEHOLDER_VALUES.includes(geo.name),
        });
      });

      lookThroughScore = computeDiversificationScore(
        scorePositions.map(p => {
          // Find look-through region for this position
          const ltGeo = lookThrough.realGeographic.find(g => 
            g.holdings.some(h => h.ticker === p.ticker)
          );
          const ltSec = lookThrough.realSectoral.find(s => 
            s.holdings.some(h => h.ticker === p.ticker)
          );
          return {
            ...p,
            // Keep original region/sector for individual stocks, but the look-through analysis
            // will affect the overall score through the allocations
          };
        }),
        {
          useLookThrough: true,
          maxPositionPct,
        }
      );
    }
  }

  return {
    score,
    holdings,
    totalValue,
    lastUpdated,
    byAssetClass,
    byRegion,
    bySector,
    lookThrough,
    lookThroughScore,
  };
}

export function useDiversificationScore(useLookThrough: boolean = false) {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const maxPositionPct = profile?.max_position_pct ?? 10;

  const query = useQuery({
    queryKey: [...queryKeys.diversification(user?.id ?? ''), 'shared-score', maxPositionPct],
    queryFn: () => fetchScoreData(user!.id),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const data = useMemo(() => {
    if (!query.data) return null;
    return processScoreData(
      query.data.holdings,
      query.data.prices,
      maxPositionPct,
      useLookThrough
    );
  }, [query.data, maxPositionPct, useLookThrough]);

  return {
    loading: query.isLoading,
    error: query.error?.message ?? null,
    data,
    refetch: query.refetch,
    maxPositionPct,
  };
}
