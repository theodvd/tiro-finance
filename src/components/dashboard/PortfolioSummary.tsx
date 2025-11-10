import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';

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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Updated: {formatDate(lastUpdated)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Value</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Updated: {formatDate(lastUpdated)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Profit / Loss</CardTitle>
          {pnl >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              pnl >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(pnl)}
          </div>
          <p
            className={`text-xs font-medium mt-1 ${
              pnl >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatPercent(pnlPct)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
