import { Building2, Wallet } from "lucide-react";
import { fmtEUR, fmtPct } from "@/lib/format";
import type { EnrichedHolding } from "./types";

interface BrokerSummary {
  accountId: string;
  name: string;
  type: string;
  totalValue: number;
  totalInvested: number;
  pnl: number;
  pnlPct: number;
  positionCount: number;
  weight: number;
}

interface BrokerCardsProps {
  holdings: EnrichedHolding[];
  totalValue: number;
  selectedBroker: string | null;
  onSelectBroker: (id: string | null) => void;
}

export function BrokerCards({ holdings, totalValue, selectedBroker, onSelectBroker }: BrokerCardsProps) {
  const brokers: BrokerSummary[] = [];

  const grouped: Record<string, EnrichedHolding[]> = {};
  for (const h of holdings) {
    const key = h.account.id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(h);
  }

  for (const [accountId, items] of Object.entries(grouped)) {
    const first = items[0];
    const tv = items.reduce((s, h) => s + h.marketValue, 0);
    const ti = items.reduce((s, h) => s + (h.amount_invested_eur ?? 0), 0);
    const pnl = tv - ti;
    brokers.push({
      accountId,
      name: first.account.name,
      type: first.account.type,
      totalValue: tv,
      totalInvested: ti,
      pnl,
      pnlPct: ti > 0 ? (pnl / ti) * 100 : 0,
      positionCount: items.length,
      weight: totalValue > 0 ? (tv / totalValue) * 100 : 0,
    });
  }

  brokers.sort((a, b) => b.totalValue - a.totalValue);

  const isCrypto = (type: string) => type === 'CRYPTO';

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {brokers.map((b) => {
        const active = selectedBroker === b.accountId;
        const isPos = b.pnl >= 0;
        return (
          <button
            key={b.accountId}
            onClick={() => onSelectBroker(active ? null : b.accountId)}
            className={`flex-shrink-0 min-w-[200px] rounded-2xl p-4 text-left transition-all duration-200 border bg-card shadow-card hover:shadow-card-hover
              ${active ? 'border-primary shadow-[0_0_0_3px_hsl(248_76%_62%/0.1)]' : 'border-border'}
            `}
          >
            <div className="flex items-center gap-2 mb-3">
              {isCrypto(b.type) ? (
                <Wallet className="w-4 h-4 text-accent" />
              ) : (
                <Building2 className="w-4 h-4 text-primary" />
              )}
              <span className="text-sm font-semibold truncate">{b.name}</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{fmtEUR(b.totalValue)}</p>
            <p className={`text-sm font-semibold tabular-nums mt-0.5 ${isPos ? 'text-positive' : 'text-negative'}`}>
              {isPos ? '+' : ''}{fmtEUR(b.pnl)} ({fmtPct(b.pnlPct)})
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(b.weight, 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {b.positionCount} position{b.positionCount > 1 ? 's' : ''}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
