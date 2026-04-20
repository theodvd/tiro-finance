import { FileText } from "lucide-react";

/**
 * Page de gestion des factures professionnelles.
 * Phase A : placeholder.
 * Phase B : liste des factures, création, statuts (brouillon / envoyé / payé / en retard).
 */
export default function Invoices() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Factures</h1>
        <p className="text-muted-foreground mt-1">
          Suivez vos factures émises et leur statut de paiement.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="p-4 bg-muted rounded-full">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Bientôt disponible</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            La gestion des factures arrive en Phase B. Vous pourrez créer vos
            factures, suivre les encaissements et déclencher automatiquement le
            calcul de vos charges URSSAF.
          </p>
        </div>
      </div>
    </div>
  );
}
