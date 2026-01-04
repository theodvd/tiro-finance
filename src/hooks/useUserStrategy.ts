/**
 * Hook for accessing user strategy and thresholds
 * Single source of truth for all diversification/decision alerts
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import {
  classifyStrategy,
  getArchetypeThresholds,
  StrategyArchetype,
  StrategyThresholds,
  StrategyResult,
  ARCHETYPE_LABELS,
} from '@/lib/strategyClassifier';

export interface UserStrategy {
  // Thresholds (always available with defaults)
  thresholds: StrategyThresholds;
  
  // Archetype info
  archetype: StrategyArchetype;
  archetypeLabel: string;
  
  // Classification result (if computed)
  classification: StrategyResult | null;
  
  // Profile status
  profileExists: boolean;
  profileComplete: boolean;
  needsOnboarding: boolean;
  
  // Raw profile data for reference
  rawProfile: RawProfile | null;
}

interface RawProfile {
  id: string;
  user_id: string;
  investment_horizon: string | null;
  max_acceptable_loss: string | null;
  financial_resilience_months: string | null;
  income_stability: string | null;
  risk_profile: string | null;
  cash_target_pct: number | null;
  max_position_pct: number | null;
  max_asset_class_pct: number | null;
  first_name: string | null;
  age: number | null;
}

// Default thresholds (Balanced archetype)
const DEFAULT_THRESHOLDS: StrategyThresholds = {
  cash_target_pct: 10,
  max_position_pct: 10,
  max_asset_class_pct: 80,
};

async function fetchUserProfile(userId: string): Promise<RawProfile | null> {
  const { data, error } = await supabase
    .from('user_profile')
    .select(`
      id,
      user_id,
      investment_horizon,
      max_acceptable_loss,
      financial_resilience_months,
      income_stability,
      risk_profile,
      cash_target_pct,
      max_position_pct,
      max_asset_class_pct,
      first_name,
      age
    `)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }

  return data;
}

function processStrategy(profile: RawProfile | null): UserStrategy {
  // No profile exists
  if (!profile) {
    return {
      thresholds: DEFAULT_THRESHOLDS,
      archetype: 'Balanced',
      archetypeLabel: ARCHETYPE_LABELS['Balanced'],
      classification: null,
      profileExists: false,
      profileComplete: false,
      needsOnboarding: true,
      rawProfile: null,
    };
  }

  // Check if profile has the key onboarding fields
  const hasHorizon = !!profile.investment_horizon;
  const hasLoss = !!profile.max_acceptable_loss;
  const hasResilience = !!profile.financial_resilience_months;
  const profileComplete = hasHorizon && hasLoss;

  // Classify based on answers
  const classification = classifyStrategy({
    investment_horizon: profile.investment_horizon,
    max_acceptable_loss: profile.max_acceptable_loss,
    financial_resilience_months: profile.financial_resilience_months,
    income_stability: profile.income_stability,
  });

  // Determine archetype: use stored risk_profile if valid, otherwise use classification
  let archetype: StrategyArchetype = classification.archetype;
  if (profile.risk_profile) {
    // Map existing risk_profile to new archetype system
    const profileLower = profile.risk_profile.toLowerCase();
    if (profileLower.includes('prudent') || profileLower.includes('défensif')) {
      archetype = 'Defensive';
    } else if (profileLower.includes('dynamique') || profileLower.includes('growth')) {
      archetype = 'Growth';
    } else if (profileLower.includes('très dynamique') || profileLower.includes('high')) {
      archetype = 'HighVolatility';
    } else if (profileLower.includes('neutre') || profileLower.includes('équilibré') || profileLower.includes('balanced')) {
      archetype = 'Balanced';
    }
  }

  // Get thresholds: prefer user-customized values, fall back to archetype defaults
  const archetypeDefaults = getArchetypeThresholds(archetype);
  const thresholds: StrategyThresholds = {
    cash_target_pct: profile.cash_target_pct ?? archetypeDefaults.cash_target_pct,
    max_position_pct: profile.max_position_pct ?? archetypeDefaults.max_position_pct,
    max_asset_class_pct: profile.max_asset_class_pct ?? archetypeDefaults.max_asset_class_pct,
  };

  return {
    thresholds,
    archetype,
    archetypeLabel: ARCHETYPE_LABELS[archetype],
    classification,
    profileExists: true,
    profileComplete,
    needsOnboarding: !profileComplete,
    rawProfile: profile,
  };
}

export function useUserStrategy() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...queryKeys.userProfile(user?.id ?? ''), 'strategy'],
    queryFn: () => fetchUserProfile(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  const strategy = processStrategy(query.data ?? null);

  // Invalidate related queries after strategy changes
  const invalidateRelatedQueries = async () => {
    if (!user) return;
    
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(user.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.diversification(user.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.insights(user.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.decisions(user.id) }),
    ]);
  };

  // Save updated thresholds to user_profile
  const saveThresholds = async (newThresholds: Partial<StrategyThresholds>) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('user_profile')
      .update({
        ...newThresholds,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) throw error;
    
    await invalidateRelatedQueries();
  };

  // Reset thresholds to archetype defaults
  const resetToDefaults = async () => {
    const defaults = getArchetypeThresholds(strategy.archetype);
    await saveThresholds(defaults);
  };

  return {
    loading: query.isLoading,
    error: query.error?.message ?? null,
    strategy,
    refetch: query.refetch,
    saveThresholds,
    resetToDefaults,
    invalidateRelatedQueries,
  };
}
