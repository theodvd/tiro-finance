import { ArrowRight, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFiscalProfile } from "@/hooks/useFiscalProfile";
import { useNetInvestable } from "@/hooks/useNetInvestable";
import { fmtEUR } from "@/lib/format";
import { PatrimoineSnapshot } from "@/components/dashboard/PatrimoineSnapshot";
import { OpportuniteCard } from "@/components/dashboard/OpportuniteCard";
import { ProKpis } from "@/components/dashboard/ProKpis";
import { ProjectionWidget } from "@/components/dashboard/ProjectionWidget";

/** Nom du mois courant en français (ex. "avril 2026"). */
const currentMonthLabel = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
}).format(new Date());

/**
 * Page d'accueil unifiée Solvio.
 * Phase A : oriente vers les deux sections + widget net investissable
 *           basé sur le CA cible annuel ÷ 12 (sans factures réelles).
 * Phase B : le CA mensuel proviendra des encaissements réels.
 */
export default function Dashboard() {
  const { hasProfile, isLoading } = useFiscalProfile();
  const {
    breakdown,
    revenueSource,
    paidInvoicesCount,
    urssafThisMonth,
    hasUrssafDeclaration,
    isReady,
  } = useNetInvestable();

  return (
    <div className="space-y-8">

      {/* Bannière onboarding fiscal — visible si profil fiscal absent */}
      {!isLoading && !hasProfile && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Configurez votre profil fiscal</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Indiquez votre régime (micro-entreprise, EI…) pour activer le
              calcul de votre net investissable mensuel.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0">
            <Link to="/profile?tab=fiscal">
              Configurer
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">
          Vue unifiée de vos finances professionnelles et personnelles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Zone KPIs pro */}
        <ProKpis />

        {/* Zone 2 — Snapshot patrimoine perso */}
        <PatrimoineSnapshot />
      </div>

      {/* Widget net investissable */}
      {isReady && breakdown ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* En-tête */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground capitalize">
                  Net investissable — {currentMonthLabel}
                </p>
                <p className="text-3xl font-bold mt-1">
                  {fmtEUR(breakdown.netAfterDeductions)}
                </p>
              </div>
              {breakdown.isEstimate && (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium shrink-0 mt-1">
                  Estimation
                </span>
              )}
            </div>

            {/* Décomposition */}
            <div className="space-y-1.5 text-sm border-t pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">CA brut HT</span>
                <span className="font-medium">{fmtEUR(breakdown.revenue)}</span>
              </div>
              <div className="flex justify-between text-destructive/80">
                <span>− URSSAF ({Math.round(breakdown.rates.urssaf * 100)} %)</span>
                <span>− {fmtEUR(breakdown.urssaf)}</span>
              </div>
              <div className="flex justify-between text-destructive/80">
                <span>
                  − IR{" "}
                  {breakdown.irMethod === "versement_liberatoire"
                    ? `VL (${Math.round(breakdown.rates.ir * 100 * 10) / 10} %)`
                    : "(barème estimé)"}
                </span>
                <span>− {fmtEUR(breakdown.ir)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1.5 mt-1">
                <span>Net après charges</span>
                <span>{fmtEUR(breakdown.netAfterDeductions)}</span>
              </div>
            </div>

            {/* Notes contextuelles */}
            <div className="space-y-1.5">
              {revenueSource === 'real' && (
                <p className="text-xs text-green-700 flex items-center gap-1.5">
                  <Info className="w-3 h-3 shrink-0" />
                  Basé sur {paidInvoicesCount} facture{paidInvoicesCount > 1 ? 's' : ''} payée{paidInvoicesCount > 1 ? 's' : ''} ce mois.
                </p>
              )}
              {revenueSource === 'target' && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3 h-3 shrink-0" />
                  Basé sur votre CA cible annuel ÷ 12 — aucune facture encaissée ce mois.
                </p>
              )}
              {hasUrssafDeclaration ? (
                <p className="text-xs text-green-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  URSSAF déclarée ce mois : − {fmtEUR(urssafThisMonth)}
                </p>
              ) : (
                <p className="text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Provisions URSSAF non encore déclarées —{' '}
                  <Link to="/pro/charges" className="underline underline-offset-2">déclarer</Link>
                </p>
              )}
              {breakdown.isEstimate && breakdown.warning && (
                <p className="text-xs text-amber-700 flex items-start gap-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  {breakdown.warning}
                </p>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3 h-3 shrink-0" />
                Hors dépenses personnelles (loyer, courses…).
              </p>
            </div>

            {/* CTA Zone 1 → redirection vers /perso/investments avec suggestion */}
            {breakdown.netAfterDeductions > 0 && (
              <div className="pt-1 border-t">
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <Link to={`/perso/patrimoine?suggest=${Math.round(breakdown.netAfterDeductions)}`}>
                    Investir {fmtEUR(breakdown.netAfterDeductions)}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : !isLoading && hasProfile ? (
        /* Profil fiscal présent mais CA cible non renseigné */
        <Card className="border-dashed border-muted">
          <CardContent className="pt-6 text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Net investissable — {currentMonthLabel}
            </p>
            <p className="text-2xl font-bold text-muted-foreground/50">—</p>
            <p className="text-xs text-muted-foreground">
              Renseignez un CA cible annuel dans votre profil fiscal pour activer ce calcul.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link to="/profile?tab=fiscal">
                Compléter le profil fiscal
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Widget Projection retraite */}
      <ProjectionWidget />

      {/* Zone 3 — Opportunité du mois */}
      <OpportuniteCard
        netAfterDeductions={isReady && breakdown ? breakdown.netAfterDeductions : null}
      />
    </div>
  );
}
