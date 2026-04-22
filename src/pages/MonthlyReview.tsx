/**
 * Page /monthly-review — Revue mensuelle Pro × Perso.
 *
 * Sections :
 *   1. Sélecteur de période (mois/année)
 *   2. Revenus pro   — CA, charges, net investissable réel
 *   3. Épargne       — patrimoine, investi vs disponible (à venir)
 *   4. Bilan narratif + graphique 6 mois (à venir)
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Receipt,
  Wallet,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMonthlyReviewPro } from '@/hooks/useMonthlyReviewPro';
import { useInvoices } from '@/hooks/useInvoices';
import { fmtEUR } from '@/lib/format';

// ─────────────────────────────────────────────────────────────
// Helpers période
// ─────────────────────────────────────────────────────────────

interface Period {
  year: number;
  month: number; // 1-12
}

/**
 * Retourne le mois par défaut :
 *   - Avant le 15 du mois courant → mois précédent (données complètes)
 *   - À partir du 15 → mois courant
 */
function defaultPeriod(): Period {
  const now = new Date();
  if (now.getDate() < 15) {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Génère la liste des 13 derniers mois (courant inclus). */
function buildMonthOptions(): Array<Period & { label: string; value: string }> {
  const now = new Date();
  return Array.from({ length: 13 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    return {
      year,
      month,
      label: format(d, 'MMMM yyyy', { locale: fr }),
      value: `${year}-${month}`,
    };
  });
}

/** Bornes ISO pour filtrage côté client des factures. */
function monthBoundsISO(year: number, month: number) {
  const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const end = new Date(year, month, 1).toISOString().slice(0, 10);
  return { start, end };
}

// ─────────────────────────────────────────────────────────────
// Sub-composants
// ─────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: 'blue' | 'green' | 'amber' | 'red';
}) {
  const colorMap = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    amber: 'text-amber-700',
    red: 'text-red-600',
  };
  const textClass = color ? colorMap[color] : 'text-foreground';
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${textClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ChargeRow({
  label,
  value,
  sub,
  bold,
  separator,
  positive,
}: {
  label: string;
  value: number;
  sub?: string;
  bold?: boolean;
  separator?: boolean;
  positive?: boolean;
}) {
  const className = [
    'flex items-center justify-between py-1.5 text-sm',
    separator ? 'border-t border-border mt-1 pt-2.5' : '',
  ].join(' ');

  const valueClass = [
    'tabular-nums shrink-0',
    bold ? 'font-semibold text-base' : 'text-muted-foreground',
    positive ? 'text-green-700' : '',
  ].join(' ');

  return (
    <div className={className}>
      <span className={bold ? 'font-medium' : 'text-muted-foreground'}>
        {label}
        {sub && (
          <span className="ml-1.5 text-xs text-muted-foreground/70">{sub}</span>
        )}
      </span>
      <span className={valueClass}>
        {positive && value > 0 ? '+' : ''}
        {fmtEUR(value)}
      </span>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
        <Skeleton className="h-px" />
        <Skeleton className="h-4" />
        <Skeleton className="h-4" />
        <Skeleton className="h-4" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────

export default function MonthlyReview() {
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const def = defaultPeriod();

  const [period, setPeriod] = useState<Period>(def);
  const { year, month } = period;

  // ── Données ─────────────────────────────────────────────────
  const { data: proData, isLoading: proLoading } = useMonthlyReviewPro(year, month);
  const { invoices, isLoading: invoicesLoading } = useInvoices();

  // Factures en attente (status 'sent'|'late') émises durant le mois sélectionné.
  // Calculé côté client depuis useInvoices — pas de doublon de requête Supabase.
  const pendingInvoices = useMemo(() => {
    if (!invoices) return [];
    const { start, end } = monthBoundsISO(year, month);
    return invoices.filter(
      (inv) =>
        (inv.status === 'sent' || inv.status === 'late') &&
        inv.issue_date >= start &&
        inv.issue_date < end,
    );
  }, [invoices, year, month]);

  const pendingTotal = pendingInvoices.reduce((s, inv) => s + inv.amount_ht, 0);

  // ── Période affichée ─────────────────────────────────────────
  const periodLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: fr });

  // ── Handler sélecteur ────────────────────────────────────────
  const handlePeriodChange = (value: string) => {
    const [y, m] = value.split('-').map(Number);
    setPeriod({ year: y, month: m });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* ── En-tête ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Revue mensuelle</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Boucle complète : revenus → charges → épargne déployée.
          </p>
        </div>

        {/* Sélecteur mois/année */}
        <Select
          value={`${year}-${month}`}
          onValueChange={handlePeriodChange}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECTION 1 — REVENUS PRO
      ══════════════════════════════════════════════════════════ */}
      {proLoading || invoicesLoading ? (
        <SectionSkeleton />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Revenus pro — {periodLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4 pb-3 border-b border-border">
              <KpiCard
                label="CA encaissé"
                value={fmtEUR(proData?.revenueEncaisse ?? 0)}
                sub={
                  proData && proData.paidInvoicesCount > 0
                    ? `${proData.paidInvoicesCount} facture${proData.paidInvoicesCount > 1 ? 's' : ''}`
                    : 'Aucun encaissement'
                }
                color="blue"
              />
              <KpiCard
                label="Factures payées"
                value={String(proData?.paidInvoicesCount ?? 0)}
                sub={`ce mois`}
              />
              <KpiCard
                label="En attente"
                value={
                  pendingInvoices.length > 0
                    ? fmtEUR(pendingTotal)
                    : '—'
                }
                sub={
                  pendingInvoices.length > 0
                    ? `${pendingInvoices.length} facture${pendingInvoices.length > 1 ? 's' : ''}`
                    : 'Aucune en attente'
                }
                color={pendingInvoices.length > 0 ? 'amber' : undefined}
              />
            </div>

            {/* Breakdown charges */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Receipt className="h-3 w-3" />
                Détail des charges
              </p>

              {proData ? (
                <div className="space-y-0.5">
                  <ChargeRow
                    label="URSSAF payée"
                    value={proData.urssafPaid}
                  />
                  <ChargeRow
                    label="Provision IR"
                    sub={`T${proData.quarter}`}
                    value={proData.irProvision}
                  />
                  {proData.otherExpenses > 0 && (
                    <ChargeRow
                      label="Autres dépenses"
                      value={proData.otherExpenses}
                    />
                  )}
                  <ChargeRow
                    label="Total charges"
                    value={proData.totalCharges}
                    bold
                    separator
                  />
                  <ChargeRow
                    label="Net après charges"
                    value={proData.netAfterCharges}
                    bold
                    positive={proData.netAfterCharges > 0}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  Aucune donnée pro pour cette période.
                </p>
              )}
            </div>

            {/* Factures en attente — détail */}
            {pendingInvoices.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {pendingInvoices.length} facture{pendingInvoices.length > 1 ? 's' : ''} en attente de paiement
                </p>
                <div className="space-y-1">
                  {pendingInvoices.slice(0, 3).map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{inv.client_name}</span>
                      <span className="font-medium tabular-nums">{fmtEUR(inv.amount_ht)}</span>
                    </div>
                  ))}
                  {pendingInvoices.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{pendingInvoices.length - 3} autre{pendingInvoices.length - 3 > 1 ? 's' : ''}…
                    </p>
                  )}
                </div>
                <Link
                  to="/pro/invoices"
                  className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-medium"
                >
                  Gérer les factures <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}

            {/* État vide — pas de CA encaissé */}
            {!proLoading && proData && proData.revenueEncaisse === 0 && proData.totalCharges === 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground">
                <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Aucune entrée pro enregistrée pour {periodLabel}.
                  Marquez vos factures comme payées dans{' '}
                  <Link to="/pro/invoices" className="text-foreground underline underline-offset-2">
                    la section Factures
                  </Link>.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════
          SECTION 2 — ÉPARGNE & INVESTISSEMENT (à venir)
      ══════════════════════════════════════════════════════════ */}
      <Card className="border-dashed opacity-50">
        <CardContent className="pt-5 flex items-center gap-3 text-muted-foreground text-sm">
          <TrendingUp className="h-4 w-4 shrink-0" />
          <span>Section Épargne & investissement — en cours de construction</span>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════
          SECTION 3 — BILAN DU MOIS (à venir)
      ══════════════════════════════════════════════════════════ */}
      <Card className="border-dashed opacity-50">
        <CardContent className="pt-5 flex items-center gap-3 text-muted-foreground text-sm">
          <Wallet className="h-4 w-4 shrink-0" />
          <span>Bilan narratif du mois — en cours de construction</span>
        </CardContent>
      </Card>

    </div>
  );
}
