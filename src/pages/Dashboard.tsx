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

export default function Dashboard() {
  const portfolioData = usePortfolioData();

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
      <div className="flex-1 space-y-6 p-6 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (portfolioData.error) {
    return (
      <div className="flex-1 space-y-6 p-6 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{portfolioData.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={handleTakeSnapshot} variant="outline">
            <Camera className="h-4 w-4 mr-2" />
            Take Snapshot
          </Button>
          <Button onClick={handleRefreshPrices}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Prices
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
      />

      <div className="grid gap-6 md:grid-cols-2">
        <ProfitAndLossChart
          totalInvested={portfolioData.totalInvested}
          pnl={portfolioData.pnl}
          pnlPct={portfolioData.pnlPct}
        />
        <AllocationByAccount accountAllocations={portfolioData.accountAllocations} />
      </div>

      <PortfolioHistory />

      <TopHoldingsTable topHoldings={portfolioData.topHoldings} />
    </div>
  );
}
