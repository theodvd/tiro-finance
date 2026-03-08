import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileDropzone } from "./FileDropzone";
import { parseCoinbaseCSV, type CoinbasePosition, type AppHolding } from "@/lib/parsers/coinbaseParser";
import { supabase } from "@/integrations/supabase/client";
import { fmtEUR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const statusIcon: Record<CoinbasePosition["status"], string> = {
  ok: "✅",
  ecart: "⚠️",
  manquant: "❌",
};

const statusLabel: Record<CoinbasePosition["status"], string> = {
  ok: "OK",
  ecart: "Écart",
  manquant: "Manquant",
};

interface Account {
  id: string;
  name: string;
  type: string;
}

export function CoinbaseReconciliation() {
  const [status, setStatus] = useState<"idle" | "parsing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>();
  const [positions, setPositions] = useState<CoinbasePosition[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [applying, setApplying] = useState(false);

  const needsAccount = positions.some((p) => p.status === "manquant" || p.status === "ecart");

  useEffect(() => {
    if (positions.length === 0) return;
    supabase
      .from("accounts")
      .select("id, name, type")
      .then(({ data }) => {
        if (data) setAccounts(data);
      });
  }, [positions.length]);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setStatus("error");
      setErrorMsg("Seuls les fichiers CSV sont acceptés.");
      return;
    }
    setStatus("parsing");
    setErrorMsg(undefined);
    try {
      const { data: holdings, error: holdingsError } = await supabase
        .from("holdings")
        .select("shares, amount_invested_eur, security:securities(symbol, name, asset_class)");

      if (holdingsError) {
        console.error("[CB Import] Holdings fetch error:", holdingsError);
      }

      const appHoldings: AppHolding[] = (holdings || [])
        .filter((h: any) => h.security?.symbol && h.security?.asset_class === "CRYPTO")
        .map((h: any) => ({
          symbol: h.security.symbol as string,
          quantity: Number(h.shares) || 0,
          amountInvested: Number(h.amount_invested_eur) || 0,
        }));

      console.log("[CB Import] App crypto holdings loaded:", appHoldings.length, appHoldings);

      const result = await parseCoinbaseCSV(file, appHoldings);
      setPositions(result);
      setStatus("success");
    } catch (err) {
      console.error("[CB Import] Error:", err);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Impossible de lire ce fichier CSV.");
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");

      let created = 0;
      let corrected = 0;

      for (const pos of positions) {
        if (pos.status === "manquant") {
          const { data: newSec, error: secErr } = await supabase
            .from("securities")
            .upsert(
              {
                user_id: user.id,
                symbol: pos.asset,
                name: pos.asset,
                asset_class: "CRYPTO" as const,
                currency_quote: "EUR",
                pricing_source: "COINGECKO" as const,
              },
              { onConflict: "user_id,symbol" }
            )
            .select("id")
            .single();

          if (secErr) {
            console.error("[CB Apply] Security upsert error:", secErr, pos);
            continue;
          }

          const { error: holdErr } = await supabase.from("holdings").upsert(
            {
              user_id: user.id,
              account_id: selectedAccountId,
              security_id: newSec.id,
              shares: pos.quantity,
              amount_invested_eur: pos.totalInvested,
            },
            { onConflict: "account_id,security_id" }
          );

          if (holdErr) {
            console.error("[CB Apply] Holding upsert error:", holdErr, pos);
            continue;
          }
          created++;
        } else if (pos.status === "ecart") {
          const { data: sec } = await supabase
            .from("securities")
            .select("id")
            .eq("user_id", user.id)
            .eq("symbol", pos.asset)
            .maybeSingle();

          if (sec) {
            await supabase
              .from("holdings")
              .update({
                shares: pos.quantity,
                amount_invested_eur: pos.totalInvested,
              })
              .eq("security_id", sec.id)
              .eq("user_id", user.id);
            corrected++;
          }
        }
      }

      toast.success(`${created} position(s) créée(s), ${corrected} corrigée(s).`);
      handleReset();
    } catch (err) {
      console.error("[CB Apply] Error:", err);
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'application des corrections.");
    } finally {
      setApplying(false);
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setPositions([]);
    setErrorMsg(undefined);
    setSelectedAccountId("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coinbase — Réconciliation crypto</CardTitle>
        <CardDescription>
          Importe ton historique de transactions CSV depuis Coinbase pour synchroniser tes positions crypto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileDropzone
          accept=".csv"
          label="Glisse ton fichier CSV Coinbase ici, ou clique pour sélectionner"
          status={status}
          errorMessage={errorMsg}
          onFile={handleFile}
        />

        {positions.length > 0 && (
          <>
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Qté CB</TableHead>
                    <TableHead className="text-right">Qté App</TableHead>
                    <TableHead className="text-right">Écart Qté</TableHead>
                    <TableHead className="text-right">Investi CB</TableHead>
                    <TableHead className="text-right">Investi App</TableHead>
                    <TableHead className="text-right">Écart Investi</TableHead>
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
                      <TableCell className="font-medium">{pos.asset}</TableCell>
                      <TableCell className="text-right">{pos.quantity.toFixed(8)}</TableCell>
                      <TableCell className="text-right">{pos.qtyApp.toFixed(8)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {Math.abs(pos.diffQty) > 0.00000001 ? pos.diffQty.toFixed(8) : "—"}
                      </TableCell>
                      <TableCell className="text-right">{fmtEUR(pos.totalInvested)}</TableCell>
                      <TableCell className="text-right">{pos.investedApp ? fmtEUR(pos.investedApp) : "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {Math.abs(pos.diffInvested) > 0.01 ? fmtEUR(pos.diffInvested) : "—"}
                      </TableCell>
                      <TableCell>
                        {statusIcon[pos.status]} {statusLabel[pos.status]}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {needsAccount && (
              <div className="space-y-2">
                <Label htmlFor="cb-target-account">Compte cible pour les nouvelles positions</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger id="cb-target-account" className="w-full max-w-xs">
                    <SelectValue placeholder="Sélectionner un compte" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleApply} disabled={applying || (needsAccount && !selectedAccountId)}>
                {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {applying ? "Application en cours…" : "Appliquer les corrections"}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={applying}>
                Annuler
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
