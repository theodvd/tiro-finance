import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";

interface MarketDataRow {
  id: string;
  native_ccy: string;
  last_px_native: number;
  eur_fx: number;
  last_px_eur: number;
  last_close_dt: string;
  updated_at: string;
  security: {
    id: string;
    symbol: string;
    name: string;
  };
}

export default function MarketData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [marketData, setMarketData] = useState<MarketDataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMarketData();
    }
  }, [user]);

  const fetchMarketData = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('market_data')
      .select(`
        id, native_ccy, last_px_native, eur_fx, last_px_eur, last_close_dt, updated_at,
        security:securities(id, symbol, name)
      `)
      .eq('securities.user_id', user!.id)
      .order('updated_at', { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMarketData(data || []);
    }

    setLoading(false);
  };

  const handleRefreshPrices = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      return;
    }

    setRefreshing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refresh-prices`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const error = await res.text();
        toast({ title: "Error", description: error || "Refresh failed", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Prices refreshed successfully" });
        await fetchMarketData();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

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
        <h1 className="text-3xl font-bold">Market Data</h1>
        <Button onClick={handleRefreshPrices} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Prices
        </Button>
      </div>

      {marketData.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No market data available. Add securities and click "Refresh Prices" to fetch current prices.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Current Market Prices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Price (Native)</TableHead>
                  <TableHead className="text-right">EUR FX</TableHead>
                  <TableHead className="text-right">Price (EUR)</TableHead>
                  <TableHead className="text-right">Last Close</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marketData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.security.symbol}</TableCell>
                    <TableCell>{row.security.name}</TableCell>
                    <TableCell>{row.native_ccy}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.last_px_native, row.native_ccy)}</TableCell>
                    <TableCell className="text-right">{row.eur_fx.toFixed(4)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.last_px_eur, 'EUR')}</TableCell>
                    <TableCell className="text-right">{formatDate(row.last_close_dt)}</TableCell>
                    <TableCell className="text-right">{formatDate(row.updated_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
