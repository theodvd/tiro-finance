import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Wallet, TrendingUp, TrendingDown, PiggyBank, Target, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { PortfolioHistory } from '@/components/dashboard/PortfolioHistory';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDiversification } from '@/hooks/useDiversification';
import CountUp from 'react-countup';
import { fmtEUR } from '@/lib/format';

export default function Portfolio() {
  const portfolioData = usePortfolioData();
  const { user } = useAuth();
  const [totalLiquidity, setTotalLiquidity] = useState<number | null>(null);
  const { data: diversificationData, loading: diversificationLoading } = useDiversification();

  useEffect(() => {
    const fetchLiquidity = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('bridge_accounts')
        .select('balance')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching liquidity:', error);
        setTotalLiquidity(0);
        return;
      }

      const total = data?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
      setTotalLiquidity(total);
    };

    fetchLiquidity();
  }, [user]);

  const formatDate = (date: string | null) =>
    date
      ? new Date(date).toLocaleString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Jamais';

  if (portfolioData.loading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <h1 className="text-xl font-bold tracking-tight">Overview</h1>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (portfolioData.error) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <h1 className="text-xl font-bold tracking-tight">Overview</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{portfolioData.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calculated values
  const totalWealth = portfolioData.totalValue + (totalLiquidity ?? 0);
  const investedPct = totalWealth > 0 ? (portfolioData.totalValue / totalWealth) * 100 : 0;
  const liquidityPct = totalWealth > 0 ? ((totalLiquidity ?? 0) / totalWealth) * 100 : 0;

  // Diversification alerts from data
  const alerts: Array<{ icon: any; text: string; variant: 'warning' | 'info' }> = [];

  if (diversificationData?.concentrationRisks) {
    diversificationData.concentrationRisks
      .filter(risk => risk.severity === 'high' || risk.severity === 'medium')
      .slice(0, 3)
      .forEach(risk => {
        alerts.push({
          icon: AlertTriangle,
          text: risk.title,
          variant: 'warning',
        });
      });
  }

  if (liquidityPct < 10 && totalLiquidity !== null) {
    alerts.push({
      icon: Wallet,
      text: `Matelas de sécurité faible (${liquidityPct.toFixed(0)}%)`,
      variant: 'warning',
    });
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Overview</h1>
        <p className="text-xs text-muted-foreground">
          Mis à jour : {formatDate(portfolioData.lastUpdated)}
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1 – ÉTAT GLOBAL DU PATRIMOINE
      ═══════════════════════════════════════════════════════════════════════ */}
      <section aria-label="État global du patrimoine">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {/* Patrimoine Total */}
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Patrimoine Total
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-semibold tabular-nums text-foreground">
                <CountUp end={totalWealth} duration={0.8} decimals={0} decimal="," separator=" " suffix=" €" />
              </div>
            </CardContent>
          </Card>

          {/* Total Investi */}
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Investi
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-semibold tabular-nums text-foreground">
                <CountUp end={portfolioData.totalValue} duration={0.8} decimals={0} decimal="," separator=" " suffix=" €" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{investedPct.toFixed(0)}% du patrimoine</p>
            </CardContent>
          </Card>

          {/* Liquidités */}
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <PiggyBank className="h-3.5 w-3.5" />
                Liquidités
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {totalLiquidity === null ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  <div className="text-lg sm:text-xl lg:text-2xl font-semibold tabular-nums text-foreground">
                    <CountUp end={totalLiquidity} duration={0.8} decimals={0} decimal="," separator=" " suffix=" €" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{liquidityPct.toFixed(0)}% du patrimoine</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Profit / Loss */}
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                {portfolioData.pnl >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-[hsl(var(--destructive))]" />
                )}
                Profit / Loss
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={`text-lg sm:text-xl lg:text-2xl font-semibold tabular-nums ${portfolioData.pnl >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}`}>
                <CountUp 
                  end={portfolioData.pnl} 
                  duration={0.8} 
                  decimals={0} 
                  decimal="," 
                  separator=" " 
                  prefix={portfolioData.pnl >= 0 ? '+' : ''} 
                  suffix=" €" 
                />
              </div>
              <p className={`text-[10px] font-medium mt-0.5 ${portfolioData.pnl >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}`}>
                {portfolioData.pnlPct >= 0 ? '+' : ''}{portfolioData.pnlPct.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2 – ÉVOLUTION & STRUCTURE
      ═══════════════════════════════════════════════════════════════════════ */}
      <section aria-label="Évolution et structure">
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          {/* Graphique historique - prend 2/3 de l'espace */}
          <div className="lg:col-span-2">
            <PortfolioHistory />
          </div>

          {/* Répartition simple */}
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Structure du patrimoine</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              {/* Barre de répartition */}
              <div className="space-y-2">
                <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                  <div 
                    className="h-full bg-primary transition-all duration-500" 
                    style={{ width: `${investedPct}%` }} 
                  />
                  <div 
                    className="h-full bg-[hsl(var(--chart-2))] transition-all duration-500" 
                    style={{ width: `${liquidityPct}%` }} 
                  />
                </div>
              </div>

              {/* Légende */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Investissements</span>
                  </div>
                  <span className="font-medium tabular-nums">{investedPct.toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-2))]" />
                    <span className="text-muted-foreground">Liquidités</span>
                  </div>
                  <span className="font-medium tabular-nums">{liquidityPct.toFixed(0)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3 – DIAGNOSTIC RAPIDE
      ═══════════════════════════════════════════════════════════════════════ */}
      <section aria-label="Diagnostic rapide">
        <Card className="rounded-xl border border-border bg-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Diagnostic</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {/* Score de diversification */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className={`flex items-center justify-center h-12 w-12 rounded-full text-lg font-bold ${
                  !diversificationLoading && diversificationData
                    ? diversificationData.score >= 60
                      ? 'bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]'
                      : diversificationData.score >= 40
                        ? 'bg-accent/20 text-accent'
                        : 'bg-destructive/20 text-destructive'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {diversificationLoading ? '...' : diversificationData?.score ?? '-'}
                </div>
                <div>
                  <p className="text-sm font-medium">Score de diversification</p>
                  <p className="text-xs text-muted-foreground">
                    {diversificationLoading 
                      ? 'Chargement...' 
                      : diversificationData?.scoreLabel ?? 'Non disponible'
                    }
                  </p>
                </div>
              </div>

              {/* Alertes */}
              <div className="space-y-2">
                {alerts.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">
                    <TrendingUp className="h-4 w-4 flex-shrink-0" />
                    <p className="text-sm">Aucune alerte majeure</p>
                  </div>
                ) : (
                  alerts.map((alert, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-accent/10 text-accent-foreground"
                    >
                      <alert.icon className="h-4 w-4 flex-shrink-0 text-accent" />
                      <p className="text-xs">{alert.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
