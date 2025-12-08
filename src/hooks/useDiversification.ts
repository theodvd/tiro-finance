import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { enrichAssetMetadata, isClassified } from '@/utils/assetEnrichment';

export interface HoldingDetail {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  value: number;
  weight: number;
  sector: string | null;
  region: string | null;
  assetClass: string | null;
  accountName: string;
}

export interface AllocationBreakdown {
  name: string;
  value: number;
  percentage: number;
  holdings: HoldingDetail[];
}

export interface ConcentrationRisk {
  type: 'single_stock' | 'sector' | 'region' | 'asset_class';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  percentage: number;
  threshold: number;
  holdings: string[];
}

export interface DiversificationRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  relatedHoldings: string[];
}

export interface DiversificationData {
  score: number;
  scoreLabel: 'Faible' | 'Moyen' | 'Bon' | 'Excellent';
  lastUpdated: string | null;
  totalValue: number;
  byAssetClass: AllocationBreakdown[];
  byRegion: AllocationBreakdown[];
  bySector: AllocationBreakdown[];
  concentrationRisks: ConcentrationRisk[];
  recommendations: DiversificationRecommendation[];
  holdings: HoldingDetail[];
  dataQuality: {
    classified: number;
    unclassified: number;
    total: number;
  };
}

// Thresholds for concentration risks
const THRESHOLDS = {
  singleStock: 10,
  sector: 40,
  region: 70,
  assetClass: 80,
};

function calculateDiversificationScore(
  byAssetClass: AllocationBreakdown[],
  byRegion: AllocationBreakdown[],
  bySector: AllocationBreakdown[],
  holdings: HoldingDetail[]
): number {
  let score = 100;

  // Penalize single stock concentration
  holdings.forEach(h => {
    if (h.weight > 20) score -= 15;
    else if (h.weight > 15) score -= 10;
    else if (h.weight > 10) score -= 5;
  });

  // Penalize sector concentration (excluding Unknown/Non classifié)
  bySector
    .filter(s => s.name !== 'Unknown' && s.name !== 'Non classifié')
    .forEach(s => {
      if (s.percentage > 50) score -= 15;
      else if (s.percentage > 40) score -= 10;
      else if (s.percentage > 30) score -= 5;
    });

  // Penalize region concentration (excluding Unknown/Non classifié)
  byRegion
    .filter(r => r.name !== 'Unknown' && r.name !== 'Non classifié')
    .forEach(r => {
      if (r.percentage > 80) score -= 15;
      else if (r.percentage > 70) score -= 10;
      else if (r.percentage > 60) score -= 5;
    });

  // Penalize asset class concentration (excluding Unknown/Non classifié)
  byAssetClass
    .filter(a => a.name !== 'Unknown' && a.name !== 'Non classifié')
    .forEach(a => {
      if (a.percentage > 90) score -= 10;
      else if (a.percentage > 80) score -= 5;
    });

  // Reward diversity (only count properly classified items)
  const uniqueRegions = byRegion.filter(r => r.name !== 'Unknown' && r.name !== 'Non classifié' && r.percentage > 5).length;
  const uniqueSectors = bySector.filter(s => s.name !== 'Unknown' && s.name !== 'Non classifié' && s.percentage > 5).length;
  const uniqueClasses = byAssetClass.filter(a => a.name !== 'Unknown' && a.name !== 'Non classifié' && a.percentage > 5).length;

  score += Math.min(uniqueRegions * 3, 15);
  score += Math.min(uniqueSectors * 2, 10);
  score += Math.min(uniqueClasses * 3, 15);

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getScoreLabel(score: number): 'Faible' | 'Moyen' | 'Bon' | 'Excellent' {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Bon';
  if (score >= 40) return 'Moyen';
  return 'Faible';
}

function detectConcentrationRisks(
  byAssetClass: AllocationBreakdown[],
  byRegion: AllocationBreakdown[],
  bySector: AllocationBreakdown[],
  holdings: HoldingDetail[]
): ConcentrationRisk[] {
  const risks: ConcentrationRisk[] = [];

  // Check single stock concentration
  holdings
    .filter(h => h.weight > THRESHOLDS.singleStock)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .forEach(h => {
      risks.push({
        type: 'single_stock',
        severity: h.weight > 20 ? 'high' : h.weight > 15 ? 'medium' : 'low',
        title: `Position concentrée : ${h.ticker}`,
        description: `${h.name} représente ${h.weight.toFixed(1)}% de votre portefeuille. Une diversification permettrait de réduire le risque spécifique.`,
        percentage: h.weight,
        threshold: THRESHOLDS.singleStock,
        holdings: [h.ticker],
      });
    });

  // Check sector concentration (exclude unknown/unclassified)
  bySector
    .filter(s => s.name !== 'Unknown' && s.name !== 'Non classifié' && s.percentage > THRESHOLDS.sector)
    .forEach(s => {
      risks.push({
        type: 'sector',
        severity: s.percentage > 60 ? 'high' : s.percentage > 50 ? 'medium' : 'low',
        title: `Surexposition secteur : ${s.name}`,
        description: `Le secteur ${s.name} représente ${s.percentage.toFixed(1)}% de votre portefeuille. Considérez une diversification vers d'autres secteurs.`,
        percentage: s.percentage,
        threshold: THRESHOLDS.sector,
        holdings: s.holdings.map(h => h.ticker),
      });
    });

  // Check region concentration (exclude unknown/unclassified)
  byRegion
    .filter(r => r.name !== 'Unknown' && r.name !== 'Non classifié' && r.percentage > THRESHOLDS.region)
    .forEach(r => {
      risks.push({
        type: 'region',
        severity: r.percentage > 85 ? 'high' : r.percentage > 75 ? 'medium' : 'low',
        title: `Concentration géographique : ${r.name}`,
        description: `La région ${r.name} représente ${r.percentage.toFixed(1)}% de votre portefeuille. Une exposition internationale pourrait améliorer la diversification.`,
        percentage: r.percentage,
        threshold: THRESHOLDS.region,
        holdings: r.holdings.map(h => h.ticker),
      });
    });

  return risks.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  }).slice(0, 5);
}

function generateRecommendations(
  byAssetClass: AllocationBreakdown[],
  byRegion: AllocationBreakdown[],
  bySector: AllocationBreakdown[],
  holdings: HoldingDetail[],
  risks: ConcentrationRisk[]
): DiversificationRecommendation[] {
  const recommendations: DiversificationRecommendation[] = [];

  // Based on concentration risks
  risks.forEach((risk, index) => {
    if (risk.type === 'single_stock') {
      recommendations.push({
        id: `rec-stock-${index}`,
        title: 'Rééquilibrer la position',
        description: `Vous avez ${risk.percentage.toFixed(1)}% dans ${risk.holdings[0]}. Envisagez de diversifier via un ETF sectoriel ou mondial pour réduire le risque spécifique.`,
        priority: risk.severity,
        relatedHoldings: risk.holdings,
      });
    } else if (risk.type === 'sector') {
      recommendations.push({
        id: `rec-sector-${index}`,
        title: `Diversifier hors ${risk.holdings[0]?.split(' ')[0] || 'ce secteur'}`,
        description: `${risk.percentage.toFixed(1)}% de votre portefeuille est concentré en ${risk.title.replace('Surexposition secteur : ', '')}. Explorez des secteurs défensifs ou en croissance différents.`,
        priority: risk.severity,
        relatedHoldings: risk.holdings.slice(0, 3),
      });
    } else if (risk.type === 'region') {
      recommendations.push({
        id: `rec-region-${index}`,
        title: 'Exposition internationale',
        description: `Avec ${risk.percentage.toFixed(1)}% en ${risk.title.replace('Concentration géographique : ', '')}, considérez des ETF émergents ou d'autres zones géographiques.`,
        priority: risk.severity,
        relatedHoldings: risk.holdings.slice(0, 3),
      });
    }
  });

  // Check for missing diversification
  const hasEmerging = byRegion.some(r => 
    (r.name?.toLowerCase().includes('émergent') || r.name?.toLowerCase().includes('emerging')) && r.percentage > 5
  );
  const hasBonds = byAssetClass.some(a => 
    (a.name?.toLowerCase().includes('bond') || a.name?.toLowerCase().includes('obligation')) && a.percentage > 5
  );
  
  if (!hasEmerging && byRegion.length > 0) {
    recommendations.push({
      id: 'rec-emerging',
      title: 'Ajouter une exposition émergente',
      description: 'Votre portefeuille manque d\'exposition aux marchés émergents. Un ETF comme VFEM ou IEMG pourrait améliorer la diversification géographique.',
      priority: 'low',
      relatedHoldings: [],
    });
  }

  if (!hasBonds && byAssetClass.length > 0) {
    recommendations.push({
      id: 'rec-bonds',
      title: 'Considérer des obligations',
      description: 'Une allocation obligataire pourrait réduire la volatilité globale de votre portefeuille, surtout si votre horizon est inférieur à 10 ans.',
      priority: 'low',
      relatedHoldings: [],
    });
  }

  return recommendations.slice(0, 6);
}

export function useDiversification() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<{
    snapshotLines: any[];
    securities: any[];
    accounts: any[];
    latestSnapshot: any;
  } | null>(null);

  const refetch = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [snapshotLinesRes, securitiesRes, accountsRes, latestSnapshotRes] = await Promise.all([
        supabase
          .from('snapshot_lines')
          .select('*')
          .eq('user_id', user.id)
          .order('valuation_date', { ascending: false }),
        supabase
          .from('securities')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('v_latest_snapshot')
          .select('*')
          .eq('user_id', user.id)
          .single(),
      ]);

      if (snapshotLinesRes.error) throw snapshotLinesRes.error;
      if (securitiesRes.error) throw securitiesRes.error;
      if (accountsRes.error) throw accountsRes.error;

      setRawData({
        snapshotLines: snapshotLinesRes.data || [],
        securities: securitiesRes.data || [],
        accounts: accountsRes.data || [],
        latestSnapshot: latestSnapshotRes.data,
      });
    } catch (err: any) {
      console.error('Error fetching diversification data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [user]);

  const data = useMemo<DiversificationData | null>(() => {
    if (!rawData) return null;

    const { snapshotLines, securities, accounts, latestSnapshot } = rawData;

    // Get latest snapshot lines only
    const latestSnapshotId = latestSnapshot?.id;
    const latestLines = latestSnapshotId 
      ? snapshotLines.filter(l => l.snapshot_id === latestSnapshotId)
      : snapshotLines.slice(0, 50); // Fallback to first 50

    const totalValue = latestLines.reduce((sum, l) => sum + Number(l.market_value_eur || 0), 0);

    // Build holdings with enriched metadata
    const holdings: HoldingDetail[] = latestLines.map(line => {
      const security = securities.find(s => s.id === line.security_id);
      const account = accounts.find(a => a.id === line.account_id);
      const value = Number(line.market_value_eur || 0);
      
      const symbol = security?.symbol || 'N/A';
      const name = security?.name || 'Unknown';
      
      // Get existing metadata from DB
      let region = line.region || security?.region || null;
      let sector = line.sector || security?.sector || null;
      let assetClass = line.asset_class || security?.asset_class || null;
      
      // Enrich if missing or unknown
      if (!region || !sector || !assetClass || 
          region === 'Unknown' || sector === 'Unknown' || assetClass === 'Unknown' ||
          region === 'Monde' && sector === 'Diversifié') {
        const enriched = enrichAssetMetadata(symbol, name);
        
        // Only use enriched if current is missing/unknown
        if (!region || region === 'Unknown') region = enriched.region;
        if (!sector || sector === 'Unknown') sector = enriched.sector;
        if (!assetClass || assetClass === 'Unknown') assetClass = enriched.assetClass;
      }

      return {
        id: line.id,
        ticker: symbol,
        name,
        quantity: Number(line.shares || 0),
        value,
        weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
        sector,
        region,
        assetClass,
        accountName: account?.name || 'Unknown',
      };
    });

    // Debug log for enrichment verification
    console.log('Holdings enrichis:', holdings.map(h => ({
      symbol: h.ticker,
      name: h.name,
      region: h.region,
      sector: h.sector,
      assetClass: h.assetClass,
      value: h.value.toFixed(2)
    })));

    // Aggregate by asset class (filter out unclassified for display but keep for stats)
    const byAssetClassMap = new Map<string, { value: number; holdings: HoldingDetail[] }>();
    holdings.forEach(h => {
      const key = h.assetClass || 'Non classifié';
      const existing = byAssetClassMap.get(key) || { value: 0, holdings: [] };
      existing.value += h.value;
      existing.holdings.push(h);
      byAssetClassMap.set(key, existing);
    });
    const byAssetClass: AllocationBreakdown[] = Array.from(byAssetClassMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        holdings: data.holdings,
      }))
      .sort((a, b) => b.value - a.value);

    // Aggregate by region
    const byRegionMap = new Map<string, { value: number; holdings: HoldingDetail[] }>();
    holdings.forEach(h => {
      const key = h.region || 'Non classifié';
      const existing = byRegionMap.get(key) || { value: 0, holdings: [] };
      existing.value += h.value;
      existing.holdings.push(h);
      byRegionMap.set(key, existing);
    });
    const byRegion: AllocationBreakdown[] = Array.from(byRegionMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        holdings: data.holdings,
      }))
      .sort((a, b) => b.value - a.value);

    // Aggregate by sector
    const bySectorMap = new Map<string, { value: number; holdings: HoldingDetail[] }>();
    holdings.forEach(h => {
      const key = h.sector || 'Non classifié';
      const existing = bySectorMap.get(key) || { value: 0, holdings: [] };
      existing.value += h.value;
      existing.holdings.push(h);
      bySectorMap.set(key, existing);
    });
    const bySector: AllocationBreakdown[] = Array.from(bySectorMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        holdings: data.holdings,
      }))
      .sort((a, b) => b.value - a.value);

    // Calculate score
    const score = calculateDiversificationScore(byAssetClass, byRegion, bySector, holdings);

    // Detect risks
    const concentrationRisks = detectConcentrationRisks(byAssetClass, byRegion, bySector, holdings);

    // Generate recommendations
    const recommendations = generateRecommendations(byAssetClass, byRegion, bySector, holdings, concentrationRisks);

    // Data quality - check using enrichment utility
    const classified = holdings.filter(h => {
      const metadata = { 
        region: h.region || 'Non classifié', 
        sector: h.sector || 'Non classifié', 
        assetClass: h.assetClass || 'Non classifié' 
      };
      return isClassified(metadata);
    }).length;

    return {
      score,
      scoreLabel: getScoreLabel(score),
      lastUpdated: latestSnapshot?.snapshot_ts || null,
      totalValue,
      byAssetClass,
      byRegion,
      bySector,
      concentrationRisks,
      recommendations,
      holdings: holdings.sort((a, b) => b.value - a.value),
      dataQuality: {
        classified,
        unclassified: holdings.length - classified,
        total: holdings.length,
      },
    };
  }, [rawData]);

  return {
    loading,
    error,
    data,
    refetch,
  };
}
