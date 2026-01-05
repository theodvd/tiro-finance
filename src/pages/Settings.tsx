/**
 * Settings page for viewing profile and editing thresholds
 */

import { useState, useEffect } from 'react';
import { useInvestorProfile } from '@/hooks/useInvestorProfile';
import { PROFILE_LABELS, PROFILE_DESCRIPTIONS, getProfileThresholds, InvestorProfile } from '@/lib/investorProfileEngine';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Loader2, Settings as SettingsIcon, RotateCcw, Save, 
  Shield, Scale, TrendingUp, Rocket, Target, 
  Info, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const PROFILE_ICONS: Record<InvestorProfile, typeof Shield> = {
  Prudent: Shield,
  Équilibré: Scale,
  Croissance: TrendingUp,
  Dynamique: Rocket,
  Conviction: Target,
};

export default function Settings() {
  const { 
    loading, error, 
    profile, profileLabel, profileDescription,
    profileResult, thresholds, defaultThresholds,
    profileExists, profileComplete,
    saveThresholds, resetToDefaults, refetch 
  } = useInvestorProfile();
  
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Local state for editing
  const [localThresholds, setLocalThresholds] = useState({
    cashTargetPct: 10,
    maxStockPositionPct: 10,
    maxEtfPositionPct: 25,
    maxAssetClassPct: 80,
  });

  // Sync local state with thresholds
  useEffect(() => {
    if (thresholds) {
      setLocalThresholds({
        cashTargetPct: thresholds.cashTargetPct,
        maxStockPositionPct: thresholds.maxStockPositionPct,
        maxEtfPositionPct: thresholds.maxEtfPositionPct,
        maxAssetClassPct: thresholds.maxAssetClassPct,
      });
      setHasChanges(false);
    }
  }, [thresholds]);

  const handleChange = (field: keyof typeof localThresholds, value: number) => {
    setLocalThresholds(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveThresholds({
        cashTargetPct: localThresholds.cashTargetPct,
        maxStockPositionPct: localThresholds.maxStockPositionPct,
        maxAssetClassPct: localThresholds.maxAssetClassPct,
      });
      await refetch();
      setHasChanges(false);
      toast.success('Seuils enregistrés', {
        description: 'Vos préférences ont été mises à jour.',
      });
    } catch (err: any) {
      toast.error('Erreur', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await resetToDefaults();
      await refetch();
      toast.success('Seuils réinitialisés', {
        description: `Retour aux valeurs recommandées pour le profil ${profileLabel}.`,
      });
    } catch (err: any) {
      toast.error('Erreur', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-destructive">
          <p className="text-destructive">Erreur: {error}</p>
        </Card>
      </div>
    );
  }

  if (!profileExists) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center space-y-4">
          <SettingsIcon className="w-12 h-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Paramètres de stratégie</h1>
          <p className="text-muted-foreground">
            Complétez d'abord le questionnaire pour configurer votre profil investisseur.
          </p>
          <Button onClick={() => window.location.href = '/profile'}>
            Compléter mon profil
          </Button>
        </Card>
      </div>
    );
  }

  const ProfileIcon = PROFILE_ICONS[profile];
  const cashDefault = (defaultThresholds.cashTargetPct.min + defaultThresholds.cashTargetPct.max) / 2;

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            Paramètres de stratégie
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualisez votre profil et personnalisez vos seuils
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <ProfileIcon className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold text-foreground">
                Profil {profileLabel}
              </h2>
              <Badge 
                variant={profileResult?.confidence === 'high' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {profileResult?.confidence === 'high' ? 'Confiance élevée' : 
                 profileResult?.confidence === 'medium' ? 'Confiance moyenne' : 'À affiner'}
              </Badge>
              {!profileComplete && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                  Questionnaire incomplet
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {profileDescription}
            </p>
          </div>
        </div>

        {/* Scores (if available) */}
        {profileResult && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-sm">Voir le détail du calcul</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              {/* Scores */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold text-foreground">
                    {profileResult.scores.capacity.score}/{profileResult.scores.capacity.maxScore}
                  </div>
                  <div className="text-xs text-muted-foreground">Capacité</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold text-foreground">
                    {profileResult.scores.tolerance.score}/{profileResult.scores.tolerance.maxScore}
                  </div>
                  <div className="text-xs text-muted-foreground">Tolérance</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold text-foreground">
                    {profileResult.scores.objectives.score}/{profileResult.scores.objectives.maxScore}
                  </div>
                  <div className="text-xs text-muted-foreground">Objectifs</div>
                </div>
              </div>

              {/* Reasoning */}
              {profileResult.reasoning.length > 0 && (
                <div className="text-sm space-y-1">
                  <p className="font-medium text-foreground">Raisonnement :</p>
                  <ul className="text-muted-foreground space-y-1">
                    {profileResult.reasoning.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Score factors */}
              <Accordion type="single" collapsible className="w-full">
                {[profileResult.scores.capacity, profileResult.scores.tolerance, profileResult.scores.objectives].map(score => (
                  <AccordionItem key={score.name} value={score.name}>
                    <AccordionTrigger className="text-sm py-2">
                      {score.name} ({score.score}/{score.maxScore})
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {score.factors.length > 0 ? score.factors.map((f, i) => (
                          <li key={i}>• {f}</li>
                        )) : <li>• Données non renseignées</li>}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Recalculate button */}
        <div className="mt-4 pt-4 border-t border-border">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.href = '/profile'}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Recalculer mon profil
          </Button>
        </div>
      </Card>

      {/* Threshold Sliders */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Seuils personnalisés</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Ces seuils sont utilisés pour les alertes et le score de diversification
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={saving}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Réinitialiser
          </Button>
        </div>

        <div className="space-y-8">
          {/* Cash target */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Cible de liquidités
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Pourcentage de votre patrimoine à garder en liquidités (livrets, fonds euros).</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-primary">
                  {localThresholds.cashTargetPct}%
                </span>
                {Math.abs(localThresholds.cashTargetPct - cashDefault) > 1 && (
                  <span className="text-xs text-muted-foreground">
                    (défaut: {defaultThresholds.cashTargetPct.min}-{defaultThresholds.cashTargetPct.max}%)
                  </span>
                )}
              </div>
            </div>
            <Slider
              value={[localThresholds.cashTargetPct]}
              onValueChange={([v]) => handleChange('cashTargetPct', v)}
              min={0}
              max={30}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>30%</span>
            </div>
          </div>

          <Separator />

          {/* Max stock position */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Position max (actions)
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Poids maximum pour une action individuelle. Les ETF ont un seuil plus élevé.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-primary">
                  {localThresholds.maxStockPositionPct}%
                </span>
                {localThresholds.maxStockPositionPct !== defaultThresholds.maxStockPositionPct && (
                  <span className="text-xs text-muted-foreground">
                    (défaut: {defaultThresholds.maxStockPositionPct}%)
                  </span>
                )}
              </div>
            </div>
            <Slider
              value={[localThresholds.maxStockPositionPct]}
              onValueChange={([v]) => handleChange('maxStockPositionPct', v)}
              min={1}
              max={40}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1%</span>
              <span>40%</span>
            </div>
          </div>

          {/* Max ETF position (display only for now) */}
          <div className="space-y-3 opacity-60">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Position max (ETF)
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Seuil plus élevé pour les ETF car ils sont déjà diversifiés. Basé sur votre profil.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <span className="text-lg font-semibold text-muted-foreground">
                {thresholds.maxEtfPositionPct}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full">
              <div 
                className="h-full bg-muted-foreground/30 rounded-full" 
                style={{ width: `${(thresholds.maxEtfPositionPct / 100) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground italic">
              Automatique selon le profil {profileLabel}
            </p>
          </div>

          <Separator />

          {/* Max asset class */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Classe d'actifs max
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Poids maximum pour une classe d'actifs (actions, crypto, obligations, etc.).</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-primary">
                  {localThresholds.maxAssetClassPct}%
                </span>
                {localThresholds.maxAssetClassPct !== defaultThresholds.maxAssetClassPct && (
                  <span className="text-xs text-muted-foreground">
                    (défaut: {defaultThresholds.maxAssetClassPct}%)
                  </span>
                )}
              </div>
            </div>
            <Slider
              value={[localThresholds.maxAssetClassPct]}
              onValueChange={([v]) => handleChange('maxAssetClassPct', v)}
              min={50}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer les modifications
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Target score info */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Score de diversification cible</p>
            <p className="mt-1">
              Pour votre profil <strong>{profileLabel}</strong>, un score entre{' '}
              <strong>{defaultThresholds.targetScoreRange.min}</strong> et{' '}
              <strong>{defaultThresholds.targetScoreRange.max}</strong>/100 est considéré comme adapté.
            </p>
            <p className="mt-1">
              Un score plus élevé n'est pas toujours meilleur — il dépend de vos objectifs.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
