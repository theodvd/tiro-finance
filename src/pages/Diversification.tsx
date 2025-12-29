import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, RefreshCw, Loader2, ChevronRight, AlertTriangle, Lightbulb, Info, Eye, Layers } from 'lucide-react';
import { useDiversification, AllocationBreakdown } from '@/hooks/useDiversification';
import { DiversificationScoreCard } from '@/components/diversification/DiversificationScoreCard';
import { AllocationChart } from '@/components/diversification/AllocationChart';
import { HoldingsPanel } from '@/components/diversification/HoldingsPanel';
import { ConcentrationRisksPanel } from '@/components/diversification/ConcentrationRisksPanel';
import { RecommendationsPanel } from '@/components/diversification/RecommendationsPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Diversification() {
  const { loading, error, data, refetch } = useDiversification();
  const [enriching, setEnriching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<AllocationBreakdown | null>(null);
  const [panelType, setPanelType] = useState<'asset_class' | 'region' | 'sector'>('asset_class');
  const [lookThroughMode, setLookThroughMode] = useState(false);

  const handleEnrichMetadata = async () => {
    setEnriching(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('enrich-securities', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast.success('Métadonnées enrichies', {
        description: `${result.updated} actifs mis à jour. Cliquez sur "Rafraîchir" pour voir les changements.`,
      });
    } catch (err: any) {
      toast.error('Erreur lors de l\'enrichissement', { description: err.message });
    } finally {
      setEnriching(false);
    }
  };

  const handleRefreshMetadata = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('refresh-snapshot-metadata', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast.success('Données rafraîchies');
      await refetch();
    } catch (err: any) {
      toast.error('Erreur lors du rafraîchissement', { description: err.message });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSliceClick = (breakdown: AllocationBreakdown, type: 'asset_class' | 'region' | 'sector') => {
    setSelectedBreakdown(breakdown);
    setPanelType(type);
  };

  const closePanel = () => {
    setSelectedBreakdown(null);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 md:p-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-40" />
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 md:p-8">
        <h1 className="text-xl font-bold">Diversification</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }

  if (!data || data.holdings.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 md:p-8">
        <h1 className="text-xl font-bold">Diversification</h1>
        <Card className="p-8 text-center">
          <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Aucune position trouvée</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Ajoutez des holdings à votre portefeuille et prenez un snapshot pour voir votre analyse de diversification.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </Card>
      </div>
    );
  }

  // Determine which data to show based on look-through mode
  const hasLookThroughData = data.lookThrough?.hasLookThroughData ?? false;
  const displayRegion = lookThroughMode && hasLookThroughData 
    ? data.lookThrough!.realGeographic 
    : data.byRegion;
  const displaySector = lookThroughMode && hasLookThroughData 
    ? data.lookThrough!.realSectoral 
    : data.bySector;

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Diversification</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={handleEnrichMetadata}
            disabled={enriching || refreshing}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-initial text-xs sm:text-sm"
          >
            {enriching ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            <span className="hidden sm:inline">Enrichir</span>
            <span className="sm:hidden">Enrichir</span>
          </Button>
          <Button
            onClick={handleRefreshMetadata}
            disabled={enriching || refreshing}
            size="sm"
            className="flex-1 sm:flex-initial text-xs sm:text-sm"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
            <span className="hidden sm:inline">Rafraîchir</span>
            <span className="sm:hidden">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Data quality warning */}
      {data.dataQuality.unclassified > 0 && (
        <Alert className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm">
            {data.dataQuality.unclassified} sur {data.dataQuality.total} positions n'ont pas de métadonnées complètes.
            Cliquez sur "Enrichir" puis "Rafraîchir" pour améliorer la précision de l'analyse.
          </AlertDescription>
        </Alert>
      )}

      {/* Look-Through Toggle */}
      {hasLookThroughData && (
        <Card className="rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Analyse Look-Through</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Décompose vos ETFs pour révéler l'exposition réelle sous-jacente.
                    <br />
                    <span className="text-primary font-medium">
                      {data.lookThrough!.etfsWithData.length} ETF{data.lookThrough!.etfsWithData.length > 1 ? 's' : ''} analysé{data.lookThrough!.etfsWithData.length > 1 ? 's' : ''} 
                      ({data.lookThrough!.lookThroughCoverage.toFixed(0)}% du portefeuille)
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="lookthrough-mode" className="text-xs cursor-pointer flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5" />
                          {lookThroughMode ? 'Vue réelle' : 'Vue nominale'}
                        </Label>
                        <Switch
                          id="lookthrough-mode"
                          checked={lookThroughMode}
                          onCheckedChange={setLookThroughMode}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p className="text-xs">
                        <strong>Vue nominale :</strong> Affiche vos positions telles qu'elles sont (ex: "VWCE = Monde")
                        <br /><br />
                        <strong>Vue réelle :</strong> Décompose les ETFs pour montrer où votre argent est vraiment investi 
                        (ex: "VWCE → 62% USA, 6% Japon...")
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            {/* Show ETFs covered */}
            {lookThroughMode && (
              <div className="mt-3 pt-3 border-t border-primary/10">
                <div className="flex flex-wrap gap-1.5">
                  {data.lookThrough!.etfsWithData.map((etf) => (
                    <Badge key={etf} variant="secondary" className="text-xs bg-primary/10 text-primary">
                      {etf}
                    </Badge>
                  ))}
                  {data.lookThrough!.etfsWithoutData.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            +{data.lookThrough!.etfsWithoutData.length} sans données
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            Ces ETFs n'ont pas de données de composition :<br />
                            {data.lookThrough!.etfsWithoutData.join(", ")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Score Card */}
      <DiversificationScoreCard
        score={data.score}
        scoreLabel={data.scoreLabel}
        lastUpdated={data.lastUpdated}
        totalValue={data.totalValue}
        dataQuality={data.dataQuality}
      />

      {/* Allocation Charts */}
      <Tabs defaultValue="asset_class" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="asset_class" className="text-xs sm:text-sm py-2">
            Classe d'actif
          </TabsTrigger>
          <TabsTrigger value="region" className="text-xs sm:text-sm py-2">
            Géographie
            {lookThroughMode && hasLookThroughData && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 bg-primary/20 text-primary">
                LT
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sector" className="text-xs sm:text-sm py-2">
            Secteur
            {lookThroughMode && hasLookThroughData && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 bg-primary/20 text-primary">
                LT
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="asset_class">
          <AllocationChart
            data={data.byAssetClass}
            title="Allocation par Classe d'Actif"
            onSliceClick={(b) => handleSliceClick(b, 'asset_class')}
          />
        </TabsContent>

        <TabsContent value="region">
          <AllocationChart
            data={displayRegion}
            title={lookThroughMode && hasLookThroughData ? "Allocation Géographique (Look-Through)" : "Allocation Géographique"}
            onSliceClick={(b) => handleSliceClick(b, 'region')}
          />
          {lookThroughMode && hasLookThroughData && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              <Info className="h-3 w-3 inline mr-1" />
              Cette vue décompose vos ETFs pour montrer l'exposition géographique réelle de votre portefeuille.
            </p>
          )}
        </TabsContent>

        <TabsContent value="sector">
          <AllocationChart
            data={displaySector}
            title={lookThroughMode && hasLookThroughData ? "Allocation par Secteur (Look-Through)" : "Allocation par Secteur"}
            onSliceClick={(b) => handleSliceClick(b, 'sector')}
          />
          {lookThroughMode && hasLookThroughData && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              <Info className="h-3 w-3 inline mr-1" />
              Cette vue décompose vos ETFs pour montrer l'exposition sectorielle réelle de votre portefeuille.
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Concentration Risks & Recommendations */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <ConcentrationRisksPanel risks={data.concentrationRisks} />
        <RecommendationsPanel recommendations={data.recommendations} />
      </div>

      {/* Legal Disclaimer */}
      <Card className="rounded-xl bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground text-center">
            <Info className="h-3 w-3 inline mr-1" />
            Ces informations sont fournies à titre indicatif et ne constituent pas un conseil en investissement personnalisé.
            Consultez un conseiller financier agréé pour des recommandations adaptées à votre situation.
          </p>
        </CardContent>
      </Card>

      {/* Holdings Side Panel */}
      <HoldingsPanel
        isOpen={selectedBreakdown !== null}
        onClose={closePanel}
        breakdown={selectedBreakdown}
        type={panelType}
      />
    </div>
  );
}