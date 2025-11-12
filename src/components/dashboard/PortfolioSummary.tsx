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
    <Card className="rounded-2xl shadow-sm border border-[#E6EAF0] bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-slate-500">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-[28px] font-semibold tracking-tight tabular-nums ${colored ? (pnl >= 0 ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-900'}`}>
          <CountUp end={value} duration={0.8} decimals={2} decimal="," separator=" " />
          <span className="ml-1">€</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Mise à jour : {formatDate(lastUpdated)}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {kpiCard('Total Invested', totalInvested, <Wallet className="h-4 w-4 text-slate-400" />)}
      {kpiCard('Current Value', totalValue, <TrendingUp className="h-4 w-4 text-slate-400" />)}
      <Card className="rounded-2xl shadow-sm border border-[#E6EAF0] bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-slate-500">Profit / Loss</CardTitle>
          {pnl >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-rose-600" />}
        </CardHeader>
        <CardContent>
          <div className={`text-[28px] font-semibold tabular-nums ${pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {fmtEUR(pnl)}
          </div>
          <p className={`text-xs font-medium mt-1 ${pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {fmtPct(pnlPct)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
