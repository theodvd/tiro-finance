import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AllocationBreakdown, HoldingDetail } from '@/hooks/useDiversification';
import { fmtEUR, fmtPct } from '@/lib/format';
import { useState, useMemo } from 'react';
import { ArrowUpDown, Search, X } from 'lucide-react';

interface HoldingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  breakdown: AllocationBreakdown | null;
  type: 'asset_class' | 'region' | 'sector';
}

type SortField = 'ticker' | 'name' | 'value' | 'weight' | 'quantity';
type SortDirection = 'asc' | 'desc';

export function HoldingsPanel({ isOpen, onClose, breakdown, type }: HoldingsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('weight');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterField, setFilterField] = useState<'all' | 'sector' | 'region'>('all');

  const typeLabel = {
    asset_class: "Classe d'actif",
    region: 'Région',
    sector: 'Secteur',
  }[type];

  const holdings = useMemo(() => {
    if (!breakdown) return [];

    let filtered = [...breakdown.holdings];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        h =>
          h.ticker.toLowerCase().includes(query) ||
          h.name.toLowerCase().includes(query) ||
          h.sector?.toLowerCase().includes(query) ||
          h.region?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'ticker':
          comparison = a.ticker.localeCompare(b.ticker);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'weight':
          comparison = a.weight - b.weight;
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [breakdown, searchQuery, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (!breakdown) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <span>{breakdown.name}</span>
            <Badge variant="outline">{breakdown.holdings.length} positions</Badge>
          </SheetTitle>
          <SheetDescription>
            {typeLabel} représentant {fmtPct(breakdown.percentage / 100)} du portefeuille ({fmtEUR(breakdown.value)})
          </SheetDescription>
        </SheetHeader>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sort buttons */}
        <div className="flex flex-wrap gap-1 mb-4">
          <Button
            variant={sortField === 'weight' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSort('weight')}
            className="text-xs"
          >
            Poids {getSortIndicator('weight')}
          </Button>
          <Button
            variant={sortField === 'value' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSort('value')}
            className="text-xs"
          >
            Valeur {getSortIndicator('value')}
          </Button>
          <Button
            variant={sortField === 'ticker' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSort('ticker')}
            className="text-xs"
          >
            Ticker {getSortIndicator('ticker')}
          </Button>
        </div>

        {/* Holdings Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Ticker</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead className="text-right w-20 hidden sm:table-cell">Qté</TableHead>
                <TableHead className="text-right w-24">Valeur</TableHead>
                <TableHead className="text-right w-16">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucune position trouvée
                  </TableCell>
                </TableRow>
              ) : (
                holdings.map(holding => (
                  <TableRow key={holding.id} className="group">
                    <TableCell className="font-mono text-xs font-medium">
                      {holding.ticker}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm truncate max-w-[150px]">{holding.name}</p>
                        <div className="flex gap-1 mt-0.5">
                          {holding.sector && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {holding.sector}
                            </Badge>
                          )}
                          {holding.region && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {holding.region}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs hidden sm:table-cell">
                      {holding.quantity.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {fmtEUR(holding.value)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={holding.weight > 10 ? 'destructive' : holding.weight > 5 ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {holding.weight.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total affiché</span>
            <span className="font-medium">{fmtEUR(holdings.reduce((sum, h) => sum + h.value, 0))}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Nombre de positions</span>
            <span className="font-medium">{holdings.length}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
