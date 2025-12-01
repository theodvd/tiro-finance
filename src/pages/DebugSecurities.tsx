import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Security {
  id: string;
  symbol: string;
  name: string;
  region: string | null;
  sector: string | null;
  asset_class: string;
  currency_quote: string;
}

export function DebugSecurities() {
  const { user } = useAuth();
  const [securities, setSecurities] = useState<Security[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyUnenriched, setShowOnlyUnenriched] = useState(false);

  useEffect(() => {
    fetchSecurities();
  }, [user]);

  const fetchSecurities = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('securities')
        .select('id, symbol, name, region, sector, asset_class, currency_quote')
        .eq('user_id', user.id)
        .order('symbol');

      if (fetchError) throw fetchError;

      setSecurities(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching securities:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSecurities = showOnlyUnenriched
    ? securities.filter(s => !s.region || s.region === 'Monde' || s.region === 'Non classifié')
    : securities;

  const unenrichedCount = securities.filter(
    s => !s.region || s.region === 'Monde' || s.region === 'Non classifié'
  ).length;

  const getRegionBadge = (region: string | null) => {
    if (!region || region === 'Monde' || region === 'Non classifié') {
      return <Badge variant="destructive" className="text-xs">Non enrichi</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{region}</Badge>;
  };

  const getSectorBadge = (sector: string | null) => {
    if (!sector || sector === 'Diversifié') {
      return <Badge variant="secondary" className="text-xs">{sector || 'N/A'}</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{sector}</Badge>;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <h1 className="text-2xl font-bold tracking-tight">Debug Securities</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <h1 className="text-2xl font-bold tracking-tight">Debug Securities</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Debug Securities</h1>
        <Button onClick={fetchSecurities} variant="outline" size="sm">
          Rafraîchir
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Page de debug temporaire pour vérifier l'enrichissement des métadonnées.
          <br />
          Total: <strong>{securities.length}</strong> securities | Non enrichis: <strong>{unenrichedCount}</strong>
        </AlertDescription>
      </Alert>

      <div className="flex items-center space-x-2">
        <Switch
          id="unenriched-filter"
          checked={showOnlyUnenriched}
          onCheckedChange={setShowOnlyUnenriched}
        />
        <Label htmlFor="unenriched-filter" className="text-sm">
          Afficher uniquement les non enrichis (region IS NULL ou 'Monde' ou 'Non classifié')
        </Label>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Securities ({filteredSecurities.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Asset Class</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Sector</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSecurities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {showOnlyUnenriched 
                        ? 'Aucun security non enrichi trouvé' 
                        : 'Aucun security trouvé'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSecurities.map((security) => (
                    <TableRow key={security.id}>
                      <TableCell className="font-mono text-sm">{security.symbol}</TableCell>
                      <TableCell className="max-w-xs truncate">{security.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {security.asset_class}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {security.currency_quote}
                      </TableCell>
                      <TableCell>{getRegionBadge(security.region)}</TableCell>
                      <TableCell>{getSectorBadge(security.sector)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
