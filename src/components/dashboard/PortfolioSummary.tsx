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
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }).format(value);

  const formatPercent = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-EU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="rounded-2xl shadow-md border border-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Total Invested</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[28px] font-semibold tracking-tight tabular-nums">
            <CountUp end={totalInvested} duration={0.8} decimals={2} separator=" " />
            <span className="ml-1">€</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Updated: {formatDate(lastUpdated)}
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-md border border-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Current Value</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-[28px] font-semibold tracking-tight tabular-nums">
            <CountUp end={totalValue} duration={0.8} decimals={2} separator=" " />
            <span className="ml-1">€</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Updated: {formatDate(lastUpdated)}
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-md border border-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Profit / Loss</CardTitle>
          {pnl >= 0 ? (
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-600" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-[28px] font-semibold tabular-nums ${
              pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {fmtEUR(pnl)}
          </div>
          <p
            className={`text-xs font-medium mt-1 ${
              pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {fmtPct(pnlPct)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
