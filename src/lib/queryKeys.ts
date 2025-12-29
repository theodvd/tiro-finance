// Centralized query keys for React Query
export const queryKeys = {
  portfolio: (userId: string) => ['portfolio', userId] as const,
  snapshots: (userId: string) => ['snapshots', userId] as const,
  diversification: (userId: string) => ['diversification', userId] as const,
  userProfile: (userId: string) => ['userProfile', userId] as const,
  decisions: (userId: string) => ['decisions', userId] as const,
};

// Route to query keys mapping for prefetching
export const routeQueryMap: Record<string, (keyof typeof queryKeys)[]> = {
  '/': ['portfolio', 'snapshots'],
  '/investments': ['portfolio'],
  '/diversification': ['diversification', 'snapshots'],
  '/decisions': ['diversification', 'snapshots'],
  '/monthly-review': ['portfolio', 'snapshots', 'userProfile'],
  '/insights': ['userProfile', 'diversification'],
  '/profile': ['userProfile'],
};
