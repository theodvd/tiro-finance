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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Receipt,
  Wallet,
  FileText,
  PiggyBank,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMonthlyReviewPro } from '@/hooks/useMonthlyReviewPro';
import { useMonthlyReviewPerso } from '@/hooks/useMonthlyReviewPerso';
import { useMonthlyHistory } from '@/hooks/useMonthlyHistory';
import { useInvoices } from '@/hooks/useInvoices';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useFiscalProfile } from '@/hooks/useFiscalProfile';
import { computeNetInvestable } from '@/lib/fiscalEngine';
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

// ─────────────────────────────────────────────────────────────
// Bilan narratif — string template (pas d'IA)
// ─────────────────────────────────────────────────────────────

function buildNarrative({
  periodLabel,
  revenue,
  totalCharges,
  netAfterCharges,
  invested,
  delta,
}: {
  periodLabel: string;
  revenue: number;
  totalCharges: number;
  netAfterCharges: number;
  invested: number;
  delta: number;
}): string {
  const monthCap = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);

  if (revenue === 0) {
    return `${monthCap} : aucun encaissement enregistré. Pensez à marquer vos factures comme payées.`;
  }

  const investRate = netAfterCharges > 0 ? Math.round((invested / netAfterCharges) * 100) : 0;

  if (delta <= 0) {
    return (
      `${monthCap}, vous avez encaissé ${fmtEUR(revenue)} HT. ` +
      (totalCharges > 0
        ? `Après ${fmtEUR(totalCharges)} de charges, votre net était de ${fmtEUR(netAfterCharges)}. `
        : '') +
      `Vous avez investi ${fmtEUR(invested)} ce mois — excellent, objectif atteint !`
    );
  }

  return (
    `${monthCap}, vous avez encaissé ${fmtEUR(revenue)} HT. ` +
    (totalCharges > 0
      ? `Après ${fmtEUR(totalCharges)} de charges, votre net était de ${fmtEUR(netAfterCharges)}. `
      : '') +
    `Vous avez investi ${fmtEUR(invested)} ce mois` +
    (investRate > 0 ? ` — soit ${investRate}% de votre net` : '') +
    `. Il vous restait ${fmtEUR(delta)} non investis.`
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
  const { data: persoData, isLoading: persoLoading } = useMonthlyReviewPerso(year, month);
  const { points: historyPoints, isLoading: historyLoading } = useMonthlyHistory();
  const { invoices, isLoading: invoicesLoading } = useInvoices();
  const { totalValue, pnl, pnlPct, loading: portfolioLoading } = usePortfolioData();
  const { profile } = useFiscalProfile();

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

  // ── Net investissable calculé pour le mois sélectionné ──────
  // On réutilise computeNetInvestable (fiscalEngine) avec le CA du mois
  // sélectionné — aucune requête supplémentaire.
  const netInvestable = useMemo(() => {
    if (!profile || !proData) return null;
    const breakdown = computeNetInvestable({
      monthlyRevenue: proData.revenueEncaisse,
      regime: profile.regime,
      versement_liberatoire: profile.versement_liberatoire,
      personalExpenses: 0,
    });
    return breakdown.netAfterDeductions;
  }, [profile, proData]);

  // Delta = net investissable − réellement investi
  const delta = netInvestable !== null && persoData !== null
    ? netInvestable - persoData.investedThisMonth
    : null;

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
          SECTION 2 — ÉPARGNE & INVESTISSEMENT
      ══════════════════════════════════════════════════════════ */}
      {portfolioLoading || persoLoading ? (
        <SectionSkeleton />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-primary" />
              Épargne & investissement — {periodLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* KPIs patrimoine */}
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-border">
              <KpiCard
                label="Patrimoine actuel"
                value={fmtEUR(totalValue)}
                sub="valeur de marché"
              />
              <KpiCard
                label="P&L total"
                value={`${pnl >= 0 ? '+' : ''}${fmtEUR(pnl)}`}
                sub={`${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`}
                color={pnl >= 0 ? 'green' : 'red'}
              />
            </div>

            {/* Analyse épargne */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Wallet className="h-3 w-3" />
                Analyse épargne du mois
              </p>

              <div className="space-y-0.5">
                <ChargeRow
                  label="Net investissable (calculé)"
                  value={netInvestable ?? 0}
                />
                <ChargeRow
                  label="Réellement investi"
                  value={persoData?.investedThisMonth ?? 0}
                  sub={
                    persoData && persoData.investmentCount > 0
                      ? `${persoData.investmentCount} position${persoData.investmentCount > 1 ? 's' : ''}`
                      : undefined
                  }
                />
                <ChargeRow
                  label="Épargne non déployée"
                  value={Math.max(0, delta ?? 0)}
                  bold
                  separator
                />
              </div>
            </div>

            {/* Card delta — amber si non déployé, verte si objectif atteint */}
            {delta !== null && (
              delta > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-amber-800">
                      {fmtEUR(delta)} non investis ce mois
                    </p>
                  </div>
                  <p className="text-xs text-amber-700/80">
                    Vous avez encaissé et dégagé un net de {fmtEUR(netInvestable ?? 0)},
                    mais seulement {fmtEUR(persoData?.investedThisMonth ?? 0)} ont été déployés.
                  </p>
                  <Button asChild size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                    <Link to={`/perso/investments?suggest=${Math.round(delta)}`}>
                      Investir les {fmtEUR(delta)} restants
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-green-200 bg-green-50/40 p-4 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Objectif d'épargne atteint ✓
                    </p>
                    <p className="text-xs text-green-700/80 mt-0.5">
                      Vous avez investi l'intégralité de votre net disponible ce mois.
                    </p>
                  </div>
                </div>
              )
            )}

            {/* État vide — pas de données portfolio */}
            {!portfolioLoading && totalValue === 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Aucune position enregistrée.{' '}
                  <Link to="/perso/investments" className="text-foreground underline underline-offset-2">
                    Ajoutez vos investissements
                  </Link>.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════
          SECTION 3 — BILAN DU MOIS
      ══════════════════════════════════════════════════════════ */}
      {proData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Bilan du mois
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bilan narratif */}
            <p className="text-sm leading-relaxed text-foreground">
              {buildNarrative({
                periodLabel,
                revenue: proData.revenueEncaisse,
                totalCharges: proData.totalCharges,
                netAfterCharges: proData.netAfterCharges,
                invested: persoData?.investedThisMonth ?? 0,
                delta: Math.max(0, delta ?? 0),
              })}
            </p>

            {/* CTA si delta > 0 */}
            {delta !== null && delta > 0 && (
              <Button asChild size="sm">
                <Link to={`/perso/investments?suggest=${Math.round(delta)}`}>
                  Investir les {fmtEUR(delta)} restants
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════
          SECTION 4 — GRAPHIQUE 6 DERNIERS MOIS
      ══════════════════════════════════════════════════════════ */}
      {historyLoading ? (
        <Card>
          <CardContent className="pt-5">
            <Skeleton className="h-4 w-40 mb-4" />
            <Skeleton className="h-48" />
          </CardContent>
        </Card>
      ) : historyPoints.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {historyPoints[historyPoints.length - 1]?.netInvestable >= 0
                ? <TrendingUp className="h-4 w-4 text-primary" />
                : <TrendingDown className="h-4 w-4 text-destructive" />}
              Tendance sur 6 mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={historyPoints}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                barCategoryGap="25%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.5}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) =>
                    v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                  }
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    fmtEUR(value),
                    name === 'netInvestable' ? 'Net investissable' : 'Investi',
                  ]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--background))',
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === 'netInvestable' ? 'Net investissable' : 'Investi'
                  }
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar
                  dataKey="netInvestable"
                  fill="#2563eb"
                  radius={[3, 3, 0, 0]}
                  name="netInvestable"
                />
                <Bar
                  dataKey="invested"
                  fill="#16a34a"
                  radius={[3, 3, 0, 0]}
                  name="invested"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
