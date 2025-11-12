import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TopHoldingsTableProps {
  topHoldings: Array<{
    name: string;
    symbol: string;
    marketValue: number;
    perfPct: number;
    accountName: string;
  }>;
  totalValue?: number;
}

export function TopHoldingsTable({ topHoldings, totalValue }: TopHoldingsTableProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const formatPercent = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  return (
    <Card className="rounded-2xl shadow-sm border border-border bg-card transition-all duration-300 hover:shadow-[0_0_25px_rgba(234,179,8,0.1)] hover:border-primary/10">
      <CardHeader>
        <CardTitle className="text-lg">Top Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        {topHoldings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No holdings available
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Ticker</TableHead>
                <TableHead className="text-right">Market Value</TableHead>
                <TableHead className="text-right">Performance</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead>Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topHoldings.map((holding, idx) => {
                const weight = totalValue && totalValue > 0 ? (holding.marketValue / totalValue) * 100 : 0;
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{holding.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {holding.symbol}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(holding.marketValue)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${
                        holding.perfPct >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'
                      }`}
                    >
                      {formatPercent(holding.perfPct)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="tabular-nums text-sm">{weight.toFixed(1)}%</span>
                        <div className="w-24 h-1.5 bg-border rounded">
                          <div
                            className="h-1.5 bg-muted-foreground rounded"
                            style={{ width: `${Math.min(100, weight)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {holding.accountName}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
