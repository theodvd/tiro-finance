/**
 * Look-Through Analysis
 * Calculates true underlying exposure by decomposing ETFs into their constituents
 */

import { HoldingDetail, AllocationBreakdown } from '@/hooks/useDiversification';
import { getETFComposition, hasETFComposition, ETFComposition } from './etfCompositions';

export interface LookThroughResult {
  /** Geographic exposure after looking through ETFs */
  realGeographic: AllocationBreakdown[];
  /** Sectoral exposure after looking through ETFs */
  realSectoral: AllocationBreakdown[];
  /** Whether any holdings have look-through data */
  hasLookThroughData: boolean;
  /** ETF symbols that don't have composition data */
  etfsWithoutData: string[];
  /** ETF symbols that have composition data */
  etfsWithData: string[];
  /** Percentage of portfolio value that has look-through data */
  lookThroughCoverage: number;
}

/**
 * Calculate real (look-through) exposure by decomposing ETF holdings
 * 
 * For each ETF:
 * 1. Get its composition (geographic and sectoral breakdown)
 * 2. Multiply the ETF's portfolio weight by each component's weight
 * 3. Aggregate across all holdings
 * 
 * For individual stocks:
 * - Use their existing region/sector classification
 */
export function calculateLookThroughExposure(
  holdings: HoldingDetail[],
  totalValue: number
): LookThroughResult {
  const geographicMap = new Map<string, { value: number; holdings: HoldingDetail[] }>();
  const sectoralMap = new Map<string, { value: number; holdings: HoldingDetail[] }>();
  
  const etfsWithData: string[] = [];
  const etfsWithoutData: string[] = [];
  let lookThroughValue = 0;
  
  holdings.forEach(holding => {
    const composition = getETFComposition(holding.ticker);
    const isETF = holding.assetClass?.toUpperCase() === 'ETF';
    
    if (composition && isETF) {
      // This is an ETF with composition data - decompose it
      etfsWithData.push(holding.ticker);
      lookThroughValue += holding.value;
      
      // Decompose geographic exposure
      Object.entries(composition.geographic).forEach(([region, percentage]) => {
        const contributedValue = holding.value * (percentage / 100);
        const existing = geographicMap.get(region) || { value: 0, holdings: [] };
        existing.value += contributedValue;
        // Add the original holding as reference (for UI purposes)
        if (!existing.holdings.some(h => h.id === holding.id)) {
          existing.holdings.push(holding);
        }
        geographicMap.set(region, existing);
      });
      
      // Decompose sectoral exposure
      Object.entries(composition.sectoral).forEach(([sector, percentage]) => {
        const contributedValue = holding.value * (percentage / 100);
        const existing = sectoralMap.get(sector) || { value: 0, holdings: [] };
        existing.value += contributedValue;
        if (!existing.holdings.some(h => h.id === holding.id)) {
          existing.holdings.push(holding);
        }
        sectoralMap.set(sector, existing);
      });
    } else {
      // Individual stock or ETF without data - use existing classification
      if (isETF && !composition) {
        etfsWithoutData.push(holding.ticker);
      }
      
      // Add to geographic map using the holding's region
      const region = holding.region || 'Non classifié';
      const geoExisting = geographicMap.get(region) || { value: 0, holdings: [] };
      geoExisting.value += holding.value;
      geoExisting.holdings.push(holding);
      geographicMap.set(region, geoExisting);
      
      // Add to sectoral map using the holding's sector
      const sector = holding.sector || 'Non classifié';
      const secExisting = sectoralMap.get(sector) || { value: 0, holdings: [] };
      secExisting.value += holding.value;
      secExisting.holdings.push(holding);
      sectoralMap.set(sector, secExisting);
    }
  });
  
  // Convert maps to sorted arrays
  const realGeographic: AllocationBreakdown[] = Array.from(geographicMap.entries())
    .map(([name, data]) => ({
      name,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      holdings: data.holdings,
    }))
    .sort((a, b) => b.value - a.value);
  
  const realSectoral: AllocationBreakdown[] = Array.from(sectoralMap.entries())
    .map(([name, data]) => ({
      name,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      holdings: data.holdings,
    }))
    .sort((a, b) => b.value - a.value);
  
  return {
    realGeographic,
    realSectoral,
    hasLookThroughData: etfsWithData.length > 0,
    etfsWithoutData: [...new Set(etfsWithoutData)],
    etfsWithData: [...new Set(etfsWithData)],
    lookThroughCoverage: totalValue > 0 ? (lookThroughValue / totalValue) * 100 : 0,
  };
}

/**
 * Compare nominal vs look-through exposure
 * Useful for showing the difference side by side
 */
export function compareExposures(
  nominal: AllocationBreakdown[],
  lookThrough: AllocationBreakdown[]
): Array<{
  name: string;
  nominalPercentage: number;
  lookThroughPercentage: number;
  difference: number;
}> {
  const allNames = new Set([
    ...nominal.map(n => n.name),
    ...lookThrough.map(l => l.name),
  ]);
  
  return Array.from(allNames).map(name => {
    const nominalItem = nominal.find(n => n.name === name);
    const lookThroughItem = lookThrough.find(l => l.name === name);
    
    const nominalPct = nominalItem?.percentage || 0;
    const lookThroughPct = lookThroughItem?.percentage || 0;
    
    return {
      name,
      nominalPercentage: nominalPct,
      lookThroughPercentage: lookThroughPct,
      difference: lookThroughPct - nominalPct,
    };
  }).sort((a, b) => b.lookThroughPercentage - a.lookThroughPercentage);
}
