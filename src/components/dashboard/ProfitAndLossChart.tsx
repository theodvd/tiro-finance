import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ProfitAndLossChartProps {
  totalInvested: number;
  pnl: number;
  pnlPct: number;
}

export function ProfitAndLossChart({ totalInvested, pnl, pnlPct }: ProfitAndLossChartProps) {
  const chartData = [
    { name: 'Invested', value: totalInvested, fill: 'hsl(var(--muted))' },
    {
      name: pnl >= 0 ? 'Profit' : 'Loss',
      value: Math.abs(pnl),
      fill: pnl >= 0 ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)',
    },
  ];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }).format(value);

  return (
    <Card className="rounded-2xl shadow-md border border-slate-200 bg-white">
      <CardHeader>
        <CardTitle>Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            invested: { label: 'Invested', color: 'hsl(var(--muted))' },
            profit: { label: 'Profit', color: 'hsl(142 76% 36%)' },
            loss: { label: 'Loss', color: 'hsl(0 84% 60%)' },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={6}
                dataKey="value"
                isAnimationActive
                animationDuration={700}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                }
              />
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-3xl font-semibold tabular-nums"
              >
                {pnl >= 0 ? '+' : ''}
                {pnlPct.toFixed(1)}%
              </text>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
