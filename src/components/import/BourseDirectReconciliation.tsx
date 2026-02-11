import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileDropzone } from "./FileDropzone";
import { parseBourseDirectXLSX, type BDPosition, type AppHolding } from "@/lib/parsers/bourseDirectParser";
import { supabase } from "@/integrations/supabase/client";
import { fmtEUR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

interface Account {
  id: string;
  name: string;
  type: string;
}

export function BourseDirectReconciliation() {
  const [status, setStatus] = useState<"idle" | "parsing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>();
  const [positions, setPositions] = useState<BDPosition[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [applying, setApplying] = useState(false);

  const needsAccount = positions.some((p) => p.status === "manquant" || p.status === "ecart");

  // Fetch user accounts when positions are loaded
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
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setStatus("error");
      setErrorMsg("Seuls les fichiers XLSX sont acceptés.");
      return;
    }
    setStatus("parsing");
    setErrorMsg(undefined);
    try {
      const { data: holdings, error: holdingsError } = await supabase
        .from('holdings')
        .select('shares, amount_invested_eur, security:securities(isin, symbol, name)');

      if (holdingsError) {
        console.error('[BD Import] Holdings fetch error:', holdingsError);
      }

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

  const handleApply = async () => {
    setApplying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté");

      let created = 0;
      let corrected = 0;
      let isinsSet = 0;

      for (const pos of positions) {
        if (pos.status === "manquant") {
          // Resolve ISIN → Yahoo ticker via edge function
          let resolvedSymbol = pos.isin; // fallback
          let resolvedName = pos.name;
          try {
            const { data: resolved } = await supabase.functions.invoke('resolve-isin', {
              body: { isin: pos.isin },
            });
            if (resolved?.symbol) {
              resolvedSymbol = resolved.symbol;
              console.log(`[BD Apply] Resolved ${pos.isin} → ${resolvedSymbol}`);
            }
            if (resolved?.name && !pos.name) {
              resolvedName = resolved.name;
            }
          } catch (resolveErr) {
            console.warn(`[BD Apply] Could not resolve ISIN ${pos.isin}:`, resolveErr);
          }

          // Create security + holding
          const { data: newSec, error: secErr } = await supabase
            .from('securities')
            .upsert({
              user_id: user.id,
              symbol: resolvedSymbol,
              name: resolvedName,
              isin: pos.isin,
              asset_class: 'ETF' as const,
              currency_quote: pos.currency || 'EUR',
              pricing_source: 'YFINANCE' as const,
            }, { onConflict: 'user_id,symbol' })
            .select('id')
            .single();

          if (secErr) {
            console.error('[BD Apply] Security upsert error:', secErr, pos);
            continue;
          }

          const { error: holdErr } = await supabase.from('holdings').upsert({
            user_id: user.id,
            account_id: selectedAccountId,
            security_id: newSec.id,
            shares: pos.qtyBD,
            amount_invested_eur: pos.pruBD * pos.qtyBD,
          }, { onConflict: 'account_id,security_id' });

          if (holdErr) {
            console.error('[BD Apply] Holding upsert error:', holdErr, pos);
            continue;
          }
          created++;
        } else if (pos.status === "ecart") {
          // Update existing holding
          const { data: sec } = await supabase
            .from('securities')
            .select('id')
            .eq('user_id', user.id)
            .or(`isin.eq.${pos.isin},symbol.eq.${pos.isin}`)
            .maybeSingle();

          if (sec) {
            await supabase.from('holdings')
              .update({
                shares: pos.qtyBD,
                amount_invested_eur: pos.pruBD * pos.qtyBD,
              })
              .eq('security_id', sec.id)
              .eq('account_id', selectedAccountId);

            // Fill ISIN if missing
            const { count } = await supabase.from('securities')
              .update({ isin: pos.isin })
              .eq('id', sec.id)
              .is('isin', null);

            if (count && count > 0) isinsSet++;
            corrected++;
          }
        } else {
          // Status OK — just fill ISIN if missing
          const { data: sec } = await supabase
            .from('securities')
            .select('id')
            .eq('user_id', user.id)
            .or(`isin.eq.${pos.isin},symbol.eq.${pos.isin}`)
            .maybeSingle();

          if (sec) {
            const { count } = await supabase.from('securities')
              .update({ isin: pos.isin })
              .eq('id', sec.id)
              .is('isin', null);

            if (count && count > 0) isinsSet++;
          }
        }
      }

      toast.success(
        `${created} position(s) créée(s), ${corrected} corrigée(s), ${isinsSet} ISIN(s) renseigné(s).`
      );
      handleReset();
    } catch (err) {
      console.error('[BD Apply] Error:', err);
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

            {needsAccount && (
              <div className="space-y-2">
                <Label htmlFor="target-account">Compte cible pour les nouvelles positions</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger id="target-account" className="w-full max-w-xs">
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
              <Button
                onClick={handleApply}
                disabled={applying || (needsAccount && !selectedAccountId)}
              >
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
