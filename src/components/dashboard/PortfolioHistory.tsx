import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function PortfolioHistory() {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<any[]>([]);

  const fetchSnapshots = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('snapshot_lines')
        .select('valuation_date, market_value_eur, cost_eur')
        .eq('user_id', user.id)
        .order('valuation_date', { ascending: true });

      if (error) throw error;

      // Aggregate by valuation_date
      const aggregated = data?.reduce((acc: any, row: any) => {
        const date = row.valuation_date;
        if (!acc[date]) {
          acc[date] = { date, totalValue: 0, totalInvested: 0 };
        }
        acc[date].totalValue += Number(row.market_value_eur || 0);
        acc[date].totalInvested += Number(row.cost_eur || 0);
        return acc;
      }, {});

      const chartData = Object.values(aggregated || {}).map((snap: any) => ({
        date: new Date(snap.date).toLocaleDateString('en-EU', {
          month: 'short',
          day: 'numeric',
        }),
        value: snap.totalValue,
        invested: snap.totalInvested,
      }));

      setSnapshots(chartData);
    } catch (err: any) {
      console.error('Error fetching snapshots:', err);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, [user]);


  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio History</CardTitle>
      </CardHeader>
      <CardContent>
        {snapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No historical data. Take your first snapshot to track performance over time.
          </p>
        ) : (
          <ChartContainer
            config={{
              value: { label: 'Portfolio Value', color: 'hsl(var(--primary))' },
              invested: { label: 'Total Invested', color: 'hsl(var(--muted))' },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={snapshots}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        new Intl.NumberFormat('en-EU', {
                          style: 'currency',
                          currency: 'EUR',
                        }).format(Number(value))
                      }
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="invested"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
