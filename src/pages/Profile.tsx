import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";

import { ObjectivesSection } from "@/components/profile/ObjectivesSection";
import { PersonalInfoSection } from "@/components/profile/PersonalInfoSection";
import { FinancialSituationSection } from "@/components/profile/FinancialSituationSection";
import { InvestorProfileSection } from "@/components/profile/InvestorProfileSection";
import { BehavioralSection } from "@/components/profile/BehavioralSection";
import { PreferencesSection } from "@/components/profile/PreferencesSection";
import { CommitmentSection } from "@/components/profile/CommitmentSection";
import { calculateRiskProfile } from "@/lib/calculateRiskProfile";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

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
      score_total: 0,
      score_tolerance: 0,
      score_capacity: 0,
      score_behavior: 0,
      score_horizon: 0,
      score_knowledge: 0,
      risk_profile: "",
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
    }

    setLoading(false);
  };

  const saveProfile = async (data: any) => {
    if (!user) return;

    setSaving(true);
    
    // Debug: afficher les données du formulaire
    console.log("Form data:", data);
    
    // Calculer le profil de risque
    const riskProfile = calculateRiskProfile(data);
    
    // Debug: afficher le résultat du scoring
    console.log("Risk profile calculated:", riskProfile);
    
    const profileData = {
      ...data,
      ...riskProfile,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("user_profile")
      .upsert(profileData, { onConflict: "user_id" });

    if (error) {
      console.error("Error saving profile:", error);
      toast.error("Erreur lors de l'enregistrement");
    } else {
      // Mettre à jour immédiatement le formulaire avec les scores calculés
      form.reset({
        ...data,
        ...riskProfile,
      });

      toast.success(`Profil enregistré avec succès ! 🎉 Profil de risque: ${riskProfile.risk_profile}`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (profileExists) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <Card className="p-8 border-primary/20">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 className="text-success" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Profil Complété</h1>
              <p className="text-muted-foreground">Ton profil investisseur a été enregistré</p>
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <div className="space-y-6">
              {/* Profil de risque */}
              <div className="p-6 bg-primary/10 rounded-lg border border-primary/20">
                <h3 className="text-xl font-bold text-primary mb-2">
                  {form.getValues().risk_profile || "Non calculé"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">Score total: {form.getValues().score_total || 0}/100</p>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tolérance:</span>
                    <span className="ml-2 font-medium">{form.getValues().score_tolerance || 0}/30</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Capacité:</span>
                    <span className="ml-2 font-medium">{form.getValues().score_capacity || 0}/25</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Comportement:</span>
                    <span className="ml-2 font-medium">{form.getValues().score_behavior || 0}/25</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Horizon:</span>
                    <span className="ml-2 font-medium">{form.getValues().score_horizon || 0}/10</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Connaissances:</span>
                    <span className="ml-2 font-medium">{form.getValues().score_knowledge || 0}/10</span>
                  </div>
                </div>
              </div>

              {/* Informations personnelles */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Prénom</p>
                  <p className="text-foreground font-medium">{form.getValues("first_name") || "Non renseigné"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Âge</p>
                  <p className="text-foreground font-medium">{form.getValues("age") || "Non renseigné"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Horizon d'investissement</p>
                  <p className="text-foreground font-medium">
                    {form.getValues("investment_horizon") || "Non renseigné"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tolérance au risque</p>
                  <p className="text-foreground font-medium">
                    {form.getValues("max_acceptable_loss") || "Non renseigné"}
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={() => setProfileExists(false)} variant="outline" className="w-full mt-6">
              Modifier mon profil
            </Button>
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
                      Enregistrement...
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
