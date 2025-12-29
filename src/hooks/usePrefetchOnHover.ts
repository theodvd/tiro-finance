import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys, routeQueryMap } from '@/lib/queryKeys';
import { fetchPortfolioData } from '@/hooks/usePortfolioData';
import { fetchSnapshotsData } from '@/hooks/useSnapshots';
import { fetchDiversificationData } from '@/hooks/useDiversification';

const PREFETCH_DELAY = 150; // ms delay before prefetching to avoid accidental hovers

const fetchFunctions = {
  portfolio: fetchPortfolioData,
  snapshots: fetchSnapshotsData,
  diversification: fetchDiversificationData,
  userProfile: async () => null, // Handled separately if needed
  decisions: async () => null, // Uses diversification data
};

export function usePrefetchOnHover() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const prefetchRoute = useCallback((route: string) => {
    if (!user?.id) return;

    const queriesToPrefetch = routeQueryMap[route];
    if (!queriesToPrefetch) return;

    queriesToPrefetch.forEach((queryType) => {
      const queryKey = queryKeys[queryType](user.id);
      const fetchFn = fetchFunctions[queryType];
      
      if (!fetchFn) return;

      // Only prefetch if not already in cache or stale
      const cachedData = queryClient.getQueryData(queryKey);
      if (cachedData) return;

      queryClient.prefetchQuery({
        queryKey,
        queryFn: () => fetchFn(user.id),
        staleTime: 2 * 60 * 1000,
      });
    });
  }, [queryClient, user?.id]);

  const handleMouseEnter = useCallback((route: string) => {
    return () => {
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Delay prefetch to avoid accidental hovers
      timeoutRef.current = setTimeout(() => {
        prefetchRoute(route);
      }, PREFETCH_DELAY);
    };
  }, [prefetchRoute]);

  const handleMouseLeave = useCallback(() => {
    // Cancel pending prefetch if user moves away quickly
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    handleMouseEnter,
    handleMouseLeave,
    prefetchRoute,
  };
}
