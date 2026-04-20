import { Receipt } from "lucide-react";

/**
 * Page des cotisations sociales URSSAF.
 * Phase A : placeholder.
 * Phase B : simulateur URSSAF par régime (micro-BNC, micro-BIC),
 * historique des déclarations, statuts de paiement.
 */
export default function Charges() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Charges & URSSAF
        </h1>
        <p className="text-muted-foreground mt-1">
          Cotisations sociales, calcul automatique selon votre régime fiscal.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="p-4 bg-muted rounded-full">
          <Receipt className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Bientôt disponible</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Le simulateur URSSAF arrive en Phase B. Il calculera automatiquement
            vos cotisations sociales (micro-BNC : 24,6 % · micro-BIC : 12,8 %)
            et vous alertera sur les échéances à venir.
          </p>
        </div>
      </div>
    </div>
  );
}
