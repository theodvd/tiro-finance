import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { AllocationItem } from '@/hooks/useSnapshots';

interface InsightsSummaryProps {
  totalValue: number;
  totalInvested: number;
  pnl: number;
  pnlPct: number;
  allocByClass: AllocationItem[];
  allocByAccount: AllocationItem[];
  allocByRegion: AllocationItem[];
  allocBySector: AllocationItem[];
}

export function InsightsSummary({
  totalValue,
  totalInvested,
  pnl,
  pnlPct,
  allocByClass,
  allocByAccount,
  allocByRegion,
  allocBySector,
}: InsightsSummaryProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(value);

  const formatPct = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  // Calculate diversification score (0-100)
  const calculateDiversificationScore = () => {
    let score = 100;

    // Check crypto exposure
    const cryptoAlloc = allocByClass.find(a => a.name === 'CRYPTO');
    const cryptoPct = cryptoAlloc ? (cryptoAlloc.value / totalValue) * 100 : 0;
    if (cryptoPct > 15) score -= 20;
    else if (cryptoPct > 10) score -= 10;

    // Check account concentration
    const maxAccountPct = Math.max(...allocByAccount.map(a => (a.value / totalValue) * 100));
    if (maxAccountPct > 80) score -= 20;
    else if (maxAccountPct > 60) score -= 10;

    // Check asset class diversity
    const numAssetClasses = allocByClass.length;
    if (numAssetClasses < 2) score -= 20;
    else if (numAssetClasses < 3) score -= 10;

    // Check regional diversity
    const numRegions = allocByRegion.length;
    if (numRegions < 2) score -= 15;

    return Math.max(0, score);
  };

  const diversificationScore = calculateDiversificationScore();

  // Generate insights
  const insights: Array<{ type: 'positive' | 'warning' | 'info'; text: string }> = [];

  // Performance insight
  if (pnl > 0) {
    insights.push({
      type: 'positive',
      text: `Ton portefeuille a progressé de ${formatPct(pnlPct)} ce mois-ci.`,
    });
  } else if (pnl < 0) {
    insights.push({
      type: 'warning',
      text: `Ton portefeuille est en baisse de ${formatPct(Math.abs(pnlPct))}.`,
    });
  }

  // Crypto exposure
  const cryptoAlloc = allocByClass.find(a => a.name === 'CRYPTO');
  const cryptoPct = cryptoAlloc ? (cryptoAlloc.value / totalValue) * 100 : 0;
  if (cryptoPct > 10) {
    insights.push({
      type: 'warning',
      text: `Ton exposition crypto dépasse ${cryptoPct.toFixed(0)}%, ce qui augmente ton risque.`,
    });
  }

  // Account balance
  const numAccounts = allocByAccount.length;
  if (numAccounts >= 3) {
    insights.push({
      type: 'positive',
      text: `La répartition est équilibrée entre tes ${numAccounts} comptes.`,
    });
  } else if (numAccounts === 1) {
    insights.push({
      type: 'info',
      text: `Tous tes investissements sont sur un seul compte. Considère la diversification.`,
    });
  }

  // Diversification
  if (diversificationScore >= 80) {
    insights.push({
      type: 'positive',
      text: `Excellent score de diversification (${diversificationScore}/100).`,
    });
  } else if (diversificationScore < 60) {
    insights.push({
      type: 'warning',
      text: `Score de diversification à améliorer (${diversificationScore}/100).`,
    });
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-accent';
    return 'text-destructive';
  };

  const getScoreVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
      <Card className="rounded-xl sm:rounded-2xl hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-primary/20 transition-all duration-300">
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
          <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-1.5 sm:gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Résumé Automatique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
          {insights.map((insight, idx) => (
            <div key={idx} className="flex items-start gap-1.5 sm:gap-2">
              {insight.type === 'positive' && <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success mt-0.5 flex-shrink-0" />}
              {insight.type === 'warning' && <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive mt-0.5 flex-shrink-0" />}
              {insight.type === 'info' && <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
              <p className="text-xs sm:text-sm leading-relaxed">{insight.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-xl sm:rounded-2xl hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-primary/20 transition-all duration-300">
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
          <CardTitle className="text-sm sm:text-base md:text-lg">Score de Diversification</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className={`text-3xl sm:text-4xl md:text-5xl font-bold ${getScoreColor(diversificationScore)}`}>
              {diversificationScore}
            </div>
            <Badge variant={getScoreVariant(diversificationScore)} className="text-xs sm:text-sm md:text-base px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2">
              {diversificationScore >= 80 ? 'Excellent' : diversificationScore >= 60 ? 'Bon' : 'À améliorer'}
            </Badge>
          </div>
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Classes d'actifs:</span>
              <span className="font-medium text-foreground">{allocByClass.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Comptes:</span>
              <span className="font-medium text-foreground">{allocByAccount.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Régions:</span>
              <span className="font-medium text-foreground">{allocByRegion.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Secteurs:</span>
              <span className="font-medium text-foreground">{allocBySector.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
