import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

interface AllocationByAccountProps {
  accountAllocations: Array<{ name: string; value: number; type: string }>;
}

const COLORS = ['#3B82F6', '#10B981', '#FACC15', '#9333EA', '#64748B', '#EF4444'];

export function AllocationByAccount({ accountAllocations }: AllocationByAccountProps) {
  const totalValue = accountAllocations.reduce((sum, acc) => sum + acc.value, 0);

  const chartData = accountAllocations.map((acc, idx) => ({
    name: acc.name,
    value: acc.value,
    type: acc.type,
    fill: COLORS[idx % COLORS.length],
    percentage: totalValue > 0 ? ((acc.value / totalValue) * 100).toFixed(1) : '0.0',
  }));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }).format(value);

  return (
    <Card className="rounded-2xl shadow-md border border-slate-200 bg-white">
      <CardHeader>
        <CardTitle>Allocation by Account</CardTitle>
      </CardHeader>
      <CardContent>
        {accountAllocations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No holdings data available
          </p>
        ) : (
          <>
            <ChartContainer
              config={{}}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, props) => (
                          <div className="flex flex-col gap-1">
                            <span>{formatCurrency(Number(value))}</span>
                            <span className="text-xs text-muted-foreground">
                              {props.payload.percentage}%
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={40}
                    formatter={(value, entry: any) => (
                      <span className="text-sm">
                        {value}
                        <Badge variant="outline" className="ml-2 text-[10px] tracking-wide">
                          {entry.payload.type}
                        </Badge>
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
