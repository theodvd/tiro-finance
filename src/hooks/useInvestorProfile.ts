/**
 * useInvestorProfile - Single Source of Truth for investor strategy
 * 
 * This hook is the ONLY interface for:
 * - Fetching investor profile and thresholds
 * - Computing and persisting profile scores
 * - Saving threshold overrides
 * - Triggering React Query invalidations
 * 
 * All other hooks (useUserStrategy, useUserProfile) are deprecated.
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import type { Json } from '@/integrations/supabase/types';
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

// ============= TYPES =============

export interface UserThresholds {
  cashTargetPct: number;
  maxStockPositionPct: number;
  maxEtfPositionPct: number;
  maxAssetClassPct: number;
  targetScoreMin: number;
  targetScoreMax: number;
}

export interface PersistedScores {
  capacity: number;
  tolerance: number;
  objectives: number;
  total: number;
}

export interface InvestorProfileState {
  // Profile identification
  profile: InvestorProfile;
  profileLabel: string;
  profileDescription: string;

  // Persisted scores (from DB, not recomputed)
  scores: PersistedScores | null;

  // Profile computation result (for detailed view)
  profileResult: ProfileResult | null;

  // Confidence
  confidence: 'high' | 'medium' | 'low';

  // Threshold mode (persisted)
  thresholdsMode: 'auto' | 'manual';

  // Effective thresholds (user overrides or defaults)
  thresholds: UserThresholds;

  // Default thresholds for current profile
  defaultThresholds: ProfileThresholds;

  // Status flags
  profileExists: boolean;
  profileComplete: boolean;
  needsOnboarding: boolean;
  profileComputedAt: Date | null;

  // Raw DB data
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
  // Stored profile result
  risk_profile: string | null;
  // Persisted computed scores
  score_capacity_computed: number | null;
  score_tolerance_computed: number | null;
  score_objectives_computed: number | null;
  score_total_computed: number | null;
  profile_confidence: string | null;
  profile_computed_at: string | null;
  onboarding_answers: unknown; // JSON type from Supabase
  // User-customized thresholds
  cash_target_pct: number | null;
  max_position_pct: number | null;
  max_etf_position_pct: number | null;
  max_asset_class_pct: number | null;
  thresholds_mode: string | null;
  // Personal info
  first_name: string | null;
  age: number | null;
}

// ============= DATA FETCHING =============

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
      score_capacity_computed,
      score_tolerance_computed,
      score_objectives_computed,
      score_total_computed,
      profile_confidence,
      profile_computed_at,
      onboarding_answers,
      cash_target_pct,
      max_position_pct,
      max_etf_position_pct,
      max_asset_class_pct,
      thresholds_mode,
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

async function ensureProfileExists(userId: string): Promise<void> {
  // Check if profile exists
  const { data } = await supabase
    .from('user_profile')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (!data) {
    // Create a minimal profile row
    const { error } = await supabase
      .from('user_profile')
      .insert({
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    
    if (error && !error.message.includes('duplicate')) {
      console.error('Error creating user profile:', error);
    }
  }
}

// ============= PROCESSING =============

function buildAnswersFromProfile(raw: RawProfile): OnboardingAnswers {
  // Use stored answers if available, otherwise reconstruct from individual fields
  if (raw.onboarding_answers && typeof raw.onboarding_answers === 'object') {
    return raw.onboarding_answers as OnboardingAnswers;
  }

  return {
    portfolioShare: undefined,
    emergencyFund: raw.financial_resilience_months || undefined,
    incomeStability: raw.income_stability || undefined,
    investmentHorizon: raw.investment_horizon || undefined,
    mainObjective: raw.main_project || undefined,
    reactionToLoss: raw.reaction_to_volatility || raw.max_acceptable_loss || undefined,
    riskVision: raw.risk_vision || undefined,
    experienceLevel: raw.investment_experience || undefined,
    timeCommitment: raw.available_time || undefined,
    preferredStyle: raw.management_style || undefined,
    concentrationAcceptance: undefined,
  };
}

async function repairComputedProfileIfNeeded(userId: string, raw: RawProfile | null): Promise<RawProfile | null> {
  if (!raw) return raw;

  const profileComplete =
    !!raw.investment_horizon && (!!raw.max_acceptable_loss || !!raw.reaction_to_volatility);

  const hasAnyAnswers = !!raw.onboarding_answers && typeof raw.onboarding_answers === 'object';

  const computedLooksMissing =
    raw.score_capacity_computed === null ||
    raw.score_tolerance_computed === null ||
    raw.score_objectives_computed === null;

  const computedLooksInvalid =
    raw.score_capacity_computed === 0 &&
    raw.score_tolerance_computed === 0 &&
    raw.score_objectives_computed === 0;

  if (!profileComplete || !hasAnyAnswers || (!computedLooksMissing && !computedLooksInvalid)) {
    return raw;
  }

  const answers = buildAnswersFromProfile(raw);
  const result = computeInvestorProfile(answers);

  const { error } = await supabase
    .from('user_profile')
    .update({
      risk_profile: result.profile,
      score_capacity_computed: result.scores.capacity.score,
      score_tolerance_computed: result.scores.tolerance.score,
      score_objectives_computed: result.scores.objectives.score,
      score_total_computed: result.scores.total,
      profile_confidence: result.confidence,
      profile_computed_at: new Date().toISOString(),
      onboarding_answers: answers as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) throw error;

  return {
    ...raw,
    risk_profile: result.profile,
    score_capacity_computed: result.scores.capacity.score,
    score_tolerance_computed: result.scores.tolerance.score,
    score_objectives_computed: result.scores.objectives.score,
    score_total_computed: result.scores.total,
    profile_confidence: result.confidence,
    profile_computed_at: new Date().toISOString(),
    onboarding_answers: answers as Json,
  };
}

function processInvestorProfile(rawProfile: RawProfile | null): InvestorProfileState {
  // No profile exists - return defaults
  if (!rawProfile) {
    const defaultProfile: InvestorProfile = 'Équilibré';
    const defaults = getProfileThresholds(defaultProfile);
    
    return {
      profile: defaultProfile,
      profileLabel: PROFILE_LABELS[defaultProfile],
      profileDescription: PROFILE_DESCRIPTIONS[defaultProfile],
      scores: null,
      profileResult: null,
      confidence: 'low',
      thresholdsMode: 'auto',
      thresholds: {
        cashTargetPct: Math.round((defaults.cashTargetPct.min + defaults.cashTargetPct.max) / 2),
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
      profileComputedAt: null,
      rawProfile: null,
    };
  }

  // Check profile completeness
  const hasHorizon = !!rawProfile.investment_horizon;
  const hasLossTolerance = !!rawProfile.max_acceptable_loss || !!rawProfile.reaction_to_volatility;
  const profileComplete = hasHorizon && hasLossTolerance;

  // Determine profile: use stored risk_profile (already computed) or map from legacy
  let profile: InvestorProfile;
  let profileResult: ProfileResult | null = null;
  let scores: PersistedScores | null = null;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // Use persisted computed data if available
  if (rawProfile.score_capacity_computed !== null && 
      rawProfile.score_tolerance_computed !== null &&
      rawProfile.score_objectives_computed !== null) {
    scores = {
      capacity: rawProfile.score_capacity_computed,
      tolerance: rawProfile.score_tolerance_computed,
      objectives: rawProfile.score_objectives_computed,
      total: rawProfile.score_total_computed || 0,
    };
    confidence = (rawProfile.profile_confidence as 'high' | 'medium' | 'low') || 'medium';
  }

  // Determine profile from stored value
  if (rawProfile.risk_profile) {
    profile = mapLegacyProfile(rawProfile.risk_profile);
  } else if (profileComplete) {
    // Compute on-the-fly if we have answers but no stored profile
    const answers = buildAnswersFromProfile(rawProfile);
    profileResult = computeInvestorProfile(answers);
    profile = profileResult.profile;
    confidence = profileResult.confidence;
    
    // Also extract scores from computation
    if (!scores) {
      scores = {
        capacity: profileResult.scores.capacity.score,
        tolerance: profileResult.scores.tolerance.score,
        objectives: profileResult.scores.objectives.score,
        total: profileResult.scores.total,
      };
    }
  } else {
    profile = 'Équilibré';
  }

  const defaults = getProfileThresholds(profile);

  const thresholdsMode: 'auto' | 'manual' = rawProfile.thresholds_mode === 'manual' ? 'manual' : 'auto';

  // Build effective thresholds
  // - auto: use profile defaults
  // - manual: use persisted overrides (fallback to defaults)
  const thresholds: UserThresholds = thresholdsMode === 'manual'
    ? {
        cashTargetPct:
          rawProfile.cash_target_pct ??
          Math.round((defaults.cashTargetPct.min + defaults.cashTargetPct.max) / 2),
        maxStockPositionPct: rawProfile.max_position_pct ?? defaults.maxStockPositionPct,
        maxEtfPositionPct: rawProfile.max_etf_position_pct ?? defaults.maxEtfPositionPct,
        maxAssetClassPct: rawProfile.max_asset_class_pct ?? defaults.maxAssetClassPct,
        targetScoreMin: defaults.targetScoreRange.min,
        targetScoreMax: defaults.targetScoreRange.max,
      }
    : {
        cashTargetPct: Math.round((defaults.cashTargetPct.min + defaults.cashTargetPct.max) / 2),
        maxStockPositionPct: defaults.maxStockPositionPct,
        maxEtfPositionPct: defaults.maxEtfPositionPct,
        maxAssetClassPct: defaults.maxAssetClassPct,
        targetScoreMin: defaults.targetScoreRange.min,
        targetScoreMax: defaults.targetScoreRange.max,
      };

  return {
    profile,
    profileLabel: PROFILE_LABELS[profile],
    profileDescription: PROFILE_DESCRIPTIONS[profile],
    scores,
    profileResult,
    confidence,
    thresholdsMode,
    thresholds,
    defaultThresholds: defaults,
    profileExists: true,
    profileComplete,
    needsOnboarding: !profileComplete,
    profileComputedAt: rawProfile.profile_computed_at ? new Date(rawProfile.profile_computed_at) : null,
    rawProfile,
  };
}

// ============= HOOK =============

export function useInvestorProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Main query - fetch profile
  const query = useQuery({
    queryKey: [...queryKeys.userProfile(user?.id ?? ''), 'investorProfile'],
    queryFn: async () => {
      if (!user) return null;
      // Ensure profile exists first
      await ensureProfileExists(user.id);
      const raw = await fetchUserProfile(user.id);
      return repairComputedProfileIfNeeded(user.id, raw);
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 30 * 60 * 1000,
  });

  const state = processInvestorProfile(query.data ?? null);

  // Invalidate all related queries
  const invalidateRelatedQueries = async () => {
    if (!user) return;
    
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(user.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.diversification(user.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.insights(user.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.decisions(user.id) }),
    ]);
  };

  // Mutation: Save thresholds (overrides)
  const saveThresholdsMutation = useMutation({
    mutationFn: async (updates: Partial<{
      cashTargetPct: number;
      maxStockPositionPct: number;
      maxEtfPositionPct: number;
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
      if (updates.maxEtfPositionPct !== undefined) {
        dbUpdates.max_etf_position_pct = updates.maxEtfPositionPct;
      }
      if (updates.maxAssetClassPct !== undefined) {
        dbUpdates.max_asset_class_pct = updates.maxAssetClassPct;
      }

      const { error } = await supabase
        .from('user_profile')
        .update(dbUpdates)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateRelatedQueries();
    },
  });

  // Mutation: Set thresholds mode (auto/manual)
  const setThresholdsModeMutation = useMutation({
    mutationFn: async (mode: 'auto' | 'manual') => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_profile')
        .update({
          thresholds_mode: mode,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateRelatedQueries();
    },
  });

  // Mutation: Recompute profile from answers
  const recomputeProfileMutation = useMutation({
    mutationFn: async (answers: OnboardingAnswers) => {
      if (!user) throw new Error('User not authenticated');

      // Compute profile
      const result = computeInvestorProfile(answers);
      const thresholds = result.thresholds;

      // Persist everything
      const profileData: Record<string, unknown> = {
        investment_horizon: answers.investmentHorizon || null,
        financial_resilience_months: answers.emergencyFund || null,
        income_stability: answers.incomeStability || null,
        reaction_to_volatility: answers.reactionToLoss || null,
        risk_vision: answers.riskVision || null,
        investment_experience: answers.experienceLevel || null,
        available_time: answers.timeCommitment || null,
        management_style: answers.preferredStyle || null,
        main_project: answers.mainObjective || null,
        risk_profile: result.profile,
        score_capacity_computed: result.scores.capacity.score,
        score_tolerance_computed: result.scores.tolerance.score,
        score_objectives_computed: result.scores.objectives.score,
        score_total_computed: result.scores.total,
        profile_confidence: result.confidence,
        profile_computed_at: new Date().toISOString(),
        onboarding_answers: answers as Json,
        cash_target_pct: Math.round((thresholds.cashTargetPct.min + thresholds.cashTargetPct.max) / 2),
        max_position_pct: thresholds.maxStockPositionPct,
        max_asset_class_pct: thresholds.maxAssetClassPct,
        updated_at: new Date().toISOString(),
      };

      // Try update first
      const { data: existing } = await supabase
        .from('user_profile')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let dbError;
      if (existing) {
        const updateResult = await supabase
          .from('user_profile')
          .update(profileData as never)
          .eq('user_id', user.id);
        dbError = updateResult.error;
      } else {
        const insertResult = await supabase
          .from('user_profile')
          .insert({ user_id: user.id, ...profileData } as never);
        dbError = insertResult.error;
      }

      if (dbError) throw dbError;

      return result;
    },
    onSuccess: () => {
      invalidateRelatedQueries();
    },
  });

  // Reset thresholds to profile defaults
  const resetToDefaults = async () => {
    const defaults = state.defaultThresholds;
    await saveThresholdsMutation.mutateAsync({
      cashTargetPct: Math.round((defaults.cashTargetPct.min + defaults.cashTargetPct.max) / 2),
      maxStockPositionPct: defaults.maxStockPositionPct,
      maxEtfPositionPct: defaults.maxEtfPositionPct,
      maxAssetClassPct: defaults.maxAssetClassPct,
    });
  };

  // Wrapper for saving thresholds
  const saveThresholds = async (updates: Partial<{
    cashTargetPct: number;
    maxStockPositionPct: number;
    maxEtfPositionPct: number;
    maxAssetClassPct: number;
  }>) => {
    await saveThresholdsMutation.mutateAsync(updates);
  };

  // Wrapper for recomputing profile
  const recomputeProfile = async (answers: OnboardingAnswers) => {
    return recomputeProfileMutation.mutateAsync(answers);
  };

  const setThresholdsMode = async (mode: 'auto' | 'manual') => {
    await setThresholdsModeMutation.mutateAsync(mode);
  };

  return {
    // Loading states
    loading: query.isLoading,
    saving:
      saveThresholdsMutation.isPending ||
      setThresholdsModeMutation.isPending ||
      recomputeProfileMutation.isPending,
    error: query.error?.message ?? null,

    // Profile state
    ...state,

    // Actions
    refetch: query.refetch,
    saveThresholds,
    resetToDefaults,
    recomputeProfile,
    setThresholdsMode,
    invalidateRelatedQueries,
  };
}

// Re-export types and utilities
export type { InvestorProfile, ProfileThresholds, ProfileResult, OnboardingAnswers };
export { PROFILE_LABELS, PROFILE_DESCRIPTIONS, getProfileThresholds, getAllProfiles } from '@/lib/investorProfileEngine';
