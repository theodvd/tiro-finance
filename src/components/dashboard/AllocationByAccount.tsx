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
    <Card className="rounded-2xl shadow-sm border border-border bg-card">
      <CardHeader><CardTitle>Allocation by Account</CardTitle></CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No holdings data available</p>
        ) : (
          <>
            <ChartContainer className="h-[300px]" config={{}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" outerRadius={90} dataKey="value" labelLine={false}>
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
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
                    <span className="text-foreground">{d.name}</span>
                  </div>
                  <div className="text-muted-foreground tabular-nums">
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
