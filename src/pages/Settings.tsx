/**
 * Settings page for viewing profile and editing thresholds
 * Uses persisted scores from DB - single source of truth
 */

import { useState, useEffect } from 'react';
import { useInvestorProfile } from '@/hooks/useInvestorProfile';
import { PROFILE_LABELS, PROFILE_DESCRIPTIONS, InvestorProfile } from '@/lib/investorProfileEngine';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Loader2, Settings as SettingsIcon, RotateCcw, Save, 
  Shield, Scale, TrendingUp, Rocket, Target, 
  Info, ChevronDown, ChevronUp, RefreshCw, AlertCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

const CONFIDENCE_LABELS = {
  high: { label: 'Confiance élevée', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  medium: { label: 'Confiance moyenne', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  low: { label: 'À affiner', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export default function Settings() {
  const { 
    loading, saving, error, 
    profile, profileLabel, profileDescription,
    scores, confidence, thresholds, defaultThresholds,
    profileExists, profileComplete, needsOnboarding,
    saveThresholds, resetToDefaults, refetch 
  } = useInvestorProfile();
  
  const [hasChanges, setHasChanges] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Local state for editing thresholds - CRITICAL: must be controlled
  const [localCash, setLocalCash] = useState<number>(10);
  const [localStock, setLocalStock] = useState<number>(10);
  const [localAssetClass, setLocalAssetClass] = useState<number>(80);

  // Sync local state when thresholds change (on load or after save)
  useEffect(() => {
    if (thresholds) {
      setLocalCash(thresholds.cashTargetPct);
      setLocalStock(thresholds.maxStockPositionPct);
      setLocalAssetClass(thresholds.maxAssetClassPct);
      setHasChanges(false);
    }
  }, [thresholds]);

  const handleSave = async () => {
    try {
      await saveThresholds({
        cashTargetPct: localCash,
        maxStockPositionPct: localStock,
        maxAssetClassPct: localAssetClass,
      });
      setHasChanges(false);
      toast.success('Seuils enregistrés', {
        description: 'Vos préférences ont été mises à jour.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error('Erreur', { description: message });
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefaults();
      toast.success('Seuils réinitialisés', {
        description: `Retour aux valeurs recommandées pour le profil ${profileLabel}.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error('Erreur', { description: message });
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

  if (!profileExists || needsOnboarding) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-500" />
          <h1 className="text-2xl font-bold text-foreground">Profil incomplet</h1>
          <p className="text-muted-foreground">
            Complétez d'abord le questionnaire pour configurer votre profil investisseur et définir vos seuils.
          </p>
          <Button onClick={() => window.location.href = '/profile'}>
            Compléter mon profil
          </Button>
        </Card>
      </div>
    );
  }

  const ProfileIcon = PROFILE_ICONS[profile];
  const cashDefault = Math.round((defaultThresholds.cashTargetPct.min + defaultThresholds.cashTargetPct.max) / 2);
  const confidenceInfo = CONFIDENCE_LABELS[confidence];

  // Check if user has customized thresholds
  const hasCashOverride = localCash !== cashDefault;
  const hasStockOverride = localStock !== defaultThresholds.maxStockPositionPct;
  const hasAssetClassOverride = localAssetClass !== defaultThresholds.maxAssetClassPct;

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
                variant="outline"
                className={`text-xs ${confidenceInfo.color}`}
              >
                {confidenceInfo.label}
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

        {/* Scores - using PERSISTED scores from DB */}
        {scores && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-sm">Voir le détail des scores</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              {/* Score cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Capacité</span>
                    <span className="text-sm font-bold text-foreground">
                      {scores.capacity}/35
                    </span>
                  </div>
                  <Progress value={(scores.capacity / 35) * 100} className="h-2" />
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Tolérance</span>
                    <span className="text-sm font-bold text-foreground">
                      {scores.tolerance}/35
                    </span>
                  </div>
                  <Progress value={(scores.tolerance / 35) * 100} className="h-2" />
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Objectifs</span>
                    <span className="text-sm font-bold text-foreground">
                      {scores.objectives}/30
                    </span>
                  </div>
                  <Progress value={(scores.objectives / 30) * 100} className="h-2" />
                </div>
              </div>

              {/* Total score */}
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Score total</span>
                  <span className="text-2xl font-bold text-primary">
                    {scores.total}/100
                  </span>
                </div>
                <Progress value={scores.total} className="h-3 mt-2" />
              </div>

              {/* What each score means */}
              <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-lg">
                <p><strong>Capacité</strong> : Situation financière objective (épargne, revenus, patrimoine)</p>
                <p><strong>Tolérance</strong> : Réaction émotionnelle aux pertes et à la volatilité</p>
                <p><strong>Objectifs</strong> : Horizon d'investissement et buts financiers</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* No scores - show message */}
        {!scores && (
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-700">
              Les scores détaillés ne sont pas encore disponibles. Recalculez votre profil pour les voir.
            </p>
          </div>
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
                  {localCash}%
                </span>
                {hasCashOverride && (
                  <span className="text-xs text-muted-foreground">
                    (défaut: {defaultThresholds.cashTargetPct.min}-{defaultThresholds.cashTargetPct.max}%)
                  </span>
                )}
              </div>
            </div>
            <Slider
              value={[localCash]}
              onValueChange={([v]) => {
                setLocalCash(v);
                setHasChanges(true);
              }}
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
                    <p className="max-w-xs">Poids maximum pour une action individuelle. Les ETF ont un seuil plus élevé ({thresholds.maxEtfPositionPct}%).</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-primary">
                  {localStock}%
                </span>
                {hasStockOverride && (
                  <span className="text-xs text-muted-foreground">
                    (défaut: {defaultThresholds.maxStockPositionPct}%)
                  </span>
                )}
              </div>
            </div>
            <Slider
              value={[localStock]}
              onValueChange={([v]) => {
                setLocalStock(v);
                setHasChanges(true);
              }}
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

          {/* Max ETF position (display only) */}
          <div className="space-y-3 opacity-70">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Position max (ETF)
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Seuil plus élevé pour les ETF car ils sont déjà diversifiés. Calculé automatiquement selon votre profil.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <span className="text-lg font-semibold text-muted-foreground">
                {thresholds.maxEtfPositionPct}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-muted-foreground/30 rounded-full" 
                style={{ width: `${Math.min(thresholds.maxEtfPositionPct, 100)}%` }}
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
                  {localAssetClass}%
                </span>
                {hasAssetClassOverride && (
                  <span className="text-xs text-muted-foreground">
                    (défaut: {defaultThresholds.maxAssetClassPct}%)
                  </span>
                )}
              </div>
            </div>
            <Slider
              value={[localAssetClass]}
              onValueChange={([v]) => {
                setLocalAssetClass(v);
                setHasChanges(true);
              }}
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

      {/* Info about thresholds impact */}
      <Card className="p-4 bg-muted/30 border-muted">
        <h4 className="font-medium text-foreground text-sm mb-2">Impact des seuils</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• <strong>Score de diversification</strong> : pénalités si positions dépassent les seuils</li>
          <li>• <strong>Alertes (Décisions)</strong> : notifications si concentration excessive</li>
          <li>• <strong>Recommandations (Insights)</strong> : conseils personnalisés selon vos limites</li>
        </ul>
      </Card>
    </div>
  );
}
