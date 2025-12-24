import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  user_id: string;
  risk_profile: string | null;
  score_total: number | null;
  score_tolerance: number | null;
  score_capacity: number | null;
  score_behavior: number | null;
  score_horizon: number | null;
  score_knowledge: number | null;
  first_name: string | null;
  age: number | null;
  investment_horizon: string | null;
  max_acceptable_loss: string | null;
  // Investment thresholds
  cash_target_pct: number | null;
  max_position_pct: number | null;
  max_asset_class_pct: number | null;
  created_at: string;
  updated_at: string;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [data, setData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data: profile, error: fetchError } = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user profile:', fetchError);
        setError(fetchError.message);
      } else {
        setData(profile);
      }

      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  return { data, loading, error };
}
