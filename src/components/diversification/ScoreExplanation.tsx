/**
 * Score Explanation Component
 * Shows transparent breakdown of how the diversification score is calculated
 */

import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  Eye,
  EyeOff,
  Calculator,
  PieChart,
  MapPin,
  Briefcase,
  Target
} from 'lucide-react';
import { DiversificationScoreResult, SubScoreBreakdown } from '@/lib/diversificationScore';

interface ScoreExplanationProps {
  score: DiversificationScoreResult;
  lookThroughScore?: DiversificationScoreResult | null;
  isLookThroughMode: boolean;
  onEnrichClick?: () => void;
}

const SUBSCORE_ICONS: Record<string, React.ReactNode> = {
  "Classes d'actifs": <PieChart className="h-4 w-4" />,
  'Régions': <MapPin className="h-4 w-4" />,
  'Secteurs': <Briefcase className="h-4 w-4" />,
  'Concentration': <Target className="h-4 w-4" />,
};

export function ScoreExplanation({ 
  score, 
  lookThroughScore, 
  isLookThroughMode,
  onEnrichClick 
}: ScoreExplanationProps) {
  const [showDebug, setShowDebug] = useState(false);
  
  const activeScore = isLookThroughMode && lookThroughScore ? lookThroughScore : score;
  
  const getScoreColor = (s: number, max: number) => {
    const pct = (s / max) * 100;
    if (pct >= 80) return 'text-[hsl(var(--success))]';
    if (pct >= 60) return 'text-[hsl(var(--chart-1))]';
    if (pct >= 40) return 'text-[hsl(var(--accent))]';
    return 'text-destructive';
  };
  
  const getProgressColor = (s: number, max: number) => {
    const pct = (s / max) * 100;
    if (pct >= 80) return 'bg-[hsl(var(--success))]';
    if (pct >= 60) return 'bg-[hsl(var(--chart-1))]';
    if (pct >= 40) return 'bg-[hsl(var(--accent))]';
    return 'bg-destructive';
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="explanation" className="border-none">
        <AccordionTrigger className="text-sm hover:no-underline py-2 px-0">
          <span className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Comment le score est calculé ?
          </span>
        </AccordionTrigger>
        <AccordionContent className="pt-2">
          <Card className="rounded-xl bg-muted/30">
            <CardContent className="p-4 space-y-4">
              {/* Weights explanation */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  Pondérations (total: 100 points)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {activeScore.subscores.map((sub) => (
                    <div 
                      key={sub.name}
                      className="bg-background rounded-lg p-2 border"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {SUBSCORE_ICONS[sub.name]}
                        <span className="text-[10px] font-medium truncate">{sub.name}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className={`text-sm font-bold ${getScoreColor(sub.score, sub.maxScore)}`}>
                          {sub.score}
                        </span>
                        <span className="text-[10px] text-muted-foreground">/{sub.maxScore}</span>
                      </div>
                      <Progress 
                        value={(sub.score / sub.maxScore) * 100} 
                        className="h-1 mt-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* HHI Explanation */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold">Méthode de calcul (HHI)</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Chaque dimension utilise l'<strong>indice HHI</strong> (Herfindahl-Hirschman) :
                  plus vos positions sont réparties équitablement, plus le score est élevé.
                  Un HHI proche de 0 = diversification parfaite. Un HHI de 10000 = concentration totale.
                </p>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  {activeScore.subscores.slice(0, 3).map((sub) => (
                    <div key={sub.name} className="bg-background rounded-lg p-2 border">
                      <p className="text-[10px] text-muted-foreground">{sub.name}</p>
                      <p className="text-xs font-mono font-bold">HHI: {sub.hhi}</p>
                      <p className="text-[10px] text-muted-foreground">
                        ({sub.itemCount} élément{sub.itemCount > 1 ? 's' : ''})
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Penalties */}
              {activeScore.penalties.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                    Pénalités appliquées
                  </h4>
                  <div className="space-y-1">
                    {activeScore.penalties.map((penalty) => (
                      <div 
                        key={penalty.code}
                        className="flex items-center justify-between text-xs bg-background rounded p-2 border border-[hsl(var(--accent))]/30"
                      >
                        <span className="text-muted-foreground">{penalty.details}</span>
                        <Badge variant="outline" className="text-[10px] text-[hsl(var(--accent))]">
                          -{penalty.points} pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Coverage */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold flex items-center gap-1.5">
                  {activeScore.coverage.classifiedPct >= 100 ? (
                    <CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                  )}
                  Couverture des données
                </h4>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {activeScore.coverage.classifiedPositions}/{activeScore.coverage.totalPositions} positions classifiées
                  </span>
                  <Badge 
                    variant={activeScore.coverage.classifiedPct >= 100 ? 'default' : 'secondary'}
                  >
                    {activeScore.coverage.classifiedPct.toFixed(0)}%
                  </Badge>
                </div>
                
                {activeScore.coverage.missingTickers.length > 0 && (
                  <div className="bg-background rounded-lg p-2 border">
                    <p className="text-[10px] text-muted-foreground mb-1">
                      Positions non classifiées :
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {activeScore.coverage.missingTickers.slice(0, 10).map((ticker) => (
                        <Badge key={ticker} variant="outline" className="text-[10px]">
                          {ticker}
                        </Badge>
                      ))}
                      {activeScore.coverage.missingTickers.length > 10 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{activeScore.coverage.missingTickers.length - 10}
                        </Badge>
                      )}
                    </div>
                    {onEnrichClick && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-[10px] p-0 h-auto mt-1"
                        onClick={onEnrichClick}
                      >
                        Enrichir les métadonnées →
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Debug toggle */}
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] h-6 px-2"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? (
                    <><EyeOff className="h-3 w-3 mr-1" /> Masquer les détails</>
                  ) : (
                    <><Eye className="h-3 w-3 mr-1" /> Afficher les détails</>
                  )}
                </Button>
                
                {showDebug && (
                  <div className="mt-2 space-y-2 text-[10px] font-mono">
                    <div className="bg-background rounded p-2 border overflow-x-auto">
                      <p className="font-semibold mb-1">HHI bruts:</p>
                      <pre className="text-muted-foreground">
                        {JSON.stringify(activeScore.debug.rawHHI, null, 2)}
                      </pre>
                    </div>
                    <div className="bg-background rounded p-2 border overflow-x-auto max-h-40">
                      <p className="font-semibold mb-1">Top positions:</p>
                      <pre className="text-muted-foreground">
                        {activeScore.debug.positionWeights
                          .slice(0, 5)
                          .map(p => `${p.ticker}: ${p.weight.toFixed(1)}%`)
                          .join('\n')}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
