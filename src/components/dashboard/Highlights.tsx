import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, AlertCircle, Wallet } from 'lucide-react';

interface HighlightsProps {
  pnlPct: number;
  accountAllocations: Array<{ name: string; value: number; type: string }>;
  totalValue: number;
  totalLiquidity: number;
  isLiquidityLoading?: boolean;
}

export function Highlights({ pnlPct, accountAllocations, totalValue, totalLiquidity, isLiquidityLoading }: HighlightsProps) {
  const cryptoAllocation = accountAllocations
    .filter(acc => acc.type === 'CRYPTO')
    .reduce((sum, acc) => sum + acc.value, 0);
  
  const cryptoPct = totalValue > 0 ? (cryptoAllocation / totalValue) * 100 : 0;
  
  const totalWealth = totalValue + totalLiquidity;
  const liquidityPct = totalWealth > 0 ? (totalLiquidity / totalWealth) * 100 : 0;

  const highlights: Array<{ icon: any; text: string; variant?: 'success' | 'warning' }> = [];

  if (Math.abs(pnlPct) > 0.1) {
    highlights.push({
      icon: TrendingUp,
      text: pnlPct >= 0
        ? `Portfolio up ${pnlPct.toFixed(1)}% overall`
        : `Portfolio down ${Math.abs(pnlPct).toFixed(1)}% overall`,
      variant: pnlPct >= 0 ? 'success' : 'warning',
    });
  }

  if (cryptoPct > 10) {
    highlights.push({
      icon: AlertCircle,
      text: `Crypto allocation at ${cryptoPct.toFixed(1)}% (>10%)`,
      variant: 'warning',
    });
  }

  // Always show emergency fund indicator if liquidity data is loaded
  if (!isLiquidityLoading) {
    highlights.push({
      icon: Wallet,
      text: `Matelas de sécurité : ${liquidityPct.toFixed(1)}% du patrimoine total (${totalLiquidity.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })})`,
      variant: liquidityPct >= 15 ? 'success' : 'warning',
    });
  }

  if (highlights.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
      {highlights.map((highlight, idx) => {
        const Icon = highlight.icon;
        return (
          <Card key={idx} className="rounded-lg sm:rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(234,179,8,0.1)] hover:border-primary/10">
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <Icon
                  className={`h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0 ${
                    highlight.variant === 'success'
                      ? 'text-success'
                      : highlight.variant === 'warning'
                      ? 'text-accent'
                      : 'text-muted-foreground'
                  }`}
                />
                <p className="text-[11px] sm:text-xs md:text-sm leading-relaxed">{highlight.text}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
