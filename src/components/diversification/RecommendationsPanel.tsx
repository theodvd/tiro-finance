import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRight, Sparkles } from 'lucide-react';
import { DiversificationRecommendation } from '@/hooks/useDiversification';

interface RecommendationsPanelProps {
  recommendations: DiversificationRecommendation[];
}

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  const getPriorityColor = (priority: DiversificationRecommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/30';
      case 'medium':
        return 'bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))]/30';
      case 'low':
        return 'bg-muted/50 border-border';
    }
  };

  const getPriorityBadge = (priority: DiversificationRecommendation['priority']) => {
    const labels = { high: 'Prioritaire', medium: 'Suggéré', low: 'Optionnel' };
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      high: 'default',
      medium: 'secondary',
      low: 'outline',
    };
    return (
      <Badge variant={variants[priority]} className="text-[10px]">
        {labels[priority]}
      </Badge>
    );
  };

  return (
    <Card className="rounded-xl sm:rounded-2xl hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-primary/20 transition-all duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-[hsl(var(--primary))]" />
          Suggestions d'Amélioration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-[hsl(var(--primary))]/10 rounded-lg border border-[hsl(var(--primary))]/20">
            <Sparkles className="h-5 w-5 text-[hsl(var(--primary))]" />
            <div>
              <p className="text-sm font-medium text-foreground">Portefeuille bien équilibré</p>
              <p className="text-xs text-muted-foreground">
                Votre allocation actuelle semble bien diversifiée. Continuez à surveiller régulièrement.
              </p>
            </div>
          </div>
        ) : (
          recommendations.map((rec, index) => (
            <div
              key={rec.id}
              className={`p-3 rounded-lg border ${getPriorityColor(rec.priority)} transition-all hover:scale-[1.01]`}
            >
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[hsl(var(--primary))]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-[hsl(var(--primary))]">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-medium text-foreground">{rec.title}</h4>
                    {getPriorityBadge(rec.priority)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {rec.description}
                  </p>
                  {rec.relatedHoldings.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rec.relatedHoldings.slice(0, 4).map(ticker => (
                        <Badge key={ticker} variant="outline" className="text-[10px] font-mono">
                          {ticker}
                        </Badge>
                      ))}
                      {rec.relatedHoldings.length > 4 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{rec.relatedHoldings.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Disclaimer */}
        <div className="pt-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Ces suggestions sont basées sur des règles générales de diversification et ne constituent pas
            un conseil personnalisé. Votre situation personnelle, vos objectifs et votre tolérance au risque
            peuvent nécessiter une approche différente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
