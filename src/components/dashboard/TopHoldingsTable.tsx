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
        <CardTitle className="text-base sm:text-lg">Top Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        {topHoldings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No holdings available
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Ticker</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Perf</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Weight</TableHead>
                  <TableHead className="hidden lg:table-cell">Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topHoldings.map((holding, idx) => {
                  const weight = totalValue && totalValue > 0 ? (holding.marketValue / totalValue) * 100 : 0;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-sm">{holding.name}</span>
                          <span className="text-xs text-muted-foreground sm:hidden">{holding.symbol}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell text-sm">
                        {holding.symbol}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(holding.marketValue)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-sm ${
                          holding.perfPct >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'
                        }`}
                      >
                        {formatPercent(holding.perfPct)}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="tabular-nums text-sm">{weight.toFixed(1)}%</span>
                          <div className="w-16 lg:w-24 h-1.5 bg-border rounded">
                            <div
                              className="h-1.5 bg-muted-foreground rounded"
                              style={{ width: `${Math.min(100, weight)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                        {holding.accountName}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
