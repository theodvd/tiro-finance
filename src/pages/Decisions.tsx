import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DecisionCard } from '@/components/decisions/DecisionCard';
import { useDecisions, Decision } from '@/hooks/useDecisions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Decisions() {
  const navigate = useNavigate();
  const { decisions, lastAnalysisDate, loading, error } = useDecisions();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleDecisions = decisions.filter(d => !dismissedIds.has(d.id));

  const handleViewDetail = (decision: Decision) => {
    // Navigate to diversification page for most decision types
    if (decision.type === 'concentration' || decision.type === 'diversification') {
      navigate('/diversification');
    } else {
      navigate('/');
    }
  };

  const handleDismiss = (decisionId: string) => {
    setDismissedIds(prev => new Set([...prev, decisionId]));
  };

  const handleReset = () => {
    setDismissedIds(new Set());
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">Erreur lors de l'analyse : {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Décisions & points d'attention</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dernière analyse : {format(new Date(lastAnalysisDate), 'dd MMMM yyyy à HH:mm', { locale: fr })}
          </p>
        </div>
        {dismissedIds.size > 0 && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Réinitialiser ({dismissedIds.size})
          </Button>
        )}
      </div>

      {/* No decisions state */}
      {visibleDecisions.length === 0 && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="text-center py-12">
            <div className="mx-auto p-3 rounded-full bg-green-500/10 w-fit mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl text-green-700">Tout est en ordre</CardTitle>
            <CardDescription className="text-green-600/80 max-w-md mx-auto">
              Aucun point d'attention détecté sur votre portefeuille. Continuez à suivre vos investissements régulièrement.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Decision cards grid */}
      {visibleDecisions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleDecisions.map(decision => (
            <DecisionCard
              key={decision.id}
              decision={decision}
              onViewDetail={() => handleViewDetail(decision)}
              onDismiss={() => handleDismiss(decision.id)}
            />
          ))}
        </div>
      )}

      {/* Rules disclosure */}
      <Card className="mt-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Comment ces alertes sont générées</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• <strong>Concentration</strong> : position unique {'>'}10% ou classe d'actifs {'>'}70%</li>
            <li>• <strong>Liquidités</strong> : épargne liquide {'>'}20% du patrimoine</li>
            <li>• <strong>Diversification</strong> : score inférieur à 40/100</li>
            <li>• <strong>Variation</strong> : mouvement {'>'}10% sur la dernière période</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Ces règles sont indicatives et ne constituent pas un conseil financier personnalisé.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
