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
}

export function TopHoldingsTable({ topHoldings }: TopHoldingsTableProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }).format(value);

  const formatPercent = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Holdings</CardTitle>
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
                <TableHead>Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topHoldings.map((holding, idx) => (
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
                      holding.perfPct >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatPercent(holding.perfPct)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {holding.accountName}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
