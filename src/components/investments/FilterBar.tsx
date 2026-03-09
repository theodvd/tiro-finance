import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

export type SortKey = 'value' | 'pnl' | 'pnlPct' | 'name';
export type AssetFilter = 'ALL' | 'ETF' | 'STOCK' | 'CRYPTO';

interface FilterBarProps {
  assetFilter: AssetFilter;
  onAssetFilterChange: (f: AssetFilter) => void;
  sortKey: SortKey;
  onSortKeyChange: (s: SortKey) => void;
  brokerChip?: string | null;
  onClearBroker?: () => void;
}

export function FilterBar({ assetFilter, onAssetFilterChange, sortKey, onSortKeyChange, brokerChip, onClearBroker }: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <Tabs value={assetFilter} onValueChange={(v) => onAssetFilterChange(v as AssetFilter)} className="w-full sm:w-auto">
        <TabsList className="bg-secondary rounded-xl">
          <TabsTrigger value="ALL" className="rounded-lg">Tout</TabsTrigger>
          <TabsTrigger value="ETF" className="rounded-lg">ETF</TabsTrigger>
          <TabsTrigger value="STOCK" className="rounded-lg">Actions</TabsTrigger>
          <TabsTrigger value="CRYPTO" className="rounded-lg">Crypto</TabsTrigger>
        </TabsList>
      </Tabs>

      {brokerChip && (
        <button
          onClick={onClearBroker}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          {brokerChip}
          <X className="w-3 h-3" />
        </button>
      )}

      <div className="sm:ml-auto">
        <Select value={sortKey} onValueChange={(v) => onSortKeyChange(v as SortKey)}>
          <SelectTrigger className="w-[160px] h-9 text-xs rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="value">Valeur ↓</SelectItem>
            <SelectItem value="pnl">P&L ↓</SelectItem>
            <SelectItem value="pnlPct">Perf % ↓</SelectItem>
            <SelectItem value="name">Nom A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
