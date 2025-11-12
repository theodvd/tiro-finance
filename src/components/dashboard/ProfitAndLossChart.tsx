import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ProfitAndLossChartProps {
  totalInvested: number;
  pnl: number;
  pnlPct: number;
}

export function ProfitAndLossChart({ totalInvested, pnl, pnlPct }: ProfitAndLossChartProps) {
  const track = '#E5E7EB';
  const accent = pnl >= 0 ? '#22C55E' : '#EF4444';

  const chartData = [
    { name: 'Track', value: totalInvested, fill: track },
    { name: pnl >= 0 ? 'Profit' : 'Loss', value: Math.abs(pnl), fill: accent },
  ];

  return (
    <Card className="rounded-2xl shadow-sm border border-[#E6EAF0] bg-white">
      <CardHeader><CardTitle>Performance</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px]" config={{}}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={2}
                dataKey="value"
                isAnimationActive
                animationDuration={500}
              >
                {chartData.map((d, i) => <Cell key={i} fill={d.fill} stroke="none" />)}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent formatter={(v) =>
                new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(v))
              }/>} />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
                className="fill-slate-900 text-3xl font-semibold tabular-nums">
                {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
              </text>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
