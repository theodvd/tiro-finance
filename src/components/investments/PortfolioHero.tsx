import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import { fmtEUR, fmtPct } from "@/lib/format";
import { Clock } from "lucide-react";

interface PortfolioHeroProps {
  totalValue: number;
  totalInvested: number;
  pnl: number;
  pnlPct: number;
  lastUpdated?: string;
  snapshots: { d: string; total_value_eur: number }[];
}

export function PortfolioHero({ totalValue, totalInvested, pnl, pnlPct, lastUpdated, snapshots }: PortfolioHeroProps) {
  const isPositive = pnl >= 0;

  const timeAgo = useMemo(() => {
    if (!lastUpdated) return null;
    const diff = Date.now() - new Date(lastUpdated).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    return `il y a ${Math.floor(hours / 24)}j`;
  }, [lastUpdated]);

  return (
    <div className="rounded-xl bg-card p-6 sm:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Left: Metrics */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">Valeur totale du portefeuille</p>
          <p className="text-3xl sm:text-4xl font-bold tabular-nums tracking-tight">
            {fmtEUR(totalValue)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-sm font-semibold tabular-nums ${isPositive ? 'text-positive' : 'text-negative'}`}>
              {isPositive ? '+' : ''}{fmtEUR(pnl)} ({fmtPct(pnlPct)})
            </span>
          </div>
          {timeAgo && (
            <div className="flex items-center gap-1.5 mt-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Dernière mise à jour : {timeAgo}</span>
            </div>
          )}
        </div>

        {/* Right: Sparkline */}
        <div className="w-full md:w-64 h-20">
          {snapshots.length >= 3 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapshots}>
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isPositive ? 'hsl(var(--positive))' : 'hsl(var(--negative))'} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={isPositive ? 'hsl(var(--positive))' : 'hsl(var(--negative))'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={['dataMin', 'dataMax']} hide />
                <Area
                  type="monotone"
                  dataKey="total_value_eur"
                  stroke={isPositive ? 'hsl(var(--positive))' : 'hsl(var(--negative))'}
                  strokeWidth={2}
                  fill="url(#sparkGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              Pas encore assez d'historique
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
