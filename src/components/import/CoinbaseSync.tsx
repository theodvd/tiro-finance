import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/import/FileDropzone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Unlink, RefreshCw, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type SyncState = "loading" | "disconnected" | "connected";

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
    } else {
      setState("disconnected");
    }
  }, []);

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
      console.log('[Coinbase] Key parsed, id:', keyId);
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
