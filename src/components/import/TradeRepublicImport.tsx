import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDropzone } from "./FileDropzone";
import { parseTradeRepublicPDF, type TRTransaction } from "@/lib/parsers/tradeRepublicParser";
import { persistTradeRepublicTransactions } from "@/lib/persistTradeRepublicImport";
import { computeTradeRepublicDiff, type ImportDiff } from "@/lib/computeTradeRepublicDiff";
import { fmtEUR } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, ArrowUp, ArrowDown, Minus, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function TradeRepublicImport() {
  const [status, setStatus] = useState<"idle" | "parsing" | "success" | "analyzing" | "error" | "importing">("idle");
  const [errorMsg, setErrorMsg] = useState<string>();
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [transactions, setTransactions] = useState<TRTransaction[]>([]);
  const [diff, setDiff] = useState<ImportDiff | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setStatus("error");
      setErrorMsg("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    setStatus("parsing");
    setErrorMsg(undefined);
    setDiff(null);
    setImportResult(null);
    try {
      const result = await parseTradeRepublicPDF(file);
      setTransactions(result);
      // Automatically compute diff
      setStatus("analyzing");
      const diffResult = await computeTradeRepublicDiff(result);
      setDiff(diffResult);
      setStatus("success");
    } catch (err) {
      console.error('[TR Import] Error:', err);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Impossible de lire ce PDF.");
    }
  };

  const handleImport = async () => {
    setStatus("importing");
    try {
      const result = await persistTradeRepublicTransactions(transactions);
      setImportResult(result);
      toast.success(`${result.inserted} transactions importées, ${result.skipped} ignorées (doublons).`);
      setStatus("success");
    } catch (err) {
      console.error('[TR Import] Persist error:', err);
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'import.");
      setStatus("success");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setTransactions([]);
    setErrorMsg(undefined);
    setImportResult(null);
    setDiff(null);
  };

  const dropzoneStatus = status === "importing" || status === "analyzing" ? "success" : status;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade Republic — Import des transactions</CardTitle>
        <CardDescription>Importe ton relevé de compte PDF pour synchroniser tes transactions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileDropzone accept=".pdf" label="Glisse ton PDF Trade Republic ici, ou clique pour sélectionner" status={dropzoneStatus} errorMessage={errorMsg} onFile={handleFile} />

        {status === "analyzing" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyse des différences en cours…
          </div>
        )}

        {diff && !importResult && (
          <div className="space-y-4">
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="gap-1">
                <Plus className="h-3 w-3" />
                {diff.newTransactions.length} nouvelle{diff.newTransactions.length > 1 ? "s" : ""} transaction{diff.newTransactions.length > 1 ? "s" : ""}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Minus className="h-3 w-3" />
                {diff.skippedTransactions.length} doublon{diff.skippedTransactions.length > 1 ? "s" : ""} ignoré{diff.skippedTransactions.length > 1 ? "s" : ""}
              </Badge>
            </div>

            {/* Holding deltas */}
            {diff.holdingDeltas.length > 0 && (
              <div className="rounded-lg border">
                <div className="px-4 py-3 border-b bg-muted/50">
                  <h4 className="text-sm font-semibold">Impact sur les positions</h4>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titre</TableHead>
                      <TableHead>Compte</TableHead>
                      <TableHead className="text-right">Parts actuelles</TableHead>
                      <TableHead className="text-right">Δ Parts</TableHead>
                      <TableHead className="text-right">Montant actuel</TableHead>
                      <TableHead className="text-right">Δ Montant</TableHead>
                      <TableHead className="text-right">Nouveau total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diff.holdingDeltas.map((d) => (
                      <TableRow key={`${d.isin}-${d.account}`}>
                        <TableCell>
                          <div className="font-medium text-sm">{d.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{d.isin}</div>
                        </TableCell>
                        <TableCell className="text-sm">{d.account}</TableCell>
                        <TableCell className="text-right tabular-nums">{d.currentShares}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={d.deltaShares > 0 ? "text-green-600" : d.deltaShares < 0 ? "text-red-500" : ""}>
                            {d.deltaShares > 0 ? "+" : ""}{d.deltaShares}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmtEUR(d.currentInvested)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={d.deltaInvested > 0 ? "text-green-600" : d.deltaInvested < 0 ? "text-red-500" : ""}>
                            {d.deltaInvested > 0 ? "+" : ""}{fmtEUR(d.deltaInvested)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{fmtEUR(d.newInvested)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {diff.newTransactions.length === 0 && (
              <div className="rounded-lg bg-muted p-3 text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Toutes les transactions de ce PDF sont déjà importées. Rien à faire.
              </div>
            )}

            {/* New transactions detail */}
            {diff.newTransactions.length > 0 && (
              <div className="rounded-lg border overflow-auto">
                <div className="px-4 py-3 border-b bg-muted/50">
                  <h4 className="text-sm font-semibold">Nouvelles transactions à importer</h4>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Compte</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead className="text-right">Quantité</TableHead>
                      <TableHead className="text-right">Montant EUR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diff.newTransactions.map((tx, i) => (
                      <TableRow key={i}>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === "Vente" ? "destructive" : "default"} className="text-xs">
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{tx.account}</TableCell>
                        <TableCell>{tx.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{tx.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtEUR(tx.amountEur)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              {diff.newTransactions.length > 0 && (
                <Button onClick={handleImport} disabled={status === "importing"}>
                  {status === "importing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Importer {diff.newTransactions.length} nouvelle{diff.newTransactions.length > 1 ? "s" : ""} transaction{diff.newTransactions.length > 1 ? "s" : ""}
                </Button>
              )}
              <Button variant="outline" onClick={handleReset}>
                {diff.newTransactions.length === 0 ? "Nouvel import" : "Annuler"}
              </Button>
            </div>
          </div>
        )}

        {importResult && (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted p-3 text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              {importResult.inserted} transaction{importResult.inserted > 1 ? "s" : ""} importée{importResult.inserted > 1 ? "s" : ""}, {importResult.skipped} ignorée{importResult.skipped > 1 ? "s" : ""}.
            </div>
            <Button variant="outline" onClick={handleReset}>Nouvel import</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
