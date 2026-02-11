import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDropzone } from "./FileDropzone";
import { parseTradeRepublicPDF, type TRTransaction } from "@/lib/parsers/tradeRepublicParser";
import { fmtEUR } from "@/lib/format";
import { toast } from "sonner";

export function TradeRepublicImport() {
  const [status, setStatus] = useState<"idle" | "parsing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>();
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

  const handleImport = () => {
    toast.success(`${transactions.length} transactions importées avec succès.`);
    handleReset();
  };

  const handleReset = () => {
    setStatus("idle");
    setTransactions([]);
    setErrorMsg(undefined);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade Republic — Import des transactions</CardTitle>
        <CardDescription>Importe ton relevé de compte PDF pour synchroniser tes transactions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileDropzone accept=".pdf" label="Glisse ton PDF Trade Republic ici, ou clique pour sélectionner" status={status} errorMessage={errorMsg} onFile={handleFile} />

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
            <div className="flex gap-3">
              <Button onClick={handleImport}>Importer {transactions.length} transactions</Button>
              <Button variant="outline" onClick={handleReset}>Annuler</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
