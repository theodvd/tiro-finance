import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Camera } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface SnapshotData {
  month: string;
  totalValue: number;
  [key: string]: number | string;
}

export default function History() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chartData, setChartData] = useState<SnapshotData[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingSnapshot, setTakingSnapshot] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    setLoading(true);

    // Get last 12 months
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 12);

    const { data, error } = await supabase
      .from('snapshot_lines')
      .select(`
        valuation_date,
        account_id,
        market_value_eur,
        account:accounts(id, name, type)
      `)
      .eq('user_id', user!.id)
      .gte('valuation_date', fromDate.toISOString().slice(0, 10))
      .lte('valuation_date', toDate.toISOString().slice(0, 10))
      .order('valuation_date', { ascending: true });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Aggregate by month and account
    const monthlyData: Record<string, Record<string, number>> = {};
    const accountSet = new Set<string>();

    data?.forEach((row: any) => {
      const month = row.valuation_date.slice(0, 7); // YYYY-MM
      const accountName = row.account?.name || 'Unknown';
      accountSet.add(accountName);

      if (!monthlyData[month]) {
        monthlyData[month] = {};
      }

      if (!monthlyData[month][accountName]) {
        monthlyData[month][accountName] = 0;
      }

      monthlyData[month][accountName] += Number(row.market_value_eur || 0);
    });

    // Convert to chart format
    const chartArray: SnapshotData[] = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, accountValues]) => {
        const totalValue = Object.values(accountValues).reduce((sum, val) => sum + val, 0);
        return {
          month,
          totalValue,
          ...accountValues,
        };
      });

    setChartData(chartArray);
    setAccounts(Array.from(accountSet));
    setLoading(false);
  };

  const handleTakeSnapshot = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      return;
    }

    setTakingSnapshot(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/take-snapshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        const error = await res.text();
        toast({ title: "Error", description: error || "Snapshot failed", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Snapshot taken successfully" });
        await fetchHistory();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setTakingSnapshot(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(value);
  };

  const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Portfolio History</h1>
        <Button onClick={handleTakeSnapshot} disabled={takingSnapshot}>
          <Camera className={`mr-2 h-4 w-4 ${takingSnapshot ? 'animate-pulse' : ''}`} />
          Take Snapshot
        </Button>
      </div>

      {chartData.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No historical data available. Click "Take Snapshot" to start tracking your portfolio value over time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Total Portfolio Value</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="totalValue" stroke="#0ea5e9" strokeWidth={2} name="Total Value" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Value by Account</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  {accounts.map((account, index) => (
                    <Area
                      key={account}
                      type="monotone"
                      dataKey={account}
                      stackId="1"
                      stroke={COLORS[index % COLORS.length]}
                      fill={COLORS[index % COLORS.length]}
                      name={account}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
