/**
 * Page /pro/charges — simulateur URSSAF et cotisations sociales.
 * Phase B : simulateur interactif + historique des déclarations.
 */

import { URSSAFSimulator } from '@/components/pro/URSSAFSimulator';

export default function Charges() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Charges & URSSAF</h1>
        <p className="text-muted-foreground mt-1">
          Simulez vos cotisations sociales et provisions fiscales, puis enregistrez
          votre déclaration mensuelle.
        </p>
      </div>

      <URSSAFSimulator />
    </div>
  );
}
