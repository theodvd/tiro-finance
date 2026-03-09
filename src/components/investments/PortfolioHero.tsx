import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from "recharts";
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

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload?.d;
  const v = payload[0]?.value;
  return (
    <div className="rounded-xl bg-card px-3 py-2 shadow-card-hover border border-border text-xs">
      <p className="text-muted-foreground">{d}</p>
      <p className="font-semibold tabular-nums">{fmtEUR(v)}</p>
    </div>
  );
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

  const strokeColor = isPositive ? 'hsl(160, 100%, 36%)' : 'hsl(14, 68%, 60%)';

  return (
    <div className="rounded-2xl bg-card p-6 sm:p-8 shadow-card">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">Valeur totale du portefeuille</p>
          <p className="text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight">
            {fmtEUR(totalValue)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-lg font-semibold tabular-nums ${isPositive ? 'text-positive' : 'text-negative'}`}>
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

        <div className="w-full md:w-72 h-[120px]">
          {snapshots.length >= 3 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapshots}>
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={['dataMin', 'dataMax']} hide />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Area
                  type="monotone"
                  dataKey="total_value_eur"
                  stroke={strokeColor}
                  strokeWidth={2}
                  fill="url(#sparkGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: strokeColor, stroke: 'white', strokeWidth: 2 }}
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
