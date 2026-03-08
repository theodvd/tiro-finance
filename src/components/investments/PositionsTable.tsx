import { useState, useMemo } from "react";
import { FilterBar, type SortKey, type AssetFilter } from "./FilterBar";
import { PositionRow } from "./PositionRow";
import { fmtEUR, fmtPct } from "@/lib/format";
import { Pencil, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { EnrichedHolding } from "./types";

interface PositionsTableProps {
  holdings: EnrichedHolding[];
  selectedBroker: string | null;
  onClearBroker: () => void;
  onEdit: (holding: EnrichedHolding) => void;
  onDelete: (id: string) => void;
  priceMap?: Record<string, string>; // security_id -> updated_at
  brokerNameMap?: Record<string, string>;
}

export function PositionsTable({
  holdings,
  selectedBroker,
  onClearBroker,
  onEdit,
  onDelete,
  priceMap,
  brokerNameMap,
}: PositionsTableProps) {
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('value');

  const filtered = useMemo(() => {
    let result = holdings;

    if (selectedBroker) {
      result = result.filter(h => h.account.id === selectedBroker);
    }

    if (assetFilter !== 'ALL') {
      result = result.filter(h => h.security.asset_class === assetFilter);
    }

    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case 'value': return b.marketValue - a.marketValue;
        case 'pnl': return b.pnl - a.pnl;
        case 'pnlPct': return b.pnlPct - a.pnlPct;
        case 'name': return a.security.name.localeCompare(b.security.name);
        default: return 0;
      }
    });

    return result;
  }, [holdings, selectedBroker, assetFilter, sortKey]);

  const brokerChip = selectedBroker && brokerNameMap?.[selectedBroker]
    ? brokerNameMap[selectedBroker]
    : null;

  return (
    <div className="space-y-4">
      <FilterBar
        assetFilter={assetFilter}
        onAssetFilterChange={setAssetFilter}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
        brokerChip={brokerChip}
        onClearBroker={onClearBroker}
      />

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card p-12 text-center">
          <p className="text-muted-foreground">Aucune position trouvée avec ces filtres.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block rounded-xl bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actif</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Compte</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Qté</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">PRU</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Prix</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Valeur</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">P&L %</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">P&L</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((h) => (
                  <PositionRow
                    key={h.id}
                    holding={h}
                    onEdit={() => onEdit(h)}
                    onDelete={() => onDelete(h.id)}
                    priceUpdatedAt={priceMap?.[h.security.id]}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            {filtered.map((h) => {
              const isPos = h.pnl >= 0;
              const badge = h.security.asset_class;
              return (
                <div key={h.id} className="rounded-xl bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{h.security.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">{h.security.symbol}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-primary/15 text-primary">
                          {badge}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(h)}>
                          <Pencil className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(h.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-end justify-between mt-3">
                    <div>
                      <p className="text-lg font-bold tabular-nums">{fmtEUR(h.marketValue)}</p>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${isPos ? 'text-positive' : 'text-negative'}`}>
                      {fmtPct(h.pnlPct)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
