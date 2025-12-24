import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, AlertTriangle, TrendingDown, PieChart, Droplets, 
  CheckCircle2, XCircle, Eye, Target, Info, Zap, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useDecisions, Decision } from '@/hooks/useDecisions';
import { useDecisionStatus, DecisionStatus } from '@/hooks/useDecisionStatus';
import { useDiversification } from '@/hooks/useDiversification';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';

// Thresholds matching useDecisions
const DEFAULT_THRESHOLDS = {
  singlePosition: 10,
  assetClass: 70,
  liquidity: 20,
  diversificationScore: 40,
  weeklyVariation: 10,
};

const getDecisionIcon = (type: Decision['type']) => {
  switch (type) {
    case 'concentration':
      return AlertTriangle;
    case 'liquidity':
      return Droplets;
    case 'diversification':
      return PieChart;
    case 'variation':
      return TrendingDown;
    default:
      return AlertTriangle;
  }
};

const getSeverityStyles = (severity: Decision['severity']) => {
  switch (severity) {
    case 'high':
      return {
        badge: 'bg-destructive/10 text-destructive border-destructive/20',
        icon: 'text-destructive',
        label: 'Priorité haute',
      };
    case 'medium':
      return {
        badge: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        icon: 'text-orange-500',
        label: 'Priorité moyenne',
      };
    case 'low':
      return {
        badge: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
        icon: 'text-yellow-500',
        label: 'À surveiller',
      };
  }
};

const getStatusStyles = (status: DecisionStatus) => {
  switch (status) {
    case 'treated':
      return {
        badge: 'bg-green-500/10 text-green-600 border-green-500/20',
        icon: CheckCircle2,
        label: 'Traité',
      };
    case 'ignored':
      return {
        badge: 'bg-muted text-muted-foreground border-muted',
        icon: XCircle,
        label: 'Ignoré',
      };
    default:
      return {
        badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        icon: Eye,
        label: 'Nouveau',
      };
  }
};

export default function DecisionDetail() {
  const { decisionId } = useParams<{ decisionId: string }>();
  const navigate = useNavigate();
  const { decisions, loading: decisionsLoading, error: decisionsError } = useDecisions();
  const { data: diversificationData, loading: divLoading } = useDiversification();
  const { data: userProfile } = useUserProfile();
  const { getStatus, markAsTreated, markAsIgnored } = useDecisionStatus();

  const decision = useMemo(() => {
    return decisions.find(d => d.id === decisionId);
  }, [decisions, decisionId]);

  const status = decisionId ? getStatus(decisionId) : 'new';
  const statusStyles = getStatusStyles(status);
  const StatusIcon = statusStyles.icon;

  // Calculate diagnostic data
  const diagnosticData = useMemo(() => {
    if (!decision || !diversificationData) return null;

    const totalValue = diversificationData.totalValue;
    const thresholds = {
      maxPositionPct: userProfile?.max_position_pct ?? DEFAULT_THRESHOLDS.singlePosition,
      maxAssetClassPct: userProfile?.max_asset_class_pct ?? DEFAULT_THRESHOLDS.assetClass,
      cashTargetPct: userProfile?.cash_target_pct ?? DEFAULT_THRESHOLDS.liquidity,
    };

    // For concentration-position decisions
    if (decision.id.startsWith('concentration-position')) {
      const ticker = decision.relatedHoldings?.[0];
      const holding = diversificationData.holdings.find(h => h.ticker === ticker);
      if (holding) {
        const currentValue = holding.value;
        const currentPct = holding.weight;
        const targetValue = (thresholds.maxPositionPct / 100) * totalValue;
        const amountToReduce = currentValue - targetValue;
        
        return {
          type: 'position',
          threshold: thresholds.maxPositionPct,
          currentValue: currentPct,
          gap: currentPct - thresholds.maxPositionPct,
          holdingValue: currentValue,
          targetValue,
          amountToReduce: Math.max(0, amountToReduce),
          ticker,
        };
      }
    }

    // For concentration-class decisions
    if (decision.id.startsWith('concentration-class')) {
      const assetClass = diversificationData.byAssetClass.find(
        ac => decision.title.includes(ac.name)
      );
      if (assetClass) {
        return {
          type: 'assetClass',
          threshold: thresholds.maxAssetClassPct,
          currentValue: assetClass.percentage,
          gap: assetClass.percentage - thresholds.maxAssetClassPct,
          assetClassName: assetClass.name,
        };
      }
    }

    // For liquidity decisions
    if (decision.id === 'liquidity-excess') {
      const liquidityClasses = ['CASH', 'Livrets', 'Monétaire', 'Épargne'];
      const liquidityTotal = diversificationData.byAssetClass
        .filter(ac => liquidityClasses.some(lc => ac.name?.toLowerCase().includes(lc.toLowerCase())))
        .reduce((sum, ac) => sum + ac.percentage, 0);
      
      const currentLiquidityValue = (liquidityTotal / 100) * totalValue;
      const targetLiquidityValue = (thresholds.cashTargetPct / 100) * totalValue;
      const excessLiquidity = currentLiquidityValue - targetLiquidityValue;
      
      return {
        type: 'liquidity',
        threshold: thresholds.cashTargetPct,
        currentValue: liquidityTotal,
        gap: liquidityTotal - thresholds.cashTargetPct,
        excessAmount: Math.max(0, excessLiquidity),
      };
    }

    // For diversification decisions
    if (decision.id === 'diversification-low') {
      return {
        type: 'diversification',
        threshold: DEFAULT_THRESHOLDS.diversificationScore,
        currentValue: diversificationData.score,
        gap: DEFAULT_THRESHOLDS.diversificationScore - diversificationData.score,
      };
    }

    // For variation decisions
    if (decision.id === 'variation-unusual') {
      return {
        type: 'variation',
        threshold: DEFAULT_THRESHOLDS.weeklyVariation,
        currentValue: parseFloat(decision.impact.replace('%', '').replace('+', '')),
        gap: 0,
      };
    }

    return null;
  }, [decision, diversificationData, userProfile]);

  const handleMarkAsTreated = () => {
    if (decisionId) {
      markAsTreated(decisionId);
      toast.success('Décision marquée comme traitée');
    }
  };

  const handleMarkAsIgnored = () => {
    if (decisionId) {
      markAsIgnored(decisionId);
      toast.success('Décision ignorée');
    }
  };

  if (decisionsLoading || divLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (decisionsError) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card className="border-destructive">
          <CardContent className="py-6">
            <p className="text-destructive">Erreur : {decisionsError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/decisions')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux décisions
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Décision indisponible</h2>
            <p className="text-muted-foreground">
              Cette décision n'existe plus ou a été résolue automatiquement.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = getDecisionIcon(decision.type);
  const severityStyles = getSeverityStyles(decision.severity);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate('/decisions')} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour aux décisions
      </Button>

      {/* Bloc A: Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className={`p-3 rounded-lg bg-muted ${severityStyles.icon}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{decision.title}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={severityStyles.badge}>
                  {severityStyles.label}
                </Badge>
                <Badge variant="outline" className={statusStyles.badge}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusStyles.label}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-foreground">{decision.impact}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Bloc B: Diagnostic transparent */}
      {diagnosticData && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Diagnostic</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Seuil configuré</p>
                <p className="text-lg font-semibold">
                  {diagnosticData.type === 'diversification' 
                    ? `${diagnosticData.threshold}/100`
                    : `${diagnosticData.threshold}%`}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Valeur actuelle</p>
                <p className="text-lg font-semibold">
                  {diagnosticData.type === 'diversification'
                    ? `${diagnosticData.currentValue}/100`
                    : `${diagnosticData.currentValue.toFixed(1)}%`}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Écart</p>
                <p className={`text-lg font-semibold ${diagnosticData.gap > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {diagnosticData.gap > 0 ? '+' : ''}{diagnosticData.gap.toFixed(1)}
                  {diagnosticData.type === 'diversification' ? ' pts' : ' pts'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bloc C: Impact & explication */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Impact & contexte</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">
            {decision.explanation}
          </p>
          
          {decision.relatedHoldings && decision.relatedHoldings.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Positions concernées</p>
              <div className="flex flex-wrap gap-1.5">
                {decision.relatedHoldings.map((ticker) => (
                  <Badge key={ticker} variant="secondary" className="text-xs font-mono">
                    {ticker}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bloc D: Plan d'action */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Plan d'action suggéré</CardTitle>
          </div>
          <CardDescription>
            Ces suggestions sont indicatives et ne constituent pas un conseil financier.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Option 1: Action douce */}
          <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Shield className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Option prudente</h4>
                {decision.type === 'concentration' && (
                  <p className="text-sm text-muted-foreground">
                    Ne plus renforcer cette position tant qu'elle dépasse le seuil de{' '}
                    {diagnosticData?.threshold ?? DEFAULT_THRESHOLDS.singlePosition}%.
                    Laisser le temps au reste du portefeuille de rééquilibrer naturellement.
                  </p>
                )}
                {decision.type === 'liquidity' && (
                  <p className="text-sm text-muted-foreground">
                    Mettre en place un plan d'investissement progressif (DCA) pour déployer
                    l'excédent de liquidités sur plusieurs mois.
                  </p>
                )}
                {decision.type === 'diversification' && (
                  <p className="text-sm text-muted-foreground">
                    Orienter les prochains investissements vers des régions ou secteurs
                    sous-représentés dans votre portefeuille.
                  </p>
                )}
                {decision.type === 'variation' && (
                  <p className="text-sm text-muted-foreground">
                    Observer l'évolution sur les prochaines semaines avant d'agir.
                    Cette variation peut être temporaire.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Option 2: Action directe */}
          <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-orange-500/10">
                <Zap className="h-4 w-4 text-orange-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Option directe</h4>
                {decision.type === 'concentration' && diagnosticData?.type === 'position' && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Réduire la position pour repasser sous le seuil de {diagnosticData.threshold}%.
                    </p>
                    {diagnosticData.amountToReduce > 0 && (
                      <div className="p-3 rounded bg-muted">
                        <p className="text-xs text-muted-foreground">Montant indicatif à céder</p>
                        <p className="text-lg font-semibold">
                          ~{diagnosticData.amountToReduce.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {decision.type === 'concentration' && diagnosticData?.type === 'assetClass' && (
                  <p className="text-sm text-muted-foreground">
                    Diversifier vers d'autres classes d'actifs (obligations, immobilier, etc.)
                    pour réduire l'exposition à {diagnosticData.assetClassName}.
                  </p>
                )}
                {decision.type === 'liquidity' && diagnosticData?.type === 'liquidity' && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Investir l'excédent de liquidités pour optimiser le rendement potentiel.
                    </p>
                    {diagnosticData.excessAmount > 0 && (
                      <div className="p-3 rounded bg-muted">
                        <p className="text-xs text-muted-foreground">Excédent disponible</p>
                        <p className="text-lg font-semibold">
                          ~{diagnosticData.excessAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {decision.type === 'diversification' && (
                  <p className="text-sm text-muted-foreground">
                    Ajouter des ETF géographiques (marchés émergents) ou sectoriels
                    pour améliorer rapidement la diversification.
                  </p>
                )}
                {decision.type === 'variation' && (
                  <p className="text-sm text-muted-foreground">
                    Rééquilibrer vers vos allocations cibles en profitant de ce mouvement
                    pour vendre les positions en hausse et renforcer celles en baisse.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bloc E: Actions utilisateur */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleMarkAsTreated} 
              className="flex-1"
              variant={status === 'treated' ? 'secondary' : 'default'}
              disabled={status === 'treated'}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {status === 'treated' ? 'Déjà traité' : 'Marquer comme traité'}
            </Button>
            <Button 
              onClick={handleMarkAsIgnored} 
              variant="outline" 
              className="flex-1"
              disabled={status === 'ignored'}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {status === 'ignored' ? 'Déjà ignoré' : 'Ignorer'}
            </Button>
            {decision.relatedHoldings && decision.relatedHoldings.length > 0 && (
              <Button 
                variant="ghost" 
                onClick={() => navigate('/diversification')}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Voir les positions
              </Button>
            )}
          </div>

          <Separator className="my-4" />
          
          <p className="text-xs text-muted-foreground text-center">
            Ces informations sont enregistrées localement sur votre appareil uniquement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
