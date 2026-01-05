/**
 * Hook for accessing investor profile and thresholds
 * Single source of truth for all diversification/decision/insights systems
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import {
  computeInvestorProfile,
  getProfileThresholds,
  mapLegacyProfile,
  InvestorProfile,
  ProfileThresholds,
  ProfileResult,
  PROFILE_LABELS,
  PROFILE_DESCRIPTIONS,
  OnboardingAnswers,
} from '@/lib/investorProfileEngine';

export interface UserThresholds {
  // Effective thresholds (user customized or defaults)
  cashTargetPct: number;
  maxStockPositionPct: number;
  maxEtfPositionPct: number;
  maxAssetClassPct: number;
  targetScoreMin: number;
  targetScoreMax: number;
}

export interface InvestorProfileState {
  // Profile info
  profile: InvestorProfile;
  profileLabel: string;
  profileDescription: string;
  
  // Computed profile result (if available)
  profileResult: ProfileResult | null;
  
  // Effective thresholds (considering user overrides)
  thresholds: UserThresholds;
  
  // Default thresholds for current profile
  defaultThresholds: ProfileThresholds;
  
  // Status
  profileExists: boolean;
  profileComplete: boolean;
  needsOnboarding: boolean;
  
  // Raw profile data
  rawProfile: RawProfile | null;
}

interface RawProfile {
  id: string;
  user_id: string;
  // Onboarding answers
  investment_horizon: string | null;
  max_acceptable_loss: string | null;
  financial_resilience_months: string | null;
  income_stability: string | null;
  reaction_to_volatility: string | null;
  risk_vision: string | null;
  investment_experience: string | null;
  available_time: string | null;
  management_style: string | null;
  main_project: string | null;
  // Stored profile
  risk_profile: string | null;
  // User-customized thresholds
  cash_target_pct: number | null;
  max_position_pct: number | null;
  max_asset_class_pct: number | null;
  // Personal info
  first_name: string | null;
  age: number | null;
}

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
      reaction_to_volatility,
      risk_vision,
      investment_experience,
      available_time,
      management_style,
      main_project,
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

function processInvestorProfile(rawProfile: RawProfile | null): InvestorProfileState {
  // No profile exists
  if (!rawProfile) {
    const defaultProfile: InvestorProfile = 'Équilibré';
    const defaults = getProfileThresholds(defaultProfile);
    
    return {
      profile: defaultProfile,
      profileLabel: PROFILE_LABELS[defaultProfile],
      profileDescription: PROFILE_DESCRIPTIONS[defaultProfile],
      profileResult: null,
      thresholds: {
        cashTargetPct: (defaults.cashTargetPct.min + defaults.cashTargetPct.max) / 2,
        maxStockPositionPct: defaults.maxStockPositionPct,
        maxEtfPositionPct: defaults.maxEtfPositionPct,
        maxAssetClassPct: defaults.maxAssetClassPct,
        targetScoreMin: defaults.targetScoreRange.min,
        targetScoreMax: defaults.targetScoreRange.max,
      },
      defaultThresholds: defaults,
      profileExists: false,
      profileComplete: false,
      needsOnboarding: true,
      rawProfile: null,
    };
  }

  // Check completeness - need at least key questions
  const hasHorizon = !!rawProfile.investment_horizon;
  const hasLossTolerance = !!rawProfile.max_acceptable_loss || !!rawProfile.reaction_to_volatility;
  const hasResilience = !!rawProfile.financial_resilience_months;
  const profileComplete = hasHorizon && hasLossTolerance;

  // Build answers for profile computation
  const answers: OnboardingAnswers = {
    portfolioShare: undefined, // Not yet collected
    emergencyFund: rawProfile.financial_resilience_months || undefined,
    incomeStability: rawProfile.income_stability || undefined,
    investmentHorizon: rawProfile.investment_horizon || undefined,
    mainObjective: rawProfile.main_project || undefined,
    reactionToLoss: rawProfile.reaction_to_volatility || rawProfile.max_acceptable_loss || undefined,
    riskVision: rawProfile.risk_vision || undefined,
    experienceLevel: rawProfile.investment_experience || undefined,
    timeCommitment: rawProfile.available_time || undefined,
    preferredStyle: rawProfile.management_style || undefined,
    concentrationAcceptance: undefined, // Not yet collected
  };

  // Compute profile from answers
  let profileResult: ProfileResult | null = null;
  let profile: InvestorProfile;

  if (profileComplete) {
    profileResult = computeInvestorProfile(answers);
    profile = profileResult.profile;
  } else {
    // Use legacy mapping if available
    profile = mapLegacyProfile(rawProfile.risk_profile);
  }

  const defaults = getProfileThresholds(profile);

  // Build effective thresholds (user overrides or defaults)
  const thresholds: UserThresholds = {
    cashTargetPct: rawProfile.cash_target_pct ?? 
      (defaults.cashTargetPct.min + defaults.cashTargetPct.max) / 2,
    // max_position_pct in DB is for stocks; ETFs get their own threshold
    maxStockPositionPct: rawProfile.max_position_pct ?? defaults.maxStockPositionPct,
    maxEtfPositionPct: defaults.maxEtfPositionPct, // No override in DB yet
    maxAssetClassPct: rawProfile.max_asset_class_pct ?? defaults.maxAssetClassPct,
    targetScoreMin: defaults.targetScoreRange.min,
    targetScoreMax: defaults.targetScoreRange.max,
  };

  return {
    profile,
    profileLabel: PROFILE_LABELS[profile],
    profileDescription: PROFILE_DESCRIPTIONS[profile],
    profileResult,
    thresholds,
    defaultThresholds: defaults,
    profileExists: true,
    profileComplete,
    needsOnboarding: !profileComplete,
    rawProfile,
  };
}

export function useInvestorProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...queryKeys.userProfile(user?.id ?? ''), 'investorProfile'],
    queryFn: () => fetchUserProfile(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const state = processInvestorProfile(query.data ?? null);

  // Invalidate related queries after profile changes
  const invalidateRelatedQueries = async () => {
    if (!user) return;
    
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(user.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.diversification(user.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.insights(user.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.decisions(user.id) }),
    ]);
  };

  // Save custom thresholds
  const saveThresholds = async (updates: Partial<{
    cashTargetPct: number;
    maxStockPositionPct: number;
    maxAssetClassPct: number;
  }>) => {
    if (!user) throw new Error('User not authenticated');

    const dbUpdates: Record<string, number | string> = {
      updated_at: new Date().toISOString(),
    };
    
    if (updates.cashTargetPct !== undefined) {
      dbUpdates.cash_target_pct = updates.cashTargetPct;
    }
    if (updates.maxStockPositionPct !== undefined) {
      dbUpdates.max_position_pct = updates.maxStockPositionPct;
    }
    if (updates.maxAssetClassPct !== undefined) {
      dbUpdates.max_asset_class_pct = updates.maxAssetClassPct;
    }

    const { error } = await supabase
      .from('user_profile')
      .update(dbUpdates)
      .eq('user_id', user.id);

    if (error) throw error;
    
    await invalidateRelatedQueries();
  };

  // Reset thresholds to profile defaults
  const resetToDefaults = async () => {
    const defaults = state.defaultThresholds;
    await saveThresholds({
      cashTargetPct: (defaults.cashTargetPct.min + defaults.cashTargetPct.max) / 2,
      maxStockPositionPct: defaults.maxStockPositionPct,
      maxAssetClassPct: defaults.maxAssetClassPct,
    });
  };

  return {
    loading: query.isLoading,
    error: query.error?.message ?? null,
    ...state,
    refetch: query.refetch,
    saveThresholds,
    resetToDefaults,
    invalidateRelatedQueries,
  };
}

// Re-export for convenience
export type { InvestorProfile, ProfileThresholds, ProfileResult, OnboardingAnswers };
export { PROFILE_LABELS, PROFILE_DESCRIPTIONS, getProfileThresholds, getAllProfiles } from '@/lib/investorProfileEngine';
