import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

import { ObjectivesSection } from "@/components/profile/ObjectivesSection";
import { PersonalInfoSection } from "@/components/profile/PersonalInfoSection";
import { FinancialSituationSection } from "@/components/profile/FinancialSituationSection";
import { InvestorProfileSection } from "@/components/profile/InvestorProfileSection";
import { BehavioralSection } from "@/components/profile/BehavioralSection";
import { PreferencesSection } from "@/components/profile/PreferencesSection";
import { CommitmentSection } from "@/components/profile/CommitmentSection";
import { 
  computeInvestorProfile, 
  PROFILE_LABELS, 
  PROFILE_DESCRIPTIONS,
  OnboardingAnswers 
} from "@/lib/investorProfileEngine";

const STEPS = [
  { id: "objectives", label: "Objectifs", component: ObjectivesSection },
  { id: "personal", label: "Qui tu es", component: PersonalInfoSection },
  { id: "financial", label: "Ton argent", component: FinancialSituationSection },
  { id: "investor", label: "Profil investisseur", component: InvestorProfileSection },
  { id: "behavioral", label: "Comportement", component: BehavioralSection },
  { id: "preferences", label: "Préférences", component: PreferencesSection },
  { id: "commitment", label: "Engagement", component: CommitmentSection },
];

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const queryClient = useQueryClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [computedProfile, setComputedProfile] = useState<ReturnType<typeof computeInvestorProfile> | null>(null);

  const form = useForm({
    defaultValues: {
      priorities: [],
      main_project: "",
      project_budget: 0,
      project_horizon_months: 0,
      first_name: "",
      age: 0,
      city: "",
      current_situation: "",
      housing_situation: "",
      monthly_income: [],
      monthly_expenses: [],
      remaining_monthly: 0,
      saveable_monthly: 0,
      current_savings: [],
      existing_investments: [],
      debts: [],
      knowledge_levels: {
        livrets: 1,
        etf: 1,
        actions: 1,
        crypto: 1,
        immobilier: 1,
        assurance_vie: 1,
      },
      investment_experience: "",
      risk_vision: "",
      max_acceptable_loss: "",
      investment_horizon: "",
      reaction_to_gains: "",
      reaction_to_volatility: "",
      fomo_tendency: "",
      panic_selling_history: false,
      regretted_purchases_history: false,
      emotional_stability: "",
      loss_impact: "",
      income_stability: "",
      financial_resilience_months: "",
      risk_percentage_on_main_goal: 0,
      management_style: "",
      available_time: "",
      learning_topics: [],
      upcoming_constraints: [],
      esg_importance: "",
      sectors_to_avoid: [],
      sectors_of_interest: [],
      ai_expectations: [],
      communication_tone: "",
      commitment_apply_advice: false,
      commitment_regular_learning: false,
      commitment_long_term_investing: false,
    },
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase.from("user_profile").select("*").eq("user_id", user.id).maybeSingle();

    if (error) {
      console.error("Error loading profile:", error);
      toast.error("Erreur lors du chargement du profil");
    } else if (data) {
      setProfileExists(true);
      // Convert JSONB fields to proper format
      const defaultKnowledge = {
        livrets: 1,
        etf: 1,
        actions: 1,
        crypto: 1,
        immobilier: 1,
        assurance_vie: 1,
      };
      
      form.reset({
        ...data,
        priorities: Array.isArray(data.priorities) ? data.priorities : [],
        monthly_income: Array.isArray(data.monthly_income) ? data.monthly_income : [],
        monthly_expenses: Array.isArray(data.monthly_expenses) ? data.monthly_expenses : [],
        current_savings: Array.isArray(data.current_savings) ? data.current_savings : [],
        existing_investments: Array.isArray(data.existing_investments) ? data.existing_investments : [],
        debts: Array.isArray(data.debts) ? data.debts : [],
        knowledge_levels:
          data.knowledge_levels && typeof data.knowledge_levels === "object"
            ? (data.knowledge_levels as any)
            : defaultKnowledge,
        learning_topics: Array.isArray(data.learning_topics) ? data.learning_topics : [],
        upcoming_constraints: Array.isArray(data.upcoming_constraints) ? data.upcoming_constraints : [],
        sectors_to_avoid: Array.isArray(data.sectors_to_avoid) ? data.sectors_to_avoid : [],
        sectors_of_interest: Array.isArray(data.sectors_of_interest) ? data.sectors_of_interest : [],
        ai_expectations: Array.isArray(data.ai_expectations) ? data.ai_expectations : [],
      });

      // Compute profile if we have data
      if (data.score_capacity_computed !== null) {
        // Profile already computed - load stored result
        setComputedProfile({
          profile: data.risk_profile as any || 'Équilibré',
          scores: {
            capacity: { name: 'Capacité', score: data.score_capacity_computed || 0, maxScore: 35, weight: 0.35, factors: [] },
            tolerance: { name: 'Tolérance', score: data.score_tolerance_computed || 0, maxScore: 35, weight: 0.35, factors: [] },
            objectives: { name: 'Objectifs', score: data.score_objectives_computed || 0, maxScore: 30, weight: 0.30, factors: [] },
            total: data.score_total_computed || 0,
          },
          thresholds: {} as any,
          confidence: (data.profile_confidence as 'high' | 'medium' | 'low') || 'medium',
          reasoning: [],
        });
      }
    }

    setLoading(false);
  };

  const buildOnboardingAnswers = (data: any): OnboardingAnswers => {
    return {
      portfolioShare: undefined,
      emergencyFund: data.financial_resilience_months || undefined,
      incomeStability: data.income_stability || undefined,
      investmentHorizon: data.investment_horizon || undefined,
      mainObjective: data.main_project || undefined,
      reactionToLoss: data.reaction_to_volatility || data.max_acceptable_loss || undefined,
      riskVision: data.risk_vision || undefined,
      experienceLevel: data.investment_experience || undefined,
      timeCommitment: data.available_time || undefined,
      preferredStyle: data.management_style || undefined,
      concentrationAcceptance: undefined,
    };
  };

  const saveProfile = async (data: any) => {
    if (!user) return;

    setSaving(true);
    
    // Build answers for new engine
    const answers = buildOnboardingAnswers(data);
    
    // Compute profile using unified engine
    const profileResult = computeInvestorProfile(answers);
    setComputedProfile(profileResult);
    
    const thresholds = profileResult.thresholds;
    
    const profileData = {
      ...data,
      user_id: user.id,
      // Store using new unified schema
      risk_profile: profileResult.profile,
      score_capacity_computed: profileResult.scores.capacity.score,
      score_tolerance_computed: profileResult.scores.tolerance.score,
      score_objectives_computed: profileResult.scores.objectives.score,
      score_total_computed: profileResult.scores.total,
      profile_confidence: profileResult.confidence,
      profile_computed_at: new Date().toISOString(),
      onboarding_answers: answers,
      // Set default thresholds from profile
      cash_target_pct: Math.round((thresholds.cashTargetPct.min + thresholds.cashTargetPct.max) / 2),
      max_position_pct: thresholds.maxStockPositionPct,
      max_asset_class_pct: thresholds.maxAssetClassPct,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("user_profile")
      .upsert(profileData, { onConflict: "user_id" });

    if (error) {
      console.error("Error saving profile:", error);
      toast.error("Erreur lors de l'enregistrement");
    } else {
      // Invalidate all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(user.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.diversification(user.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.insights(user.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.decisions(user.id) }),
      ]);

      toast.success(`Profil enregistré ! Profil: ${profileResult.profile}`);
      setProfileExists(true);
    }

    setSaving(false);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReturnToSettings = () => {
    navigate(returnTo || "/settings");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (profileExists && computedProfile) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <Card className="p-8 border-primary/20">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 className="text-green-500" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Profil Complété</h1>
              <p className="text-muted-foreground">Ton profil investisseur a été calculé</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Profil calculé */}
            <div className="p-6 bg-primary/10 rounded-lg border border-primary/20">
              <h3 className="text-xl font-bold text-primary mb-2">
                {PROFILE_LABELS[computedProfile.profile]}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {PROFILE_DESCRIPTIONS[computedProfile.profile]}
              </p>
              <p className="text-sm font-medium">
                Score total: {computedProfile.scores.total}/100
              </p>
              
              <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                <div className="p-3 bg-background/50 rounded">
                  <span className="text-muted-foreground">Capacité</span>
                  <p className="font-bold">{computedProfile.scores.capacity.score}/35</p>
                </div>
                <div className="p-3 bg-background/50 rounded">
                  <span className="text-muted-foreground">Tolérance</span>
                  <p className="font-bold">{computedProfile.scores.tolerance.score}/35</p>
                </div>
                <div className="p-3 bg-background/50 rounded">
                  <span className="text-muted-foreground">Objectifs</span>
                  <p className="font-bold">{computedProfile.scores.objectives.score}/30</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={() => setProfileExists(false)} variant="outline" className="flex-1">
                Modifier mon profil
              </Button>
              
              {returnTo && (
                <Button onClick={handleReturnToSettings} className="flex-1">
                  <ArrowLeft size={16} className="mr-2" />
                  Retour à Stratégie
                </Button>
              )}
              
              {!returnTo && (
                <Button onClick={() => navigate("/settings")} className="flex-1">
                  Voir mes seuils
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Ton Profil Investisseur</h1>
        <p className="text-muted-foreground">Complète ce questionnaire pour obtenir une stratégie personnalisée</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground font-medium">
            Étape {currentStep + 1}/{STEPS.length}
          </span>
        </div>
      </div>

      <Card className="p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(saveProfile)} className="space-y-8">
            <CurrentStepComponent form={form} />

            <div className="flex justify-between pt-6 border-t border-border">
              <Button type="button" variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
                Précédent
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext}>
                  Suivant
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Calcul en cours...
                    </>
                  ) : (
                    "Enregistrer mon profil"
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
