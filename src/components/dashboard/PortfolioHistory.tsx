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
        date: new Date(snap.date).toLocaleDateString('fr-FR', {
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
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  return (
    <Card className="rounded-xl sm:rounded-2xl shadow-sm border border-border bg-card transition-all duration-300 hover:shadow-[0_0_25px_rgba(234,179,8,0.1)] hover:border-primary/10 min-w-0">
      <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
        <CardTitle className="text-sm sm:text-base md:text-lg">Portfolio History</CardTitle>
      </CardHeader>
      <CardContent className="w-full px-3 sm:px-6 pb-3 sm:pb-6">
        {snapshots.length < 3 ? (
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-8">
            Historique en cours de construction. Les données seront disponibles après quelques semaines de suivi.
          </p>
        ) : (
          <ChartContainer config={{}} className="h-[180px] sm:h-[220px] md:h-[250px] lg:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={snapshots} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={9} 
                  className="sm:text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={9}
                  className="sm:text-xs"
                  width={45}
                  tickFormatter={(v: number) =>
                    new Intl.NumberFormat('fr-FR', {
                      notation: 'compact',
                      style: 'currency',
                      currency: 'EUR',
                    }).format(v)
                  }
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(v) => formatCurrency(Number(v))} />}
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
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
