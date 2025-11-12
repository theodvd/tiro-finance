import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface AllocationByAccountProps {
  accountAllocations: Array<{ name: string; value: number; type: string }>;
}

const COLORS = ['#1F2937','#334155','#475569','#64748B','#94A3B8','#CBD5E1'];

export function AllocationByAccount({ accountAllocations }: AllocationByAccountProps) {
  const totalValue = accountAllocations.reduce((s, a) => s + a.value, 0);
  const chartData = accountAllocations.map((a, i) => ({
    name: a.name, value: a.value, type: a.type,
    fill: COLORS[i % COLORS.length],
    percentage: totalValue > 0 ? (a.value / totalValue) * 100 : 0,
  }));

  return (
    <Card className="rounded-2xl shadow-sm border border-[#E6EAF0] bg-white">
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
                    {chartData.map((d, i) => <Cell key={i} fill={d.fill} stroke="none" />)}
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
                    <span className="text-slate-700">{d.name}</span>
                  </div>
                  <div className="text-slate-600 tabular-nums">
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
