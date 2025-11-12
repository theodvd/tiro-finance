import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface AllocationByAccountProps {
  accountAllocations: Array<{ name: string; value: number; type: string }>;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function AllocationByAccount({ accountAllocations }: AllocationByAccountProps) {
  const totalValue = accountAllocations.reduce((s, a) => s + a.value, 0);
  const chartData = accountAllocations.map((a, i) => ({
    name: a.name, value: a.value, type: a.type,
    fill: COLORS[i % COLORS.length],
    percentage: totalValue > 0 ? (a.value / totalValue) * 100 : 0,
  }));

  return (
    <Card className="rounded-2xl shadow-sm border border-border bg-card transition-all duration-300 hover:shadow-[0_0_25px_rgba(234,179,8,0.1)] hover:border-primary/10 min-w-0">
      <CardHeader><CardTitle className="text-base sm:text-lg">Allocation by Account</CardTitle></CardHeader>
      <CardContent className="w-full">
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No holdings data available</p>
        ) : (
          <>
            <ChartContainer className="h-[200px] sm:h-[250px] lg:h-[300px] w-full" config={{}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" outerRadius={65} dataKey="value" labelLine={false}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.fill} stroke="hsl(var(--card))" strokeWidth={2} fillOpacity={0.85} />)}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) =>
                    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(v))
                  }/>} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Légende personnalisée, sobre */}
            <div className="mt-4 space-y-2">
              {chartData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                    <span className="text-foreground truncate">{d.name}</span>
                  </div>
                  <div className="text-muted-foreground tabular-nums flex-shrink-0">
                    {d.percentage.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
