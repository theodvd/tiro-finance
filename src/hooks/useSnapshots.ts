import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';

export interface SnapshotSeries {
  date: string;
  value: number;
  invested: number;
}

export interface AllocationItem {
  name: string;
  value: number;
  type?: string;
}

export interface SnapshotsData {
  series: SnapshotSeries[];
  snapshots: any[];
  allocByAccount: AllocationItem[];
  allocByClass: AllocationItem[];
  allocByRegion: AllocationItem[];
  allocBySector: AllocationItem[];
}

const defaultData: SnapshotsData = {
  series: [],
  snapshots: [],
  allocByAccount: [],
  allocByClass: [],
  allocByRegion: [],
  allocBySector: [],
};

export async function fetchSnapshotsData(userId: string): Promise<SnapshotsData> {
  // Fetch all data in parallel
  const [tsRes, snapsRes, accRes, clsRes, regRes, secRes] = await Promise.all([
    supabase
      .from('v_snapshot_totals')
      .select('*')
      .eq('user_id', userId)
      .order('d', { ascending: true }),
    supabase
      .from('snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_ts', { ascending: false })
      .limit(12),
    supabase
      .from('v_latest_alloc_by_account')
      .select('*')
      .eq('user_id', userId),
    supabase
      .from('v_latest_alloc_by_asset_class')
      .select('*')
      .eq('user_id', userId),
    supabase
      .from('v_latest_alloc_by_region')
      .select('*')
      .eq('user_id', userId),
    supabase
      .from('v_latest_alloc_by_sector')
      .select('*')
      .eq('user_id', userId),
  ]);

  if (tsRes.error || snapsRes.error || accRes.error || clsRes.error || regRes.error || secRes.error) {
    throw new Error(
      tsRes.error?.message ||
      snapsRes.error?.message ||
      accRes.error?.message ||
      clsRes.error?.message ||
      regRes.error?.message ||
      secRes.error?.message
    );
  }

  // Process time series
  const series = (tsRes.data || []).map((r: any) => ({
    date: new Date(r.d).toLocaleDateString('en-EU', {
      month: 'short',
      day: 'numeric',
    }),
    value: Number(r.total_value_eur || 0),
    invested: Number(r.total_invested_eur || 0),
  }));

  // Process allocations
  const allocByAccount = (accRes.data || []).map((r: any) => ({
    name: r.account_name,
    value: Number(r.value_eur || 0),
    type: r.account_type,
  }));

  const allocByClass = (clsRes.data || []).map((r: any) => ({
    name: r.asset_class,
    value: Number(r.value_eur || 0),
  }));

  const allocByRegion = (regRes.data || []).map((r: any) => ({
    name: r.region,
    value: Number(r.value_eur || 0),
  }));

  const allocBySector = (secRes.data || []).map((r: any) => ({
    name: r.sector,
    value: Number(r.value_eur || 0),
  }));

  return {
    series,
    snapshots: snapsRes.data || [],
    allocByAccount,
    allocByClass,
    allocByRegion,
    allocBySector,
  };
}

export function useSnapshots() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.snapshots(user?.id ?? ''),
    queryFn: () => fetchSnapshotsData(user!.id),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  return {
    ...defaultData,
    ...(query.data ?? {}),
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
