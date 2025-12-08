import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fmtEUR } from '@/lib/format';

interface DiversificationScoreCardProps {
  score: number;
  scoreLabel: 'Faible' | 'Moyen' | 'Bon' | 'Excellent';
  lastUpdated: string | null;
  totalValue: number;
  dataQuality: {
    classified: number;
    unclassified: number;
    total: number;
  };
}

export function DiversificationScoreCard({
  score,
  scoreLabel,
  lastUpdated,
  totalValue,
  dataQuality,
}: DiversificationScoreCardProps) {
  const getScoreColor = () => {
    if (score >= 80) return 'text-[hsl(var(--success))]';
    if (score >= 60) return 'text-[hsl(var(--chart-1))]';
    if (score >= 40) return 'text-[hsl(var(--accent))]';
    return 'text-[hsl(var(--destructive))]';
  };

  const getScoreIcon = () => {
    if (score >= 80) return <CheckCircle2 className="h-8 w-8 text-[hsl(var(--success))]" />;
    if (score >= 60) return <Shield className="h-8 w-8 text-[hsl(var(--chart-1))]" />;
    if (score >= 40) return <TrendingUp className="h-8 w-8 text-[hsl(var(--accent))]" />;
    return <AlertTriangle className="h-8 w-8 text-[hsl(var(--destructive))]" />;
  };

  const getBadgeVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    if (score >= 40) return 'outline';
    return 'destructive';
  };

  const getProgressColor = () => {
    if (score >= 80) return 'bg-[hsl(var(--success))]';
    if (score >= 60) return 'bg-[hsl(var(--chart-1))]';
    if (score >= 40) return 'bg-[hsl(var(--accent))]';
    return 'bg-[hsl(var(--destructive))]';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-primary/20 transition-all duration-300">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          {/* Score Circle */}
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-card border-4 border-border flex items-center justify-center">
                <span className={`text-2xl sm:text-3xl font-bold ${getScoreColor()}`}>{score}</span>
              </div>
              <div className="absolute -bottom-1 -right-1">
                {getScoreIcon()}
              </div>
            </div>
            <div className="sm:hidden">
              <Badge variant={getBadgeVariant()} className="text-sm mb-1">
                {scoreLabel}
              </Badge>
              <p className="text-xs text-muted-foreground">Score de diversification</p>
            </div>
          </div>

          {/* Score Details */}
          <div className="flex-1 space-y-3 w-full">
            <div className="hidden sm:flex items-center gap-3">
              <Badge variant={getBadgeVariant()} className="text-sm">
                {scoreLabel}
              </Badge>
              <span className="text-sm text-muted-foreground">Score de diversification</span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getProgressColor()}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Valeur totale: <strong className="text-foreground">{fmtEUR(totalValue)}</strong></span>
              <span>Positions: <strong className="text-foreground">{dataQuality.total}</strong></span>
              <span>Classifiées: <strong className="text-foreground">{dataQuality.classified}/{dataQuality.total}</strong></span>
              {lastUpdated && (
                <span>Mis à jour: <strong className="text-foreground">{formatDate(lastUpdated)}</strong></span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
