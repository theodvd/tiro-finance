/**
 * Insights — fusion Insights + Diversification + Décisions en 3 onglets.
 *
 * Onglets :
 *   • Analyse       — analytics portefeuille (ex-Insights.tsx)
 *   • Diversification — analyse allocation (ex-Diversification.tsx)
 *   • Décisions     — points d'attention actionnables (ex-Decisions.tsx)
 *
 * Les hooks sont tous appelés au niveau du composant racine (règles React).
 * Chaque onglet gère son propre état loading/error interne.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── UI ──────────────────────────────────────────────────────────────────────
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// ── Recharts ────────────────────────────────────────────────────────────────
import {
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, ResponsiveContainer, CartesianGrid,
} from 'recharts';

// ── Icônes ───────────────────────────────────────────────────────────────────
import {
  AlertCircle, AlertTriangle,
  CheckCircle, CheckCircle2,
  Eye, XCircle, Layers, Info,
  Loader2, Plus, RefreshCw, Sparkles,
  TrendingUp, TrendingDown,
} from 'lucide-react';

// ── Hooks ────────────────────────────────────────────────────────────────────
import { useDiversificationScore, AllocationBreakdown } from '@/hooks/useDiversificationScore';
import { useInsightsData } from '@/hooks/useInsightsData';
import { useInvestorProfile } from '@/hooks/useInvestorProfile';
import { useDecisions } from '@/hooks/useDecisions';
import { useDecisionStatus } from '@/hooks/useDecisionStatus';

// ── Composants diversification ───────────────────────────────────────────────
import { ScoreExplanation } from '@/components/diversification/ScoreExplanation';
import { DiversificationScoreCard } from '@/components/diversification/DiversificationScoreCard';
import { AllocationChart } from '@/components/diversification/AllocationChart';
import { HoldingsPanel } from '@/components/diversification/HoldingsPanel';
import { ConcentrationRisksPanel } from '@/components/diversification/ConcentrationRisksPanel';
import { RecommendationsPanel } from '@/components/diversification/RecommendationsPanel';

// ── Composants décisions ─────────────────────────────────────────────────────
import { DecisionCard } from '@/components/decisions/DecisionCard';

// ── Lib ───────────────────────────────────────────────────────────────────────
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getRiskBasedInsights } from '@/lib/investorRules';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DecisionStatus } from '@/hooks/useDecisionStatus';

// ─────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────

const COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--primary))',
  'hsl(var(--accent))', 'hsl(var(--success))',
];

// ─────────────────────────────────────────────────────────────
// Types locaux (Diversification)
// ─────────────────────────────────────────────────────────────

interface ConcentrationRisk {
  type: 'single_stock' | 'sector' | 'region' | 'asset_class';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  percentage: number;
  threshold: number;
  holdings: string[];
}

interface DiversificationRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  relatedHoldings: string[];
}

type FilterType = 'toHandle' | 'ignored' | 'treated' | 'all';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const fmtCompact = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(v);
const fmtFull = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);
const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

// ─────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────

export default function Insights() {
  const navigate = useNavigate();

  // ── État partagé (actions header) ──────────────────────────
  const [enriching, setEnriching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Onglet Analyse ─────────────────────────────────────────
  const {
    profile, profileLabel, profileExists, thresholds,
    loading: profileLoading, rawProfile,
  } = useInvestorProfile();
  const maxPositionPct = thresholds.maxStockPositionPct;
  const {
    data: scoreData, loading: scoreLoading, refetch: refetchScore,
  } = useDiversificationScore(false);
  const {
    loading: insightsLoading, error: insightsError,
    data: insightsData, refetch: refetchInsights,
  } = useInsightsData(maxPositionPct);
  const risk = getRiskBasedInsights(rawProfile?.risk_profile);

  // ── Onglet Diversification ─────────────────────────────────
  const [lookThroughMode, setLookThroughMode] = useState(false);
  const {
    loading: divLoading, error: divError, data: divData, refetch: divRefetch,
    maxPositionPct: divMaxPos, maxAssetClassPct,
  } = useDiversificationScore(lookThroughMode);
  const [selectedBreakdown, setSelectedBreakdown] = useState<AllocationBreakdown | null>(null);
  const [panelType, setPanelType] = useState<'asset_class' | 'region' | 'sector'>('asset_class');

  // ── Onglet Décisions ───────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<FilterType>('toHandle');
  const { decisions, lastAnalysisDate, loading: decisionsLoading, error: decisionsError } = useDecisions();
  const { getStatus, markAsIgnored, resetAll, countByStatus } = useDecisionStatus();

  // ─────────────────────────────────────────────────────────────
  // Handlers communs
  // ─────────────────────────────────────────────────────────────

  const handleEnrichMetadata = async () => {
    setEnriching(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('enrich-securities', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      toast.success(result.message || 'Métadonnées enrichies', {
        description: `${result.updated} actifs mis à jour sur ${result.total}.`,
        duration: 5000,
      });
      await Promise.all([refetchScore(), divRefetch(), refetchInsights()]);
    } catch (err: any) {
      toast.error("Erreur lors de l'enrichissement", { description: err.message });
    } finally {
      setEnriching(false);
    }
  };

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('refresh-prices', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      toast.success('Prix mis à jour', {
        description: `${result?.updated || 0} prix rafraîchis.`,
        duration: 4000,
      });
      await Promise.all([refetchScore(), divRefetch(), refetchInsights()]);
    } catch (err: any) {
      toast.error('Erreur lors du rafraîchissement', { description: err.message });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshMetadata = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('refresh-snapshot-metadata', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      toast.success('Données rafraîchies');
      await divRefetch();
    } catch (err: any) {
      toast.error('Erreur lors du rafraîchissement', { description: err.message });
    } finally {
      setRefreshing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Calculs Diversification
  // ─────────────────────────────────────────────────────────────

  const THRESHOLDS = { singleStock: divMaxPos, sector: 40, region: maxAssetClassPct };

  const buildDivData = () => {
    if (!divData) return { concentrationRisks: [] as ConcentrationRisk[], recommendations: [] as DiversificationRecommendation[] };
    const concentrationRisks: ConcentrationRisk[] = [];

    divData.holdings
      .filter((h) => h.weightPct > divMaxPos)
      .sort((a, b) => b.weightPct - a.weightPct)
      .slice(0, 3)
      .forEach((h) =>
        concentrationRisks.push({
          type: 'single_stock',
          severity: h.weightPct > 20 ? 'high' : h.weightPct > 15 ? 'medium' : 'low',
          title: `Position concentrée : ${h.ticker}`,
          description: `${h.name} représente ${h.weightPct.toFixed(1)}% de votre portefeuille.`,
          percentage: h.weightPct,
          threshold: divMaxPos,
          holdings: [h.ticker],
        })
      );

    divData.bySector
      .filter((s) => s.name !== 'Non classifié' && s.percentage > THRESHOLDS.sector)
      .forEach((s) =>
        concentrationRisks.push({
          type: 'sector',
          severity: s.percentage > 60 ? 'high' : s.percentage > 50 ? 'medium' : 'low',
          title: `Surexposition secteur : ${s.name}`,
          description: `Le secteur ${s.name} représente ${s.percentage.toFixed(1)}% de votre portefeuille.`,
          percentage: s.percentage,
          threshold: THRESHOLDS.sector,
          holdings: s.holdings.map((h) => h.ticker),
        })
      );

    divData.byRegion
      .filter((r) => r.name !== 'Non classifié' && r.percentage > THRESHOLDS.region)
      .forEach((r) =>
        concentrationRisks.push({
          type: 'region',
          severity: r.percentage > 85 ? 'high' : r.percentage > 75 ? 'medium' : 'low',
          title: `Concentration géographique : ${r.name}`,
          description: `La région ${r.name} représente ${r.percentage.toFixed(1)}% de votre portefeuille.`,
          percentage: r.percentage,
          threshold: THRESHOLDS.region,
          holdings: r.holdings.map((h) => h.ticker),
        })
      );

    const recommendations: DiversificationRecommendation[] = concentrationRisks
      .slice(0, 4)
      .map((risk, idx) => ({
        id: `rec-${idx}`,
        title:
          risk.type === 'single_stock'
            ? 'Rééquilibrer la position'
            : risk.type === 'sector'
            ? `Diversifier hors ${risk.title.replace('Surexposition secteur : ', '')}`
            : 'Exposition internationale',
        description: risk.description,
        priority: risk.severity,
        relatedHoldings: risk.holdings.slice(0, 3),
      }));

    return { concentrationRisks, recommendations };
  };

  // ─────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────

  const analyseLoading = scoreLoading || insightsLoading || profileLoading;

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 p-4 sm:p-6 md:p-8">

      {/* ── Header commun ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Insights</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={handleEnrichMetadata}
            disabled={enriching || refreshing}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-initial"
          >
            {enriching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Enrichir</span>
          </Button>
          <Button
            onClick={handleRefreshPrices}
            disabled={enriching || refreshing}
            variant="default"
            size="sm"
            className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-initial"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Rafraîchir les prix</span>
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ONGLETS PRINCIPAUX
      ══════════════════════════════════════════════════════════ */}
      <Tabs defaultValue="analyse" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analyse" className="text-xs sm:text-sm">Analyse</TabsTrigger>
          <TabsTrigger value="diversification" className="text-xs sm:text-sm">Diversification</TabsTrigger>
          <TabsTrigger value="decisions" className="text-xs sm:text-sm">
            Décisions
            {!decisionsLoading && decisions.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {countByStatus(decisions).toHandle}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════
            ONGLET 1 — ANALYSE
        ══════════════════════════════════════════════════════ */}
        <TabsContent value="analyse" className="space-y-4 sm:space-y-6">
          {analyseLoading ? (
            <div className="grid gap-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-64" />
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
              </div>
            </div>
          ) : insightsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{insightsError}</AlertDescription>
            </Alert>
          ) : !scoreData || !insightsData || !insightsData.dataQuality.hasHoldings ? (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Aucune donnée disponible</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Pour voir vos insights, commencez par ajouter des investissements à votre portefeuille.
                </p>
                <Button onClick={() => navigate('/perso/patrimoine')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Ajouter un investissement
                </Button>
              </div>
            </Card>
          ) : (() => {
            const diversificationScore = scoreData.score;
            const {
              totalValue, totalInvested, pnl, pnlPct, lastUpdated,
              allocByAccount, allocByClass, allocByRegion, allocBySector,
              snapshotVariation, topGainers, topLosers,
              series, snapshots, dataQuality,
            } = insightsData;

            const getScoreColor = (s: number) =>
              s >= 80 ? 'text-[hsl(var(--success))]'
              : s >= 60 ? 'text-[hsl(var(--chart-1))]'
              : s >= 40 ? 'text-[hsl(var(--accent))]'
              : 'text-[hsl(var(--destructive))]';

            const getScoreBadgeVariant = (s: number): 'default' | 'secondary' | 'destructive' | 'outline' =>
              s >= 80 ? 'default' : s >= 60 ? 'secondary' : s >= 40 ? 'outline' : 'destructive';

            return (
              <>
                {/* KPIs */}
                <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
                  {[
                    { label: 'Valeur totale', value: fmtCompact(totalValue), color: '' },
                    { label: 'Investi', value: fmtCompact(totalInvested), color: '' },
                    {
                      label: 'Plus/Moins-value',
                      value: fmtCompact(pnl),
                      color: pnl >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive',
                    },
                    {
                      label: 'Performance',
                      value: fmtPct(pnlPct),
                      color: pnlPct >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive',
                    },
                  ].map((kpi) => (
                    <Card key={kpi.label} className="rounded-xl">
                      <CardContent className="p-3 sm:p-4">
                        <p className="text-xs text-muted-foreground">{kpi.label}</p>
                        <p className={`text-lg sm:text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Score de diversification */}
                <Card className="rounded-xl sm:rounded-2xl">
                  <CardHeader className="px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                        Score de Diversification
                        <Badge variant={getScoreBadgeVariant(diversificationScore.totalScore)} className="ml-2">
                          {diversificationScore.label}
                        </Badge>
                      </CardTitle>
                      <span className={`text-2xl sm:text-3xl font-bold ${getScoreColor(diversificationScore.totalScore)}`}>
                        {diversificationScore.totalScore}/100
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="space-y-3">
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            diversificationScore.totalScore >= 80 ? 'bg-[hsl(var(--success))]'
                            : diversificationScore.totalScore >= 60 ? 'bg-[hsl(var(--chart-1))]'
                            : diversificationScore.totalScore >= 40 ? 'bg-[hsl(var(--accent))]'
                            : 'bg-[hsl(var(--destructive))]'
                          }`}
                          style={{ width: `${diversificationScore.totalScore}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                        {diversificationScore.subscores.map((sub) => (
                          <div key={sub.name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{sub.name}</span>
                              <span className="font-medium">{sub.score}/{sub.maxScore}</span>
                            </div>
                            <Progress value={(sub.score / sub.maxScore) * 100} className="h-1.5" />
                            <p className="text-[10px] text-muted-foreground">{sub.description}</p>
                          </div>
                        ))}
                      </div>
                      <ScoreExplanation
                        score={diversificationScore}
                        lookThroughScore={scoreData.lookThroughScore}
                        isLookThroughMode={false}
                        onEnrichClick={handleEnrichMetadata}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Résumé + Recommandations */}
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <Card className="rounded-xl sm:rounded-2xl">
                    <CardHeader className="px-4 sm:px-6 py-4">
                      <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Résumé Automatique
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 pb-4 space-y-2">
                      {snapshotVariation && (
                        <div className="flex items-start gap-2">
                          {snapshotVariation.variation >= 0
                            ? <CheckCircle className="h-4 w-4 text-[hsl(var(--success))] mt-0.5 flex-shrink-0" />
                            : <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />}
                          <p className="text-xs sm:text-sm">
                            {snapshotVariation.variation >= 0 ? 'Progression' : 'Baisse'} de{' '}
                            <strong className={snapshotVariation.variation >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}>
                              {fmtPct(snapshotVariation.variationPct)}
                            </strong>{' '}
                            ({fmtCompact(Math.abs(snapshotVariation.variation))}) {snapshotVariation.periodLabel}.
                          </p>
                        </div>
                      )}
                      {topGainers.length > 0 && (
                        <div className="flex items-start gap-2">
                          <TrendingUp className="h-4 w-4 text-[hsl(var(--success))] mt-0.5 flex-shrink-0" />
                          <p className="text-xs sm:text-sm">
                            Meilleures performances :{' '}
                            {topGainers.map((g, i) => (
                              <span key={g.ticker}>
                                <strong>{g.ticker}</strong> ({fmtPct(g.pnlPct)})
                                {i < topGainers.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </p>
                        </div>
                      )}
                      {topLosers.length > 0 && (
                        <div className="flex items-start gap-2">
                          <TrendingDown className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                          <p className="text-xs sm:text-sm">
                            À surveiller :{' '}
                            {topLosers.map((l, i) => (
                              <span key={l.ticker}>
                                <strong>{l.ticker}</strong> ({fmtPct(l.pnlPct)})
                                {i < topLosers.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </p>
                        </div>
                      )}
                      {diversificationScore.coverage.classifiedPositions < diversificationScore.coverage.totalPositions && (
                        <div className="flex items-start gap-2 pt-1">
                          <AlertCircle className="h-4 w-4 text-[hsl(var(--accent))] mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            {diversificationScore.coverage.totalPositions - diversificationScore.coverage.classifiedPositions} positions non classifiées.
                            Cliquez sur "Enrichir" pour améliorer la précision.
                          </p>
                        </div>
                      )}
                      {!snapshotVariation && !dataQuality.hasSnapshots && (
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            Pas encore de snapshots. L'historique se construira automatiquement chaque semaine.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {profileExists && (
                    <Card className="rounded-xl sm:rounded-2xl">
                      <CardHeader className="px-4 sm:px-6 py-4">
                        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Recommandations ({profileLabel})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 sm:px-6 pb-4">
                        <ul className="space-y-2">
                          {risk.insights.slice(0, 4).map((item, idx) => (
                            <li key={idx} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Graphique évolution */}
                <Card className="rounded-xl sm:rounded-2xl">
                  <CardHeader className="px-4 sm:px-6 py-4">
                    <CardTitle className="text-sm sm:text-base md:text-lg">Évolution du Portefeuille</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4">
                    {series.length < 2 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground mb-3">
                          Pas assez de données historiques. L'historique se construit automatiquement chaque semaine.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => navigate('/monthly-review')}>
                          Créer un point mensuel
                        </Button>
                      </div>
                    ) : (
                      <ChartContainer
                        config={{
                          value: { label: 'Valeur', color: 'hsl(var(--primary))' },
                          invested: { label: 'Investi', color: 'hsl(var(--muted))' },
                        }}
                        className="h-[220px] sm:h-[280px] md:h-[320px]"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} width={50} tickFormatter={fmtCompact} />
                            <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtFull(Number(v))} />} />
                            <Line type="monotone" dataKey="invested" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Répartitions */}
                <Tabs defaultValue="account" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto sm:h-10">
                    <TabsTrigger value="account" className="text-[10px] sm:text-xs py-2 sm:py-0">Compte</TabsTrigger>
                    <TabsTrigger value="class" className="text-[10px] sm:text-xs py-2 sm:py-0">Classe</TabsTrigger>
                    <TabsTrigger value="region" className="text-[10px] sm:text-xs py-2 sm:py-0">Région</TabsTrigger>
                    <TabsTrigger value="sector" className="text-[10px] sm:text-xs py-2 sm:py-0">Secteur</TabsTrigger>
                  </TabsList>
                  {[
                    { value: 'account', title: 'Répartition par Compte', data: allocByAccount },
                    { value: 'class', title: 'Répartition par Classe', data: allocByClass },
                    { value: 'region', title: 'Répartition par Région', data: allocByRegion },
                    { value: 'sector', title: 'Répartition par Secteur', data: allocBySector },
                  ].map(({ value, title, data: allocData }) => (
                    <TabsContent key={value} value={value}>
                      <Card className="rounded-xl sm:rounded-2xl">
                        <CardHeader className="px-4 sm:px-6 py-4">
                          <CardTitle className="text-sm sm:text-base">{title}</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6 pb-4">
                          {allocData.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <ChartContainer config={{}} className="h-[200px] sm:h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie data={allocData} cx="50%" cy="50%" labelLine={false} outerRadius={70} dataKey="value" nameKey="name">
                                      {allocData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} fillOpacity={0.85} />
                                      ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtFull(Number(v))} />} />
                                  </PieChart>
                                </ResponsiveContainer>
                              </ChartContainer>
                              <div className="space-y-2 text-sm">
                                {allocData.map((item, idx) => (
                                  <div key={item.name} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                      <span className="truncate text-xs sm:text-sm">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 text-xs sm:text-sm">
                                      <span className="text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                                      <span className="font-medium">{fmtCompact(item.value)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>

                {/* Historique snapshots */}
                {snapshots.length > 0 && (
                  <Card className="rounded-xl sm:rounded-2xl">
                    <CardHeader className="px-4 sm:px-6 py-4">
                      <CardTitle className="text-sm sm:text-base">Historique des Snapshots</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 pb-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs sm:text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2">Date</th>
                              <th className="text-right py-2 px-2">Valeur</th>
                              <th className="text-right py-2 px-2 hidden sm:table-cell">Investi</th>
                              <th className="text-right py-2 px-2">P/L</th>
                              <th className="text-right py-2 px-2">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {snapshots.slice(0, 10).map((snap: any) => {
                              const snapPnl = Number(snap.pnl_eur || 0);
                              const snapPnlPct = Number(snap.pnl_pct || 0);
                              return (
                                <tr key={snap.id} className="border-b border-border/50">
                                  <td className="py-2 px-2">
                                    {new Date(snap.snapshot_ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                  </td>
                                  <td className="text-right py-2 px-2 font-medium">{fmtCompact(Number(snap.total_value_eur || 0))}</td>
                                  <td className="text-right py-2 px-2 hidden sm:table-cell text-muted-foreground">{fmtCompact(Number(snap.total_invested_eur || 0))}</td>
                                  <td className={`text-right py-2 px-2 ${snapPnl >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>{fmtCompact(snapPnl)}</td>
                                  <td className={`text-right py-2 px-2 ${snapPnlPct >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>{fmtPct(snapPnlPct)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Source */}
                <Card className="rounded-xl bg-muted/30 border-dashed">
                  <CardContent className="p-4 text-xs text-muted-foreground">
                    <p className="flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Source unique :</strong> Le score de diversification utilise l'indice HHI sur 4 dimensions : classes d'actifs, régions, secteurs et concentration par position.
                        {lastUpdated && (
                          <span className="block mt-1">
                            Dernière mise à jour des prix : {new Date(lastUpdated).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </span>
                    </p>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════
            ONGLET 2 — DIVERSIFICATION
        ══════════════════════════════════════════════════════ */}
        <TabsContent value="diversification" className="space-y-4 sm:space-y-6">
          {divLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-40" />
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
              </div>
            </div>
          ) : divError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{divError}</AlertDescription>
            </Alert>
          ) : !divData || divData.holdings.length === 0 ? (
            <Card className="p-8 text-center">
              <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">Aucune position trouvée</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Ajoutez des positions à votre portefeuille pour voir l'analyse de diversification.
              </p>
              <Button onClick={() => divRefetch()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </Card>
          ) : (() => {
            const hasLookThroughData = divData.lookThrough?.hasLookThroughData ?? false;
            const displayRegion = lookThroughMode && hasLookThroughData ? divData.lookThrough!.realGeographic : divData.byRegion;
            const displaySector = lookThroughMode && hasLookThroughData ? divData.lookThrough!.realSectoral : divData.bySector;
            const { concentrationRisks, recommendations } = buildDivData();
            const scoreLabel = divData.score.label;
            const dataQuality = {
              classified: divData.score.coverage.classifiedPositions,
              unclassified: divData.score.coverage.totalPositions - divData.score.coverage.classifiedPositions,
              total: divData.score.coverage.totalPositions,
            };

            return (
              <>
                {/* Data quality warning */}
                {dataQuality.unclassified > 0 && (
                  <Alert className="rounded-xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs sm:text-sm">
                      {dataQuality.unclassified} sur {dataQuality.total} positions n'ont pas de métadonnées complètes.
                      Cliquez sur "Enrichir" puis "Rafraîchir" pour améliorer la précision.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Look-Through */}
                {hasLookThroughData && (
                  <Card className="rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Layers className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">Analyse Look-Through</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Décompose vos ETFs pour révéler l'exposition réelle sous-jacente.
                              <br />
                              <span className="text-primary font-medium">
                                {divData.lookThrough!.etfsWithData.length} ETF{divData.lookThrough!.etfsWithData.length > 1 ? 's' : ''} analysé{divData.lookThrough!.etfsWithData.length > 1 ? 's' : ''}{' '}
                                ({divData.lookThrough!.lookThroughCoverage.toFixed(0)}% du portefeuille)
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center space-x-2">
                                  <Label htmlFor="lookthrough-mode" className="text-xs cursor-pointer flex items-center gap-1.5">
                                    <Eye className="h-3.5 w-3.5" />
                                    {lookThroughMode ? 'Vue réelle' : 'Vue nominale'}
                                  </Label>
                                  <Switch id="lookthrough-mode" checked={lookThroughMode} onCheckedChange={setLookThroughMode} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                <p className="text-xs">
                                  <strong>Vue nominale :</strong> Affiche vos positions telles qu'elles sont.<br /><br />
                                  <strong>Vue réelle :</strong> Décompose les ETFs pour montrer où votre argent est vraiment investi.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      {lookThroughMode && (
                        <div className="mt-3 pt-3 border-t border-primary/10 flex flex-wrap gap-1.5">
                          {divData.lookThrough!.etfsWithData.map((etf) => (
                            <Badge key={etf} variant="secondary" className="text-xs bg-primary/10 text-primary">{etf}</Badge>
                          ))}
                          {divData.lookThrough!.etfsWithoutData.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    +{divData.lookThrough!.etfsWithoutData.length} sans données
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    Ces ETFs n'ont pas de données de composition :<br />
                                    {divData.lookThrough!.etfsWithoutData.join(', ')}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Score Card + Explanation */}
                <DiversificationScoreCard
                  score={divData.score.totalScore}
                  scoreLabel={scoreLabel}
                  lastUpdated={divData.lastUpdated}
                  totalValue={divData.totalValue}
                  dataQuality={dataQuality}
                />
                <ScoreExplanation
                  score={divData.score}
                  lookThroughScore={divData.lookThroughScore}
                  isLookThroughMode={lookThroughMode}
                  onEnrichClick={handleEnrichMetadata}
                />

                {/* Allocation Charts */}
                <Tabs defaultValue="asset_class" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3 h-auto">
                    <TabsTrigger value="asset_class" className="text-xs sm:text-sm py-2">Classe d'actif</TabsTrigger>
                    <TabsTrigger value="region" className="text-xs sm:text-sm py-2">
                      Géographie
                      {lookThroughMode && hasLookThroughData && (
                        <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 bg-primary/20 text-primary">LT</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="sector" className="text-xs sm:text-sm py-2">
                      Secteur
                      {lookThroughMode && hasLookThroughData && (
                        <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 bg-primary/20 text-primary">LT</Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="asset_class">
                    <AllocationChart
                      data={divData.byAssetClass}
                      title="Allocation par Classe d'Actif"
                      onSliceClick={(b) => { setSelectedBreakdown(b as AllocationBreakdown); setPanelType('asset_class'); }}
                    />
                  </TabsContent>
                  <TabsContent value="region">
                    <AllocationChart
                      data={displayRegion}
                      title={lookThroughMode && hasLookThroughData ? 'Allocation Géographique (Look-Through)' : 'Allocation Géographique'}
                      onSliceClick={(b) => { setSelectedBreakdown(b as AllocationBreakdown); setPanelType('region'); }}
                    />
                    {lookThroughMode && hasLookThroughData && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        <Info className="h-3 w-3 inline mr-1" />
                        Vue décomposée de l'exposition géographique réelle via ETFs.
                      </p>
                    )}
                  </TabsContent>
                  <TabsContent value="sector">
                    <AllocationChart
                      data={displaySector}
                      title={lookThroughMode && hasLookThroughData ? 'Allocation par Secteur (Look-Through)' : 'Allocation par Secteur'}
                      onSliceClick={(b) => { setSelectedBreakdown(b as AllocationBreakdown); setPanelType('sector'); }}
                    />
                    {lookThroughMode && hasLookThroughData && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        <Info className="h-3 w-3 inline mr-1" />
                        Vue décomposée de l'exposition sectorielle réelle via ETFs.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Risques + Recommandations */}
                <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                  <ConcentrationRisksPanel risks={concentrationRisks} />
                  <RecommendationsPanel recommendations={recommendations} />
                </div>

                {/* Rafraîchir métadonnées (bouton dédié Diversification) */}
                <div className="flex justify-end">
                  <Button onClick={handleRefreshMetadata} disabled={enriching || refreshing} variant="outline" size="sm">
                    {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                    Rafraîchir les métadonnées
                  </Button>
                </div>

                {/* Disclaimer */}
                <Card className="rounded-xl bg-muted/30 border-dashed">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground text-center">
                      <Info className="h-3 w-3 inline mr-1" />
                      Ces informations sont fournies à titre indicatif et ne constituent pas un conseil en investissement personnalisé.
                    </p>
                  </CardContent>
                </Card>

                {/* Side panel Holdings */}
                <HoldingsPanel
                  isOpen={selectedBreakdown !== null}
                  onClose={() => setSelectedBreakdown(null)}
                  breakdown={selectedBreakdown}
                  type={panelType}
                />
              </>
            );
          })()}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════
            ONGLET 3 — DÉCISIONS
        ══════════════════════════════════════════════════════ */}
        <TabsContent value="decisions" className="space-y-6">
          {decisionsLoading ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
              </div>
            </div>
          ) : decisionsError ? (
            <Card className="border-destructive">
              <CardContent className="flex items-center gap-3 py-6">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">Erreur lors de l'analyse : {decisionsError}</p>
              </CardContent>
            </Card>
          ) : (() => {
            const counts = countByStatus(decisions);
            const filteredDecisions = decisions.filter((d) => {
              const status = getStatus(d.id);
              switch (activeFilter) {
                case 'toHandle': return status === 'new' || status === 'viewed';
                case 'ignored': return status === 'ignored';
                case 'treated': return status === 'treated';
                default: return true;
              }
            });

            return (
              <>
                {/* Header décisions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Décisions & points d'attention</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Dernière analyse : {format(new Date(lastAnalysisDate), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                  {(counts.ignored > 0 || counts.treated > 0) && (
                    <Button variant="outline" size="sm" onClick={resetAll}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Réinitialiser
                    </Button>
                  )}
                </div>

                {/* Filtres */}
                <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterType)}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="toHandle" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">À traiter</span>
                      {counts.toHandle > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{counts.toHandle}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="ignored" className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Ignorées</span>
                      {counts.ignored > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{counts.ignored}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="treated" className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Traitées</span>
                      {counts.treated > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{counts.treated}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="all" className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden sm:inline">Tout</span>
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{decisions.length}</Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Empty state */}
                {filteredDecisions.length === 0 && (
                  <Card className="border-green-500/20 bg-green-500/5">
                    <CardHeader className="text-center py-12">
                      <div className="mx-auto p-3 rounded-full bg-green-500/10 w-fit mb-4">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      </div>
                      <CardTitle className="text-xl text-green-700">
                        {activeFilter === 'toHandle' && 'Tout est en ordre'}
                        {activeFilter === 'ignored' && 'Aucune décision ignorée'}
                        {activeFilter === 'treated' && 'Aucune décision traitée'}
                        {activeFilter === 'all' && 'Aucune décision détectée'}
                      </CardTitle>
                      <CardDescription className="text-green-600/80 max-w-md mx-auto">
                        {activeFilter === 'toHandle' && "Aucun point d'attention détecté sur votre portefeuille."}
                        {activeFilter === 'ignored' && 'Les décisions que vous ignorerez apparaîtront ici.'}
                        {activeFilter === 'treated' && 'Les décisions que vous marquerez comme traitées apparaîtront ici.'}
                        {activeFilter === 'all' && "Votre portefeuille ne présente actuellement aucun point d'attention."}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}

                {/* Grille de décisions */}
                {filteredDecisions.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredDecisions.map((decision) => (
                      <DecisionCard
                        key={decision.id}
                        decision={decision}
                        status={getStatus(decision.id)}
                        onViewDetail={() => navigate(`/decisions/${decision.id}`)}
                        onDismiss={activeFilter !== 'ignored' ? () => markAsIgnored(decision.id) : undefined}
                      />
                    ))}
                  </div>
                )}

                {/* Règles */}
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Comment ces alertes sont générées</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs text-muted-foreground space-y-1.5">
                      <li>• <strong>Concentration</strong> : position unique {'>'}10% ou classe d'actifs {'>'}70%</li>
                      <li>• <strong>Liquidités</strong> : épargne liquide {'>'}20% du patrimoine</li>
                      <li>• <strong>Diversification</strong> : score inférieur à 40/100</li>
                      <li>• <strong>Variation</strong> : mouvement {'>'}10% sur la dernière période</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-3 italic">
                      Ces règles sont indicatives et ne constituent pas un conseil financier personnalisé.
                    </p>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
