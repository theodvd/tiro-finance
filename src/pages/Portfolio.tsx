import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, AlertCircle, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { PortfolioSummary } from '@/components/dashboard/PortfolioSummary';
import { ProfitAndLossChart } from '@/components/dashboard/ProfitAndLossChart';
import { AllocationByAccount } from '@/components/dashboard/AllocationByAccount';
import { PortfolioHistory } from '@/components/dashboard/PortfolioHistory';
import { TopHoldingsTable } from '@/components/dashboard/TopHoldingsTable';
import { Highlights } from '@/components/dashboard/Highlights';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Portfolio() {
  const portfolioData = usePortfolioData();
  const { user } = useAuth();
  const [totalLiquidity, setTotalLiquidity] = useState(0);

  useEffect(() => {
    const fetchLiquidity = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('bridge_accounts')
        .select('balance')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching liquidity:', error);
        return;
      }

      const total = data?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
      setTotalLiquidity(total);
    };

    fetchLiquidity();
  }, [user]);

  const handleRefreshPrices = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      toast({ title: 'Refreshing prices...', description: 'This may take a few seconds' });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refresh-prices`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to refresh prices');

      toast({ title: 'Prices refreshed successfully' });
      await portfolioData.refetch();
    } catch (err: any) {
      toast({
        title: 'Error refreshing prices',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleTakeSnapshot = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      toast({ title: 'Taking snapshot...', description: 'Capturing portfolio state' });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/take-snapshot`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to take snapshot');

      toast({ title: 'Snapshot created successfully' });
      await portfolioData.refetch();
    } catch (err: any) {
      toast({
        title: 'Error taking snapshot',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  if (portfolioData.loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight">Portfolio</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (portfolioData.error) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight">Portfolio</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{portfolioData.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Portfolio</h1>
        <div className="flex flex-col sm:flex-row gap-2 shadow-lg rounded-lg sm:rounded-xl p-1 bg-card/50 backdrop-blur-sm border border-border/50 w-full sm:w-auto">
          <Button onClick={handleTakeSnapshot} variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
            <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Take Snapshot</span>
            <span className="sm:hidden">Snapshot</span>
          </Button>
          <Button onClick={handleRefreshPrices} size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Refresh Prices</span>
            <span className="sm:hidden">Refresh</span>
          </Button>
        </div>
      </div>

      <PortfolioSummary
        totalInvested={portfolioData.totalInvested}
        totalValue={portfolioData.totalValue}
        pnl={portfolioData.pnl}
        pnlPct={portfolioData.pnlPct}
        lastUpdated={portfolioData.lastUpdated}
      />

      <Highlights
        pnlPct={portfolioData.pnlPct}
        accountAllocations={portfolioData.accountAllocations}
        totalValue={portfolioData.totalValue}
        totalLiquidity={totalLiquidity}
      />

      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        <ProfitAndLossChart
          totalInvested={portfolioData.totalInvested}
          pnl={portfolioData.pnl}
          pnlPct={portfolioData.pnlPct}
        />
        <AllocationByAccount accountAllocations={portfolioData.accountAllocations} />
      </div>

      <PortfolioHistory />

      <TopHoldingsTable topHoldings={portfolioData.topHoldings} totalValue={portfolioData.totalValue} />
    </div>
  );
}
