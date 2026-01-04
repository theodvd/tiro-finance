/**
 * Settings page for editing strategy thresholds
 */

import { useState, useEffect } from 'react';
import { useUserStrategy } from '@/hooks/useUserStrategy';
import { getArchetypeThresholds, ARCHETYPE_LABELS, ARCHETYPE_DESCRIPTIONS, getAllArchetypes } from '@/lib/strategyClassifier';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Settings as SettingsIcon, RotateCcw, Save, Shield, Target, TrendingUp, Zap, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ARCHETYPE_ICONS = {
  Defensive: Shield,
  Balanced: Target,
  Growth: TrendingUp,
  HighVolatility: Zap,
};

export default function Settings() {
  const { loading, error, strategy, saveThresholds, resetToDefaults, refetch } = useUserStrategy();
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Local state for editing
  const [localThresholds, setLocalThresholds] = useState({
    cash_target_pct: 10,
    max_position_pct: 10,
    max_asset_class_pct: 80,
  });

  // Sync local state with strategy
  useEffect(() => {
    if (strategy) {
      setLocalThresholds({
        cash_target_pct: strategy.thresholds.cash_target_pct,
        max_position_pct: strategy.thresholds.max_position_pct,
        max_asset_class_pct: strategy.thresholds.max_asset_class_pct,
      });
      setHasChanges(false);
    }
  }, [strategy]);

  const handleChange = (field: keyof typeof localThresholds, value: number) => {
    setLocalThresholds(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveThresholds(localThresholds);
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
        description: `Retour aux valeurs par défaut pour le profil ${strategy.archetypeLabel}.`,
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

  if (!strategy.profileExists) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center space-y-4">
          <SettingsIcon className="w-12 h-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Paramètres de stratégie</h1>
          <p className="text-muted-foreground">
            Complétez d'abord l'onboarding pour configurer votre profil investisseur.
          </p>
          <Button onClick={() => window.location.href = '/profile'}>
            Aller au profil
          </Button>
        </Card>
      </div>
    );
  }

  const ArchetypeIcon = ARCHETYPE_ICONS[strategy.archetype];
  const defaults = getArchetypeThresholds(strategy.archetype);

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="w-6 h-6" />
            Paramètres de stratégie
          </h1>
          <p className="text-muted-foreground mt-1">
            Personnalisez vos seuils d'alerte et objectifs
          </p>
        </div>
      </div>

      {/* Current archetype */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <ArchetypeIcon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                Profil {strategy.archetypeLabel}
              </h2>
              <Badge variant="secondary" className="text-xs">
                {strategy.classification?.confidence === 'high' ? 'Fiable' : 
                 strategy.classification?.confidence === 'medium' ? 'Moyen' : 'À affiner'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {ARCHETYPE_DESCRIPTIONS[strategy.archetype]}
            </p>
            {strategy.classification?.reasoning && (
              <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                {strategy.classification.reasoning.slice(0, 3).map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {/* Threshold sliders */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Seuils personnalisés</h3>
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

        <div className="space-y-6">
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
                    <p className="max-w-xs">Pourcentage de votre patrimoine à garder en liquidités (épargne de précaution, livrets).</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-primary">
                  {localThresholds.cash_target_pct}%
                </span>
                {localThresholds.cash_target_pct !== defaults.cash_target_pct && (
                  <span className="text-xs text-muted-foreground">
                    (défaut: {defaults.cash_target_pct}%)
                  </span>
                )}
              </div>
            </div>
            <Slider
              value={[localThresholds.cash_target_pct]}
              onValueChange={([v]) => handleChange('cash_target_pct', v)}
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

          {/* Max position */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Position max
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Poids maximum acceptable pour une seule position. Une alerte sera générée si dépassé.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-primary">
                  {localThresholds.max_position_pct}%
                </span>
                {localThresholds.max_position_pct !== defaults.max_position_pct && (
                  <span className="text-xs text-muted-foreground">
                    (défaut: {defaults.max_position_pct}%)
                  </span>
                )}
              </div>
            </div>
            <Slider
              value={[localThresholds.max_position_pct]}
              onValueChange={([v]) => handleChange('max_position_pct', v)}
              min={1}
              max={30}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1%</span>
              <span>30%</span>
            </div>
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
                    <p className="max-w-xs">Poids maximum acceptable pour une classe d'actifs (actions, ETF, crypto, etc.).</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-primary">
                  {localThresholds.max_asset_class_pct}%
                </span>
                {localThresholds.max_asset_class_pct !== defaults.max_asset_class_pct && (
                  <span className="text-xs text-muted-foreground">
                    (défaut: {defaults.max_asset_class_pct}%)
                  </span>
                )}
              </div>
            </div>
            <Slider
              value={[localThresholds.max_asset_class_pct]}
              onValueChange={([v]) => handleChange('max_asset_class_pct', v)}
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

      {/* Info about where thresholds are used */}
      <Card className="p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground">
          <strong>Ces seuils sont utilisés pour :</strong> le score de diversification, 
          les alertes sur la page Décisions, et les recommandations de la revue mensuelle.
        </p>
      </Card>
    </div>
  );
}
