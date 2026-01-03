import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { 
  AlertCircle, 
  Sparkles, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Plus,
  Info
} from 'lucide-react';
import { useInsightsData, SubScore } from '@/hooks/useInsightsData';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getRiskBasedInsights } from '@/lib/investorRules';
import { useNavigate } from 'react-router-dom';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
];

export function Insights() {
  const { data: profile } = useUserProfile();
  const maxPositionPct = profile?.max_position_pct ?? 10;
  const { loading, error, data, refetch } = useInsightsData(maxPositionPct);
  const [enriching, setEnriching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const risk = getRiskBasedInsights(profile?.risk_profile);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(value);

  const formatCurrencyFull = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const formatPct = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  const handleEnrichMetadata = async () => {
    setEnriching(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('enrich-securities', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(result.message || 'Métadonnées enrichies avec succès', {
        description: `${result.updated} actifs mis à jour sur ${result.total}.`,
        duration: 5000,
      });

      await refetch();
    } catch (err: any) {
      console.error('Error enriching metadata:', err);
      toast.error('Erreur lors de l\'enrichissement', { description: err.message });
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
        description: `${result.updated || 0} prix rafraîchis.`,
        duration: 4000,
      });

      await refetch();
    } catch (err: any) {
      console.error('Error refreshing prices:', err);
      toast.error('Erreur lors du rafraîchissement', { description: err.message });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 md:p-8">
        <h1 className="text-xl font-bold tracking-tight">Insights</h1>
        <div className="grid gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 md:p-8">
        <h1 className="text-xl font-bold tracking-tight">Insights</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty state
  if (!data || !data.dataQuality.hasHoldings) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 md:p-8">
        <h1 className="text-xl font-bold tracking-tight">Insights</h1>
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Aucune donnée disponible</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Pour voir vos insights, commencez par ajouter des investissements à votre portefeuille.
            </p>
            <Button onClick={() => navigate('/investments')} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un investissement
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { 
    totalValue, totalInvested, pnl, pnlPct, lastUpdated,
    allocByAccount, allocByClass, allocByRegion, allocBySector,
    diversificationScore, snapshotVariation, topGainers, topLosers,
    series, snapshots, dataQuality
  } = data;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[hsl(var(--success))]';
    if (score >= 60) return 'text-[hsl(var(--chart-1))]';
    if (score >= 40) return 'text-[hsl(var(--accent))]';
    return 'text-[hsl(var(--destructive))]';
  };

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    if (score >= 40) return 'outline';
    return 'destructive';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Insights</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Analyse basée sur {dataQuality.totalCount} positions • {dataQuality.classifiedCount} classifiées
          </p>
        </div>
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

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="rounded-xl">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Valeur totale</p>
            <p className="text-lg sm:text-xl font-bold">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Investi</p>
            <p className="text-lg sm:text-xl font-bold">{formatCurrency(totalInvested)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Plus/Moins-value</p>
            <p className={`text-lg sm:text-xl font-bold ${pnl >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
              {formatCurrency(pnl)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Performance</p>
            <p className={`text-lg sm:text-xl font-bold ${pnlPct >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
              {formatPct(pnlPct)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Diversification Score with Sub-scores */}
      <Card className="rounded-xl sm:rounded-2xl">
        <CardHeader className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
              Score de Diversification
              <Badge variant={getScoreBadgeVariant(diversificationScore.total)} className="ml-2">
                {diversificationScore.label}
              </Badge>
            </CardTitle>
            <span className={`text-2xl sm:text-3xl font-bold ${getScoreColor(diversificationScore.total)}`}>
              {diversificationScore.total}/100
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-3">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  diversificationScore.total >= 80 ? 'bg-[hsl(var(--success))]' :
                  diversificationScore.total >= 60 ? 'bg-[hsl(var(--chart-1))]' :
                  diversificationScore.total >= 40 ? 'bg-[hsl(var(--accent))]' :
                  'bg-[hsl(var(--destructive))]'
                }`}
                style={{ width: `${diversificationScore.total}%` }}
              />
            </div>
            
            {/* Sub-scores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {diversificationScore.subScores.map((sub: SubScore) => (
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

            <p className="text-xs text-muted-foreground pt-2 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              Ce score est calculé via l'indice HHI (concentration) sur vos classes, régions, secteurs + pénalité si positions &gt; {maxPositionPct}%.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Insights Summary */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Automated Insights */}
        <Card className="rounded-xl sm:rounded-2xl">
          <CardHeader className="px-4 sm:px-6 py-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Résumé Automatique
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 space-y-2">
            {/* Snapshot variation */}
            {snapshotVariation && (
              <div className="flex items-start gap-2">
                {snapshotVariation.variation >= 0 ? (
                  <CheckCircle className="h-4 w-4 text-[hsl(var(--success))] mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                )}
                <p className="text-xs sm:text-sm">
                  {snapshotVariation.variation >= 0 ? 'Progression' : 'Baisse'} de{' '}
                  <strong className={snapshotVariation.variation >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}>
                    {formatPct(snapshotVariation.variationPct)}
                  </strong>{' '}
                  ({formatCurrency(Math.abs(snapshotVariation.variation))}) {snapshotVariation.periodLabel}.
                </p>
              </div>
            )}

            {/* Top Gainers */}
            {topGainers.length > 0 && (
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-[hsl(var(--success))] mt-0.5 flex-shrink-0" />
                <p className="text-xs sm:text-sm">
                  Meilleures performances :{' '}
                  {topGainers.map((g, i) => (
                    <span key={g.ticker}>
                      <strong>{g.ticker}</strong> ({formatPct(g.pnlPct)})
                      {i < topGainers.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              </div>
            )}

            {/* Top Losers */}
            {topLosers.length > 0 && (
              <div className="flex items-start gap-2">
                <TrendingDown className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-xs sm:text-sm">
                  À surveiller :{' '}
                  {topLosers.map((l, i) => (
                    <span key={l.ticker}>
                      <strong>{l.ticker}</strong> ({formatPct(l.pnlPct)})
                      {i < topLosers.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              </div>
            )}

            {/* Data quality warning */}
            {dataQuality.classifiedCount < dataQuality.totalCount && (
              <div className="flex items-start gap-2 pt-1">
                <AlertCircle className="h-4 w-4 text-[hsl(var(--accent))] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {dataQuality.totalCount - dataQuality.classifiedCount} positions non classifiées. 
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

        {/* Personalized Recommendations */}
        {profile && (
          <Card className="rounded-xl sm:rounded-2xl">
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Recommandations
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

      {/* Portfolio Value Chart */}
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
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    width={50}
                    tickFormatter={formatCurrency}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value) => formatCurrencyFull(Number(value))} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="invested"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Allocations Tabs */}
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
                    {/* Pie Chart */}
                    <ChartContainer config={{}} className="h-[200px] sm:h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={allocData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={70}
                            dataKey="value"
                            nameKey="name"
                          >
                            {allocData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} fillOpacity={0.85} />
                            ))}
                          </Pie>
                          <ChartTooltip
                            content={<ChartTooltipContent formatter={(v) => formatCurrencyFull(Number(v))} />}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>

                    {/* Legend Table */}
                    <div className="space-y-2 text-sm">
                      {allocData.map((item, idx) => (
                        <div key={item.name} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span className="truncate text-xs sm:text-sm">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 text-xs sm:text-sm">
                            <span className="text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                            <span className="font-medium">{formatCurrency(item.value)}</span>
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

      {/* Snapshots History */}
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
                          {new Date(snap.snapshot_ts).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        <td className="text-right py-2 px-2 font-medium">
                          {formatCurrency(Number(snap.total_value_eur || 0))}
                        </td>
                        <td className="text-right py-2 px-2 hidden sm:table-cell text-muted-foreground">
                          {formatCurrency(Number(snap.total_invested_eur || 0))}
                        </td>
                        <td className={`text-right py-2 px-2 ${snapPnl >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                          {formatCurrency(snapPnl)}
                        </td>
                        <td className={`text-right py-2 px-2 ${snapPnlPct >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                          {formatPct(snapPnlPct)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Source Explanation */}
      <Card className="rounded-xl bg-muted/30 border-dashed">
        <CardContent className="p-4 text-xs text-muted-foreground">
          <p className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Sources de données :</strong> Les allocations et P/L sont calculés en temps réel depuis vos holdings 
              et les derniers prix de marché. Le score de diversification utilise l'indice HHI (Herfindahl-Hirschman) 
              pour mesurer la concentration. L'historique provient des snapshots hebdomadaires automatiques.
              {lastUpdated && (
                <span className="block mt-1">
                  Dernière mise à jour des prix : {new Date(lastUpdated).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default Insights;
