import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  CheckCircle2, 
  AlertTriangle,
  PieChart,
  Wallet,
  ArrowRight,
  Calendar,
  Loader2,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMonthlyReview, MonthlyAction } from '@/hooks/useMonthlyReview';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import CountUp from 'react-countup';

export default function MonthlyReview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const data = useMonthlyReview();
  const [isCreatingCheckpoint, setIsCreatingCheckpoint] = useState(false);
  const [checkpointCreated, setCheckpointCreated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set());

  // Local state for editable thresholds
  const [editableThresholds, setEditableThresholds] = useState({
    cashTargetPct: data.thresholds.cashTargetPct,
    maxPositionPct: data.thresholds.maxPositionPct,
    maxAssetClassPct: data.thresholds.maxAssetClassPct,
  });

  const handleCreateCheckpoint = async () => {
    if (!user) return;
    
    setIsCreatingCheckpoint(true);
    try {
      // Call take-snapshot with monthly type
      const { data: result, error } = await supabase.functions.invoke('take-snapshot', {
        body: { snapshot_type: 'monthly' }
      });

      if (error) throw error;

      setCheckpointCreated(true);
      toast.success('Point mensuel validé !', {
        description: 'Votre checkpoint a été enregistré.',
      });
    } catch (e: any) {
      console.error('Error creating checkpoint:', e);
      toast.error('Erreur lors de la création du checkpoint', {
        description: e.message,
      });
    } finally {
      setIsCreatingCheckpoint(false);
    }
  };

  const handleSaveThresholds = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profile')
        .update({
          cash_target_pct: editableThresholds.cashTargetPct,
          max_position_pct: editableThresholds.maxPositionPct,
          max_asset_class_pct: editableThresholds.maxAssetClassPct,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Objectifs enregistrés');
    } catch (e: any) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleActionClick = (action: MonthlyAction) => {
    if (action.ctaAction === 'add-investment') {
      navigate('/investments');
    } else if (action.ctaAction === 'view-decision') {
      navigate('/decisions');
    } else {
      setDismissedActions(prev => new Set([...prev, action.id]));
    }
  };

  const getEffortBadge = (effort: MonthlyAction['effort']) => {
    switch (effort) {
      case 'low':
        return <Badge variant="secondary" className="text-xs">Effort faible</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-xs">Effort moyen</Badge>;
      case 'high':
        return <Badge variant="destructive" className="text-xs">Effort élevé</Badge>;
    }
  };

  if (data.loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  const visibleActions = data.actions.filter(a => !dismissedActions.has(a.id));

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Point mensuel</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'MMMM yyyy', { locale: fr })}
          </p>
        </div>
        {data.lastCheckpointDate && (
          <Badge variant="outline" className="text-xs w-fit">
            <Calendar className="h-3 w-3 mr-1" />
            Dernier point : {format(new Date(data.lastCheckpointDate), 'dd MMM yyyy', { locale: fr })}
          </Badge>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          BLOC A – RÉSUMÉ DU MOIS
      ═══════════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Résumé du mois
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Total Value */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Patrimoine total</p>
              <p className="text-xl font-bold tabular-nums">
                <CountUp end={data.totalValue} duration={0.8} decimals={0} separator=" " suffix=" €" />
              </p>
            </div>

            {/* Monthly P/L */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">P/L latent</p>
              <p className={`text-xl font-bold tabular-nums ${data.monthlyPnl >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                {data.monthlyPnl >= 0 ? '+' : ''}{data.monthlyPnl.toLocaleString('fr-FR')} €
              </p>
              <p className={`text-xs ${data.monthlyPnl >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                {data.monthlyPnlPct >= 0 ? '+' : ''}{data.monthlyPnlPct.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Variation vs previous */}
          {data.variationVsPrevious !== null && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              {data.variationVsPrevious >= 0 ? (
                <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className="text-sm">
                <span className={`font-medium ${data.variationVsPrevious >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                  {data.variationVsPrevious >= 0 ? '+' : ''}{data.variationVsPrevious.toFixed(1)}%
                </span>
                {' '}vs période précédente
              </span>
            </div>
          )}

          {/* Top contributors */}
          {data.topContributors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Top 3 positions</p>
              <div className="flex flex-wrap gap-2">
                {data.topContributors.map((c, i) => (
                  <Badge key={i} variant="secondary" className="font-mono">
                    {c.name} ({c.contribution.toFixed(1)}%)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
          BLOC B – SITUATION VS OBJECTIFS
      ═══════════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Situation vs objectifs
            </CardTitle>
            <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  Modifier
                  {settingsOpen ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Settings panel */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleContent>
              <div className="p-4 rounded-lg bg-muted/50 space-y-4 mb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase">Vos objectifs personnalisés</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="cashTarget" className="text-xs">Cash cible (%)</Label>
                    <Input
                      id="cashTarget"
                      type="number"
                      min={0}
                      max={100}
                      value={editableThresholds.cashTargetPct}
                      onChange={(e) => setEditableThresholds(prev => ({ ...prev, cashTargetPct: Number(e.target.value) }))}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="maxPosition" className="text-xs">Max position (%)</Label>
                    <Input
                      id="maxPosition"
                      type="number"
                      min={1}
                      max={100}
                      value={editableThresholds.maxPositionPct}
                      onChange={(e) => setEditableThresholds(prev => ({ ...prev, maxPositionPct: Number(e.target.value) }))}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="maxAssetClass" className="text-xs">Max classe (%)</Label>
                    <Input
                      id="maxAssetClass"
                      type="number"
                      min={1}
                      max={100}
                      value={editableThresholds.maxAssetClassPct}
                      onChange={(e) => setEditableThresholds(prev => ({ ...prev, maxAssetClassPct: Number(e.target.value) }))}
                      className="h-8"
                    />
                  </div>
                </div>
                <Button size="sm" onClick={handleSaveThresholds}>Enregistrer</Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Cash vs target */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                Liquidités
              </span>
              <span className="font-medium tabular-nums">
                {data.currentCashPct.toFixed(0)}% / {data.thresholds.cashTargetPct}% cible
              </span>
            </div>
            <Progress 
              value={Math.min(data.currentCashPct, 100)} 
              className="h-2"
            />
            {data.currentCashPct > data.thresholds.cashTargetPct + 5 && (
              <p className="text-xs text-muted-foreground">
                +{(data.currentCashPct - data.thresholds.cashTargetPct).toFixed(0)}% au-dessus de la cible
              </p>
            )}
          </div>

          {/* Concentrations */}
          {data.mainConcentrations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-accent" />
                Concentrations détectées
              </p>
              {data.mainConcentrations.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-accent/10">
                  <span>{c.name}</span>
                  <span className="font-medium tabular-nums text-accent-foreground">
                    {c.pct.toFixed(1)}% ({c.type === 'position' ? `seuil ${data.thresholds.maxPositionPct}%` : `seuil ${data.thresholds.maxAssetClassPct}%`})
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Diversification score */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              <span className="text-sm">Score de diversification</span>
            </div>
            <div className={`text-lg font-bold ${
              data.diversificationScore >= 60 ? 'text-[hsl(var(--success))]' : 
              data.diversificationScore >= 40 ? 'text-accent' : 'text-destructive'
            }`}>
              {data.diversificationScore}/100
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
          BLOC C – PLAN D'ACTION
      ═══════════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Plan d'action
          </CardTitle>
          <CardDescription>
            {visibleActions.length === 0 
              ? 'Aucune action recommandée ce mois-ci'
              : `${visibleActions.length} action${visibleActions.length > 1 ? 's' : ''} suggérée${visibleActions.length > 1 ? 's' : ''}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleActions.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-sm">Votre portefeuille est bien équilibré. Continuez ainsi !</p>
            </div>
          ) : (
            visibleActions.map((action) => (
              <div key={action.id} className="p-4 rounded-lg border space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium">{action.title}</h4>
                  {getEffortBadge(action.effort)}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {action.reason}
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleActionClick(action)}
                    className="flex-1"
                  >
                    {action.ctaLabel}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setDismissedActions(prev => new Set([...prev, action.id]))}
                  >
                    Ignorer
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
          BLOC D – CHECKPOINT MENSUEL
      ═══════════════════════════════════════════════════════════════════════ */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          {checkpointCreated ? (
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-[hsl(var(--success))] mx-auto" />
              <p className="font-medium text-[hsl(var(--success))]">Point mensuel validé</p>
              <p className="text-sm text-muted-foreground">
                Enregistré le {format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-medium">Valider mon point mensuel</p>
                <p className="text-sm text-muted-foreground">
                  Créer un checkpoint pour suivre votre progression
                </p>
              </div>
              <Button 
                onClick={handleCreateCheckpoint} 
                disabled={isCreatingCheckpoint}
                className="w-full sm:w-auto"
              >
                {isCreatingCheckpoint ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Valider le checkpoint
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
