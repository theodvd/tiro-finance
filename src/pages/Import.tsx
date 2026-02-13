import { TradeRepublicImport } from "@/components/import/TradeRepublicImport";
import { BourseDirectReconciliation } from "@/components/import/BourseDirectReconciliation";
import { CoinbaseSync } from "@/components/import/CoinbaseSync";

export default function Import() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import</h1>
        <p className="text-muted-foreground mt-1">Importe et réconcilie tes données depuis tes courtiers.</p>
      </div>
      <TradeRepublicImport />
      <BourseDirectReconciliation />
      <CoinbaseSync />
    </div>
  );
}
