import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDropzone } from "@/components/import/FileDropzone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Unlink, RefreshCw, CheckCircle2, Save } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type SyncState = "loading" | "disconnected" | "connected";

interface CoinbaseHolding {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  amountInvested: number;
}

export function CoinbaseSync() {
  const { toast } = useToast();
  const [state, setState] = useState<SyncState>("loading");
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [parsedKey, setParsedKey] = useState<{ keyId: string; privateKey: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [dropStatus, setDropStatus] = useState<"idle" | "parsing" | "success" | "error">("idle");
  const [dropError, setDropError] = useState<string>();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [coinbaseHoldings, setCoinbaseHoldings] = useState<CoinbaseHolding[]>([]);
  const [investedAmounts, setInvestedAmounts] = useState<Record<string, string>>({});
  const [savingAmounts, setSavingAmounts] = useState(false);

  const fetchCoinbaseHoldings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: account } = await supabase
      .from("accounts" as any)
      .select("id")
      .eq("user_id", user.id)
      .eq("name", "Coinbase")
      .eq("type", "CRYPTO")
      .maybeSingle();

    if (!account) {
      setCoinbaseHoldings([]);
      return;
    }

    const { data: holdings } = await supabase
      .from("holdings" as any)
      .select("id, shares, amount_invested_eur, securities(symbol, name)")
      .eq("user_id", user.id)
      .eq("account_id", (account as any).id);

    if (!holdings) return;

    const mapped: CoinbaseHolding[] = (holdings as any[]).map((h) => ({
      id: h.id,
      symbol: h.securities?.symbol || "",
      name: h.securities?.name || "",
      shares: Number(h.shares || 0),
      amountInvested: Number(h.amount_invested_eur || 0),
    }));

    setCoinbaseHoldings(mapped);

    setInvestedAmounts((prev) => {
      const next: Record<string, string> = { ...prev };
      for (const h of mapped) {
        if (!(h.id in next)) {
          next[h.id] = h.amountInvested > 0 ? String(h.amountInvested) : "";
        }
      }
      return next;
    });
  }, []);

  const fetchConnection = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("broker_connections" as any)
      .select("last_synced_at")
      .eq("user_id", user.id)
      .eq("broker", "coinbase")
      .maybeSingle();

    if (data) {
      setState("connected");
      setLastSynced((data as any).last_synced_at);
      await fetchCoinbaseHoldings();
    } else {
      setState("disconnected");
      setCoinbaseHoldings([]);
    }
  }, [fetchCoinbaseHoldings]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const handleFile = useCallback(async (file: File) => {
    setDropStatus("parsing");
    setParsedKey(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const keyId = json.id || json.name;
      const privateKey = json.privateKey;
      if (!keyId || !privateKey) {
        throw new Error('Le fichier doit contenir les champs "id" (ou "name") et "privateKey".');
      }
      setParsedKey({ keyId, privateKey });
      setDropStatus("success");
    } catch (e: any) {
      setDropStatus("error");
      setDropError(e.message || "Fichier JSON invalide");
    }
  }, []);

  const handleConnect = async () => {
    if (!parsedKey) return;
    setConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("broker_connections" as any)
        .upsert({
          user_id: user.id,
          broker: "coinbase",
          credentials: parsedKey,
        } as any, { onConflict: "user_id,broker" });

      if (error) throw error;

      toast({ title: "Coinbase connecté", description: "Clé API enregistrée avec succès." });
      setParsedKey(null);
      setDropStatus("idle");
      await fetchConnection();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-coinbase");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Synchronisation réussie",
        description: data?.message || `${data?.synced} position(s) synchronisée(s).`,
      });
      await fetchConnection();
    } catch (e: any) {
      toast({ title: "Erreur de synchronisation", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveAmounts = async () => {
    setSavingAmounts(true);
    try {
      const updates = Object.entries(investedAmounts)
        .filter(([_, val]) => val !== "" && !isNaN(Number(val)))
        .map(([id, val]) =>
          supabase
            .from("holdings" as any)
            .update({ amount_invested_eur: Number(val) })
            .eq("id", id)
        );

      await Promise.all(updates);
      await fetchCoinbaseHoldings();
      toast({ title: "Montants sauvegardés", description: "Les coûts de revient ont été mis à jour." });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSavingAmounts(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("broker_connections" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("broker", "coinbase");

      toast({ title: "Coinbase déconnecté" });
      setConfirmDisconnect(false);
      setState("disconnected");
      setLastSynced(null);
      setCoinbaseHoldings([]);
      setInvestedAmounts({});
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  if (state === "loading") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Coinbase — Synchronisation crypto</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coinbase — Synchronisation crypto</CardTitle>
        <CardDescription>
          {state === "connected"
            ? "Synchronise automatiquement tes positions crypto depuis Coinbase."
            : "Connecte ton compte Coinbase en uploadant ton fichier de clé API (format CDP JSON)."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state === "disconnected" && (
          <>
            <FileDropzone
              accept=".json"
              label="Glisse ton fichier de clé API Coinbase (.json)"
              status={dropStatus}
              errorMessage={dropError}
              onFile={handleFile}
            />
            {parsedKey && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Clé détectée : <code className="text-xs bg-muted px-1 py-0.5 rounded">{parsedKey.keyId.slice(0, 40)}…</code>
                </p>
                <Button onClick={handleConnect} disabled={connecting}>
                  {connecting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Connecter Coinbase
                </Button>
              </div>
            )}
          </>
        )}

        {state === "connected" && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="font-medium">Coinbase connecté</span>
              {lastSynced && (
                <span className="text-muted-foreground">
                  — dernière sync {formatDistanceToNow(new Date(lastSynced), { addSuffix: true, locale: fr })}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSync} disabled={syncing}>
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {syncing ? "Synchronisation en cours…" : "Synchroniser"}
              </Button>

              {!confirmDisconnect ? (
                <Button variant="outline" onClick={() => setConfirmDisconnect(true)}>
                  <Unlink className="h-4 w-4 mr-2" />
                  Déconnecter
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Confirmer ?</span>
                  <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                    Oui, déconnecter
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDisconnect(false)}>
                    Annuler
                  </Button>
                </div>
              )}
            </div>

            {coinbaseHoldings.length > 0 && (
              <div className="border rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium">Coût de revient par position</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Saisis le montant total investi en € pour chaque crypto. Ce montant sert à calculer le PnL.
                  </p>
                </div>

                <div className="space-y-2">
                  {coinbaseHoldings.map((h) => (
                    <div key={h.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{h.symbol}</p>
                        <p className="text-xs text-muted-foreground">{h.shares.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} unités</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-32 text-right h-8 text-sm"
                          value={investedAmounts[h.id] ?? ""}
                          onChange={(e) =>
                            setInvestedAmounts((prev) => ({ ...prev, [h.id]: e.target.value }))
                          }
                        />
                        <span className="text-sm text-muted-foreground w-3">€</span>
                      </div>
                    </div>
                  ))}
                </div>

                <Button size="sm" onClick={handleSaveAmounts} disabled={savingAmounts}>
                  {savingAmounts ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Sauvegarder les montants
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
