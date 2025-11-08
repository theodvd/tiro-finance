import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Wallet, RefreshCw, Camera } from "lucide-react";
import { toast } from "sonner";

interface Summary {
  totalValue: number;
  totalInvested: number;
  pnl: number;
  pnlPercent: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary>({
    totalValue: 0,
    totalInvested: 0,
    pnl: 0,
    pnlPercent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = async () => {
    if (!user) return;

    try {
      // holdings -> security -> market_data (nested select)
      const { data: rows, error } = await supabase
        .from('holdings')
        .select(`
          id,
          shares,
          amount_invested_eur,
          security:securities(
            id,
            symbol,
            name,
            market_data(
              last_px_eur
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      let totalValue = 0;
      let totalInvested = 0;

      for (const h of rows ?? []) {
        const px = Number(h?.security?.market_data?.[0]?.last_px_eur ?? 0);
        const shares = Number(h?.shares ?? 0);
        const invested = Number(h?.amount_invested_eur ?? 0);

        totalValue += shares * px;
        totalInvested += invested;
      }

      const pnl = totalValue - totalInvested;
      const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

      setSummary({ totalValue, totalInvested, pnl, pnlPercent });
    } catch (err) {
      console.error('Error fetching summary:', err);
      toast.error('Failed to load portfolio summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [user]);

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Not authenticated');
        setRefreshing(false);
        return;
      }

      // Supabase Edge Functions route
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refresh-prices`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const msg = await res.text();
        toast.error(msg || 'Refresh failed');
      } else {
        toast.success('Prices refreshed');
        await fetchSummary(); // recompute totals with fresh prices
      }
    } catch (e: any) {
      toast.error(e?.message || 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const handleTakeSnapshot = async () => {
    toast.info("Snapshot feature coming soon!");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "percent",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Summary</h1>
          <p className="text-muted-foreground">Track your investment performance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefreshPrices} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Prices
          </Button>
          <Button onClick={handleTakeSnapshot}>
            <Camera className="w-4 h-4 mr-2" />
            Take Snapshot
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current market value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalInvested)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cost basis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit/Loss</CardTitle>
            {summary.pnl >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-negative" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.pnl >= 0 ? 'text-success' : 'text-negative'}`}>
              {formatCurrency(summary.pnl)}
            </div>
            <p className={`text-xs mt-1 ${summary.pnl >= 0 ? 'text-success' : 'text-negative'}`}>
              {formatPercent(summary.pnlPercent)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Set up your investment tracking in a few simple steps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 border rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
              1
            </div>
            <div>
              <h4 className="font-medium">Create your accounts</h4>
              <p className="text-sm text-muted-foreground">
                Add your investment accounts like CTO, PEA, Assurance-vie, etc.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 border rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
              2
            </div>
            <div>
              <h4 className="font-medium">Add securities</h4>
              <p className="text-sm text-muted-foreground">
                Register the stocks, ETFs, and crypto you own
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 border rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
              3
            </div>
            <div>
              <h4 className="font-medium">Import or create holdings</h4>
              <p className="text-sm text-muted-foreground">
                Upload a CSV or manually enter your positions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
