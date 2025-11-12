import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ProfitAndLossChartProps {
  totalInvested: number;
  pnl: number;
  pnlPct: number;
}

export function ProfitAndLossChart({ totalInvested, pnl, pnlPct }: ProfitAndLossChartProps) {
  const track = 'hsl(var(--border))';
  const accent = pnl >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))';

  const chartData = [
    { name: 'Track', value: totalInvested, fill: track },
    { name: pnl >= 0 ? 'Profit' : 'Loss', value: Math.abs(pnl), fill: accent },
  ];

  return (
    <Card className="rounded-2xl shadow-sm border border-border bg-card transition-all duration-300 hover:shadow-[0_0_25px_rgba(234,179,8,0.1)] hover:border-primary/10 min-w-0">
      <CardHeader><CardTitle className="text-base sm:text-lg">Performance</CardTitle></CardHeader>
      <CardContent className="w-full">
        <ChartContainer className="h-[200px] sm:h-[250px] lg:h-[300px] w-full" config={{}}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
                isAnimationActive
                animationDuration={500}
              >
                {chartData.map((d, i) => <Cell key={i} fill={d.fill} stroke="hsl(var(--card))" strokeWidth={3} fillOpacity={0.85} />)}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent formatter={(v) =>
                new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(v))
              }/>} />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
                className="fill-foreground text-xl sm:text-2xl lg:text-3xl font-semibold tabular-nums">
                {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
              </text>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
