import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDropzone } from "./FileDropzone";
import { parseTradeRepublicPDF, type TRTransaction } from "@/lib/parsers/tradeRepublicParser";
import { persistTradeRepublicTransactions } from "@/lib/persistTradeRepublicImport";
import { fmtEUR } from "@/lib/format";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function TradeRepublicImport() {
  const [status, setStatus] = useState<"idle" | "parsing" | "success" | "error" | "importing">("idle");
  const [errorMsg, setErrorMsg] = useState<string>();
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [transactions, setTransactions] = useState<TRTransaction[]>([]);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setStatus("error");
      setErrorMsg("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    setStatus("parsing");
    setErrorMsg(undefined);
    try {
      const result = await parseTradeRepublicPDF(file);
      setTransactions(result);
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
      setStatus("success"); // keep showing the table
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setTransactions([]);
    setErrorMsg(undefined);
    setImportResult(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade Republic — Import des transactions</CardTitle>
        <CardDescription>Importe ton relevé de compte PDF pour synchroniser tes transactions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileDropzone accept=".pdf" label="Glisse ton PDF Trade Republic ici, ou clique pour sélectionner" status={status === "importing" ? "success" : status} errorMessage={errorMsg} onFile={handleFile} />

        {transactions.length > 0 && (
          <>
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Compte</TableHead>
                    <TableHead>ISIN</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead className="text-right">Montant EUR</TableHead>
                    <TableHead className="text-right">Prix unitaire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, i) => (
                    <TableRow key={i}>
                      <TableCell>{tx.date}</TableCell>
                      <TableCell>{tx.type}</TableCell>
                      <TableCell>{tx.account}</TableCell>
                      <TableCell className="font-mono text-xs">{tx.isin}</TableCell>
                      <TableCell>{tx.name}</TableCell>
                      <TableCell className="text-right">{tx.quantity}</TableCell>
                      <TableCell className="text-right">{fmtEUR(tx.amountEur)}</TableCell>
                      <TableCell className="text-right">{fmtEUR(tx.unitPrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {importResult && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                ✅ {importResult.inserted} transactions insérées, {importResult.skipped} ignorées (doublons ou ISIN inconnu).
              </div>
            )}
            <div className="flex gap-3">
              {!importResult && (
                <Button onClick={handleImport} disabled={status === "importing"}>
                  {status === "importing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Importer {transactions.length} transactions
                </Button>
              )}
              <Button variant="outline" onClick={handleReset}>
                {importResult ? "Nouvel import" : "Annuler"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
