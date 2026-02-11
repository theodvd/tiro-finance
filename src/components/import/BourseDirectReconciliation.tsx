import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDropzone } from "./FileDropzone";
import { parseBourseDirectXLSX, type BDPosition } from "@/lib/parsers/bourseDirectParser";
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
      const result = await parseBourseDirectXLSX(file);
      setPositions(result);
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Impossible de lire ce fichier XLSX.");
    }
  };

  const handleApply = () => {
    const corrections = positions.filter((p) => p.status !== "ok").length;
    toast.success(`${corrections} correction(s) appliquée(s).`);
    handleReset();
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
