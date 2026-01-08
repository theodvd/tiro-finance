/**
 * Settings page - Strategy thresholds with auto/manual mode
 * Uses useInvestorProfile as single source of truth
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvestorProfile } from '@/hooks/useInvestorProfile';
import { PROFILE_LABELS, PROFILE_DESCRIPTIONS, InvestorProfile } from '@/lib/investorProfileEngine';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Loader2, Settings as SettingsIcon, RotateCcw, Save, 
  Shield, Scale, TrendingUp, Rocket, Target, 
  Info, ChevronDown, ChevronUp, RefreshCw, AlertCircle, Lock
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
  const navigate = useNavigate();
  const {
    loading,
    saving,
    error,
    profile,
    profileLabel,
    profileDescription,
    scores,
    confidence,
    thresholds,
    defaultThresholds,
    thresholdsMode,
    profileExists,
    profileComplete,
    needsOnboarding,
    saveThresholds,
    resetToDefaults,
    setThresholdsMode,
    refetch,
  } = useInvestorProfile();

  const [hasChanges, setHasChanges] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  // Local state for editing thresholds
  const [localCash, setLocalCash] = useState<number>(10);
  const [localStock, setLocalStock] = useState<number>(10);
  const [localEtf, setLocalEtf] = useState<number>(25);
  const [localAssetClass, setLocalAssetClass] = useState<number>(80);

  // Single source of truth: the persisted thresholds_mode column
  useEffect(() => {
    setManualMode(thresholdsMode === 'manual');
  }, [thresholdsMode]);

  // Sync local state when thresholds change
  useEffect(() => {
    if (thresholds) {
      setLocalCash(thresholds.cashTargetPct);
      setLocalStock(thresholds.maxStockPositionPct);
      setLocalEtf(thresholds.maxEtfPositionPct);
      setLocalAssetClass(thresholds.maxAssetClassPct);
      setHasChanges(false);
    }
  }, [thresholds]);

  const handleSave = async () => {
    try {
      // Ensure mode sticks even if thresholds match defaults
      await setThresholdsMode('manual');
      await saveThresholds({
        cashTargetPct: localCash,
        maxStockPositionPct: localStock,
        maxEtfPositionPct: localEtf,
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
      // Reset values to profile defaults (still in manual if user wants)
      const cashDefault = Math.round(
        (defaultThresholds.cashTargetPct.min + defaultThresholds.cashTargetPct.max) / 2
      );
      await setThresholdsMode('manual');
      await saveThresholds({
        cashTargetPct: cashDefault,
        maxStockPositionPct: defaultThresholds.maxStockPositionPct,
        maxEtfPositionPct: defaultThresholds.maxEtfPositionPct,
        maxAssetClassPct: defaultThresholds.maxAssetClassPct,
      });
      setHasChanges(false);
      toast.success('Seuils réinitialisés', {
        description: `Valeurs recommandées pour le profil ${profileLabel}.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error('Erreur', { description: message });
    }
  };

  const handleRecalculateProfile = () => {
    navigate('/profile?returnTo=/settings');
  };

  const toggleManualMode = async (checked: boolean) => {
    try {
      if (checked) {
        await setThresholdsMode('manual');
        setManualMode(true);
        toast.message('Mode Manuel activé', {
          description: 'Vous pouvez maintenant ajuster les seuils.',
        });
      } else {
        await setThresholdsMode('auto');
        setManualMode(false);
        setHasChanges(false);
        toast.message('Mode Auto activé', {
          description: 'Seuils recalculés automatiquement selon votre profil.',
        });
      }
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
          <Button onClick={() => refetch()} className="mt-4">Réessayer</Button>
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
          <Button onClick={() => navigate('/profile?returnTo=/settings')}>
            Compléter mon profil
          </Button>
        </Card>
      </div>
    );
  }

  const ProfileIcon = PROFILE_ICONS[profile];
  const confidenceInfo = CONFIDENCE_LABELS[confidence];

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
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {profileDescription}
            </p>
          </div>
        </div>

        {/* Scores */}
        {scores ? (
          <Collapsible open={showDetails} onOpenChange={setShowDetails} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-sm">Voir le détail des scores</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
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

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Score total</span>
                  <span className="text-2xl font-bold text-primary">
                    {scores.total}/100
                  </span>
                </div>
                <Progress value={scores.total} className="h-3 mt-2" />
              </div>

              <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-lg">
                <p><strong>Capacité</strong> : Situation financière objective</p>
                <p><strong>Tolérance</strong> : Réaction émotionnelle aux pertes</p>
                <p><strong>Objectifs</strong> : Horizon et buts financiers</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-700">
              Scores détaillés non disponibles. Recalculez votre profil.
            </p>
          </div>
        )}

        {/* Recalculate button */}
        <div className="mt-4 pt-4 border-t border-border">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRecalculateProfile}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Recalculer mon profil
          </Button>
        </div>
      </Card>

      {/* Threshold Mode Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Mode de gestion des seuils</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {manualMode 
                ? 'Vous personnalisez vos seuils manuellement' 
                : 'Seuils calculés automatiquement selon votre profil'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Auto</span>
            <Switch checked={manualMode} onCheckedChange={toggleManualMode} />
            <span className="text-sm text-muted-foreground">Manuel</span>
          </div>
        </div>
      </Card>

      {/* Threshold Sliders */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Seuils de diversification</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Utilisés pour les alertes et le score de diversification
            </p>
          </div>
          {manualMode && (
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
          )}
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
                    <p className="max-w-xs">Part de votre patrimoine à garder en liquidités.</p>
                  </TooltipContent>
                </Tooltip>
                {!manualMode && <Lock className="w-3 h-3 text-muted-foreground" />}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-primary">
                  {localCash}%
                </span>
                <span className="text-xs text-muted-foreground">
                  (défaut: {defaultThresholds.cashTargetPct.min}-{defaultThresholds.cashTargetPct.max}%)
                </span>
              </div>
            </div>
            <Slider
              value={[localCash]}
              onValueChange={([v]) => {
                if (manualMode) {
                  setLocalCash(v);
                  setHasChanges(true);
                }
              }}
              min={0}
              max={30}
              step={1}
              disabled={!manualMode}
              className="w-full"
            />
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
                    <p className="max-w-xs">Poids maximum pour une action individuelle.</p>
                  </TooltipContent>
                </Tooltip>
                {!manualMode && <Lock className="w-3 h-3 text-muted-foreground" />}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-primary">
                  {localStock}%
                </span>
                <span className="text-xs text-muted-foreground">
                  (défaut: {defaultThresholds.maxStockPositionPct}%)
                </span>
              </div>
            </div>
            <Slider
              value={[localStock]}
              onValueChange={([v]) => {
                if (manualMode) {
                  setLocalStock(v);
                  setHasChanges(true);
                }
              }}
              min={1}
              max={40}
              step={1}
              disabled={!manualMode}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Max ETF position */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Position max (ETF)
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Poids maximum pour un ETF. Plus élevé car déjà diversifiés.</p>
                  </TooltipContent>
                </Tooltip>
                {!manualMode && <Lock className="w-3 h-3 text-muted-foreground" />}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-primary">
                  {localEtf}%
                </span>
                <span className="text-xs text-muted-foreground">
                  (défaut: {defaultThresholds.maxEtfPositionPct}%)
                </span>
              </div>
            </div>
            <Slider
              value={[localEtf]}
              onValueChange={([v]) => {
                if (manualMode) {
                  setLocalEtf(v);
                  setHasChanges(true);
                }
              }}
              min={10}
              max={100}
              step={5}
              disabled={!manualMode}
              className="w-full"
            />
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
                    <p className="max-w-xs">Poids maximum pour une classe d'actifs (actions, crypto, etc.).</p>
                  </TooltipContent>
                </Tooltip>
                {!manualMode && <Lock className="w-3 h-3 text-muted-foreground" />}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-primary">
                  {localAssetClass}%
                </span>
                <span className="text-xs text-muted-foreground">
                  (défaut: {defaultThresholds.maxAssetClassPct}%)
                </span>
              </div>
            </div>
            <Slider
              value={[localAssetClass]}
              onValueChange={([v]) => {
                if (manualMode) {
                  setLocalAssetClass(v);
                  setHasChanges(true);
                }
              }}
              min={50}
              max={100}
              step={5}
              disabled={!manualMode}
              className="w-full"
            />
          </div>
        </div>

        {/* Save button */}
        {manualMode && hasChanges && (
          <div className="pt-4">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
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
        )}
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-muted/30">
        <h4 className="font-medium text-sm text-foreground mb-2">Comment sont utilisés ces seuils ?</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• <strong>Score de diversification</strong> : pénalités si dépassement</li>
          <li>• <strong>Alertes</strong> : notification si position trop concentrée</li>
          <li>• <strong>Recommandations</strong> : suggestions d'actions correctives</li>
        </ul>
      </Card>
    </div>
  );
}
