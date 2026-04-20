import { Calculator } from "lucide-react";

/**
 * Page des provisions fiscales (IR, CFE).
 * Phase A : placeholder.
 * Phase B : estimation IR (barème progressif ou versement libératoire),
 * provisions trimestrielles, alerte CFE.
 */
export default function Tax() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Impôts & Provisions
        </h1>
        <p className="text-muted-foreground mt-1">
          Provisions IR, CFE et estimation de votre charge fiscale annuelle.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="p-4 bg-muted rounded-full">
          <Calculator className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Bientôt disponible</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Le simulateur fiscal arrive en Phase B. Il estimera votre impôt sur
            le revenu (versement libératoire ou barème progressif) et vous
            suggèrera un montant de provision mensuelle à mettre de côté.
          </p>
        </div>
      </div>
    </div>
  );
}
