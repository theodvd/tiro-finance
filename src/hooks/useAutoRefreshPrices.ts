import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';

const REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes
const MIN_REFRESH_GAP = 2 * 60 * 1000; // 2 minutes minimum between refreshes
const STORAGE_KEY = 'last_price_refresh';

export function useAutoRefreshPrices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshPrices = useCallback(async () => {
    if (!user) return;

    // Check throttle
    const lastRefresh = localStorage.getItem(STORAGE_KEY);
    if (lastRefresh && Date.now() - Number(lastRefresh) < MIN_REFRESH_GAP) {
      console.log('[AutoRefresh] Skipped - too recent');
      return;
    }

    console.log('[AutoRefresh] Starting price refresh...');
    setIsRefreshing(true);

    try {
      const { error } = await supabase.functions.invoke('refresh-prices', {
        body: { user_id: user.id }
      });

      if (error) {
        console.error('[AutoRefresh] Error:', error);
        return;
      }

      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      console.log('[AutoRefresh] Prices refreshed successfully');

      // Invalidate queries to force reload with new prices
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.portfolio(user.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.snapshots(user.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.diversification(user.id) }),
      ]);
    } catch (err) {
      console.error('[AutoRefresh] Exception:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [user, queryClient]);

  useEffect(() => {
    if (!user) return;

    // Initial refresh on mount
    refreshPrices();

    // Polling every 3 minutes
    intervalRef.current = setInterval(refreshPrices, REFRESH_INTERVAL);

    // Refresh when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshPrices();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, refreshPrices]);

  return { isRefreshing };
}
