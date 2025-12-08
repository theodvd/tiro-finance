import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Globe, Briefcase, CheckCircle2 } from 'lucide-react';
import { ConcentrationRisk } from '@/hooks/useDiversification';

interface ConcentrationRisksPanelProps {
  risks: ConcentrationRisk[];
}

export function ConcentrationRisksPanel({ risks }: ConcentrationRisksPanelProps) {
  const getRiskIcon = (type: ConcentrationRisk['type']) => {
    switch (type) {
      case 'single_stock':
        return <TrendingUp className="h-4 w-4" />;
      case 'sector':
        return <Briefcase className="h-4 w-4" />;
      case 'region':
        return <Globe className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: ConcentrationRisk['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]/20';
      case 'medium':
        return 'bg-[hsl(30_90%_55%)]/10 text-[hsl(30_90%_55%)] border-[hsl(30_90%_55%)]/20';
      case 'low':
        return 'bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] border-[hsl(var(--accent))]/20';
    }
  };

  const getSeverityBadge = (severity: ConcentrationRisk['severity']) => {
    const labels = { high: 'Élevé', medium: 'Modéré', low: 'Faible' };
    const variants: Record<string, 'destructive' | 'secondary' | 'outline'> = {
      high: 'destructive',
      medium: 'secondary',
      low: 'outline',
    };
    return (
      <Badge variant={variants[severity]} className="text-[10px]">
        {labels[severity]}
      </Badge>
    );
  };

  return (
    <Card className="rounded-xl sm:rounded-2xl hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-primary/20 transition-all duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[hsl(30_90%_55%)]" />
          Risques de Concentration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {risks.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-[hsl(var(--success))]/10 rounded-lg border border-[hsl(var(--success))]/20">
            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />
            <div>
              <p className="text-sm font-medium text-foreground">Bonne diversification</p>
              <p className="text-xs text-muted-foreground">
                Aucun risque de concentration majeur détecté dans votre portefeuille.
              </p>
            </div>
          </div>
        ) : (
          risks.map((risk, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getSeverityColor(risk.severity)} transition-all hover:scale-[1.01]`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 opacity-80">{getRiskIcon(risk.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-medium">{risk.title}</h4>
                    {getSeverityBadge(risk.severity)}
                  </div>
                  <p className="text-xs mt-1 opacity-80 leading-relaxed">{risk.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-current opacity-60 rounded-full"
                        style={{ width: `${Math.min(risk.percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono opacity-70">
                      {risk.percentage.toFixed(1)}% / {risk.threshold}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Legend */}
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground">
            Seuils: Action unique &gt;{10}% • Secteur &gt;{40}% • Région &gt;{70}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
