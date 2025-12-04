import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, RefreshCw, Calendar, TrendingUp } from "lucide-react";
import { z } from "zod";
import { ASSET_CLASSES, PRICING_SOURCES, ASSET_CLASS_LABEL, AssetClass, PricingSource } from "@/constants";

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
  currency_quote: string;
  pricing_source: string;
  created_at: string;
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

interface BridgeAccount {
  id: string;
  name: string;
  balance: number | null;
  currency: string;
  type: string;
}

interface DcaPlan {
  id: string;
  user_id: string;
  account_id: string;
  security_id: string;
  source_account_id: string | null;
  amount: number;
  investment_mode: 'amount' | 'shares';
  frequency: 'weekly' | 'monthly' | 'interval';
  interval_days: number | null;
  weekday: number | null;
  monthday: number | null;
  start_date: string;
  next_execution_date: string | null;
  active: boolean;
  created_at: string;
  account?: Account;
  security?: Security;
  source_account?: BridgeAccount;
}

const holdingSchema = z.object({
  account_id: z.string().uuid("Invalid account ID"),
  security_id: z.string().uuid("Invalid security ID"),
  shares: z.number().positive("Shares must be positive").max(1000000000, "Shares value too large"),
  amount_invested_eur: z.number().positive("Amount must be positive").max(1000000000, "Amount value too large").nullable(),
});

const securitySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  symbol: z.string().trim().min(1, "Symbol is required").max(50, "Symbol must be less than 50 characters"),
  asset_class: z.enum(["STOCK", "ETF", "BOND", "CRYPTO", "REIT", "CASH"], { errorMap: () => ({ message: "Invalid asset class" }) }),
  currency_quote: z.enum(["EUR", "USD", "GBP"], { errorMap: () => ({ message: "Invalid currency" }) }),
  pricing_source: z.enum(["YFINANCE", "COINGECKO", "MANUAL"], { errorMap: () => ({ message: "Invalid pricing source" }) }),
});

export default function Investments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [securities, setSecurities] = useState<Security[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dcaPlans, setDcaPlans] = useState<DcaPlan[]>([]);
  const [bridgeAccounts, setBridgeAccounts] = useState<BridgeAccount[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Holdings dialog
  const [holdingDialogOpen, setHoldingDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [holdingFormData, setHoldingFormData] = useState({
    account_id: "",
    security_id: "",
    shares: "",
    amount_invested_eur: "",
  });

  // Securities dialog
  const [securityDialogOpen, setSecurityDialogOpen] = useState(false);
  const [editingSecurity, setEditingSecurity] = useState<Security | null>(null);
  const [securityFormData, setSecurityFormData] = useState<{
    name: string;
    symbol: string;
    asset_class: AssetClass;
    currency_quote: string;
    pricing_source: PricingSource;
  }>({
    name: "",
    symbol: "",
    asset_class: "STOCK",
    currency_quote: "EUR",
    pricing_source: "YFINANCE",
  });

  // Quick Add Investment form state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddData, setQuickAddData] = useState({
    account_id: "",
    ticker: "",
    quantity: "",
    purchase_price: "",
    // Auto-fill security details
    name: "",
    asset_class: "STOCK" as AssetClass,
    currency: "EUR",
    pricing_source: "YFINANCE" as PricingSource,
  });

  // DCA Plan dialog
  const [dcaDialogOpen, setDcaDialogOpen] = useState(false);
  const [editingDca, setEditingDca] = useState<DcaPlan | null>(null);
  const [dcaFormData, setDcaFormData] = useState({
    account_id: "",
    security_id: "",
    source_account_id: "",
    amount: "",
    investment_mode: "amount" as "amount" | "shares",
    frequency: "monthly" as "weekly" | "monthly" | "interval",
    interval_days: "",
    weekday: "1",
    monthday: "1",
    start_date: new Date().toISOString().split('T')[0],
    active: true,
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
      
      const secIds = (holdingsData || [])
        .map((h: any) => h?.security?.id)
        .filter((id: string | undefined): id is string => Boolean(id));

      if (secIds.length > 0) {
        const { data: mdRows, error: mdError } = await supabase
          .from('market_data')
          .select('security_id, last_px_eur, updated_at')
          .in('security_id', secIds);

        if (!mdError) {
          const map: Record<string, number> = {};
          (mdRows || []).forEach((r: any) => {
            if (r.security_id != null) map[r.security_id] = Number(r.last_px_eur);
          });
          setPriceMap(map);
        }
      }
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
      .select('id, name, symbol, asset_class, currency_quote, pricing_source, created_at')
      .eq('user_id', user!.id)
      .order('symbol');

    if (securitiesError) {
      toast({ title: "Error", description: securitiesError.message, variant: "destructive" });
    } else {
      setSecurities(securitiesData || []);
    }

    // Fetch DCA plans
    const { data: dcaData, error: dcaError } = await supabase
      .from('dca_plans')
      .select(`
        *,
        account:accounts(id, name, type),
        security:securities(id, name, symbol),
        source_account:bridge_accounts(id, name, balance, currency, type)
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (dcaError) {
      toast({ title: "Error", description: dcaError.message, variant: "destructive" });
    } else {
      setDcaPlans((dcaData || []) as any);
    }

    // Fetch bridge accounts (liquidity sources)
    const { data: bridgeData, error: bridgeError } = await supabase
      .from('bridge_accounts')
      .select('id, name, balance, currency, type')
      .eq('user_id', user!.id)
      .order('name');

    if (!bridgeError) {
      setBridgeAccounts(bridgeData || []);
    }

    setLoading(false);
  };

  const handleHoldingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!holdingFormData.account_id || !holdingFormData.security_id || !holdingFormData.shares) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const payload = {
      user_id: user!.id,
      account_id: holdingFormData.account_id,
      security_id: holdingFormData.security_id,
      shares: parseFloat(holdingFormData.shares),
      amount_invested_eur: holdingFormData.amount_invested_eur ? parseFloat(holdingFormData.amount_invested_eur) : null,
    };

    const validationResult = holdingSchema.safeParse(payload);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(", ");
      toast({ title: "Validation Error", description: errors, variant: "destructive" });
      return;
    }

    if (editingHolding) {
      const { error } = await supabase
        .from('holdings')
        .update(payload)
        .eq('id', editingHolding.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Holding updated successfully" });
        setHoldingDialogOpen(false);
        setEditingHolding(null);
        resetHoldingForm();
        fetchData();
      }
    } else {
      const { error } = await supabase.from('holdings').insert(payload);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Holding created successfully" });
        setHoldingDialogOpen(false);
        resetHoldingForm();
        fetchData();
      }
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validationResult = securitySchema.safeParse(securityFormData);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => e.message).join(", ");
      toast({ title: "Validation Error", description: errors, variant: "destructive" });
      return;
    }

    const validatedData = validationResult.data;

    try {
      if (editingSecurity) {
        const { error } = await supabase
          .from("securities")
          .update({
            name: validatedData.name,
            symbol: validatedData.symbol,
            asset_class: validatedData.asset_class,
            currency_quote: validatedData.currency_quote,
            pricing_source: validatedData.pricing_source
          })
          .eq("id", editingSecurity.id);
        if (error) throw error;
        toast({ title: "Success", description: "Security updated successfully" });
      } else {
        const { error } = await supabase
          .from("securities")
          .insert([{
            name: validatedData.name,
            symbol: validatedData.symbol,
            asset_class: validatedData.asset_class,
            currency_quote: validatedData.currency_quote,
            pricing_source: validatedData.pricing_source,
            user_id: user.id
          }]);
        if (error) throw error;
        toast({ title: "Success", description: "Security created successfully" });
      }
      setSecurityDialogOpen(false);
      resetSecurityForm();
      setEditingSecurity(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditHolding = (holding: Holding) => {
    setEditingHolding(holding);
    setHoldingFormData({
      account_id: holding.account.id,
      security_id: holding.security.id,
      shares: holding.shares.toString(),
      amount_invested_eur: holding.amount_invested_eur?.toString() || "",
    });
    setHoldingDialogOpen(true);
  };

  const handleEditSecurity = (security: Security) => {
    setEditingSecurity(security);
    const normalizedClass = (security.asset_class?.toUpperCase() === 'EQUITY')
      ? 'STOCK'
      : (security.asset_class?.toUpperCase() as AssetClass);

    setSecurityFormData({
      name: security.name,
      symbol: security.symbol,
      asset_class: normalizedClass,
      currency_quote: security.currency_quote,
      pricing_source: security.pricing_source as PricingSource,
    });
    setSecurityDialogOpen(true);
  };

  const handleDeleteHolding = async (id: string) => {
    if (!confirm("Are you sure you want to delete this holding?")) return;

    const { error } = await supabase.from('holdings').delete().eq('id', id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Holding deleted successfully" });
      fetchData();
    }
  };

  const handleDeleteSecurity = async (id: string) => {
    if (!confirm("Are you sure? This will also delete associated holdings.")) return;

    try {
      const { error } = await supabase.from("securities").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Security deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetHoldingForm = () => {
    setHoldingFormData({
      account_id: "",
      security_id: "",
      shares: "",
      amount_invested_eur: "",
    });
  };

  const resetSecurityForm = () => {
    setSecurityFormData({ 
      name: "", 
      symbol: "", 
      asset_class: "STOCK", 
      currency_quote: "EUR", 
      pricing_source: "YFINANCE" 
    });
  };

  const handleRefreshPrices = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
      return;
    }
    setRefreshing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refresh-prices`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      const body = await res.text();
      if (!res.ok) {
        toast({ title: 'Error', description: body || 'Refresh failed', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Prices refreshed' });
        await fetchData();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const calculateMarketValue = (holding: Holding) => {
    const secId = holding.security?.id;
    const priceFromMap = secId ? priceMap[secId] : undefined;
    const nestedPrice = holding.security?.market_data?.[0]?.last_px_eur as any;

    const price = Number(
      typeof priceFromMap === 'number' ? priceFromMap : nestedPrice
    );

    if (!Number.isFinite(price) || price <= 0) return null;
    return Number(holding.shares) * price;
  };

  const handleDcaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dcaFormData.account_id || !dcaFormData.security_id || !dcaFormData.amount) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const payload: any = {
      user_id: user!.id,
      account_id: dcaFormData.account_id,
      security_id: dcaFormData.security_id,
      source_account_id: dcaFormData.source_account_id || null,
      amount: parseFloat(dcaFormData.amount),
      investment_mode: dcaFormData.investment_mode,
      frequency: dcaFormData.frequency,
      start_date: dcaFormData.start_date,
      active: dcaFormData.active,
      interval_days: dcaFormData.frequency === 'interval' ? parseInt(dcaFormData.interval_days) : null,
      weekday: dcaFormData.frequency === 'weekly' ? parseInt(dcaFormData.weekday) : null,
      monthday: dcaFormData.frequency === 'monthly' ? parseInt(dcaFormData.monthday) : null,
    };

    try {
      if (editingDca) {
        const { error } = await supabase
          .from('dca_plans')
          .update(payload)
          .eq('id', editingDca.id);

        if (error) throw error;
        toast({ title: "Success", description: "DCA plan updated successfully" });
      } else {
        const { error } = await supabase.from('dca_plans').insert(payload);
        if (error) throw error;
        toast({ title: "Success", description: "DCA plan created successfully" });
      }
      
      setDcaDialogOpen(false);
      setEditingDca(null);
      resetDcaForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEditDca = (plan: DcaPlan) => {
    setEditingDca(plan);
    setDcaFormData({
      account_id: plan.account_id,
      security_id: plan.security_id,
      source_account_id: plan.source_account_id || "",
      amount: plan.amount.toString(),
      investment_mode: plan.investment_mode || "amount",
      frequency: plan.frequency,
      interval_days: plan.interval_days?.toString() || "",
      weekday: plan.weekday?.toString() || "1",
      monthday: plan.monthday?.toString() || "1",
      start_date: plan.start_date,
      active: plan.active,
    });
    setDcaDialogOpen(true);
  };

  const handleDeleteDca = async (id: string) => {
    if (!confirm("Are you sure you want to delete this DCA plan?")) return;

    const { error } = await supabase.from('dca_plans').delete().eq('id', id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "DCA plan deleted successfully" });
      fetchData();
    }
  };

  const handleToggleDca = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from('dca_plans')
      .update({ active })
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `DCA plan ${active ? 'activated' : 'paused'}` });
      fetchData();
    }
  };

  const resetDcaForm = () => {
    setDcaFormData({
      account_id: "",
      security_id: "",
      source_account_id: "",
      amount: "",
      investment_mode: "amount",
      frequency: "monthly",
      interval_days: "",
      weekday: "1",
      monthday: "1",
      start_date: new Date().toISOString().split('T')[0],
      active: true,
    });
  };

  const formatNextExecution = (plan: DcaPlan) => {
    if (plan.next_execution_date) {
      return new Date(plan.next_execution_date).toLocaleDateString('fr-FR');
    }
    
    const start = new Date(plan.start_date);
    switch (plan.frequency) {
      case 'weekly':
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `Every ${dayNames[plan.weekday || 0]}`;
      case 'monthly':
        return `Day ${plan.monthday} of each month`;
      case 'interval':
        return `Every ${plan.interval_days} days`;
      default:
        return start.toLocaleDateString('fr-FR');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quickAddData.account_id || !quickAddData.ticker || !quickAddData.quantity) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    try {
      // Check if security exists
      const { data: existingSec, error: searchError } = await supabase
        .from('securities')
        .select('id')
        .eq('user_id', user!.id)
        .eq('symbol', quickAddData.ticker.toUpperCase())
        .maybeSingle();

      if (searchError) throw searchError;

      let securityId = existingSec?.id;

      // If security doesn't exist, create it
      if (!securityId) {
        const { data: newSec, error: createSecError } = await supabase
          .from('securities')
          .insert({
            user_id: user!.id,
            symbol: quickAddData.ticker.toUpperCase(),
            name: quickAddData.name || quickAddData.ticker.toUpperCase(),
            asset_class: quickAddData.asset_class,
            currency_quote: quickAddData.currency,
            pricing_source: quickAddData.pricing_source,
          })
          .select('id')
          .single();

        if (createSecError) throw createSecError;
        securityId = newSec.id;
      }

      // Create holding
      const holdingPayload = {
        user_id: user!.id,
        account_id: quickAddData.account_id,
        security_id: securityId,
        shares: parseFloat(quickAddData.quantity),
        amount_invested_eur: quickAddData.purchase_price 
          ? parseFloat(quickAddData.quantity) * parseFloat(quickAddData.purchase_price)
          : null,
      };

      const validationResult = holdingSchema.safeParse(holdingPayload);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(", ");
        toast({ title: "Validation Error", description: errors, variant: "destructive" });
        return;
      }

      const { error: insertError } = await supabase.from('holdings').insert(holdingPayload);
      if (insertError) throw insertError;

      toast({ title: "Success", description: "Investment added successfully" });
      setQuickAddOpen(false);
      setQuickAddData({
        account_id: "",
        ticker: "",
        quantity: "",
        purchase_price: "",
        name: "",
        asset_class: "STOCK",
        currency: "EUR",
        pricing_source: "YFINANCE",
      });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Investments</h1>
          <p className="text-sm text-muted-foreground">Manage your holdings and securities</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Investment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Investment</DialogTitle>
                <DialogDescription>
                  Add a new investment quickly. If the security doesn't exist, it will be created automatically.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleQuickAddSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quick_account">Account *</Label>
                  <Select value={quickAddData.account_id} onValueChange={(value) => setQuickAddData({ ...quickAddData, account_id: value })}>
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
                  <Label htmlFor="quick_ticker">Ticker *</Label>
                  <Input
                    id="quick_ticker"
                    placeholder="e.g., CW8.PA, BTC"
                    value={quickAddData.ticker}
                    onChange={(e) => setQuickAddData({ ...quickAddData, ticker: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick_name">Security Name (optional)</Label>
                  <Input
                    id="quick_name"
                    placeholder="e.g., MSCI World ETF"
                    value={quickAddData.name}
                    onChange={(e) => setQuickAddData({ ...quickAddData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quick_quantity">Quantity *</Label>
                    <Input
                      id="quick_quantity"
                      type="number"
                      step="0.00000001"
                      placeholder="10"
                      value={quickAddData.quantity}
                      onChange={(e) => setQuickAddData({ ...quickAddData, quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quick_price">Purchase Price (optional)</Label>
                    <Input
                      id="quick_price"
                      type="number"
                      step="0.01"
                      placeholder="100.00"
                      value={quickAddData.purchase_price}
                      onChange={(e) => setQuickAddData({ ...quickAddData, purchase_price: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quick_asset">Asset Class</Label>
                    <Select value={quickAddData.asset_class} onValueChange={(value) => setQuickAddData({ ...quickAddData, asset_class: value as AssetClass })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_CLASSES.map((cls) => (
                          <SelectItem key={cls} value={cls}>
                            {ASSET_CLASS_LABEL[cls]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quick_currency">Currency</Label>
                    <Select value={quickAddData.currency} onValueChange={(value) => setQuickAddData({ ...quickAddData, currency: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Add Investment</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleRefreshPrices} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Prices
          </Button>
        </div>
      </div>

      <Tabs defaultValue="quick" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quick">Quick Add</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
          <TabsTrigger value="securities">Securities</TabsTrigger>
          <TabsTrigger value="dca">
            <TrendingUp className="w-4 h-4 mr-2" />
            DCA Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Add Investment</CardTitle>
              <CardDescription>
                Use the "Add Investment" button above to quickly add a new holding. 
                If the security doesn't exist in your database, it will be created automatically.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="holdings" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={holdingDialogOpen} onOpenChange={(open) => {
              setHoldingDialogOpen(open);
              if (!open) {
                setEditingHolding(null);
                resetHoldingForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Holding
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingHolding ? "Edit Holding" : "Add New Holding"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleHoldingSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_id">Account *</Label>
                    <Select value={holdingFormData.account_id} onValueChange={(value) => setHoldingFormData({ ...holdingFormData, account_id: value })}>
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
                    <Select value={holdingFormData.security_id} onValueChange={(value) => setHoldingFormData({ ...holdingFormData, security_id: value })}>
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
                      value={holdingFormData.shares}
                      onChange={(e) => setHoldingFormData({ ...holdingFormData, shares: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount_invested_eur">Amount Invested (EUR)</Label>
                    <Input
                      id="amount_invested_eur"
                      type="number"
                      step="0.01"
                      value={holdingFormData.amount_invested_eur}
                      onChange={(e) => setHoldingFormData({ ...holdingFormData, amount_invested_eur: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setHoldingDialogOpen(false)}>
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
            <Card className="transition-all duration-300 hover:shadow-[0_0_25px_rgba(234,179,8,0.1)] hover:border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg">Your Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
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
                          <TableCell className="text-right tabular-nums">{holding.shares.toLocaleString('fr-FR')}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(holding.amount_invested_eur)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(calculateMarketValue(holding))}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEditHolding(holding)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteHolding(holding.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="securities" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={securityDialogOpen} onOpenChange={(open) => {
              setSecurityDialogOpen(open);
              if (!open) {
                setEditingSecurity(null);
                resetSecurityForm();
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
                <form onSubmit={handleSecuritySubmit}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g. Amundi MSCI World"
                        value={securityFormData.name}
                        onChange={(e) => setSecurityFormData({ ...securityFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="symbol">Symbol / Ticker</Label>
                      <Input
                        id="symbol"
                        placeholder="e.g. CW8.PA or BTC"
                        value={securityFormData.symbol}
                        onChange={(e) => setSecurityFormData({ ...securityFormData, symbol: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="asset_class">Asset Class</Label>
                      <Select 
                        value={securityFormData.asset_class} 
                        onValueChange={(value) => {
                          const updates: any = { asset_class: value as typeof securityFormData.asset_class };
                          if (value === 'CRYPTO') {
                            updates.pricing_source = 'COINGECKO';
                            updates.currency_quote = 'EUR';
                          }
                          setSecurityFormData({ ...securityFormData, ...updates });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSET_CLASSES.map((ac) => (
                            <SelectItem key={ac} value={ac}>{ASSET_CLASS_LABEL[ac]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={securityFormData.currency_quote} onValueChange={(value) => setSecurityFormData({ ...securityFormData, currency_quote: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pricing_source">Pricing Source</Label>
                      <Select value={securityFormData.pricing_source} onValueChange={(value) => setSecurityFormData({ ...securityFormData, pricing_source: value as typeof securityFormData.pricing_source })}>
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

          <Card className="transition-all duration-300 hover:shadow-[0_0_25px_rgba(234,179,8,0.1)] hover:border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">Your Securities</CardTitle>
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
                              {ASSET_CLASS_LABEL[(security.asset_class as any) ?? 'STOCK']}
                            </span>
                          </TableCell>
                          <TableCell>{security.currency_quote}</TableCell>
                          <TableCell className="text-xs">{security.pricing_source}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEditSecurity(security)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteSecurity(security.id)}>
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
        </TabsContent>

        <TabsContent value="dca" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={dcaDialogOpen} onOpenChange={(open) => {
              setDcaDialogOpen(open);
              if (!open) {
                setEditingDca(null);
                resetDcaForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add DCA Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingDca ? "Edit DCA Plan" : "New DCA Plan"}</DialogTitle>
                  <DialogDescription>
                    Create a recurring investment plan that will execute automatically
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleDcaSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dca_account">Account *</Label>
                    <Select value={dcaFormData.account_id} onValueChange={(value) => setDcaFormData({ ...dcaFormData, account_id: value })}>
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
                    <Label htmlFor="dca_security">Security *</Label>
                    <Select value={dcaFormData.security_id} onValueChange={(value) => setDcaFormData({ ...dcaFormData, security_id: value })}>
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
                    <Label htmlFor="dca_mode">Mode d'investissement *</Label>
                    <Select value={dcaFormData.investment_mode} onValueChange={(value: "amount" | "shares") => setDcaFormData({ ...dcaFormData, investment_mode: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">Montant fixe (parts fractionnaires)</SelectItem>
                        <SelectItem value="shares">Parts entières (budget max)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {dcaFormData.investment_mode === 'amount' 
                        ? "Investit le montant exact en EUR, peut acheter des fractions de parts"
                        : "Achète des parts entières jusqu'au budget max, le reste n'est pas investi"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dca_amount">
                      {dcaFormData.investment_mode === 'amount' ? "Montant (EUR) *" : "Budget max (EUR) *"}
                    </Label>
                    <Input
                      id="dca_amount"
                      type="number"
                      step="0.01"
                      min="1"
                      value={dcaFormData.amount}
                      onChange={(e) => setDcaFormData({ ...dcaFormData, amount: e.target.value })}
                      required
                    />
                  </div>

                  {bridgeAccounts.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="dca_source">Source de liquidité (optionnel)</Label>
                      <Select 
                        value={dcaFormData.source_account_id || "none"} 
                        onValueChange={(value) => setDcaFormData({ ...dcaFormData, source_account_id: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Aucune source sélectionnée" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucune</SelectItem>
                          {bridgeAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name} ({acc.balance?.toFixed(2) || 0} {acc.currency})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Le montant sera automatiquement déduit de ce compte lors de l'exécution du DCA
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="dca_frequency">Frequency *</Label>
                    <Select value={dcaFormData.frequency} onValueChange={(value: any) => setDcaFormData({ ...dcaFormData, frequency: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="interval">Custom Interval</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {dcaFormData.frequency === 'weekly' && (
                    <div className="space-y-2">
                      <Label htmlFor="dca_weekday">Day of Week *</Label>
                      <Select value={dcaFormData.weekday} onValueChange={(value) => setDcaFormData({ ...dcaFormData, weekday: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                          <SelectItem value="0">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {dcaFormData.frequency === 'monthly' && (
                    <div className="space-y-2">
                      <Label htmlFor="dca_monthday">Day of Month *</Label>
                      <Input
                        id="dca_monthday"
                        type="number"
                        min="1"
                        max="31"
                        value={dcaFormData.monthday}
                        onChange={(e) => setDcaFormData({ ...dcaFormData, monthday: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  {dcaFormData.frequency === 'interval' && (
                    <div className="space-y-2">
                      <Label htmlFor="dca_interval">Every N Days *</Label>
                      <Input
                        id="dca_interval"
                        type="number"
                        min="1"
                        value={dcaFormData.interval_days}
                        onChange={(e) => setDcaFormData({ ...dcaFormData, interval_days: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="dca_start">Start Date *</Label>
                    <Input
                      id="dca_start"
                      type="date"
                      value={dcaFormData.start_date}
                      onChange={(e) => setDcaFormData({ ...dcaFormData, start_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="dca_active"
                      checked={dcaFormData.active}
                      onCheckedChange={(checked) => setDcaFormData({ ...dcaFormData, active: checked })}
                    />
                    <Label htmlFor="dca_active">Active</Label>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDcaDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingDca ? "Update" : "Create"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {dcaPlans.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No DCA plans yet. Click "Add DCA Plan" to automate your investments.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="transition-all duration-300 hover:shadow-[0_0_25px_rgba(234,179,8,0.1)] hover:border-primary/10">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Active DCA Plans
                  </CardTitle>
                  <CardDescription>
                    Your recurring investment plans
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Security</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Next Execution</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dcaPlans.map((plan) => (
                          <TableRow key={plan.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{plan.security?.symbol}</div>
                                <div className="text-sm text-muted-foreground">{plan.security?.name}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div>{plan.account?.name}</div>
                                {plan.source_account && (
                                  <div className="text-xs text-muted-foreground">
                                    Source: {plan.source_account.name}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatCurrency(plan.amount)}</TableCell>
                            <TableCell className="capitalize">{plan.frequency}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{formatNextExecution(plan)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={plan.active}
                                onCheckedChange={(checked) => handleToggleDca(plan.id, checked)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEditDca(plan)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteDca(plan.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">Upcoming Schedule</CardTitle>
                  <CardDescription>
                    Next scheduled DCA executions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dcaPlans
                      .filter(p => p.active)
                      .slice(0, 5)
                      .map((plan) => (
                        <div key={plan.id} className="flex items-center justify-between p-3 rounded-lg bg-card border">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <TrendingUp className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{plan.security?.symbol}</div>
                              <div className="text-sm text-muted-foreground">{formatNextExecution(plan)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(plan.amount)}</div>
                            <div className="text-xs text-muted-foreground">{plan.account?.name}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
