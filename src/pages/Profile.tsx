import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";

interface UserProfile {
  financial_goals?: string[];
  concrete_project?: string;
  investment_horizon?: string;
  current_status?: string;
  monthly_income?: number;
  monthly_expenses?: number;
  monthly_saving_capacity?: number;
  emergency_fund?: number;
  existing_investments?: string[];
  investment_experience?: string;
  risk_tolerance?: string;
  preferred_assets?: string[];
  responsible_investing?: boolean;
  investment_exclusions?: string[];
  learning_priorities?: string[];
  management_style?: string;
  time_commitment?: string;
  wants_reminders?: boolean;
  main_difficulty?: string;
  main_motivation?: string;
  planned_expenses?: string;
  one_year_goal?: string;
  five_year_goal?: string;
  financial_dream?: string;
  committed?: boolean;
}

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState("1");
  const [profileExists, setProfileExists] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  
  const [profile, setProfile] = useState<UserProfile>({
    financial_goals: [],
    existing_investments: [],
    preferred_assets: [],
    investment_exclusions: [],
    learning_priorities: [],
    responsible_investing: false,
    wants_reminders: false,
    committed: false,
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("user_profile")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setProfile(data);
        setProfileExists(true);
        setShowSummary(true);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const profileData = {
        user_id: user.id,
        ...profile,
      };

      const { error } = profileExists
        ? await supabase
            .from("user_profile")
            .update(profileData)
            .eq("user_id", user.id)
        : await supabase.from("user_profile").insert([profileData]);

      if (error) throw error;

      toast.success("Profil enregistré 🎉");
      setProfileExists(true);
      setShowSummary(true);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Erreur lors de l'enregistrement du profil");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof UserProfile, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: keyof UserProfile, item: string) => {
    const currentArray = (profile[field] as string[]) || [];
    const newArray = currentArray.includes(item)
      ? currentArray.filter((i) => i !== item)
      : [...currentArray, item];
    updateField(field, newArray);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showSummary && profileExists) {
    return (
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ton Profil Investisseur</h1>
            <p className="text-muted-foreground">Synthèse de ton profil</p>
          </div>
          <Button onClick={() => setShowSummary(false)} variant="outline">
            Modifier mon profil
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />
              <h3 className="text-lg font-semibold text-foreground">Profil</h3>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Tolérance au risque</p>
                <p className="text-foreground font-medium">{profile.risk_tolerance || "Non défini"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horizon d'investissement</p>
                <p className="text-foreground font-medium">{profile.investment_horizon || "Non défini"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expérience</p>
                <p className="text-foreground font-medium">{profile.investment_experience || "Non défini"}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Recommandation initiale</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ETF World</span>
                <span className="text-foreground font-medium">70%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Fonds Euro</span>
                <span className="text-foreground font-medium">20%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Crypto</span>
                <span className="text-foreground font-medium">10%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Cette allocation est indicative et basée sur ton profil de risque.
            </p>
          </Card>

          <Card className="p-6 space-y-4 md:col-span-2">
            <h3 className="text-lg font-semibold text-foreground">Tes objectifs</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Objectif à 1 an</p>
                <p className="text-foreground">{profile.one_year_goal || "Non défini"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Objectif à 5 ans</p>
                <p className="text-foreground">{profile.five_year_goal || "Non défini"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rêve financier</p>
                <p className="text-foreground">{profile.financial_dream || "Non défini"}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Ton Profil Investisseur</h1>
        <p className="text-muted-foreground">
          Complète ce questionnaire pour obtenir une stratégie personnalisée.
        </p>
      </div>

      <Tabs value={currentStep} onValueChange={setCurrentStep} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="1">1</TabsTrigger>
          <TabsTrigger value="2">2</TabsTrigger>
          <TabsTrigger value="3">3</TabsTrigger>
          <TabsTrigger value="4">4</TabsTrigger>
          <TabsTrigger value="5">5</TabsTrigger>
          <TabsTrigger value="6">6</TabsTrigger>
        </TabsList>

        {/* Section 1: Objectifs financiers */}
        <TabsContent value="1">
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Objectifs financiers</h2>
              <p className="text-sm text-muted-foreground">Étape 1/6</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Quels sont tes trois objectifs financiers prioritaires pour les 3 prochaines années ?</Label>
                <Textarea
                  placeholder="Ex: Constituer une épargne de sécurité, investir en bourse, préparer un voyage..."
                  value={profile.financial_goals?.join("\n") || ""}
                  onChange={(e) => updateField("financial_goals", e.target.value.split("\n").filter(Boolean))}
                  rows={4}
                />
              </div>

              <div>
                <Label>As-tu un projet concret ? (montant et échéance)</Label>
                <Textarea
                  placeholder="Ex: Voyage de 5000€ dans 2 ans, apport immobilier de 20000€ dans 5 ans..."
                  value={profile.concrete_project || ""}
                  onChange={(e) => updateField("concrete_project", e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label>Quel est ton horizon d'investissement ?</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {["Court terme (0-3 ans)", "Moyen terme (3-10 ans)", "Long terme (+10 ans)"].map((horizon) => (
                    <Button
                      key={horizon}
                      type="button"
                      variant={profile.investment_horizon === horizon ? "default" : "outline"}
                      onClick={() => updateField("investment_horizon", horizon)}
                      className="w-full"
                    >
                      {horizon}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setCurrentStep("2")}>
                Suivant <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Section 2: Situation actuelle */}
        <TabsContent value="2">
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Situation actuelle</h2>
              <p className="text-sm text-muted-foreground">Étape 2/6</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Quelle est ta situation actuelle ?</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {["Étudiant", "Alternance", "Salarié", "Entrepreneur", "Freelance", "Autre"].map((status) => (
                    <Button
                      key={status}
                      type="button"
                      variant={profile.current_status === status ? "default" : "outline"}
                      onClick={() => updateField("current_status", status)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Quels sont tes revenus mensuels moyens ? (€)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 2500"
                  value={profile.monthly_income || ""}
                  onChange={(e) => updateField("monthly_income", parseFloat(e.target.value))}
                />
              </div>

              <div>
                <Label>Quelles sont tes principales dépenses mensuelles ? (€)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 1500"
                  value={profile.monthly_expenses || ""}
                  onChange={(e) => updateField("monthly_expenses", parseFloat(e.target.value))}
                />
              </div>

              <div>
                <Label>Combien peux-tu épargner par mois sans que ce soit trop difficile ? (€)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 500"
                  value={profile.monthly_saving_capacity || ""}
                  onChange={(e) => updateField("monthly_saving_capacity", parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("1")}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
              <Button onClick={() => setCurrentStep("3")}>
                Suivant <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Section 3: Patrimoine et placements */}
        <TabsContent value="3">
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Patrimoine et placements</h2>
              <p className="text-sm text-muted-foreground">Étape 3/6</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Quelle somme veux-tu garder disponible à tout moment ? (€)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 5000"
                  value={profile.emergency_fund || ""}
                  onChange={(e) => updateField("emergency_fund", parseFloat(e.target.value))}
                />
              </div>

              <div>
                <Label>As-tu déjà des placements ?</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {["PEA", "Assurance-vie", "CTO", "Crypto", "Immobilier", "Livret A"].map((investment) => (
                    <div key={investment} className="flex items-center space-x-2">
                      <Checkbox
                        id={investment}
                        checked={profile.existing_investments?.includes(investment)}
                        onCheckedChange={() => toggleArrayItem("existing_investments", investment)}
                      />
                      <label htmlFor={investment} className="text-sm text-foreground cursor-pointer">
                        {investment}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Depuis combien de temps investis-tu ?</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {["Moins de 6 mois", "6 mois - 1 an", "1 an - 3 ans", "Plus de 3 ans"].map((exp) => (
                    <Button
                      key={exp}
                      type="button"
                      variant={profile.investment_experience === exp ? "default" : "outline"}
                      onClick={() => updateField("investment_experience", exp)}
                    >
                      {exp}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("2")}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
              <Button onClick={() => setCurrentStep("4")}>
                Suivant <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Section 4: Risque et profil */}
        <TabsContent value="4">
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Risque et profil</h2>
              <p className="text-sm text-muted-foreground">Étape 4/6</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Quelle est ta tolérance au risque ?</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {["Jusqu'à -10%", "Jusqu'à -20%", "Jusqu'à -30% ou plus"].map((risk) => (
                    <Button
                      key={risk}
                      type="button"
                      variant={profile.risk_tolerance === risk ? "default" : "outline"}
                      onClick={() => updateField("risk_tolerance", risk)}
                    >
                      {risk}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Quels types d'actifs t'intéressent le plus ?</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {["Actions", "ETF", "Crypto", "Immobilier", "Obligations", "Fonds Euro"].map((asset) => (
                    <div key={asset} className="flex items-center space-x-2">
                      <Checkbox
                        id={asset}
                        checked={profile.preferred_assets?.includes(asset)}
                        onCheckedChange={() => toggleArrayItem("preferred_assets", asset)}
                      />
                      <label htmlFor={asset} className="text-sm text-foreground cursor-pointer">
                        {asset}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Es-tu sensible à l'investissement responsable (écologie, social, éthique) ?</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <Button
                    type="button"
                    variant={profile.responsible_investing === true ? "default" : "outline"}
                    onClick={() => updateField("responsible_investing", true)}
                  >
                    Oui
                  </Button>
                  <Button
                    type="button"
                    variant={profile.responsible_investing === false ? "default" : "outline"}
                    onClick={() => updateField("responsible_investing", false)}
                  >
                    Non
                  </Button>
                </div>
              </div>

              <div>
                <Label>Qu'aimerais-tu éviter dans tes investissements ?</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {["Tabac", "Pétrole", "Armement", "Jeux d'argent", "Fast fashion", "Aucune exclusion"].map(
                    (exclusion) => (
                      <div key={exclusion} className="flex items-center space-x-2">
                        <Checkbox
                          id={exclusion}
                          checked={profile.investment_exclusions?.includes(exclusion)}
                          onCheckedChange={() => toggleArrayItem("investment_exclusions", exclusion)}
                        />
                        <label htmlFor={exclusion} className="text-sm text-foreground cursor-pointer">
                          {exclusion}
                        </label>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("3")}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
              <Button onClick={() => setCurrentStep("5")}>
                Suivant <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Section 5: Apprentissage et motivation */}
        <TabsContent value="5">
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Apprentissage et motivation</h2>
              <p className="text-sm text-muted-foreground">Étape 5/6</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Qu'aimerais-tu apprendre en priorité sur la finance et l'investissement ?</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {["Budget", "ETF", "Crypto", "Immobilier", "Fiscalité", "Stratégies avancées"].map((topic) => (
                    <div key={topic} className="flex items-center space-x-2">
                      <Checkbox
                        id={topic}
                        checked={profile.learning_priorities?.includes(topic)}
                        onCheckedChange={() => toggleArrayItem("learning_priorities", topic)}
                      />
                      <label htmlFor={topic} className="text-sm text-foreground cursor-pointer">
                        {topic}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Comment veux-tu gérer tes investissements ?</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {["Autonomie totale", "Avec accompagnement", "Gestion automatique"].map((style) => (
                    <Button
                      key={style}
                      type="button"
                      variant={profile.management_style === style ? "default" : "outline"}
                      onClick={() => updateField("management_style", style)}
                    >
                      {style}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Combien de temps peux-tu consacrer à la gestion de ton argent chaque semaine ?</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {["Moins de 30 min", "30 min - 1h", "1h - 2h", "Plus de 2h"].map((time) => (
                    <Button
                      key={time}
                      type="button"
                      variant={profile.time_commitment === time ? "default" : "outline"}
                      onClick={() => updateField("time_commitment", time)}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Souhaites-tu recevoir des rappels, alertes ou conseils réguliers ?</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <Button
                    type="button"
                    variant={profile.wants_reminders === true ? "default" : "outline"}
                    onClick={() => updateField("wants_reminders", true)}
                  >
                    Oui
                  </Button>
                  <Button
                    type="button"
                    variant={profile.wants_reminders === false ? "default" : "outline"}
                    onClick={() => updateField("wants_reminders", false)}
                  >
                    Non
                  </Button>
                </div>
              </div>

              <div>
                <Label>Quelle est ta plus grande difficulté aujourd'hui avec l'argent ?</Label>
                <Textarea
                  placeholder="Ex: Gérer mon budget, épargner régulièrement, comprendre les placements..."
                  value={profile.main_difficulty || ""}
                  onChange={(e) => updateField("main_difficulty", e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label>Qu'est-ce qui te motiverait le plus à progresser financièrement ?</Label>
                <Textarea
                  placeholder="Ex: Devenir libre financièrement, préparer ma retraite, acheter un bien..."
                  value={profile.main_motivation || ""}
                  onChange={(e) => updateField("main_motivation", e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("4")}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
              <Button onClick={() => setCurrentStep("6")}>
                Suivant <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Section 6: Vision long terme */}
        <TabsContent value="6">
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Vision long terme</h2>
              <p className="text-sm text-muted-foreground">Étape 6/6</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>As-tu des dépenses prévues dans les 12 prochains mois ?</Label>
                <Textarea
                  placeholder="Ex: Voyage de 3000€, voiture, déménagement..."
                  value={profile.planned_expenses || ""}
                  onChange={(e) => updateField("planned_expenses", e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label>Dans 1 an, quel objectif veux-tu avoir atteint ?</Label>
                <Textarea
                  placeholder="Ex: Avoir constitué une épargne de 10000€, investir 500€/mois..."
                  value={profile.one_year_goal || ""}
                  onChange={(e) => updateField("one_year_goal", e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label>Dans 5 ans, quelle situation financière aimerais-tu avoir ?</Label>
                <Textarea
                  placeholder="Ex: Avoir un patrimoine de 100000€, être propriétaire..."
                  value={profile.five_year_goal || ""}
                  onChange={(e) => updateField("five_year_goal", e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label>Ton rêve financier ultime, ce serait quoi ?</Label>
                <Textarea
                  placeholder="Ex: Liberté financière à 50 ans, ne plus avoir besoin de travailler..."
                  value={profile.financial_dream || ""}
                  onChange={(e) => updateField("financial_dream", e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label>Es-tu prêt à suivre des conseils réguliers et à investir de façon disciplinée ?</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <Button
                    type="button"
                    variant={profile.committed === true ? "default" : "outline"}
                    onClick={() => updateField("committed", true)}
                  >
                    Oui, je suis engagé
                  </Button>
                  <Button
                    type="button"
                    variant={profile.committed === false ? "default" : "outline"}
                    onClick={() => updateField("committed", false)}
                  >
                    Je préfère rester flexible
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep("5")}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer mon profil"
                )}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
