import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { fmtEUR } from "@/lib/format";
import { Wallet, Plus, Pencil, Trash2 } from "lucide-react";
import { LiquidityAccountDialog } from "@/components/liquidity/LiquidityAccountDialog";
import { toast } from "sonner";

interface LiquidityData {
  totalLiquidity: number;
  totalInvestments: number;
  accounts: Array<{
    id: string;
    name: string;
    balance: number;
    type: string;
    provider: string;
  }>;
}

export default function Liquidity() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LiquidityData>({
    totalLiquidity: 0,
    totalInvestments: 0,
    accounts: [],
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch liquid accounts from bridge_accounts
      const { data: bridgeAccounts, error: bridgeError } = await supabase
        .from("bridge_accounts")
        .select("*")
        .eq("user_id", user?.id);

      if (bridgeError) throw bridgeError;

      const totalLiquidity = (bridgeAccounts || []).reduce(
        (sum, acc) => sum + Number(acc.balance || 0),
        0
      );

      // Fetch investments total from latest snapshot
      const { data: snapshot, error: snapshotError } = await supabase
        .from("v_latest_snapshot")
        .select("total_value_eur")
        .eq("user_id", user?.id)
        .single();

      if (snapshotError && snapshotError.code !== "PGRST116") throw snapshotError;

      const totalInvestments = Number(snapshot?.total_value_eur || 0);

      setData({
        totalLiquidity,
        totalInvestments,
        accounts: (bridgeAccounts || []).map((acc) => ({
          id: acc.id,
          name: acc.name,
          balance: Number(acc.balance || 0),
          type: acc.type,
          provider: acc.provider,
        })),
      });
    } catch (err: any) {
      console.error("Error fetching liquidity data:", err);
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const totalWealth = data.totalLiquidity + data.totalInvestments;
  const liquidityPct = totalWealth > 0 ? (data.totalLiquidity / totalWealth) * 100 : 0;
  const investmentPct = totalWealth > 0 ? (data.totalInvestments / totalWealth) * 100 : 0;

  const chartData = [
    { name: "Liquidités", value: data.totalLiquidity, color: "hsl(var(--chart-1))" },
    { name: "Investissements", value: data.totalInvestments, color: "hsl(var(--chart-2))" },
  ];

  const handleAddAccount = () => {
    setEditingAccount(null);
    setDialogOpen(true);
  };

  const handleEditAccount = (account: any) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;

    try {
      const { error } = await supabase
        .from("bridge_accounts")
        .delete()
        .eq("id", accountToDelete);

      if (error) throw error;

      toast.success("Compte supprimé avec succès");
      await fetchData();
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const openDeleteDialog = (accountId: string) => {
    setAccountToDelete(accountId);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Liquidités & Patrimoine</h1>
        </div>
        <Button onClick={handleAddAccount}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un compte
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Liquidités</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {fmtEUR(data.totalLiquidity)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {liquidityPct.toFixed(1)}% du patrimoine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Investissements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {fmtEUR(data.totalInvestments)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {investmentPct.toFixed(1)}% du patrimoine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Patrimoine Total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary tabular-nums">
              {fmtEUR(totalWealth)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.accounts.length} compte(s) liquide(s)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition du Patrimoine</CardTitle>
            <CardDescription>Liquidités vs Investissements</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => fmtEUR(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comptes Liquides</CardTitle>
            <CardDescription>Comptes bancaires synchronisés</CardDescription>
          </CardHeader>
          <CardContent>
            {data.accounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Aucun compte liquide trouvé</p>
                <p className="text-xs mt-2">Connectez vos comptes via Bank Sync</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40 group hover:border-border transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">{account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.provider} • {account.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-sm tabular-nums text-foreground">
                          {fmtEUR(account.balance)}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditAccount(account)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteDialog(account.id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <LiquidityAccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchData}
        userId={user?.id || ""}
        account={editingAccount}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce compte ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
