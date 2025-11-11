import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export function useSnapshots() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<SnapshotSeries[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [allocByAccount, setAllocByAccount] = useState<AllocationItem[]>([]);
  const [allocByClass, setAllocByClass] = useState<AllocationItem[]>([]);
  const [allocByRegion, setAllocByRegion] = useState<AllocationItem[]>([]);
  const [allocBySector, setAllocBySector] = useState<AllocationItem[]>([]);

  const refetch = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [tsRes, snapsRes, accRes, clsRes, regRes, secRes] = await Promise.all([
        supabase
          .from('v_snapshot_totals')
          .select('*')
          .eq('user_id', user.id)
          .order('d', { ascending: true }),
        supabase
          .from('snapshots')
          .select('*')
          .eq('user_id', user.id)
          .order('snapshot_ts', { ascending: false })
          .limit(12),
        supabase
          .from('v_latest_alloc_by_account')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('v_latest_alloc_by_asset_class')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('v_latest_alloc_by_region')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('v_latest_alloc_by_sector')
          .select('*')
          .eq('user_id', user.id),
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
      setSeries(
        (tsRes.data || []).map((r: any) => ({
          date: new Date(r.d).toLocaleDateString('en-EU', {
            month: 'short',
            day: 'numeric',
          }),
          value: Number(r.total_value_eur || 0),
          invested: Number(r.total_invested_eur || 0),
        }))
      );

      // Process snapshots list
      setSnapshots(snapsRes.data || []);

      // Process allocations
      setAllocByAccount(
        (accRes.data || []).map((r: any) => ({
          name: r.account_name,
          value: Number(r.value_eur || 0),
          type: r.account_type,
        }))
      );

      setAllocByClass(
        (clsRes.data || []).map((r: any) => ({
          name: r.asset_class,
          value: Number(r.value_eur || 0),
        }))
      );

      setAllocByRegion(
        (regRes.data || []).map((r: any) => ({
          name: r.region,
          value: Number(r.value_eur || 0),
        }))
      );

      setAllocBySector(
        (secRes.data || []).map((r: any) => ({
          name: r.sector,
          value: Number(r.value_eur || 0),
        }))
      );
    } catch (err: any) {
      console.error('Error fetching snapshots:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [user]);

  return {
    loading,
    error,
    series,
    snapshots,
    allocByAccount,
    allocByClass,
    allocByRegion,
    allocBySector,
    refetch,
  };
}
