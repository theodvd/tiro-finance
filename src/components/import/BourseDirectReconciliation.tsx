import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDropzone } from "./FileDropzone";
import { parseBourseDirectXLSX, type BDPosition, type AppHolding } from "@/lib/parsers/bourseDirectParser";
import { supabase } from "@/integrations/supabase/client";
import { fmtEUR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusIcon: Record<BDPosition["status"], string> = {
  ok: "✅",
  ecart: "⚠️",
  manquant: "❌",
};

const statusLabel: Record<BDPosition["status"], string> = {
  ok: "OK",
  ecart: "Écart",
  manquant: "Manquant",
};

export function BourseDirectReconciliation() {
  const [status, setStatus] = useState<"idle" | "parsing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>();
  const [positions, setPositions] = useState<BDPosition[]>([]);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setStatus("error");
      setErrorMsg("Seuls les fichiers XLSX sont acceptés.");
      return;
    }
    setStatus("parsing");
    setErrorMsg(undefined);
    try {
      // Fetch current holdings with security name/symbol for matching
      const { data: holdings, error: holdingsError } = await supabase
        .from('holdings')
        .select('shares, amount_invested_eur, security:securities(isin, symbol, name)');

      if (holdingsError) {
        console.error('[BD Import] Holdings fetch error:', holdingsError);
      }

      // Note: securities table has no ISIN column, so we can't match by ISIN directly.
      // We pass symbol and name so the parser can try fuzzy matching.
      const appHoldings: AppHolding[] = (holdings || [])
        .filter((h: any) => h.security?.symbol)
        .map((h: any) => ({
          isin: (h.security.isin as string) || '',
          symbol: (h.security.symbol as string) || '',
          name: (h.security.name as string) || '',
          quantity: Number(h.shares) || 0,
          pru: Number(h.shares) > 0 ? (Number(h.amount_invested_eur) || 0) / Number(h.shares) : 0,
        }));

      console.log('[BD Import] App holdings loaded:', appHoldings.length, appHoldings);

      const result = await parseBourseDirectXLSX(file, appHoldings);
      setPositions(result);
      setStatus("success");
    } catch (err) {
      console.error('[BD Import] Error:', err);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Impossible de lire ce fichier XLSX.");
    }
  };

  const handleApply = () => {
    const corrections = positions.filter((p) => p.status !== "ok");
    toast.info(
      `${corrections.length} écart(s) détecté(s). La correction automatique sera disponible prochainement. Pour l'instant, corrige manuellement dans la page Investments.`
    );
  };

  const handleReset = () => {
    setStatus("idle");
    setPositions([]);
    setErrorMsg(undefined);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bourse Direct — Réconciliation des positions</CardTitle>
        <CardDescription>Importe ton export de positions XLSX pour vérifier et corriger les écarts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileDropzone accept=".xlsx" label="Glisse ton fichier XLSX Bourse Direct ici, ou clique pour sélectionner" status={status} errorMessage={errorMsg} onFile={handleFile} />

        {positions.length > 0 && (
          <>
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>ISIN</TableHead>
                    <TableHead className="text-right">Qté BD</TableHead>
                    <TableHead className="text-right">Qté App</TableHead>
                    <TableHead className="text-right">Écart Qté</TableHead>
                    <TableHead className="text-right">PRU BD</TableHead>
                    <TableHead className="text-right">PRU App</TableHead>
                    <TableHead className="text-right">Écart PRU</TableHead>
                    <TableHead className="text-right">Valorisation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((pos, i) => (
                    <TableRow
                      key={i}
                      className={cn(
                        pos.status === "ecart" && "bg-yellow-500/10",
                        pos.status === "manquant" && "bg-destructive/10"
                      )}
                    >
                      <TableCell>{pos.name}</TableCell>
                      <TableCell className="font-mono text-xs">{pos.isin}</TableCell>
                      <TableCell className="text-right">{pos.qtyBD}</TableCell>
                      <TableCell className="text-right">{pos.qtyApp}</TableCell>
                      <TableCell className="text-right font-medium">{pos.diffQty !== 0 ? pos.diffQty : "—"}</TableCell>
                      <TableCell className="text-right">{fmtEUR(pos.pruBD)}</TableCell>
                      <TableCell className="text-right">{pos.pruApp ? fmtEUR(pos.pruApp) : "—"}</TableCell>
                      <TableCell className="text-right font-medium">{pos.diffPRU !== 0 ? fmtEUR(pos.diffPRU) : "—"}</TableCell>
                      <TableCell className="text-right">{fmtEUR(pos.valorisationBD)}</TableCell>
                      <TableCell>{statusIcon[pos.status]} {statusLabel[pos.status]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleApply}>Appliquer les corrections</Button>
              <Button variant="outline" onClick={handleReset}>Annuler</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
