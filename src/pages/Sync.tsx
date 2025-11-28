import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, RefreshCw, Wallet, ArrowRight, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { fmtEUR } from '@/lib/format';
import { LiquidityAccountDialog } from '@/components/liquidity/LiquidityAccountDialog';

interface BridgeAccount {
  id: string;
  provider: string;
  name: string;
  balance: number;
  currency: string;
  type: string;
  updated_at: string;
}

export default function Sync() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [accounts, setAccounts] = useState<BridgeAccount[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bridge_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleConnectBank = async () => {
    setLoading(true);
    try {
      // Get the auth session for the request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Call the edge function with the correct URL structure
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bridge-proxy/init`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize Bridge session');
      }

      const data = await response.json();

      if (data?.redirect_url) {
        // Open Bridge Connect in new window
        const width = 600;
        const height = 800;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        const popup = window.open(
          data.redirect_url,
          'Bridge Connect',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Poll for popup closure
        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            handleSyncAccounts();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error connecting bank:', error);
      toast.error('Failed to connect bank account');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAccounts = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bridge-proxy/accounts`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync accounts');
      }

      const data = await response.json();

      toast.success(`Synced ${data?.accounts?.length || 0} accounts`);
      await fetchAccounts();

      // Sync transactions for each account
      if (data?.accounts) {
        for (const account of data.accounts) {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bridge-proxy/transactions?account_id=${account.id}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
            }
          );
        }
      }
    } catch (error) {
      console.error('Error syncing accounts:', error);
      toast.error('Failed to sync accounts');
    } finally {
      setSyncing(false);
    }
  };

  const handleEditAccount = (account: BridgeAccount) => {
    setEditingAccount({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: account.balance,
      currency: account.currency,
      provider: account.provider,
    });
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
      await fetchAccounts();
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Bank Sync</h1>
          <p className="text-muted-foreground mt-1">
            Connect your bank accounts for automatic transaction sync
          </p>
        </div>
        <div className="flex gap-3">
          {accounts.length > 0 && (
            <Button
              variant="outline"
              onClick={handleSyncAccounts}
              disabled={syncing}
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Accounts
                </>
              )}
            </Button>
          )}
          <Button onClick={handleConnectBank} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Bank Account
              </>
            )}
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No bank accounts connected
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Connect your bank accounts to automatically sync transactions and get a complete
              view of your finances.
            </p>
            <Button onClick={handleConnectBank} disabled={loading} size="lg">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <Card key={account.id} className="border-border bg-card hover:shadow-lg transition-shadow group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-foreground">{account.name}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {account.provider} • {account.type}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Wallet className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditAccount(account)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDeleteDialog(account.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {fmtEUR(account.balance)}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Last updated: {new Date(account.updated_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {accounts.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">What's Next?</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your bank accounts are now connected and syncing automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-1 mt-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Automatic Sync</p>
                <p className="text-sm text-muted-foreground">
                  Transactions are automatically imported and categorized
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-1 mt-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Portfolio Integration</p>
                <p className="text-sm text-muted-foreground">
                  Investment accounts automatically update your holdings and performance
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-1 mt-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Real-time Updates</p>
                <p className="text-sm text-muted-foreground">
                  Your dashboard and insights update automatically as new data arrives
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <LiquidityAccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchAccounts}
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
