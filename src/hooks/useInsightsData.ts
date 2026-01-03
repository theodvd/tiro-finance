import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { enrichAssetMetadata } from '@/utils/assetEnrichment';

// ============ TYPES ============

export interface HoldingInsight {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  invested: number;
  marketValue: number;
  pnl: number;
  pnlPct: number;
  weight: number;
  assetClass: string;
  region: string;
  sector: string;
  accountName: string;
  accountId: string;
}

export interface AllocationItem {
  name: string;
  value: number;
  percentage: number;
  count: number;
}

export interface SubScore {
  name: string;
  score: number;
  maxScore: number;
  description: string;
}

export interface DiversificationScore {
  total: number;
  label: 'Faible' | 'Moyen' | 'Bon' | 'Excellent';
  subScores: SubScore[];
}

export interface SnapshotVariation {
  previousValue: number;
  currentValue: number;
  variation: number;
  variationPct: number;
  periodLabel: string;
}

export interface TopMover {
  ticker: string;
  name: string;
  pnl: number;
  pnlPct: number;
}

export interface InsightsData {
  // Portfolio totals
  totalValue: number;
  totalInvested: number;
  pnl: number;
  pnlPct: number;
  lastUpdated: string | null;

  // Holdings
  holdings: HoldingInsight[];

  // Allocations
  allocByAccount: AllocationItem[];
  allocByClass: AllocationItem[];
  allocByRegion: AllocationItem[];
  allocBySector: AllocationItem[];

  // Diversification
  diversificationScore: DiversificationScore;

  // Insights
  snapshotVariation: SnapshotVariation | null;
  topGainers: TopMover[];
  topLosers: TopMover[];

  // Historical data
  series: Array<{ date: string; value: number; invested: number }>;
  snapshots: any[];

  // Data quality
  dataQuality: {
    hasHoldings: boolean;
    hasPrices: boolean;
    hasSnapshots: boolean;
    classifiedCount: number;
    totalCount: number;
  };
}

// ============ HHI CALCULATION ============

/**
 * Calculate Herfindahl-Hirschman Index (HHI)
 * HHI = sum of squared market shares
 * Range: 0 (perfect diversity) to 10000 (complete concentration)
 * We convert to a 0-25 score where higher is better (more diverse)
 */
function calculateHHI(allocations: AllocationItem[]): number {
  if (allocations.length === 0) return 10000;
  
  const validAllocations = allocations.filter(
    a => a.name !== 'Non classifié' && a.name !== 'Unknown' && a.percentage > 0
  );
  
  if (validAllocations.length === 0) return 10000;
  
  const hhi = validAllocations.reduce((sum, a) => sum + Math.pow(a.percentage, 2), 0);
  return hhi;
}

function hhiToScore(hhi: number, maxScore: number): number {
  // Perfect diversity (HHI ~= 0) -> maxScore
  // Complete concentration (HHI = 10000) -> 0
  // Use a curved scale for better differentiation
  const normalized = Math.max(0, Math.min(1, 1 - (hhi / 10000)));
  return Math.round(normalized * maxScore);
}

function calculateConcentrationScore(
  holdings: HoldingInsight[],
  maxPositionPct: number
): { score: number; maxScore: number } {
  const maxScore = 25;
  
  if (holdings.length === 0) return { score: 0, maxScore };
  
  // Count positions exceeding the threshold
  const overConcentrated = holdings.filter(h => h.weight > maxPositionPct);
  
  if (overConcentrated.length === 0) {
    return { score: maxScore, maxScore };
  }
  
  // Penalize based on how much they exceed and how many
  let penalty = 0;
  overConcentrated.forEach(h => {
    const excess = h.weight - maxPositionPct;
    penalty += Math.min(excess / maxPositionPct, 1) * (maxScore / 3);
  });
  
  return { score: Math.max(0, Math.round(maxScore - penalty)), maxScore };
}

function calculateDiversificationScore(
  allocByClass: AllocationItem[],
  allocByRegion: AllocationItem[],
  allocBySector: AllocationItem[],
  holdings: HoldingInsight[],
  maxPositionPct: number
): DiversificationScore {
  // Sub-score 1: Asset Class diversity (0-25)
  const classHHI = calculateHHI(allocByClass);
  const classScore = hhiToScore(classHHI, 25);
  
  // Sub-score 2: Region diversity (0-25)
  const regionHHI = calculateHHI(allocByRegion);
  const regionScore = hhiToScore(regionHHI, 25);
  
  // Sub-score 3: Sector diversity (0-25)
  const sectorHHI = calculateHHI(allocBySector);
  const sectorScore = hhiToScore(sectorHHI, 25);
  
  // Sub-score 4: Position concentration (0-25)
  const { score: concentrationScore, maxScore: concentrationMax } = calculateConcentrationScore(holdings, maxPositionPct);
  
  const total = classScore + regionScore + sectorScore + concentrationScore;
  
  const subScores: SubScore[] = [
    {
      name: 'Classes d\'actifs',
      score: classScore,
      maxScore: 25,
      description: `Répartition entre ${allocByClass.filter(a => a.name !== 'Non classifié').length} classes`,
    },
    {
      name: 'Régions',
      score: regionScore,
      maxScore: 25,
      description: `Répartition entre ${allocByRegion.filter(a => a.name !== 'Non classifié').length} régions`,
    },
    {
      name: 'Secteurs',
      score: sectorScore,
      maxScore: 25,
      description: `Répartition entre ${allocBySector.filter(a => a.name !== 'Non classifié').length} secteurs`,
    },
    {
      name: 'Concentration',
      score: concentrationScore,
      maxScore: concentrationMax,
      description: `${holdings.filter(h => h.weight > maxPositionPct).length} positions > ${maxPositionPct}%`,
    },
  ];
  
  let label: DiversificationScore['label'];
  if (total >= 80) label = 'Excellent';
  else if (total >= 60) label = 'Bon';
  else if (total >= 40) label = 'Moyen';
  else label = 'Faible';
  
  return { total, label, subScores };
}

// ============ FETCH DATA ============

export async function fetchInsightsData(userId: string, maxPositionPct: number = 10): Promise<InsightsData> {
  // Fetch all data in parallel
  const [holdingsRes, pricesRes, snapshotsRes, timeSeries] = await Promise.all([
    // Holdings with accounts and securities
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
    
    // Latest prices
    supabase
      .from('v_latest_market_price')
      .select('security_id, last_px_eur, updated_at'),
    
    // Recent snapshots
    supabase
      .from('snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_ts', { ascending: false })
      .limit(12),
    
    // Time series for chart
    supabase
      .from('v_snapshot_totals')
      .select('*')
      .eq('user_id', userId)
      .order('d', { ascending: true }),
  ]);

  // Handle errors
  if (holdingsRes.error) throw holdingsRes.error;
  if (pricesRes.error) throw pricesRes.error;
  if (snapshotsRes.error) throw snapshotsRes.error;
  if (timeSeries.error) throw timeSeries.error;

  const rawHoldings = holdingsRes.data || [];
  const rawPrices = pricesRes.data || [];
  const snapshots = snapshotsRes.data || [];
  const series = (timeSeries.data || []).map((r: any) => ({
    date: new Date(r.d).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
    value: Number(r.total_value_eur || 0),
    invested: Number(r.total_invested_eur || 0),
  }));

  // Build price map
  const priceMap = new Map<string, { price: number; updated: string }>();
  rawPrices.forEach((p: any) => {
    if (p.security_id) {
      priceMap.set(p.security_id, {
        price: Number(p.last_px_eur ?? 0),
        updated: p.updated_at || '',
      });
    }
  });

  // Process holdings
  let totalValue = 0;
  let totalInvested = 0;
  let lastUpdated: string | null = null;
  
  const holdings: HoldingInsight[] = rawHoldings.map((h: any) => {
    const security = h.security as any;
    const account = h.accounts as any;
    const securityId = security?.id || '';
    const shares = Number(h.shares || 0);
    const invested = Number(h.amount_invested_eur || 0);
    const priceData = priceMap.get(securityId);
    const price = priceData?.price ?? 0;
    const marketValue = shares * price;
    const pnl = marketValue - invested;
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
    
    totalValue += marketValue;
    totalInvested += invested;
    
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
    const placeholders = ['Monde', 'Non défini', 'Unknown', 'Non classifié', null, undefined, ''];
    if (placeholders.includes(region) || placeholders.includes(sector)) {
      const enriched = enrichAssetMetadata(ticker, name);
      if (placeholders.includes(region) && enriched.region !== 'Non classifié') {
        region = enriched.region;
      }
      if (placeholders.includes(sector) && enriched.sector !== 'Non classifié') {
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
      invested,
      marketValue,
      pnl,
      pnlPct,
      weight: 0, // Will be calculated after we know totalValue
      assetClass: assetClass || 'Non classifié',
      region: region || 'Non classifié',
      sector: sector || 'Non classifié',
      accountName: account?.name || 'Unknown',
      accountId: h.account_id,
    };
  });

  // Calculate weights
  holdings.forEach(h => {
    h.weight = totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0;
  });

  // Sort by weight
  holdings.sort((a, b) => b.weight - a.weight);

  // Build allocations
  const buildAllocation = (
    holdings: HoldingInsight[],
    keyFn: (h: HoldingInsight) => string
  ): AllocationItem[] => {
    const map = new Map<string, { value: number; count: number }>();
    
    holdings.forEach(h => {
      const key = keyFn(h);
      const existing = map.get(key) || { value: 0, count: 0 };
      existing.value += h.marketValue;
      existing.count += 1;
      map.set(key, existing);
    });
    
    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value);
  };

  const allocByAccount = buildAllocation(holdings, h => h.accountName);
  const allocByClass = buildAllocation(holdings, h => h.assetClass);
  const allocByRegion = buildAllocation(holdings, h => h.region);
  const allocBySector = buildAllocation(holdings, h => h.sector);

  // Calculate diversification score
  const diversificationScore = calculateDiversificationScore(
    allocByClass,
    allocByRegion,
    allocBySector,
    holdings,
    maxPositionPct
  );

  // Snapshot variation
  let snapshotVariation: SnapshotVariation | null = null;
  if (snapshots.length >= 2) {
    const current = snapshots[0];
    const previous = snapshots[1];
    const currentVal = Number(current.total_value_eur || 0);
    const previousVal = Number(previous.total_value_eur || 0);
    const variation = currentVal - previousVal;
    const variationPct = previousVal > 0 ? (variation / previousVal) * 100 : 0;
    
    snapshotVariation = {
      currentValue: currentVal,
      previousValue: previousVal,
      variation,
      variationPct,
      periodLabel: 'depuis le dernier snapshot',
    };
  }

  // Top gainers/losers
  const sortedByPnl = [...holdings].sort((a, b) => b.pnl - a.pnl);
  const topGainers = sortedByPnl
    .filter(h => h.pnl > 0)
    .slice(0, 3)
    .map(h => ({ ticker: h.ticker, name: h.name, pnl: h.pnl, pnlPct: h.pnlPct }));
  
  const topLosers = sortedByPnl
    .filter(h => h.pnl < 0)
    .slice(-3)
    .reverse()
    .map(h => ({ ticker: h.ticker, name: h.name, pnl: h.pnl, pnlPct: h.pnlPct }));

  // Data quality
  const classifiedCount = holdings.filter(h => 
    h.region !== 'Non classifié' && h.sector !== 'Non classifié'
  ).length;

  const pnl = totalValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

  return {
    totalValue,
    totalInvested,
    pnl,
    pnlPct,
    lastUpdated,
    holdings,
    allocByAccount,
    allocByClass,
    allocByRegion,
    allocBySector,
    diversificationScore,
    snapshotVariation,
    topGainers,
    topLosers,
    series,
    snapshots,
    dataQuality: {
      hasHoldings: holdings.length > 0,
      hasPrices: priceMap.size > 0,
      hasSnapshots: snapshots.length > 0,
      classifiedCount,
      totalCount: holdings.length,
    },
  };
}

// ============ HOOK ============

export function useInsightsData(maxPositionPct: number = 10) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: [...queryKeys.insights(user?.id ?? ''), maxPositionPct],
    queryFn: () => fetchInsightsData(user!.id, maxPositionPct),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    loading: query.isLoading,
    error: query.error?.message ?? null,
    data: query.data ?? null,
    refetch: query.refetch,
  };
}
