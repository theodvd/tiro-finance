/**
 * Lightweight onboarding wizard for strategy classification
 * Shown on first run after signup/login if user_profile doesn't exist or is incomplete
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { classifyStrategy, ARCHETYPE_LABELS, ARCHETYPE_DESCRIPTIONS } from '@/lib/strategyClassifier';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Loader2, Shield, Target, TrendingUp, Zap } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

interface OnboardingAnswers {
  investment_horizon: string;
  max_acceptable_loss: string;
  financial_resilience_months: string;
  income_stability: string;
  main_project: string;
}

const QUESTIONS = [
  {
    id: 'investment_horizon',
    title: 'Quel est ton horizon d\'investissement ?',
    subtitle: 'Pendant combien de temps peux-tu laisser ton argent investi ?',
    options: [
      { value: 'Moins de 2 ans', label: 'Moins de 2 ans', description: 'Court terme' },
      { value: '2-5 ans', label: '2 à 5 ans', description: 'Moyen terme' },
      { value: '5-10 ans', label: '5 à 10 ans', description: 'Long terme' },
      { value: 'Plus de 10 ans', label: 'Plus de 10 ans', description: 'Très long terme' },
    ],
  },
  {
    id: 'max_acceptable_loss',
    title: 'Quelle perte maximale peux-tu accepter ?',
    subtitle: 'En période de crise, ton portefeuille peut temporairement perdre de la valeur.',
    options: [
      { value: '5%', label: 'Jusqu\'à 5%', description: 'Très prudent' },
      { value: '10%', label: 'Jusqu\'à 10%', description: 'Prudent' },
      { value: '20%', label: 'Jusqu\'à 20%', description: 'Modéré' },
      { value: '30%', label: 'Jusqu\'à 30%', description: 'Tolérant' },
      { value: '50%', label: '50% ou plus', description: 'Très tolérant' },
    ],
  },
  {
    id: 'financial_resilience_months',
    title: 'Combien de mois peux-tu tenir sans revenus ?',
    subtitle: 'Ton épargne de précaution (hors investissements).',
    options: [
      { value: 'Moins de 3 mois', label: 'Moins de 3 mois', description: 'Épargne limitée' },
      { value: '3-6 mois', label: '3 à 6 mois', description: 'Épargne correcte' },
      { value: '6-12 mois', label: '6 à 12 mois', description: 'Bonne épargne' },
      { value: 'Plus de 12 mois', label: 'Plus de 12 mois', description: 'Excellente épargne' },
    ],
  },
  {
    id: 'income_stability',
    title: 'Quelle est la stabilité de tes revenus ?',
    subtitle: 'Cela influence ta capacité à prendre des risques.',
    options: [
      { value: 'Très instable', label: 'Très instable', description: 'Freelance, intérim' },
      { value: 'Variable', label: 'Variable', description: 'Commissions, primes' },
      { value: 'Stable', label: 'Stable', description: 'CDI, fonctionnaire' },
      { value: 'Très stable', label: 'Très stable', description: 'Revenus multiples' },
    ],
  },
  {
    id: 'main_project',
    title: 'Quel est ton objectif principal ?',
    subtitle: 'Choisis ce qui te motive le plus.',
    options: [
      { value: 'Épargne de précaution', label: 'Épargne de précaution', description: 'Sécurité avant tout' },
      { value: 'Achat immobilier', label: 'Achat immobilier', description: 'Apport pour un bien' },
      { value: 'Retraite', label: 'Préparer ma retraite', description: 'Long terme' },
      { value: 'Patrimoine', label: 'Construire un patrimoine', description: 'Croissance' },
      { value: 'Revenus passifs', label: 'Revenus passifs', description: 'Dividendes, loyers' },
    ],
  },
];

const ARCHETYPE_ICONS = {
  Defensive: Shield,
  Balanced: Target,
  Growth: TrendingUp,
  HighVolatility: Zap,
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
      // Classify strategy
      const result = classifyStrategy({
        investment_horizon: answers.investment_horizon,
        max_acceptable_loss: answers.max_acceptable_loss,
        financial_resilience_months: answers.financial_resilience_months,
        income_stability: answers.income_stability,
      });

      // Upsert profile with answers and computed thresholds
      const { error } = await supabase
        .from('user_profile')
        .upsert({
          user_id: user.id,
          investment_horizon: answers.investment_horizon,
          max_acceptable_loss: answers.max_acceptable_loss,
          financial_resilience_months: answers.financial_resilience_months,
          income_stability: answers.income_stability,
          main_project: answers.main_project,
          risk_profile: result.archetype,
          cash_target_pct: result.thresholds.cash_target_pct,
          max_position_pct: result.thresholds.max_position_pct,
          max_asset_class_pct: result.thresholds.max_asset_class_pct,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Invalidate all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(user.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.diversification(user.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.insights(user.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.decisions(user.id) }),
      ]);

      toast.success('Profil créé !', {
        description: `Stratégie ${ARCHETYPE_LABELS[result.archetype]} configurée.`,
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
    const result = classifyStrategy({
      investment_horizon: answers.investment_horizon,
      max_acceptable_loss: answers.max_acceptable_loss,
      financial_resilience_months: answers.financial_resilience_months,
      income_stability: answers.income_stability,
    });

    const ArchetypeIcon = ARCHETYPE_ICONS[result.archetype];

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-lg p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <ArchetypeIcon className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Ton profil : {ARCHETYPE_LABELS[result.archetype]}
            </h2>
            <p className="text-muted-foreground">
              {ARCHETYPE_DESCRIPTIONS[result.archetype]}
            </p>
          </div>

          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium text-foreground">Seuils recommandés :</h3>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cible de liquidités</span>
                <span className="font-medium">{result.thresholds.cash_target_pct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Position max</span>
                <span className="font-medium">{result.thresholds.max_position_pct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Classe d'actifs max</span>
                <span className="font-medium">{result.thresholds.max_asset_class_pct}%</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-foreground text-sm">Raisonnement :</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              {result.reasoning.map((reason, i) => (
                <li key={i}>• {reason}</li>
              ))}
            </ul>
          </div>

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
                  Confirmer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Question screen
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg p-8 space-y-6">
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            Question {currentStep + 1} sur {QUESTIONS.length}
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {currentQuestion.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {currentQuestion.subtitle}
          </p>
        </div>

        <RadioGroup
          value={answers[currentQuestion.id as keyof OnboardingAnswers] || ''}
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
            disabled={!answers[currentQuestion.id as keyof OnboardingAnswers]}
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
