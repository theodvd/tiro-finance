/**
 * PatrimoineSnapshot — carte compacte du patrimoine perso pour le Dashboard.
 *
 * Données : usePortfolioData() (même query key que /perso/portfolio →
 * aucun appel Supabase dupliqué si déjà en cache).
 *
 * Affiche :
 *   - Valeur totale + P&L (depuis acquisition) en €/%
 *   - Barres horizontales par compte (top 4 triés par valeur)
 *   - Skeleton pendant le chargement initial
 *   - CTA → /perso/portfolio
 */

import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { fmtEUR } from '@/lib/format';

// ─────────────────────────────────────────────────────────────
// Couleurs des barres (cycle sur 4 comptes max)
// ─────────────────────────────────────────────────────────────

const BAR_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-indigo-400',
];

// ─────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────

export function PatrimoineSnapshot() {
  const { totalValue, pnl, pnlPct, accountAllocations, loading } = usePortfolioData();

  // ── Skeleton (chargement initial) ──────────────────────────
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="space-y-1">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-2 pt-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Top 4 comptes triés par valeur décroissante
  const top4 = [...accountAllocations]
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  const pnlPositive = pnl >= 0;
  const pnlSign = pnlPositive ? '+' : '';

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">

        {/* En-tête */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <p className="font-medium">Patrimoine</p>
            <p className="text-sm text-muted-foreground">Positions & comptes</p>
          </div>
        </div>

        {/* KPI principal */}
        {totalValue > 0 ? (
          <div>
            <p className="text-2xl font-bold">{fmtEUR(totalValue)}</p>
            <p className={`text-sm font-medium flex items-center gap-1 mt-0.5 ${pnlPositive ? 'text-green-600' : 'text-destructive'}`}>
              {pnlPositive ? (
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 shrink-0" />
              )}
              {pnlSign}{fmtEUR(pnl)} · {pnlSign}{Math.abs(pnlPct).toFixed(1)} %
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune position renseignée. Ajoutez vos investissements pour voir votre patrimoine ici.
          </p>
        )}

        {/* Barres par compte */}
        {top4.length > 0 && (
          <div className="space-y-2">
            {top4.map((account, i) => {
              const widthPct = totalValue > 0
                ? Math.max((account.value / totalValue) * 100, 2)
                : 0;
              return (
                <div key={account.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground truncate max-w-[60%]">{account.name}</span>
                    <span className="font-medium tabular-nums">{fmtEUR(account.value)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <Button asChild size="sm" variant="outline">
          <Link to="/perso/portfolio">
            Voir le détail
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
