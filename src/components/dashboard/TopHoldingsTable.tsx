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
    <Card className="rounded-xl sm:rounded-2xl shadow-sm border border-border bg-card transition-all duration-300 hover:shadow-[0_0_25px_rgba(234,179,8,0.1)] hover:border-primary/10">
      <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
        <CardTitle className="text-sm sm:text-base md:text-lg">Top Holdings</CardTitle>
      </CardHeader>
      <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
        {topHoldings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No holdings available
          </p>
        ) : (
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-3 sm:pl-4 text-xs sm:text-sm">Name</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs sm:text-sm">Ticker</TableHead>
                  <TableHead className="text-right pr-3 sm:pr-4 text-xs sm:text-sm">Value</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">Perf</TableHead>
                  <TableHead className="text-right hidden md:table-cell text-xs sm:text-sm">Weight</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs sm:text-sm">Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topHoldings.map((holding, idx) => {
                  const weight = totalValue && totalValue > 0 ? (holding.marketValue / totalValue) * 100 : 0;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium pl-3 sm:pl-4">
                        <div className="flex flex-col">
                          <span className="text-xs sm:text-sm">{holding.name}</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground sm:hidden">{holding.symbol}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell text-xs sm:text-sm">
                        {holding.symbol}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs sm:text-sm pr-3 sm:pr-4">
                        {formatCurrency(holding.marketValue)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-xs sm:text-sm ${
                          holding.perfPct >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'
                        }`}
                      >
                        {formatPercent(holding.perfPct)}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        <div className="flex items-center gap-1 sm:gap-2 justify-end">
                          <span className="tabular-nums text-xs sm:text-sm">{weight.toFixed(1)}%</span>
                          <div className="w-12 sm:w-16 lg:w-24 h-1 sm:h-1.5 bg-border rounded">
                            <div
                              className="h-1 sm:h-1.5 bg-muted-foreground rounded"
                              style={{ width: `${Math.min(100, weight)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs sm:text-sm hidden lg:table-cell">
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
