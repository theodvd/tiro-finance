import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, RefreshCw, Eye, XCircle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DecisionCard } from '@/components/decisions/DecisionCard';
import { useDecisions } from '@/hooks/useDecisions';
import { useDecisionStatus, DecisionStatus } from '@/hooks/useDecisionStatus';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type FilterType = 'toHandle' | 'ignored' | 'treated' | 'all';

export default function Decisions() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>('toHandle');
  const { decisions, lastAnalysisDate, loading, error } = useDecisions();
  const { getStatus, markAsIgnored, resetAll, countByStatus } = useDecisionStatus();

  const counts = countByStatus(decisions);

  // Filter decisions based on active filter
  const filteredDecisions = decisions.filter(d => {
    const status = getStatus(d.id);
    switch (activeFilter) {
      case 'toHandle':
        return status === 'new' || status === 'viewed';
      case 'ignored':
        return status === 'ignored';
      case 'treated':
        return status === 'treated';
      case 'all':
        return true;
      default:
        return true;
    }
  });

  const handleViewDetail = (decisionId: string) => {
    navigate(`/decisions/${decisionId}`);
  };

  const handleDismiss = (decisionId: string) => {
    markAsIgnored(decisionId);
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
        {(counts.ignored > 0 || counts.treated > 0) && (
          <Button variant="outline" size="sm" onClick={resetAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Filters tabs */}
      <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="toHandle" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">À traiter</span>
            {counts.toHandle > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {counts.toHandle}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ignored" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Ignorées</span>
            {counts.ignored > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {counts.ignored}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="treated" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">Traitées</span>
            {counts.treated > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {counts.treated}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Tout</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {decisions.length}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* No decisions state */}
      {filteredDecisions.length === 0 && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="text-center py-12">
            <div className="mx-auto p-3 rounded-full bg-green-500/10 w-fit mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl text-green-700">
              {activeFilter === 'toHandle' && 'Tout est en ordre'}
              {activeFilter === 'ignored' && 'Aucune décision ignorée'}
              {activeFilter === 'treated' && 'Aucune décision traitée'}
              {activeFilter === 'all' && 'Aucune décision détectée'}
            </CardTitle>
            <CardDescription className="text-green-600/80 max-w-md mx-auto">
              {activeFilter === 'toHandle' && 'Aucun point d\'attention détecté sur votre portefeuille. Continuez à suivre vos investissements régulièrement.'}
              {activeFilter === 'ignored' && 'Les décisions que vous ignorerez apparaîtront ici.'}
              {activeFilter === 'treated' && 'Les décisions que vous marquez comme traitées apparaîtront ici.'}
              {activeFilter === 'all' && 'Votre portefeuille ne présente actuellement aucun point d\'attention.'}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Decision cards grid */}
      {filteredDecisions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDecisions.map(decision => (
            <DecisionCard
              key={decision.id}
              decision={decision}
              status={getStatus(decision.id)}
              onViewDetail={() => handleViewDetail(decision.id)}
              onDismiss={activeFilter !== 'ignored' ? () => handleDismiss(decision.id) : undefined}
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
