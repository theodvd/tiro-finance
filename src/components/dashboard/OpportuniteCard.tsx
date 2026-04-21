/**
 * OpportuniteCard — Zone 3 du Dashboard : "Opportunité du mois".
 *
 * Logique :
 *   disponible = netAfterDeductions (depuis useNetInvestable, passé en prop)
 *   investedThisMonth = useInvestedThisMonth() (holdings créés ce mois)
 *   reste = disponible - investedThisMonth
 *
 * États :
 *   A. !isReady (pas de profil fiscal) → null — la bannière onboarding couvre déjà ce cas
 *   B. disponible <= 0 → null (pas de montant disponible, pas d'opportunité à signaler)
 *   C. investedThisMonth >= disponible → card verte "Objectif du mois atteint ✓"
 *   D. investedThisMonth > 0 mais reste > 0 → card amber partielle
 *   E. investedThisMonth === 0 → card amber "X€ disponibles à investir"
 */

import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useInvestedThisMonth } from '@/hooks/useInvestedThisMonth';
import { fmtEUR } from '@/lib/format';

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface OpportuniteCardProps {
  /** Net investissable calculé (Zone 1). null = profil fiscal absent. */
  netAfterDeductions: number | null;
}

// ─────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────

export function OpportuniteCard({ netAfterDeductions }: OpportuniteCardProps) {
  const { investedThisMonth, isLoading } = useInvestedThisMonth();

  // Pas de profil ou net nul/négatif → rien à afficher
  if (netAfterDeductions === null || netAfterDeductions <= 0) return null;
  // En chargement → rien (évite le flash de la card "amber" avant de savoir ce qui est investi)
  if (isLoading) return null;

  const objectifAtteint = investedThisMonth >= netAfterDeductions;
  const reste = Math.max(netAfterDeductions - investedThisMonth, 0);
  const suggestAmount = Math.round(reste);

  // Objectif atteint → card verte
  if (objectifAtteint) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">
                Objectif du mois atteint ✓
              </p>
              <p className="text-sm text-green-700 mt-0.5">
                {fmtEUR(investedThisMonth)} investis ce mois — vous avez couvert votre
                net investissable.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Opportunité disponible → card amber
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {fmtEUR(reste)} disponibles à investir ce mois
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                {investedThisMonth > 0
                  ? `${fmtEUR(investedThisMonth)} déjà investis — il vous reste ${fmtEUR(reste)}.`
                  : 'Aucun investissement enregistré ce mois.'}
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
          >
            <Link to={`/perso/investments?suggest=${suggestAmount}`}>
              Allouer
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
