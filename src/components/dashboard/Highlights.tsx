import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface HighlightsProps {
  pnlPct: number;
  accountAllocations: Array<{ name: string; value: number; type: string }>;
  totalValue: number;
}

export function Highlights({ pnlPct, accountAllocations, totalValue }: HighlightsProps) {
  const cryptoAllocation = accountAllocations
    .filter(acc => acc.type === 'CRYPTO')
    .reduce((sum, acc) => sum + acc.value, 0);
  
  const cryptoPct = totalValue > 0 ? (cryptoAllocation / totalValue) * 100 : 0;

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

  if (highlights.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {highlights.map((highlight, idx) => {
        const Icon = highlight.icon;
        return (
          <Card key={idx}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Icon
                  className={`h-5 w-5 mt-0.5 ${
                    highlight.variant === 'success'
                      ? 'text-green-600'
                      : highlight.variant === 'warning'
                      ? 'text-yellow-600'
                      : 'text-muted-foreground'
                  }`}
                />
                <p className="text-sm">{highlight.text}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
