import { ArrowRight, Briefcase, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Page d'accueil unifiée Solvio.
 * Phase A : placeholder qui oriente vers les deux sections.
 * Phase B : sera remplacée par le dashboard pro×perso avec le widget
 * "net investissable".
 */
export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">
          Vue unifiée de vos finances professionnelles et personnelles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Section Pro */}
        <Card className="border-2 border-dashed border-muted">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="font-medium">Section professionnelle</p>
                <p className="text-sm text-muted-foreground">
                  Factures, URSSAF, provisions fiscales
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Connectez vos données professionnelles pour calculer votre revenu
              net après charges et cotisations.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/pro/invoices">
                Voir mes factures
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Section Perso */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="font-medium">Section personnelle</p>
                <p className="text-sm text-muted-foreground">
                  Patrimoine, investissements, diversification
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Suivez votre patrimoine, vos positions et votre score de
              diversification.
            </p>
            <Button asChild size="sm">
              <Link to="/perso/portfolio">
                Voir mon patrimoine
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Widget à venir */}
      <Card className="border-2 border-dashed border-muted bg-muted/30">
        <CardContent className="pt-6 text-center space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Bientôt disponible
          </p>
          <p className="text-2xl font-bold text-muted-foreground/50">
            Net investissable ce mois-ci : —
          </p>
          <p className="text-xs text-muted-foreground">
            Complétez votre profil fiscal et ajoutez vos factures pour
            voir ce calcul.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
