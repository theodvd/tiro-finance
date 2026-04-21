/**
 * Page /unified/projection — simulateur de projection retraite.
 *
 * Pré-remplissage automatique :
 *   currentAge         ← useInvestorProfile().age    (fallback 30)
 *   currentWealth      ← usePortfolioData().totalValue
 *   monthlyInvestment  ← useNetInvestable() × 30 %   (fallback fiscal_profile)
 *
 * Calcul synchrone à chaque keystroke via useMemo (retirementEngine pur TS).
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Info, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RetirementChart } from '@/components/projection/RetirementChart';
import {
  computeRetirementProjection,
  type RetirementInput,
} from '@/lib/retirementEngine';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useInvestorProfile } from '@/hooks/useInvestorProfile';
import { useNetInvestable } from '@/hooks/useNetInvestable';
import { useFiscalProfile } from '@/hooks/useFiscalProfile';
import { useProCashflow } from '@/hooks/useProCashflow';
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
// SliderField — input slider + champ numérique synchronisés
// ─────────────────────────────────────────────────────────────

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  hint?: string;
  onChange: (v: number) => void;
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  hint,
  onChange,
}: SliderFieldProps) {
  const handleInput = (raw: string) => {
    const n = parseFloat(raw);
    if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Slider
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          className="flex-1"
        />
        <div className="relative w-28 shrink-0">
          <Input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => handleInput(e.target.value)}
            className="pr-8 text-right tabular-nums"
          />
          {unit && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              {unit}
            </span>
          )}
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground px-0.5">
        <span>{min.toLocaleString('fr-FR')}{unit}</span>
        <span>{max.toLocaleString('fr-FR')}{unit}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function Projection() {
  // ── Données pré-remplissage ──────────────────────────────
  const { rawProfile, isLoading: profileLoading } = useInvestorProfile();
  const profileAge = rawProfile?.age ?? null;
  const { totalValue: portfolioValue, loading: portfolioLoading } = usePortfolioData();
  const { breakdown, revenueSource, isLoading: netLoading } = useNetInvestable();
  const { profile } = useFiscalProfile();
  const { summary } = useProCashflow();

  // ── État des inputs ──────────────────────────────────────
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(65);
  const [currentWealth, setCurrentWealth] = useState(0);
  const [monthlyInvestment, setMonthlyInvestment] = useState(500);
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState(3_000);

  // ── Pré-remplissage (une seule fois chaque) ──────────────
  useEffect(() => {
    if (!profileLoading && profileAge != null) {
      setCurrentAge(profileAge);
    }
  }, [profileAge, profileLoading]);

  useEffect(() => {
    if (!portfolioLoading && portfolioValue > 0) {
      setCurrentWealth(Math.round(portfolioValue));
    }
  }, [portfolioValue, portfolioLoading]);

  useEffect(() => {
    if (!netLoading) {
      if (breakdown && breakdown.netAfterDeductions > 0) {
        setMonthlyInvestment(Math.max(1, Math.round(breakdown.netAfterDeductions * 0.3)));
      } else if (profile?.annual_revenue_target) {
        setMonthlyInvestment(
          Math.max(1, Math.round((profile.annual_revenue_target / 12) * 0.3))
        );
      }
    }
  }, [breakdown, profile, netLoading]);

  // ── Calcul synchrone de la projection ───────────────────
  const result = useMemo(() => {
    if (retirementAge <= currentAge || currentAge < 18) return null;
    const input: RetirementInput = {
      currentAge,
      retirementAge,
      currentWealth: Math.max(0, currentWealth),
      monthlyInvestment: Math.max(0, monthlyInvestment),
      targetMonthlyIncome: Math.max(0, targetMonthlyIncome),
    };
    return computeRetirementProjection(input);
  }, [currentAge, retirementAge, currentWealth, monthlyInvestment, targetMonthlyIncome]);

  // Capital cible affiché en temps réel (avant le calcul complet)
  const targetCapital = (targetMonthlyIncome * 12) / 0.04;
  const horizon = retirementAge - currentAge;

  // ── Contexte de la source d'épargne (pour la card pro) ──
  const hasRealData = revenueSource === 'real';
  const monthsWithData = hasRealData && summary ? summary.paidInvoicesCount : 0;

  // ── Scénario équilibré final ─────────────────────────────
  const balancedFinal = result
    ? result.scenarios.balanced[result.scenarios.balanced.length - 1]
    : null;

  return (
    <div className="space-y-8 pb-28">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projection retraite</h1>
        <p className="text-muted-foreground mt-1">
          Simulateur interactif — les calculs sont mis à jour en temps réel.
        </p>
      </div>

      {/* ── Zone principale : inputs gauche / graphique droite ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">

        {/* ── Colonne gauche : inputs ──────────────────────── */}
        <div className="space-y-5">

          {/* Âge actuel */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <SliderField
                label="Âge actuel"
                value={currentAge}
                min={18}
                max={70}
                step={1}
                unit=" ans"
                onChange={setCurrentAge}
              />
            </CardContent>
          </Card>

          {/* Âge de retraite cible */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <SliderField
                label="Âge de retraite cible"
                value={retirementAge}
                min={50}
                max={75}
                step={1}
                unit=" ans"
                hint={horizon > 0 ? `Horizon : ${horizon} ans` : undefined}
                onChange={(v) => {
                  if (v > currentAge) setRetirementAge(v);
                }}
              />
            </CardContent>
          </Card>

          {/* Patrimoine actuel */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <SliderField
                label="Patrimoine actuel"
                value={currentWealth}
                min={0}
                max={500_000}
                step={1_000}
                unit=" €"
                hint={portfolioValue > 0 ? '← depuis votre portefeuille' : undefined}
                onChange={setCurrentWealth}
              />
            </CardContent>
          </Card>

          {/* Épargne mensuelle */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <SliderField
                label="Épargne mensuelle investie"
                value={monthlyInvestment}
                min={0}
                max={10_000}
                step={50}
                unit=" €"
                hint={breakdown ? '← 30 % de votre net' : undefined}
                onChange={setMonthlyInvestment}
              />
            </CardContent>
          </Card>

          {/* Revenu mensuel cible + capital affiché */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <SliderField
                label="Revenu mensuel cible à la retraite"
                value={targetMonthlyIncome}
                min={1_000}
                max={10_000}
                step={100}
                unit=" €"
                onChange={setTargetMonthlyIncome}
              />
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                <span className="text-xs text-muted-foreground">
                  Capital cible (règle des 4 %)
                </span>
                <span className="font-semibold text-sm tabular-nums">
                  {fmtK(targetCapital)}
                </span>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── Colonne droite : graphique ───────────────────── */}
        <Card className="sticky top-20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Projection de {currentAge} à {retirementAge} ans
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Scénarios prudent (3 %), équilibré (5 %) et dynamique (7 %) — composés mensuellement
            </p>
          </CardHeader>
          <CardContent>
            {result ? (
              <RetirementChart result={result} />
            ) : (
              <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">
                L'âge de retraite doit être supérieur à l'âge actuel.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Cards de synthèse ─────────────────────────────── */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Card 1 — Scénario équilibré */}
          <Card className={
            balancedFinal != null && balancedFinal >= result.targetCapital
              ? 'border-green-200 bg-green-50/40'
              : 'border-amber-200 bg-amber-50/40'
          }>
            <CardContent className="pt-5 space-y-2">
              <div className="flex items-start gap-2">
                {balancedFinal != null && balancedFinal >= result.targetCapital ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <p className="text-sm font-semibold">Scénario équilibré (5 %/an)</p>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                {fmtK(balancedFinal ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                Patrimoine estimé à {retirementAge} ans
                {balancedFinal != null && balancedFinal >= result.targetCapital
                  ? ' — objectif atteint ✓'
                  : ''}
              </p>
            </CardContent>
          </Card>

          {/* Card 2 — Gap / Surplus */}
          <Card className={
            result.gapAtRetirement > 0
              ? 'border-red-100 bg-red-50/30'
              : 'border-green-200 bg-green-50/40'
          }>
            <CardContent className="pt-5 space-y-2">
              {result.gapAtRetirement > 0 ? (
                <>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold">Déficit projeté</p>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-red-600">
                    − {fmtK(result.gapAtRetirement)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Il manque {fmtK(result.gapAtRetirement)} par rapport à l'objectif
                    — soit {fmtEUR(result.monthlyDeltaNeeded)}/mois supplémentaires.
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-1">
                    <Link to="/dashboard">
                      Voir mon net investissable
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold">Objectif dépassé 🎉</p>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-green-700">
                    + {fmtK(Math.abs(result.gapAtRetirement))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Surplus par rapport à votre objectif de {fmtK(result.targetCapital)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card 3 — Contexte pro */}
          <Card>
            <CardContent className="pt-5 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold">Source de l'épargne</p>
              </div>
              {hasRealData ? (
                <p className="text-xs text-muted-foreground">
                  Basé sur votre épargne estimée de{' '}
                  <span className="font-semibold text-foreground">
                    {fmtEUR(monthlyInvestment)}/mois
                  </span>{' '}
                  (30 % de votre net investissable — {monthsWithData} facture
                  {monthsWithData > 1 ? 's' : ''} ce mois).
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Épargne estimée à 30 % de votre net investissable cible.
                  Ajoutez des factures pour affiner la projection avec des données réelles.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Modifiez le slider «&nbsp;Épargne mensuelle&nbsp;» pour tester différents scénarios.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Disclaimer ────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3">
        <p className="text-xs text-muted-foreground text-center max-w-4xl mx-auto leading-relaxed">
          <span className="font-medium">Simulation à titre indicatif uniquement.</span>{' '}
          Les rendements affichés sont des hypothèses, pas des garanties. Les performances passées
          ne préjugent pas des performances futures. Ceci ne constitue pas un conseil en
          investissement au sens de la réglementation AMF.
        </p>
      </div>
    </div>
  );
}
