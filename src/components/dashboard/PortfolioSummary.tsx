import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import CountUp from 'react-countup';
import { fmtEUR, fmtPct } from '@/lib/format';

interface PortfolioSummaryProps {
  totalInvested: number;
  totalValue: number;
  pnl: number;
  pnlPct: number;
  lastUpdated: string | null;
}

export function PortfolioSummary({
  totalInvested,
  totalValue,
  pnl,
  pnlPct,
  lastUpdated,
}: PortfolioSummaryProps) {
  const formatDate = (date: string | null) =>
    date
      ? new Date(date).toLocaleString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Jamais';

  const kpiCard = (label: string, value: number, icon?: React.ReactNode, colored?: boolean) => (
    <Card className="rounded-2xl shadow-sm border border-border bg-card transition-all duration-300 hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-xl sm:text-2xl md:text-[28px] font-semibold tracking-tight tabular-nums ${colored ? (pnl >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]') : 'text-foreground'}`}>
          <CountUp end={value} duration={0.8} decimals={2} decimal="," separator=" " />
          <span className="ml-1">€</span>
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Mise à jour : {formatDate(lastUpdated)}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {kpiCard('Total Invested', totalInvested, <Wallet className="h-4 w-4 text-muted-foreground" />)}
      {kpiCard('Current Value', totalValue, <TrendingUp className="h-4 w-4 text-muted-foreground" />)}
      <Card className="rounded-2xl shadow-sm border border-border bg-card transition-all duration-300 hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Profit / Loss</CardTitle>
          {pnl >= 0 ? <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" /> : <TrendingDown className="h-4 w-4 text-[hsl(var(--destructive))]" />}
        </CardHeader>
        <CardContent>
          <div className={`text-xl sm:text-2xl md:text-[28px] font-semibold tabular-nums ${pnl >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}`}>
            <CountUp end={pnl} duration={0.8} decimals={2} decimal="," separator=" " prefix={pnl >= 0 ? '+' : ''} suffix=" €" />
          </div>
          <p className={`text-[10px] sm:text-xs font-medium mt-1 ${pnl >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}`}>
            <CountUp end={pnlPct} duration={0.8} decimals={2} decimal="," separator=" " prefix={pnlPct >= 0 ? '+' : ''} suffix="%" />
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
