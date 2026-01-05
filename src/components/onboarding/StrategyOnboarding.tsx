/**
 * Comprehensive onboarding wizard for investor profile
 * 
 * Collects data across 3 dimensions (MIFID II aligned):
 * - Capacity (financial situation)
 * - Tolerance (behavioral/emotional)  
 * - Objectives (horizon + goals)
 * Plus knowledge & preferences
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { computeInvestorProfile, PROFILE_LABELS, PROFILE_DESCRIPTIONS } from '@/lib/investorProfileEngine';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  ArrowRight, ArrowLeft, Loader2, 
  Shield, Scale, TrendingUp, Rocket, Target,
  Wallet, Brain, Clock, BookOpen
} from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

interface OnboardingAnswers {
  // A. Capacity
  portfolioShare: string;
  emergencyFund: string;
  incomeStability: string;
  // B. Objectives
  investmentHorizon: string;
  mainObjective: string;
  // C. Tolerance
  reactionToLoss: string;
  riskVision: string;
  // D. Knowledge
  experienceLevel: string;
  timeCommitment: string;
  // E. Preferences
  preferredStyle: string;
  concentrationAcceptance: string;
}

interface Question {
  id: keyof OnboardingAnswers;
  section: 'capacity' | 'objectives' | 'tolerance' | 'knowledge' | 'preferences';
  sectionLabel: string;
  sectionIcon: typeof Shield;
  title: string;
  subtitle: string;
  options: Array<{
    value: string;
    label: string;
    description: string;
  }>;
}

const QUESTIONS: Question[] = [
  // A. CAPACITY
  {
    id: 'portfolioShare',
    section: 'capacity',
    sectionLabel: 'Situation financière',
    sectionIcon: Wallet,
    title: 'Quelle part de ton patrimoine représente ce portefeuille ?',
    subtitle: 'Cela nous aide à évaluer ta capacité objective à prendre des risques.',
    options: [
      { value: '< 20%', label: 'Moins de 20%', description: 'Faible part' },
      { value: '20-50%', label: '20% à 50%', description: 'Part modérée' },
      { value: '> 50%', label: 'Plus de 50%', description: 'Part importante' },
    ],
  },
  {
    id: 'emergencyFund',
    section: 'capacity',
    sectionLabel: 'Situation financière',
    sectionIcon: Wallet,
    title: 'As-tu une épargne de précaution disponible immédiatement ?',
    subtitle: 'Hors investissements, combien de mois de dépenses as-tu de côté ?',
    options: [
      { value: '< 3 mois', label: 'Moins de 3 mois', description: 'Épargne limitée' },
      { value: '3-6 mois', label: '3 à 6 mois', description: 'Épargne correcte' },
      { value: '> 6 mois', label: 'Plus de 6 mois', description: 'Bonne épargne' },
    ],
  },
  {
    id: 'incomeStability',
    section: 'capacity',
    sectionLabel: 'Situation financière',
    sectionIcon: Wallet,
    title: 'Tes revenus sont-ils stables ?',
    subtitle: 'La stabilité de tes revenus influence ta capacité à prendre des risques.',
    options: [
      { value: 'Instables', label: 'Instables', description: 'Freelance, intérim' },
      { value: 'Variables', label: 'Variables', description: 'Commissions, primes' },
      { value: 'Stables', label: 'Stables', description: 'CDI, fonctionnaire' },
      { value: 'Très stables', label: 'Très stables', description: 'Revenus multiples' },
    ],
  },
  // B. OBJECTIVES
  {
    id: 'investmentHorizon',
    section: 'objectives',
    sectionLabel: 'Horizon & Objectifs',
    sectionIcon: Clock,
    title: 'Quand penses-tu avoir besoin de cet argent ?',
    subtitle: 'Ton horizon d\'investissement influence les risques que tu peux prendre.',
    options: [
      { value: '< 3 ans', label: 'Moins de 3 ans', description: 'Court terme' },
      { value: '3-8 ans', label: '3 à 8 ans', description: 'Moyen terme' },
      { value: '> 8 ans', label: 'Plus de 8 ans', description: 'Long terme' },
    ],
  },
  {
    id: 'mainObjective',
    section: 'objectives',
    sectionLabel: 'Horizon & Objectifs',
    sectionIcon: Clock,
    title: 'Quel est ton objectif principal ?',
    subtitle: 'Choisis ce qui te motive le plus dans l\'investissement.',
    options: [
      { value: 'Préserver le capital', label: 'Préserver le capital', description: 'Sécurité avant tout' },
      { value: 'Faire croître le patrimoine', label: 'Croissance du patrimoine', description: 'Équilibre risque/rendement' },
      { value: 'Maximiser la performance', label: 'Performance maximale', description: 'Accepter la volatilité' },
    ],
  },
  // C. TOLERANCE
  {
    id: 'reactionToLoss',
    section: 'tolerance',
    sectionLabel: 'Tolérance au risque',
    sectionIcon: Brain,
    title: 'Si ton portefeuille perdait 20%, que ferais-tu ?',
    subtitle: 'Question clé pour évaluer ta réaction émotionnelle aux pertes.',
    options: [
      { value: 'Je vendrais pour limiter la perte', label: 'Je vendrais', description: 'Limiter les dégâts' },
      { value: 'Je ne ferais rien et attendrais', label: 'Je ne ferais rien', description: 'Attendre le rebond' },
      { value: 'J\'investirais davantage', label: 'J\'investirais plus', description: 'Profiter des soldes' },
    ],
  },
  {
    id: 'riskVision',
    section: 'tolerance',
    sectionLabel: 'Tolérance au risque',
    sectionIcon: Brain,
    title: 'Quelle affirmation te correspond le plus ?',
    subtitle: 'Ta vision du compromis entre risque et rendement.',
    options: [
      { value: 'Je préfère éviter les pertes même si le gain est limité', label: 'Éviter les pertes', description: 'Prudence maximale' },
      { value: 'J\'accepte les fluctuations pour viser plus de rendement', label: 'Accepter les fluctuations', description: 'Équilibre' },
      { value: 'La volatilité ne me dérange pas si la thèse long terme est bonne', label: 'Volatilité acceptée', description: 'Focus long terme' },
    ],
  },
  // D. KNOWLEDGE
  {
    id: 'experienceLevel',
    section: 'knowledge',
    sectionLabel: 'Connaissances',
    sectionIcon: BookOpen,
    title: 'Quel est ton niveau en investissement ?',
    subtitle: 'Cela nous aide à adapter les recommandations et la complexité.',
    options: [
      { value: 'Débutant', label: 'Débutant', description: 'Je découvre' },
      { value: 'Intermédiaire', label: 'Intermédiaire', description: 'Quelques années' },
      { value: 'Avancé', label: 'Avancé', description: 'Expérimenté' },
    ],
  },
  {
    id: 'timeCommitment',
    section: 'knowledge',
    sectionLabel: 'Connaissances',
    sectionIcon: BookOpen,
    title: 'Combien de temps veux-tu y consacrer ?',
    subtitle: 'Ton implication influence le type de stratégie recommandée.',
    options: [
      { value: 'Très peu', label: 'Très peu', description: 'Quelques min/mois' },
      { value: 'Occasionnel', label: 'Occasionnel', description: 'Quelques h/mois' },
      { value: 'Régulier', label: 'Régulier / actif', description: 'Plusieurs h/semaine' },
    ],
  },
  // E. PREFERENCES
  {
    id: 'preferredStyle',
    section: 'preferences',
    sectionLabel: 'Préférences',
    sectionIcon: Target,
    title: 'Préfères-tu investir principalement en...',
    subtitle: 'ETFs (diversifiés) ou actions individuelles (conviction).',
    options: [
      { value: 'ETF', label: 'ETF principalement', description: 'Diversification' },
      { value: 'Mix ETF + actions', label: 'Mix ETF + actions', description: 'Équilibre' },
      { value: 'Actions individuelles', label: 'Actions individuelles', description: 'Conviction' },
    ],
  },
  {
    id: 'concentrationAcceptance',
    section: 'preferences',
    sectionLabel: 'Préférences',
    sectionIcon: Target,
    title: 'Acceptes-tu des positions très concentrées ?',
    subtitle: 'Par exemple, une seule action représentant 15-20% du portefeuille.',
    options: [
      { value: 'Non', label: 'Non', description: 'Diversification stricte' },
      { value: 'Oui, mais limité', label: 'Oui, mais limité', description: 'Quelques convictions' },
      { value: 'Oui, sans problème', label: 'Oui, sans problème', description: 'Convictions fortes' },
    ],
  },
];

const PROFILE_ICONS = {
  Prudent: Shield,
  Équilibré: Scale,
  Croissance: TrendingUp,
  Dynamique: Rocket,
  Conviction: Target,
};

export function StrategyOnboarding({ onComplete }: OnboardingProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({});
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

  // Group questions by section for navigation
  const sections = ['capacity', 'objectives', 'tolerance', 'knowledge', 'preferences'];
  const currentSection = currentQuestion.section;
  const sectionIndex = sections.indexOf(currentSection);

  const handleAnswer = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowResult(true);
    }
  };

  const handlePrevious = () => {
    if (showResult) {
      setShowResult(false);
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Compute profile
      const result = computeInvestorProfile(answers as OnboardingAnswers);
      const thresholds = result.thresholds;

      // Upsert profile
      const { error } = await supabase
        .from('user_profile')
        .upsert({
          user_id: user.id,
          // Answers
          investment_horizon: answers.investmentHorizon,
          financial_resilience_months: answers.emergencyFund,
          income_stability: answers.incomeStability,
          reaction_to_volatility: answers.reactionToLoss,
          risk_vision: answers.riskVision,
          investment_experience: answers.experienceLevel,
          available_time: answers.timeCommitment,
          management_style: answers.preferredStyle,
          main_project: answers.mainObjective,
          // Computed profile
          risk_profile: result.profile,
          // Default thresholds
          cash_target_pct: (thresholds.cashTargetPct.min + thresholds.cashTargetPct.max) / 2,
          max_position_pct: thresholds.maxStockPositionPct,
          max_asset_class_pct: thresholds.maxAssetClassPct,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Invalidate queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(user.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.diversification(user.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.insights(user.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.decisions(user.id) }),
      ]);

      toast.success('Profil créé !', {
        description: `Stratégie ${PROFILE_LABELS[result.profile]} configurée.`,
      });

      onComplete();
    } catch (err: any) {
      console.error('Error saving onboarding:', err);
      toast.error('Erreur lors de l\'enregistrement', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Result screen
  if (showResult) {
    const result = computeInvestorProfile(answers as OnboardingAnswers);
    const ProfileIcon = PROFILE_ICONS[result.profile];
    const thresholds = result.thresholds;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-2xl p-8 space-y-6">
          {/* Profile Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <ProfileIcon className="w-10 h-10 text-primary" />
            </div>
            <div>
              <Badge variant="secondary" className="mb-2">
                Confiance: {result.confidence === 'high' ? 'Élevée' : result.confidence === 'medium' ? 'Moyenne' : 'À affiner'}
              </Badge>
              <h2 className="text-2xl font-bold text-foreground">
                Ton profil : {PROFILE_LABELS[result.profile]}
              </h2>
              <p className="text-muted-foreground mt-2">
                {PROFILE_DESCRIPTIONS[result.profile]}
              </p>
            </div>
          </div>

          <Separator />

          {/* Scores breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {result.scores.capacity.score}/{result.scores.capacity.maxScore}
              </div>
              <div className="text-sm text-muted-foreground">Capacité</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {result.scores.tolerance.score}/{result.scores.tolerance.maxScore}
              </div>
              <div className="text-sm text-muted-foreground">Tolérance</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {result.scores.objectives.score}/{result.scores.objectives.maxScore}
              </div>
              <div className="text-sm text-muted-foreground">Objectifs</div>
            </div>
          </div>

          {/* Thresholds */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <h3 className="font-medium text-foreground">Seuils recommandés :</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cible de liquidités</span>
                <span className="font-medium">{thresholds.cashTargetPct.min}-{thresholds.cashTargetPct.max}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Position max (action)</span>
                <span className="font-medium">{thresholds.maxStockPositionPct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Position max (ETF)</span>
                <span className="font-medium">{thresholds.maxEtfPositionPct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Classe d'actifs max</span>
                <span className="font-medium">{thresholds.maxAssetClassPct}%</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-muted-foreground">Score cible</span>
                <span className="font-medium">{thresholds.targetScoreRange.min}-{thresholds.targetScoreRange.max}/100</span>
              </div>
            </div>
          </div>

          {/* Reasoning */}
          <div className="space-y-2">
            <h3 className="font-medium text-foreground text-sm">Raisonnement :</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              {result.reasoning.map((reason, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handlePrevious} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Modifier
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  Confirmer mon profil
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Tu pourras modifier ces seuils à tout moment dans les paramètres.
          </p>
        </Card>
      </div>
    );
  }

  // Question screen
  const SectionIcon = currentQuestion.sectionIcon;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg p-8 space-y-6">
        {/* Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <SectionIcon className="w-4 h-4" />
              <span>{currentQuestion.sectionLabel}</span>
            </div>
            <span>{currentStep + 1} / {QUESTIONS.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
          {/* Section indicators */}
          <div className="flex justify-between">
            {sections.map((s, i) => (
              <div 
                key={s}
                className={`h-1 flex-1 mx-0.5 rounded-full ${
                  i <= sectionIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Question */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {currentQuestion.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {currentQuestion.subtitle}
          </p>
        </div>

        {/* Options */}
        <RadioGroup
          value={answers[currentQuestion.id] || ''}
          onValueChange={handleAnswer}
          className="space-y-3"
        >
          {currentQuestion.options.map(option => (
            <Label
              key={option.value}
              htmlFor={option.value}
              className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
            >
              <RadioGroupItem value={option.value} id={option.value} />
              <div className="flex-1">
                <span className="font-medium text-foreground">{option.label}</span>
                <span className="ml-2 text-sm text-muted-foreground">({option.description})</span>
              </div>
            </Label>
          ))}
        </RadioGroup>

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Précédent
          </Button>
          <Button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id]}
            className="flex-1"
          >
            {currentStep < QUESTIONS.length - 1 ? (
              <>
                Suivant
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Voir mon profil
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
