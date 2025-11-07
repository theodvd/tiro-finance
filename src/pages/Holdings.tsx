import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Security {
  id: string;
  name: string;
  symbol: string;
  asset_class: string;
  market_data?: { last_px_eur: number }[];
}

interface Holding {
  id: string;
  shares: number;
  amount_invested_eur: number | null;
  created_at: string;
  account: Account;
  security: Security;
}

export default function Holdings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [securities, setSecurities] = useState<Security[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [formData, setFormData] = useState({
    account_id: "",
    security_id: "",
    shares: "",
    amount_invested_eur: "",
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch holdings
    const { data: holdingsData, error: holdingsError } = await supabase
      .from('holdings')
      .select(`
        id, shares, amount_invested_eur, created_at,
        account:accounts(id, name, type),
        security:securities(
          id, name, symbol, asset_class, currency_quote, pricing_source,
          market_data(last_px_eur)
        )
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (holdingsError) {
      toast({ title: "Error", description: holdingsError.message, variant: "destructive" });
    } else {
      setHoldings((holdingsData || []) as any);
    }

    // Fetch accounts
    const { data: accountsData, error: accountsError } = await supabase
      .from('accounts')
      .select('id, name, type')
      .eq('user_id', user!.id)
      .order('name');

    if (accountsError) {
      toast({ title: "Error", description: accountsError.message, variant: "destructive" });
    } else {
      setAccounts(accountsData || []);
    }

    // Fetch securities
    const { data: securitiesData, error: securitiesError } = await supabase
      .from('securities')
      .select('id, name, symbol, asset_class, market_data(last_px_eur)')
      .eq('user_id', user!.id)
      .order('symbol');

    if (securitiesError) {
      toast({ title: "Error", description: securitiesError.message, variant: "destructive" });
    } else {
      setSecurities((securitiesData || []) as any);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.account_id || !formData.security_id || !formData.shares) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const payload = {
      user_id: user!.id,
      account_id: formData.account_id,
      security_id: formData.security_id,
      shares: parseFloat(formData.shares),
      amount_invested_eur: formData.amount_invested_eur ? parseFloat(formData.amount_invested_eur) : null,
    };

    if (editingHolding) {
      const { error } = await supabase
        .from('holdings')
        .update(payload)
        .eq('id', editingHolding.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Holding updated successfully" });
        setDialogOpen(false);
        setEditingHolding(null);
        resetForm();
        fetchData();
      }
    } else {
      const { error } = await supabase.from('holdings').insert(payload);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Holding created successfully" });
        setDialogOpen(false);
        resetForm();
        fetchData();
      }
    }
  };

  const handleEdit = (holding: Holding) => {
    setEditingHolding(holding);
    setFormData({
      account_id: holding.account.id,
      security_id: holding.security.id,
      shares: holding.shares.toString(),
      amount_invested_eur: holding.amount_invested_eur?.toString() || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this holding?")) return;

    const { error } = await supabase.from('holdings').delete().eq('id', id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Holding deleted successfully" });
      fetchData();
    }
  };

  const resetForm = () => {
    setFormData({
      account_id: "",
      security_id: "",
      shares: "",
      amount_invested_eur: "",
    });
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingHolding(null);
    resetForm();
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const calculateMarketValue = (holding: Holding) => {
    const price = holding.security?.market_data?.[0]?.last_px_eur;
    if (!price) return null;
    return holding.shares * price;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Holdings</h1>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Holding
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHolding ? "Edit Holding" : "Add New Holding"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account_id">Account *</Label>
                <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
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
              <div className="space-y-2">
                <Label htmlFor="security_id">Security *</Label>
                <Select value={formData.security_id} onValueChange={(value) => setFormData({ ...formData, security_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select security..." />
                  </SelectTrigger>
                  <SelectContent>
                    {securities.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>
                        {sec.symbol} - {sec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shares">Shares *</Label>
                <Input
                  id="shares"
                  type="number"
                  step="0.00000001"
                  value={formData.shares}
                  onChange={(e) => setFormData({ ...formData, shares: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount_invested_eur">Amount Invested (EUR)</Label>
                <Input
                  id="amount_invested_eur"
                  type="number"
                  step="0.01"
                  value={formData.amount_invested_eur}
                  onChange={(e) => setFormData({ ...formData, amount_invested_eur: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button type="submit">{editingHolding ? "Update" : "Create"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {holdings.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No holdings yet. Click "Add Holding" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Security</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Cost (EUR)</TableHead>
                  <TableHead className="text-right">Market Value (EUR)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((holding) => (
                  <TableRow key={holding.id}>
                    <TableCell>{holding.account.name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{holding.security.symbol}</div>
                        <div className="text-sm text-muted-foreground">{holding.security.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{holding.shares.toLocaleString('fr-FR')}</TableCell>
                    <TableCell className="text-right">{formatCurrency(holding.amount_invested_eur)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(calculateMarketValue(holding))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(holding)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(holding.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
