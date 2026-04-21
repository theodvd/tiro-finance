/**
 * ProKpis — Zone KPIs professionnels du Dashboard.
 *
 * Remplace la card placeholder "Section professionnelle".
 * Aucune nouvelle requête Supabase : réutilise useProCashflow et useInvoices
 * dont les query keys sont déjà en cache si l'utilisateur a visité /pro/*.
 *
 * KPIs affichés :
 *   1. CA encaissé ce mois     → useProCashflow().summary.revenueThisMonth
 *   2. Factures en attente     → useInvoices() → status 'sent' | 'late'
 *   3. Prochaine échéance URSSAF → 31 du mois suivant (URSSAF mensuelle micro)
 */

import { ArrowRight, Briefcase, Euro, FileText, CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProCashflow } from '@/hooks/useProCashflow';
import { useInvoices } from '@/hooks/useInvoices';
import { fmtEUR } from '@/lib/format';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Retourne "31 mois+1 année" comme libellé d'échéance URSSAF mensuelle. */
function nextUrssafDeadline(): string {
  const now = new Date();
  // Dernier jour du mois suivant
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
  }).format(lastDay);
}

// ─────────────────────────────────────────────────────────────
// Sous-composant KPI row
// ─────────────────────────────────────────────────────────────

function KpiRow({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-semibold truncate ${valueClass ?? ''}`}>{value}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────

export function ProKpis() {
  const { summary, isLoading: cashflowLoading } = useProCashflow();
  const { invoices, isLoading: invoicesLoading } = useInvoices();

  const isLoading = cashflowLoading || invoicesLoading;

  // Factures en attente (envoyées ou en retard)
  const pendingInvoices = invoices.filter(
    (inv) => inv.status === 'sent' || inv.status === 'late'
  );
  const pendingCount = pendingInvoices.length;
  const pendingTotal = pendingInvoices.reduce((s, inv) => s + inv.amount_ht, 0);

  const deadline = nextUrssafDeadline();

  // ── Skeleton ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="space-y-3 border-t pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">

        {/* En-tête */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Briefcase className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <p className="font-medium">Activité pro</p>
            <p className="text-sm text-muted-foreground">Ce mois</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="space-y-3 border-t pt-4">
          <KpiRow
            icon={<Euro className="w-4 h-4" />}
            label="CA encaissé ce mois"
            value={summary && summary.revenueThisMonth > 0
              ? fmtEUR(summary.revenueThisMonth)
              : '—'}
            valueClass={summary && summary.revenueThisMonth > 0 ? 'text-green-700' : undefined}
          />
          <KpiRow
            icon={<FileText className="w-4 h-4" />}
            label="Factures en attente"
            value={
              pendingCount === 0
                ? 'Aucune'
                : `${pendingCount} facture${pendingCount > 1 ? 's' : ''} · ${fmtEUR(pendingTotal)}`
            }
            valueClass={pendingCount > 0 ? 'text-amber-700' : undefined}
          />
          <KpiRow
            icon={<CalendarClock className="w-4 h-4" />}
            label="Prochaine échéance URSSAF"
            value={`31 ${deadline.split(' ').slice(1).join(' ')}`}
          />
        </div>

        {/* CTA */}
        <Button asChild variant="outline" size="sm">
          <Link to="/pro/invoices">
            Gérer mes factures
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
