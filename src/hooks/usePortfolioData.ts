import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PortfolioData {
  totalInvested: number;
  totalValue: number;
  pnl: number;
  pnlPct: number;
  lastUpdated: string | null;
  accountAllocations: Array<{ name: string; value: number; type: string }>;
  topHoldings: Array<{
    name: string;
    symbol: string;
    marketValue: number;
    perfPct: number;
    accountName: string;
  }>;
  loading: boolean;
  error: string | null;
}

export function usePortfolioData() {
  const { user } = useAuth();
  const [data, setData] = useState<PortfolioData>({
    totalInvested: 0,
    totalValue: 0,
    pnl: 0,
    pnlPct: 0,
    lastUpdated: null,
    accountAllocations: [],
    topHoldings: [],
    loading: true,
    error: null,
  });

  const fetchData = async () => {
    if (!user) {
      setData(prev => ({ ...prev, loading: false, error: 'No user authenticated' }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch holdings with related data
      const { data: holdings, error: holdingsError } = await supabase
        .from('holdings')
        .select(`
          id,
          shares,
          amount_invested_eur,
          account_id,
          accounts(id, name, type),
          security:securities(id, symbol, name, asset_class)
        `)
        .eq('user_id', user.id);

      if (holdingsError) throw holdingsError;
      if (!holdings || holdings.length === 0) {
        setData({
          totalInvested: 0,
          totalValue: 0,
          pnl: 0,
          pnlPct: 0,
          lastUpdated: null,
          accountAllocations: [],
          topHoldings: [],
          loading: false,
          error: null,
        });
        return;
      }

      // Fetch market data for all securities
      const securityIds = holdings
        .map(h => h.security?.id)
        .filter(Boolean) as string[];

      const { data: marketData, error: mdError } = await supabase
        .from('market_data')
        .select('security_id, last_px_eur, updated_at')
        .in('security_id', securityIds);

      if (mdError) throw mdError;

      // Build price map
      const priceMap = new Map<string, { price: number; updated: string }>();
      marketData?.forEach(md => {
        priceMap.set(md.security_id, {
          price: Number(md.last_px_eur || 0),
          updated: md.updated_at || '',
        });
      });

      // Compute totals and allocations
      let totalInvested = 0;
      let totalValue = 0;
      let lastUpdated: string | null = null;
      const accountMap = new Map<string, { name: string; type: string; value: number }>();
      const holdingsData: Array<{
        name: string;
        symbol: string;
        marketValue: number;
        perfPct: number;
        accountName: string;
        invested: number;
      }> = [];

      holdings.forEach(holding => {
        const invested = Number(holding.amount_invested_eur || 0);
        const shares = Number(holding.shares || 0);
        const priceData = priceMap.get(holding.security?.id || '');
        const price = priceData?.price || 0;
        const marketValue = shares * price;

        totalInvested += invested;
        totalValue += marketValue;

        if (priceData?.updated && (!lastUpdated || priceData.updated > lastUpdated)) {
          lastUpdated = priceData.updated;
        }

        // Account allocation
        const accountId = holding.account_id;
        const accountName = (holding.accounts as any)?.name || 'Unknown';
        const accountType = (holding.accounts as any)?.type || 'OTHER';
        
        if (!accountMap.has(accountId)) {
          accountMap.set(accountId, { name: accountName, type: accountType, value: 0 });
        }
        accountMap.get(accountId)!.value += marketValue;

        // Holdings data
        holdingsData.push({
          name: holding.security?.name || '',
          symbol: holding.security?.symbol || '',
          marketValue,
          perfPct: invested > 0 ? ((marketValue - invested) / invested) * 100 : 0,
          accountName,
          invested,
        });
      });

      const pnl = totalValue - totalInvested;
      const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

      // Sort and get top 5 holdings
      const topHoldings = holdingsData
        .sort((a, b) => b.marketValue - a.marketValue)
        .slice(0, 5)
        .map(({ name, symbol, marketValue, perfPct, accountName }) => ({
          name,
          symbol,
          marketValue,
          perfPct,
          accountName,
        }));

      setData({
        totalInvested,
        totalValue,
        pnl,
        pnlPct,
        lastUpdated,
        accountAllocations: Array.from(accountMap.values()),
        topHoldings,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('Error fetching portfolio data:', err);
      setData(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to load portfolio data',
      }));
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  return { ...data, refetch: fetchData };
}
