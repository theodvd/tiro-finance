import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ASSET_CLASSES = ["EQUITY", "ETF", "CRYPTO", "BOND", "REIT", "CASH"];
const PRICING_SOURCES = ["YFINANCE", "COINGECKO", "MANUAL"];

interface Security {
  id: string;
  name: string;
  symbol: string;
  asset_class: string;
  currency_quote: string;
  pricing_source: string;
  created_at: string;
}

export default function Securities() {
  const { user } = useAuth();
  const [securities, setSecurities] = useState<Security[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSecurity, setEditingSecurity] = useState<Security | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    symbol: string;
    asset_class: "EQUITY" | "ETF" | "CRYPTO" | "BOND" | "REIT" | "CASH";
    currency_quote: string;
    pricing_source: "YFINANCE" | "COINGECKO" | "MANUAL";
  }>({
    name: "",
    symbol: "",
    asset_class: "ETF",
    currency_quote: "EUR",
    pricing_source: "YFINANCE",
  });

  const fetchSecurities = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("securities")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSecurities(data || []);
    } catch (error: any) {
      toast.error("Failed to load securities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurities();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingSecurity) {
        const { error } = await supabase
          .from("securities")
          .update(formData)
          .eq("id", editingSecurity.id);
        if (error) throw error;
        toast.success("Security updated successfully");
      } else {
        const { error } = await supabase
          .from("securities")
          .insert([{ ...formData, user_id: user.id }]);
        if (error) throw error;
        toast.success("Security created successfully");
      }
      setDialogOpen(false);
      setFormData({ name: "", symbol: "", asset_class: "ETF", currency_quote: "EUR", pricing_source: "YFINANCE" });
      setEditingSecurity(null);
      fetchSecurities();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (security: Security) => {
    setEditingSecurity(security);
    setFormData({
      name: security.name,
      symbol: security.symbol,
      asset_class: security.asset_class,
      currency_quote: security.currency_quote,
      pricing_source: security.pricing_source,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will also delete associated holdings.")) return;

    try {
      const { error } = await supabase.from("securities").delete().eq("id", id);
      if (error) throw error;
      toast.success("Security deleted successfully");
      fetchSecurities();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Securities</h1>
          <p className="text-muted-foreground">Manage stocks, ETFs, crypto, and other assets</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingSecurity(null);
            setFormData({ name: "", symbol: "", asset_class: "ETF", currency_quote: "EUR", pricing_source: "YFINANCE" });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Security
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingSecurity ? "Edit Security" : "New Security"}</DialogTitle>
              <DialogDescription>
                {editingSecurity ? "Update security details" : "Add a new investment security"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Amundi MSCI World"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol / Ticker</Label>
                  <Input
                    id="symbol"
                    placeholder="e.g. CW8.PA or BTC"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset_class">Asset Class</Label>
                  <Select value={formData.asset_class} onValueChange={(value) => setFormData({ ...formData, asset_class: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_CLASSES.map((ac) => (
                        <SelectItem key={ac} value={ac}>{ac}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    placeholder="EUR, USD, GBP..."
                    value={formData.currency_quote}
                    onChange={(e) => setFormData({ ...formData, currency_quote: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricing_source">Pricing Source</Label>
                  <Select value={formData.pricing_source} onValueChange={(value) => setFormData({ ...formData, pricing_source: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICING_SOURCES.map((ps) => (
                        <SelectItem key={ps} value={ps}>{ps}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">{editingSecurity ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Securities</CardTitle>
          <CardDescription>
            {securities.length} securit{securities.length !== 1 ? "ies" : "y"} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {securities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No securities yet. Add your first security to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securities.map((security) => (
                    <TableRow key={security.id}>
                      <TableCell className="font-medium">{security.name}</TableCell>
                      <TableCell className="font-mono text-sm">{security.symbol}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent-foreground">
                          {security.asset_class}
                        </span>
                      </TableCell>
                      <TableCell>{security.currency_quote}</TableCell>
                      <TableCell className="text-xs">{security.pricing_source}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(security)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(security.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
