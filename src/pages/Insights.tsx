import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
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
  Legend,
} from 'recharts';
import { AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { useSnapshots } from '@/hooks/useSnapshots';
import { InsightsSummary } from '@/components/dashboard/InsightsSummary';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';

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
  const { loading, error, series, snapshots, allocByAccount, allocByClass, allocByRegion, allocBySector, refetch } = useSnapshots();
  const [enriching, setEnriching] = useState(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(value);

  const formatCurrencyFull = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const handleEnrichMetadata = async () => {
    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-securities', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(data.message || 'Métadonnées enrichies avec succès', {
        description: `${data.updated} actifs mis à jour sur ${data.total}. Prenez un nouveau snapshot pour voir les changements dans les graphiques.`,
        duration: 6000,
      });

      // Don't refetch yet - user needs to take a new snapshot first
    } catch (error: any) {
      console.error('Error enriching metadata:', error);
      toast.error('Erreur lors de l\'enrichissement des métadonnées', {
        description: error.message,
      });
    } finally {
      setEnriching(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-6 md:p-8">
        <h1 className="text-xl font-bold tracking-tight">Insights</h1>
        <div className="grid gap-6">
          <Skeleton className="h-96" />
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-6 md:p-8">
        <h1 className="text-xl font-bold tracking-tight">Insights</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Get latest snapshot for summary
  const latestSnapshot = snapshots[0];
  const totalValue = latestSnapshot ? Number(latestSnapshot.total_value_eur || 0) : 0;
  const totalInvested = latestSnapshot ? Number(latestSnapshot.total_invested_eur || 0) : 0;
  const pnl = latestSnapshot ? Number(latestSnapshot.pnl_eur || 0) : 0;
  const pnlPct = latestSnapshot ? Number(latestSnapshot.pnl_pct || 0) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Insights</h1>
        <Button
          onClick={handleEnrichMetadata}
          disabled={enriching}
          variant="outline"
          size="sm"
          className="gap-1.5 sm:gap-2 text-xs sm:text-sm w-full sm:w-auto"
        >
          {enriching ? (
            <>
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
              <span className="hidden sm:inline">Enrichissement...</span>
              <span className="sm:hidden">Enriching...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Enrichir les métadonnées</span>
              <span className="sm:hidden">Enrich data</span>
            </>
          )}
        </Button>
      </div>

      {/* Auto-generated Summary */}
      {series.length > 0 && (
        <InsightsSummary
          totalValue={totalValue}
          totalInvested={totalInvested}
          pnl={pnl}
          pnlPct={pnlPct}
          allocByClass={allocByClass}
          allocByAccount={allocByAccount}
          allocByRegion={allocByRegion}
          allocBySector={allocBySector}
        />
      )}

      {/* Instructions for metadata enrichment */}
      {(allocByRegion.length === 0 || allocByRegion.every(a => a.name === 'Unknown')) && (
        <Alert className="rounded-lg sm:rounded-xl">
          <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <AlertDescription className="text-xs sm:text-sm">
            Pour voir les allocations par région et secteur, suivez ces 2 étapes :
            <ol className="list-decimal ml-4 sm:ml-6 mt-2 space-y-1 text-[11px] sm:text-xs">
              <li>Cliquez sur "Enrichir les métadonnées" ci-dessus et attendez la fin</li>
              <li>Retournez sur le Dashboard et cliquez sur "Take Snapshot"</li>
              <li>Revenez ici pour voir les graphiques mis à jour</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {/* Time Series Chart */}
      <Card className="rounded-xl sm:rounded-2xl hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-primary/20 transition-all duration-300">
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
          <CardTitle className="text-sm sm:text-base md:text-lg">Portfolio Value Over Time</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          {series.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-8">
              No historical data. Take your first snapshot from the Dashboard to start tracking.
            </p>
          ) : (
            <ChartContainer
              config={{
                value: { label: 'Portfolio Value', color: 'hsl(var(--primary))' },
                invested: { label: 'Total Invested', color: 'hsl(var(--muted))' },
              }}
              className="h-[220px] sm:h-[280px] md:h-[350px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} className="sm:text-xs" />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    className="sm:text-xs"
                    width={45}
                    tickFormatter={formatCurrency}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatCurrencyFull(Number(value))}
                      />
                    }
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

      {/* Allocations */}
      {series.length > 0 && (
        <Tabs defaultValue="account" className="space-y-3 sm:space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-0 h-auto sm:h-10">
            <TabsTrigger value="account" className="text-[10px] sm:text-xs md:text-sm py-2 sm:py-0">Account</TabsTrigger>
            <TabsTrigger value="class" className="text-[10px] sm:text-xs md:text-sm py-2 sm:py-0">Asset Class</TabsTrigger>
            <TabsTrigger value="region" className="text-[10px] sm:text-xs md:text-sm py-2 sm:py-0">Region</TabsTrigger>
            <TabsTrigger value="sector" className="text-[10px] sm:text-xs md:text-sm py-2 sm:py-0">Sector</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-3 sm:space-y-4">
            <Card className="rounded-xl sm:rounded-2xl hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-primary/20 transition-all duration-300">
              <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                <CardTitle className="text-sm sm:text-base md:text-lg">Allocation by Account</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                {allocByAccount.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-8">No data</p>
                ) : (
                  <ChartContainer config={{}} className="h-[220px] sm:h-[280px] md:h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocByAccount}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={70}
                          dataKey="value"
                        >
                          {allocByAccount.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} fillOpacity={0.85} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => formatCurrencyFull(Number(value))}
                            />
                          }
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          wrapperStyle={{ fontSize: '11px' }}
                          formatter={(value, entry: any) => (
                            <span className="text-[10px] sm:text-xs md:text-sm">
                              {value}{' '}
                              {entry.payload.type && (
                                <Badge variant="outline" className="ml-0.5 sm:ml-1 text-[9px] sm:text-xs">
                                  {entry.payload.type}
                                </Badge>
                              )}
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="class" className="space-y-3 sm:space-y-4">
            <Card className="rounded-xl sm:rounded-2xl hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-primary/20 transition-all duration-300">
              <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                <CardTitle className="text-sm sm:text-base md:text-lg">Allocation by Asset Class</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                {allocByClass.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-8">No data</p>
                ) : (
                  <ChartContainer config={{}} className="h-[220px] sm:h-[280px] md:h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocByClass}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={70}
                          dataKey="value"
                        >
                          {allocByClass.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} fillOpacity={0.85} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => formatCurrencyFull(Number(value))}
                            />
                          }
                        />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="region" className="space-y-3 sm:space-y-4">
            <Card className="rounded-xl sm:rounded-2xl hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-primary/20 transition-all duration-300">
              <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                <CardTitle className="text-sm sm:text-base md:text-lg">Allocation by Region</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                {allocByRegion.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-8">No data</p>
                ) : (
                  <ChartContainer config={{}} className="h-[220px] sm:h-[280px] md:h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocByRegion}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={70}
                          dataKey="value"
                        >
                          {allocByRegion.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} fillOpacity={0.85} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => formatCurrencyFull(Number(value))}
                            />
                          }
                        />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sector" className="space-y-3 sm:space-y-4">
            <Card className="rounded-xl sm:rounded-2xl hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-primary/20 transition-all duration-300">
              <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
                <CardTitle className="text-sm sm:text-base md:text-lg">Allocation by Sector</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                {allocBySector.length === 0 ? (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-8">No data</p>
                ) : (
                  <ChartContainer config={{}} className="h-[220px] sm:h-[280px] md:h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocBySector}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={70}
                          dataKey="value"
                        >
                          {allocBySector.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} fillOpacity={0.85} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => formatCurrencyFull(Number(value))}
                            />
                          }
                        />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Snapshots List */}
      {series.length > 0 && (
        <Card className="hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-primary/20 transition-all duration-300">
          <CardHeader>
            <CardTitle>Recent Snapshots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Date</th>
                    <th className="text-right py-2 px-4">Total Value</th>
                    <th className="text-right py-2 px-4">Invested</th>
                    <th className="text-right py-2 px-4">P/L</th>
                    <th className="text-right py-2 px-4">P/L %</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((snap) => {
                    const pnl = Number(snap.pnl_eur || 0);
                    const pnlPct = Number(snap.pnl_pct || 0);
                    return (
                      <tr key={snap.id} className="border-b">
                        <td className="py-2 px-4">
                          {new Date(snap.snapshot_ts).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="text-right py-2 px-4">
                          {formatCurrencyFull(Number(snap.total_value_eur || 0))}
                        </td>
                        <td className="text-right py-2 px-4">
                          {formatCurrencyFull(Number(snap.total_invested_eur || 0))}
                        </td>
                        <td
                          className={`text-right py-2 px-4 ${
                            pnl >= 0 ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {formatCurrencyFull(pnl)}
                        </td>
                        <td
                          className={`text-right py-2 px-4 ${
                            pnlPct >= 0 ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {pnlPct >= 0 ? '+' : ''}
                          {pnlPct.toFixed(2)}%
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
    </div>
  );
}

export default Insights;
