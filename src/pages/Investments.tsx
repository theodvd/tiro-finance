import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogBody } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, RefreshCw, TrendingUp } from "lucide-react";
import { z } from "zod";
import { ASSET_CLASSES, PRICING_SOURCES, ASSET_CLASS_LABEL, AssetClass, PricingSource } from "@/constants";
import { HoldingsSection } from "@/components/investments/HoldingsSection";
import { DcaSection } from "@/components/investments/DcaSection";
import type { Account, Security, Holding, DcaPlan, BridgeAccount, EnrichedHolding } from "@/components/investments/types";

const holdingSchema = z.object({
  account_id: z.string().uuid("Invalid account ID"),
  security_id: z.string().uuid("Invalid security ID"),
  shares: z.number().positive("Shares must be positive").max(1000000000, "Shares value too large"),
  amount_invested_eur: z.number().positive("Amount must be positive").max(1000000000, "Amount value too large").nullable(),
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

  // Quick Add Investment form state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddData, setQuickAddData] = useState({
    account_id: "",
    ticker: "",
    quantity: "",
    purchase_price: "",
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

  // Holding edit dialog
  const [holdingDialogOpen, setHoldingDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [holdingFormData, setHoldingFormData] = useState({
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
      toast({ title: "Erreur", description: holdingsError.message, variant: "destructive" });
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

    const { data: accountsData } = await supabase
      .from('accounts')
      .select('id, name, type')
      .eq('user_id', user!.id)
      .order('name');
    setAccounts(accountsData || []);

    const { data: securitiesData } = await supabase
      .from('securities')
      .select('id, name, symbol, asset_class, currency_quote, pricing_source, created_at')
      .eq('user_id', user!.id)
      .order('symbol');
    setSecurities(securitiesData || []);

    const { data: dcaData } = await supabase
      .from('dca_plans')
      .select(`
        *,
        account:accounts(id, name, type),
        security:securities(id, name, symbol),
        source_account:bridge_accounts(id, name, balance, currency, type)
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setDcaPlans((dcaData || []) as any);

    const { data: bridgeData } = await supabase
      .from('bridge_accounts')
      .select('id, name, balance, currency, type')
      .eq('user_id', user!.id)
      .order('name');
    setBridgeAccounts(bridgeData || []);

    setLoading(false);
  };

  // Enriched holdings with calculations
  const enrichedHoldings = useMemo<EnrichedHolding[]>(() => {
    const totalValue = holdings.reduce((sum, h) => {
      const secId = h.security?.id;
      const price = secId ? (priceMap[secId] ?? 0) : 0;
      return sum + (h.shares * price);
    }, 0);

    return holdings
      .map((h) => {
        const secId = h.security?.id;
        const price = secId ? (priceMap[secId] ?? 0) : 0;
        const marketValue = h.shares * price;
        const invested = h.amount_invested_eur ?? 0;
        const pnl = marketValue - invested;
        const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
        const weight = totalValue > 0 ? (marketValue / totalValue) * 100 : 0;

        return { ...h, marketValue, pnl, pnlPct, weight };
      })
      .sort((a, b) => b.weight - a.weight);
  }, [holdings, priceMap]);

  const handleRefreshPrices = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({ title: 'Erreur', description: 'Non authentifié', variant: 'destructive' });
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
      if (!res.ok) {
        const body = await res.text();
        toast({ title: 'Erreur', description: body || 'Échec du rafraîchissement', variant: 'destructive' });
      } else {
        toast({ title: 'Succès', description: 'Prix mis à jour' });
        await fetchData();
      }
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quickAddData.account_id || !quickAddData.ticker || !quickAddData.quantity) {
      toast({ title: "Erreur", description: "Remplis tous les champs obligatoires", variant: "destructive" });
      return;
    }

    try {
      const { data: existingSec } = await supabase
        .from('securities')
        .select('id')
        .eq('user_id', user!.id)
        .eq('symbol', quickAddData.ticker.toUpperCase())
        .maybeSingle();

      let securityId = existingSec?.id;

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
        toast({ title: "Erreur de validation", description: errors, variant: "destructive" });
        return;
      }

      const { error: insertError } = await supabase.from('holdings').insert(holdingPayload);
      if (insertError) throw insertError;

      toast({ title: "Succès", description: "Investissement ajouté" });
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
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  // Holdings CRUD
  const handleEditHolding = (holding: EnrichedHolding) => {
    setEditingHolding(holding);
    setHoldingFormData({
      account_id: holding.account.id,
      security_id: holding.security.id,
      shares: holding.shares.toString(),
      amount_invested_eur: holding.amount_invested_eur?.toString() || "",
    });
    setHoldingDialogOpen(true);
  };

  const handleHoldingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!holdingFormData.account_id || !holdingFormData.security_id || !holdingFormData.shares) {
      toast({ title: "Erreur", description: "Remplis tous les champs obligatoires", variant: "destructive" });
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
      toast({ title: "Erreur de validation", description: errors, variant: "destructive" });
      return;
    }

    if (editingHolding) {
      const { error } = await supabase
        .from('holdings')
        .update(payload)
        .eq('id', editingHolding.id);

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Succès", description: "Position mise à jour" });
        setHoldingDialogOpen(false);
        setEditingHolding(null);
        resetHoldingForm();
        fetchData();
      }
    }
  };

  const handleDeleteHolding = async (id: string) => {
    if (!confirm("Es-tu sûr de vouloir supprimer cette position ?")) return;

    const { error } = await supabase.from('holdings').delete().eq('id', id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Position supprimée" });
      fetchData();
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

  // DCA CRUD
  const handleDcaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dcaFormData.account_id || !dcaFormData.security_id || !dcaFormData.amount) {
      toast({ title: "Erreur", description: "Remplis tous les champs obligatoires", variant: "destructive" });
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
        toast({ title: "Succès", description: "DCA mis à jour" });
      } else {
        const { error } = await supabase.from('dca_plans').insert(payload);
        if (error) throw error;
        toast({ title: "Succès", description: "DCA créé" });
      }

      setDcaDialogOpen(false);
      setEditingDca(null);
      resetDcaForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
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
    if (!confirm("Es-tu sûr de vouloir supprimer ce DCA ?")) return;

    const { error } = await supabase.from('dca_plans').delete().eq('id', id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "DCA supprimé" });
      fetchData();
    }
  };

  const handleToggleDca = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from('dca_plans')
      .update({ active })
      .eq('id', id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: `DCA ${active ? 'activé' : 'mis en pause'}` });
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

    switch (plan.frequency) {
      case 'weekly':
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        return `Chaque ${dayNames[plan.weekday || 0]}`;
      case 'monthly':
        return `Le ${plan.monthday} du mois`;
      case 'interval':
        return `Tous les ${plan.interval_days} jours`;
      default:
        return new Date(plan.start_date).toLocaleDateString('fr-FR');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Investissements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pilote tes positions et tes investissements récurrents
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Ajouter un investissement</span>
                <span className="sm:hidden">Investir</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Ajouter un investissement</DialogTitle>
                <DialogDescription>
                  Ajoute rapidement une nouvelle position. L'actif sera créé automatiquement s'il n'existe pas.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <form id="quick-add-form" onSubmit={handleQuickAddSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="quick_account">Compte *</Label>
                    <Select value={quickAddData.account_id} onValueChange={(value) => setQuickAddData({ ...quickAddData, account_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionne un compte..." />
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
                      placeholder="ex: CW8.PA, BTC"
                      value={quickAddData.ticker}
                      onChange={(e) => setQuickAddData({ ...quickAddData, ticker: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quick_name">Nom (optionnel)</Label>
                    <Input
                      id="quick_name"
                      placeholder="ex: MSCI World ETF"
                      value={quickAddData.name}
                      onChange={(e) => setQuickAddData({ ...quickAddData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quick_quantity">Quantité *</Label>
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
                      <Label htmlFor="quick_price">Prix unitaire (optionnel)</Label>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quick_asset">Classe d'actif</Label>
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
                      <Label htmlFor="quick_currency">Devise</Label>
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
                </form>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setQuickAddOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" form="quick-add-form">Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={dcaDialogOpen} onOpenChange={(open) => {
            setDcaDialogOpen(open);
            if (!open) {
              setEditingDca(null);
              resetDcaForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <TrendingUp className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Ajouter un DCA</span>
                <span className="sm:hidden">DCA</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingDca ? "Modifier le DCA" : "Nouveau DCA"}</DialogTitle>
                <DialogDescription>
                  Crée un plan d'investissement récurrent qui s'exécutera automatiquement
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <form id="dca-form" onSubmit={handleDcaSubmit} className="space-y-4">
                  {/* Compte & Actif */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dca_account">Compte *</Label>
                      <Select value={dcaFormData.account_id} onValueChange={(value) => setDcaFormData({ ...dcaFormData, account_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionne..." />
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
                      <Label htmlFor="dca_security">Actif *</Label>
                      <Select value={dcaFormData.security_id} onValueChange={(value) => setDcaFormData({ ...dcaFormData, security_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionne..." />
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
                  </div>

                  {/* Mode & Montant */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dca_mode">Mode *</Label>
                      <Select value={dcaFormData.investment_mode} onValueChange={(value: "amount" | "shares") => setDcaFormData({ ...dcaFormData, investment_mode: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amount">Montant fixe</SelectItem>
                          <SelectItem value="shares">Parts entières</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dca_amount">
                        {dcaFormData.investment_mode === 'amount' ? "Montant (€) *" : "Budget max (€) *"}
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
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    {dcaFormData.investment_mode === 'amount'
                      ? "Investit le montant exact, peut acheter des fractions"
                      : "Achète des parts entières jusqu'au budget max"}
                  </p>

                  {/* Source de liquidité */}
                  {bridgeAccounts.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="dca_source">Source de liquidité (optionnel)</Label>
                      <Select
                        value={dcaFormData.source_account_id || "none"}
                        onValueChange={(value) => setDcaFormData({ ...dcaFormData, source_account_id: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Aucune" />
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
                    </div>
                  )}

                  {/* Fréquence & Paramètres */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dca_frequency">Fréquence *</Label>
                      <Select value={dcaFormData.frequency} onValueChange={(value: any) => setDcaFormData({ ...dcaFormData, frequency: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Hebdomadaire</SelectItem>
                          <SelectItem value="monthly">Mensuel</SelectItem>
                          <SelectItem value="interval">Intervalle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {dcaFormData.frequency === 'weekly' && (
                      <div className="space-y-2">
                        <Label htmlFor="dca_weekday">Jour *</Label>
                        <Select value={dcaFormData.weekday} onValueChange={(value) => setDcaFormData({ ...dcaFormData, weekday: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Lundi</SelectItem>
                            <SelectItem value="2">Mardi</SelectItem>
                            <SelectItem value="3">Mercredi</SelectItem>
                            <SelectItem value="4">Jeudi</SelectItem>
                            <SelectItem value="5">Vendredi</SelectItem>
                            <SelectItem value="6">Samedi</SelectItem>
                            <SelectItem value="0">Dimanche</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {dcaFormData.frequency === 'monthly' && (
                      <div className="space-y-2">
                        <Label htmlFor="dca_monthday">Jour du mois *</Label>
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
                        <Label htmlFor="dca_interval">Tous les N jours *</Label>
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
                  </div>

                  {/* Date de début & Actif */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="dca_start">Date de début *</Label>
                      <Input
                        id="dca_start"
                        type="date"
                        value={dcaFormData.start_date}
                        onChange={(e) => setDcaFormData({ ...dcaFormData, start_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex items-center space-x-2 pb-2">
                      <Switch
                        id="dca_active"
                        checked={dcaFormData.active}
                        onCheckedChange={(checked) => setDcaFormData({ ...dcaFormData, active: checked })}
                      />
                      <Label htmlFor="dca_active">Actif</Label>
                    </div>
                  </div>
                </form>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDcaDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" form="dca-form">{editingDca ? "Mettre à jour" : "Créer"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="icon" onClick={handleRefreshPrices} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Holdings Section */}
      <HoldingsSection
        holdings={enrichedHoldings}
        onEdit={handleEditHolding}
        onDelete={handleDeleteHolding}
      />

      {/* DCA Section */}
      <DcaSection
        plans={dcaPlans}
        onAdd={() => setDcaDialogOpen(true)}
        onEdit={handleEditDca}
        onDelete={handleDeleteDca}
        onToggle={handleToggleDca}
        formatNextExecution={formatNextExecution}
      />

      {/* Holding Edit Dialog */}
      <Dialog open={holdingDialogOpen} onOpenChange={(open) => {
        setHoldingDialogOpen(open);
        if (!open) {
          setEditingHolding(null);
          resetHoldingForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier la position</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form id="holding-edit-form" onSubmit={handleHoldingSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_account">Compte *</Label>
                  <Select value={holdingFormData.account_id} onValueChange={(value) => setHoldingFormData({ ...holdingFormData, account_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionne..." />
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
                  <Label htmlFor="edit_security">Actif *</Label>
                  <Select value={holdingFormData.security_id} onValueChange={(value) => setHoldingFormData({ ...holdingFormData, security_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionne..." />
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
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_shares">Nombre de parts *</Label>
                  <Input
                    id="edit_shares"
                    type="number"
                    step="0.00000001"
                    value={holdingFormData.shares}
                    onChange={(e) => setHoldingFormData({ ...holdingFormData, shares: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_amount">Montant investi (€)</Label>
                  <Input
                    id="edit_amount"
                    type="number"
                    step="0.01"
                    value={holdingFormData.amount_invested_eur}
                    onChange={(e) => setHoldingFormData({ ...holdingFormData, amount_invested_eur: e.target.value })}
                  />
                </div>
              </div>
            </form>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHoldingDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="holding-edit-form">Mettre à jour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
