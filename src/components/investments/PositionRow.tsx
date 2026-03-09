import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { fmtEUR, fmtPct } from "@/lib/format";
import type { EnrichedHolding } from "./types";

interface PositionRowProps {
  holding: EnrichedHolding;
  onEdit: () => void;
  onDelete: () => void;
  priceUpdatedAt?: string;
}

const ASSET_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  CRYPTO: { label: 'Crypto', bg: 'bg-amber-50', text: 'text-amber-700' },
  ETF: { label: 'ETF', bg: 'bg-violet-50', text: 'text-violet-700' },
  STOCK: { label: 'Action', bg: 'bg-blue-50', text: 'text-blue-700' },
  BOND: { label: 'Obligation', bg: 'bg-orange-50', text: 'text-orange-700' },
  REIT: { label: 'REIT', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

export function PositionRow({ holding, onEdit, onDelete, priceUpdatedAt }: PositionRowProps) {
  const { security, account, shares, amount_invested_eur, marketValue, pnl, pnlPct } = holding;
  const invested = amount_invested_eur ?? 0;
  const pru = shares > 0 ? invested / shares : 0;
  const price = shares > 0 ? marketValue / shares : 0;
  const isPos = pnl >= 0;
  const isCrypto = security.asset_class === 'CRYPTO';
  const badge = ASSET_BADGES[security.asset_class];

  const priceStale = priceUpdatedAt
    ? Date.now() - new Date(priceUpdatedAt).getTime() > 24 * 60 * 60 * 1000
    : false;

  const barWidth = Math.min(Math.abs(pnlPct), 100);

  return (
    <tr className="group transition-colors hover:bg-background">
      {/* Asset */}
      <td className="p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <div>
            <p className="font-semibold text-sm">{security.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">{security.symbol}</span>
              {badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Broker */}
      <td className="p-4 hidden lg:table-cell">
        <span className="text-sm">{account.name}</span>
      </td>

      {/* Quantity */}
      <td className="p-4 hidden md:table-cell text-right tabular-nums text-sm">
        {isCrypto ? shares.toFixed(6) : shares.toFixed(shares % 1 === 0 ? 0 : 2)}
      </td>

      {/* PRU */}
      <td className="p-4 hidden lg:table-cell text-right tabular-nums text-sm">
        {fmtEUR(pru)}
      </td>

      {/* Current price */}
      <td className={`p-4 hidden lg:table-cell text-right tabular-nums text-sm ${priceStale ? 'text-warning' : ''}`}>
        {fmtEUR(price)}
      </td>

      {/* Value */}
      <td className="p-3 sm:p-4 text-right tabular-nums font-semibold text-sm">
        {fmtEUR(marketValue)}
      </td>

      {/* P&L % with background bar */}
      <td className="p-3 sm:p-4 text-right">
        <div className="relative inline-flex items-center justify-end w-full">
          <div
            className={`absolute right-0 h-6 rounded-md ${isPos ? 'bg-positive' : 'bg-negative'}`}
            style={{ width: `${barWidth}%`, opacity: 0.1 }}
          />
          <span className={`relative text-sm font-semibold tabular-nums ${isPos ? 'text-positive' : 'text-negative'}`}>
            {fmtPct(pnlPct)}
          </span>
        </div>
      </td>

      {/* P&L amount */}
      <td className={`p-4 hidden sm:table-cell text-right tabular-nums text-sm font-medium ${isPos ? 'text-positive' : 'text-negative'}`}>
        {isPos ? '+' : ''}{fmtEUR(pnl)}
      </td>

      {/* Actions */}
      <td className="p-3 sm:p-4 text-right">
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
