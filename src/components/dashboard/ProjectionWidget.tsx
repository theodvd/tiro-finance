/**
 * ProjectionWidget — aperçu compact de la projection retraite pour le Dashboard.
 *
 * Réutilise les mêmes hooks + computeRetirementProjection que /unified/projection
 * avec les paramètres pré-remplis (âge, patrimoine, épargne estimée).
 * Non interactif : aucun slider — affiche juste le résultat scénario équilibré.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { computeRetirementProjection } from '@/lib/retirementEngine';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useInvestorProfile } from '@/hooks/useInvestorProfile';
import { useNetInvestable } from '@/hooks/useNetInvestable';
import { useFiscalProfile } from '@/hooks/useFiscalProfile';
import { fmtEUR } from '@/lib/format';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmtK(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M€`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k€`;
  return `${Math.round(v)}€`;
}

// ─────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────

export function ProjectionWidget() {
  const { rawProfile, loading: profileLoading } = useInvestorProfile();
  const { totalValue: portfolioValue, loading: portfolioLoading } = usePortfolioData();
  const { breakdown, isLoading: netLoading } = useNetInvestable();
  const { profile } = useFiscalProfile();

  const isLoading = profileLoading || portfolioLoading || netLoading;

  // Paramètres avec mêmes defaults que Projection.tsx
  const currentAge = rawProfile?.age ?? 30;
  const retirementAge = Math.max(currentAge + 5, 65);
  const currentWealth = portfolioValue > 0 ? Math.round(portfolioValue) : 0;
  const monthlyInvestment = useMemo(() => {
    if (breakdown && breakdown.netAfterDeductions > 0)
      return Math.max(1, Math.round(breakdown.netAfterDeductions * 0.3));
    if (profile?.annual_revenue_target)
      return Math.max(1, Math.round((profile.annual_revenue_target / 12) * 0.3));
    return 500;
  }, [breakdown, profile]);

  const TARGET_MONTHLY_INCOME = 3_000;

  const result = useMemo(() => {
    if (retirementAge <= currentAge || currentAge < 18) return null;
    return computeRetirementProjection({
      currentAge,
      retirementAge,
      currentWealth: Math.max(0, currentWealth),
      monthlyInvestment: Math.max(0, monthlyInvestment),
      targetMonthlyIncome: TARGET_MONTHLY_INCOME,
    });
  }, [currentAge, retirementAge, currentWealth, monthlyInvestment]);

  const horizon = retirementAge - currentAge;
  const balancedFinal = result
    ? result.scenarios.balanced[result.scenarios.balanced.length - 1]
    : null;
  const progressPct =
    result && balancedFinal != null && result.targetCapital > 0
      ? Math.min(100, Math.round((balancedFinal / result.targetCapital) * 100))
      : 0;
  const onTrack = balancedFinal != null && result && balancedFinal >= result.targetCapital;

  // ─────────────────────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-4 w-56" />
        </CardContent>
      </Card>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Rendu principal
  // ─────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Projection retraite
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
            <Link to="/unified/projection">
              Simuler
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Horizon {horizon} ans · retraite à {retirementAge} ans · {fmtEUR(monthlyInvestment)}/mois investis
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {result && balancedFinal != null ? (
          <>
            {/* Capital projeté */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Capital projeté — scénario équilibré (5 %/an)</p>
              <p className="text-2xl font-bold tabular-nums">{fmtK(balancedFinal)}</p>
            </div>

            {/* Barre de progression vers l'objectif */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progression vers l'objectif</span>
                <span>{progressPct} %</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    onTrack ? 'bg-[hsl(var(--success))]' : progressPct >= 60 ? 'bg-amber-400' : 'bg-destructive/70'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Objectif : <span className="font-medium text-foreground">{fmtK(result.targetCapital)}</span>
                {' '}(revenu de {fmtEUR(TARGET_MONTHLY_INCOME)}/mois, règle des 4 %)
              </p>
            </div>

            {/* Gap / Surplus */}
            {onTrack ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[hsl(var(--success))]/10">
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))] shrink-0" />
                <p className="text-xs text-[hsl(var(--success))] font-medium">
                  Objectif atteint — surplus de {fmtK(Math.abs(result.gapAtRetirement))}
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
                  <p className="font-medium">
                    Déficit projeté : −{fmtK(result.gapAtRetirement)}
                  </p>
                  <p className="text-amber-700 dark:text-amber-400">
                    +{fmtEUR(result.monthlyDeltaNeeded)}/mois supplémentaires pour combler l'écart.
                  </p>
                </div>
              </div>
            )}

            {/* CTA */}
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link to="/unified/projection">
                Affiner la simulation
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <p>Complétez votre profil pour activer la projection.</p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link to="/unified/projection">
                Ouvrir le simulateur
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
