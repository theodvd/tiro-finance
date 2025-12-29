import { AlertTriangle, TrendingDown, PieChart, Droplets, ChevronRight, X, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Decision } from '@/hooks/useDecisions';
import { DecisionStatus } from '@/hooks/useDecisionStatus';

interface DecisionCardProps {
  decision: Decision;
  status?: DecisionStatus;
  onViewDetail?: () => void;
  onDismiss?: () => void;
}

const getDecisionIcon = (type: Decision['type']) => {
  switch (type) {
    case 'concentration':
      return AlertTriangle;
    case 'liquidity':
      return Droplets;
    case 'diversification':
      return PieChart;
    case 'variation':
      return TrendingDown;
    default:
      return AlertTriangle;
  }
};

const getSeverityStyles = (severity: Decision['severity']) => {
  switch (severity) {
    case 'high':
      return {
        badge: 'bg-destructive/10 text-destructive border-destructive/20',
        icon: 'text-destructive',
        border: 'border-l-destructive',
        label: 'Priorité haute',
      };
    case 'medium':
      return {
        badge: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        icon: 'text-orange-500',
        border: 'border-l-orange-500',
        label: 'Priorité moyenne',
      };
    case 'low':
      return {
        badge: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
        icon: 'text-yellow-500',
        border: 'border-l-yellow-500',
        label: 'À surveiller',
      };
  }
};

const getStatusBadge = (status: DecisionStatus) => {
  switch (status) {
    case 'new':
      return { className: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Nouveau', icon: Sparkles };
    case 'treated':
      return { className: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Traité', icon: CheckCircle2 };
    case 'ignored':
      return { className: 'bg-muted text-muted-foreground border-muted', label: 'Ignoré', icon: XCircle };
    case 'viewed':
      return null; // No badge for viewed status (it's the "normal" state after reading)
    default:
      return null;
  }
};

export function DecisionCard({ decision, status = 'new', onViewDetail, onDismiss }: DecisionCardProps) {
  const Icon = getDecisionIcon(decision.type);
  const styles = getSeverityStyles(decision.severity);
  const statusBadge = getStatusBadge(status);

  return (
    <Card className={`border-l-4 ${styles.border} hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-muted ${styles.icon}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{decision.title}</CardTitle>
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="outline" className={`text-xs ${styles.badge}`}>
                  {styles.label}
                </Badge>
                {statusBadge && (
                  <Badge variant="outline" className={`text-xs ${statusBadge.className}`}>
                    <statusBadge.icon className="h-3 w-3 mr-1" />
                    {statusBadge.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-foreground">{decision.impact}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {decision.explanation}
        </p>
        
        {decision.relatedHoldings && decision.relatedHoldings.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {decision.relatedHoldings.map((ticker) => (
              <Badge key={ticker} variant="secondary" className="text-xs font-mono">
                {ticker}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {onViewDetail && (
            <Button variant="outline" size="sm" onClick={onViewDetail} className="flex-1">
              Voir le détail
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Ignorer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
