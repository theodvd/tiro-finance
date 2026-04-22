/**
 * Patrimoine — fusion de Portfolio (vue patrimoniale) + Investments (positions & DCA).
 *
 * Structure :
 *   0. Bannière contextuelle (?suggest depuis Revue mensuelle)
 *   1. Header : titre + boutons d'action
 *   2. KPIs globaux (patrimoine, investi, liquidités, P&L)
 *   3. Évolution & structure (PortfolioHistory + répartition)
 *   4. Diagnostic (score diversification + alertes)
 *   5. Positions par broker + tableau détaillé
 *   6. Plans DCA
 *   Dialogs : Ajout rapide, DCA, Édition de position
 */

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogBody,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Info,
  PiggyBank,
  Plus,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { z } from "zod";
import {
  ASSET_CLASSES,
  ASSET_CLASS_LABEL,
  AssetClass,
  PricingSource,
} from "@/constants";
import { PortfolioHistory } from "@/components/dashboard/PortfolioHistory";
import { BrokerCards } from "@/components/investments/BrokerCards";
import { PositionsTable } from "@/components/investments/PositionsTable";
import { DcaSection } from "@/components/investments/DcaSection";
import type {
  Account,
  Security,
  Holding,
  DcaPlan,
  BridgeAccount,
  EnrichedHolding,
} from "@/components/investments/types";
import { useDiversification } from "@/hooks/useDiversification";
import CountUp from "react-countup";

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────

const holdingSchema = z.object({
  account_id: z.string().uuid("Invalid account ID"),
  security_id: z.string().uuid("Invalid security ID"),
  shares: z
    .number()
    .positive("Shares must be positive")
    .max(1000000000, "Shares value too large"),
  amount_invested_eur: z
    .number()
    .positive("Amount must be positive")
    .max(1000000000, "Amount value too large")
    .nullable(),
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const formatDate = (date: string | null | undefined) =>
  date
    ? new Date(date).toLocaleString("fr-FR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Jamais";

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function Patrimoine() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: diversificationData, loading: diversificationLoading } =
    useDiversification();

  // ── Montant suggéré depuis la Revue mensuelle (?suggest=X)
  const suggestParam = searchParams.get("suggest");
  const suggestAmount = suggestParam ? Number(suggestParam) : null;

  // ── État principal (chargé par fetchData)
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [securities, setSecurities] = useState<Security[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dcaPlans, setDcaPlans] = useState<DcaPlan[]>([]);
  const [bridgeAccounts, setBridgeAccounts] = useState<BridgeAccount[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [priceUpdatedMap, setPriceUpdatedMap] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<
    { d: string; total_value_eur: number }[]
  >([]);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>();

  // ── Dialogs
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
    start_date: new Date().toISOString().split("T")[0],
    active: true,
  });

  const [holdingDialogOpen, setHoldingDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<EnrichedHolding | null>(
    null
  );
  const [holdingFormData, setHoldingFormData] = useState({
    account_id: "",
    security_id: "",
    shares: "",
    amount_invested_eur: "",
  });

  // ─────────────────────────────────────────────────────────────
  // Fetch
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    const { data: holdingsData, error: holdingsError } = await supabase
      .from("holdings")
      .select(
        `
        id, shares, amount_invested_eur, created_at,
        account:accounts(id, name, type),
        security:securities(
          id, name, symbol, asset_class, currency_quote, pricing_source,
          market_data(last_px_eur)
        )
      `
      )
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (holdingsError) {
      setError(holdingsError.message);
      setLoading(false);
      return;
    }

    setHoldings((holdingsData || []) as any);

    const secIds = (holdingsData || [])
      .map((h: any) => h?.security?.id)
      .filter((id: string | undefined): id is string => Boolean(id));

    if (secIds.length > 0) {
      const { data: mdRows } = await supabase
        .from("market_data")
        .select("security_id, last_px_eur, updated_at")
        .in("security_id", secIds);

      if (mdRows) {
        const map: Record<string, number> = {};
        const updMap: Record<string, string> = {};
        let latest = "";
        for (const r of mdRows) {
          if (r.security_id != null) {
            map[r.security_id] = Number(r.last_px_eur);
            updMap[r.security_id] = r.updated_at;
            if (r.updated_at > latest) latest = r.updated_at;
          }
        }
        setPriceMap(map);
        setPriceUpdatedMap(updMap);
        if (latest) setLastUpdated(latest);
      }
    }

    const { data: snapData } = await supabase
      .from("v_snapshot_totals")
      .select("d, total_value_eur")
      .eq("user_id", user!.id)
      .order("d", { ascending: true })
      .limit(30);
    setSnapshots(
      (snapData || []).map((s) => ({
        d: s.d || "",
        total_value_eur: Number(s.total_value_eur) || 0,
      }))
    );

    const { data: accountsData } = await supabase
      .from("accounts")
      .select("id, name, type")
      .eq("user_id", user!.id)
      .order("name");
    setAccounts(accountsData || []);

    const { data: securitiesData } = await supabase
      .from("securities")
      .select(
        "id, name, symbol, asset_class, currency_quote, pricing_source, created_at"
      )
      .eq("user_id", user!.id)
      .order("symbol");
    setSecurities(securitiesData || []);

    const { data: dcaData } = await supabase
      .from("dca_plans")
      .select(
        `
        *,
        account:accounts(id, name, type),
        security:securities(id, name, symbol),
        source_account:bridge_accounts(id, name, balance, currency, type)
      `
      )
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setDcaPlans((dcaData || []) as any);

    const { data: bridgeData } = await supabase
      .from("bridge_accounts")
      .select("id, name, balance, currency, type")
      .eq("user_id", user!.id)
      .order("name");
    setBridgeAccounts(bridgeData || []);

    setLoading(false);
  };

  // ─────────────────────────────────────────────────────────────
  // Calculs dérivés
  // ─────────────────────────────────────────────────────────────

  const enrichedHoldings = useMemo<EnrichedHolding[]>(() => {
    const totalVal = holdings.reduce((sum, h) => {
      const price = h.security?.id ? (priceMap[h.security.id] ?? 0) : 0;
      return sum + h.shares * price;
    }, 0);

    return holdings
      .map((h) => {
        const price = h.security?.id ? (priceMap[h.security.id] ?? 0) : 0;
        const marketValue = h.shares * price;
        const invested = h.amount_invested_eur ?? 0;
        const pnl = marketValue - invested;
        const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
        const weight = totalVal > 0 ? (marketValue / totalVal) * 100 : 0;
        return { ...h, marketValue, pnl, pnlPct, weight };
      })
      .sort((a, b) => b.weight - a.weight);
  }, [holdings, priceMap]);

  const totalValue = useMemo(
    () => enrichedHoldings.reduce((s, h) => s + h.marketValue, 0),
    [enrichedHoldings]
  );
  const totalInvested = useMemo(
    () =>
      enrichedHoldings.reduce((s, h) => s + (h.amount_invested_eur ?? 0), 0),
    [enrichedHoldings]
  );
  const pnl = totalValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

  // Liquidités = somme des soldes bancaires (bridge_accounts)
  const totalLiquidity = useMemo(
    () => bridgeAccounts.reduce((s, a) => s + (a.balance || 0), 0),
    [bridgeAccounts]
  );
  const totalWealth = totalValue + totalLiquidity;
  const investedPct =
    totalWealth > 0 ? (totalValue / totalWealth) * 100 : 0;
  const liquidityPct =
    totalWealth > 0 ? (totalLiquidity / totalWealth) * 100 : 0;

  const brokerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const h of enrichedHoldings) map[h.account.id] = h.account.name;
    return map;
  }, [enrichedHoldings]);

  // Alertes de diversification
  const alerts: Array<{
    icon: any;
    text: string;
    variant: "warning" | "info";
  }> = [];
  if (diversificationData?.concentrationRisks) {
    diversificationData.concentrationRisks
      .filter((r) => r.severity === "high" || r.severity === "medium")
      .slice(0, 3)
      .forEach((r) =>
        alerts.push({ icon: AlertTriangle, text: r.title, variant: "warning" })
      );
  }
  if (liquidityPct < 10 && bridgeAccounts.length > 0) {
    alerts.push({
      icon: Wallet,
      text: `Matelas de sécurité faible (${liquidityPct.toFixed(0)}%)`,
      variant: "warning",
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Handlers — Prix
  // ─────────────────────────────────────────────────────────────

  const handleRefreshPrices = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast({
        title: "Erreur",
        description: "Non authentifié",
        variant: "destructive",
      });
      return;
    }
    setRefreshing(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refresh-prices`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) {
        const body = await res.text();
        toast({
          title: "Erreur",
          description: body || "Échec du rafraîchissement",
          variant: "destructive",
        });
      } else {
        toast({ title: "Succès", description: "Prix mis à jour" });
        await fetchData();
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Handlers — Ajout rapide
  // ─────────────────────────────────────────────────────────────

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !quickAddData.account_id ||
      !quickAddData.ticker ||
      !quickAddData.quantity
    ) {
      toast({
        title: "Erreur",
        description: "Remplis tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }
    try {
      const { data: existingSec } = await supabase
        .from("securities")
        .select("id")
        .eq("user_id", user!.id)
        .eq("symbol", quickAddData.ticker.toUpperCase())
        .maybeSingle();

      let securityId = existingSec?.id;

      if (!securityId) {
        const { data: newSec, error: createSecError } = await supabase
          .from("securities")
          .insert({
            user_id: user!.id,
            symbol: quickAddData.ticker.toUpperCase(),
            name: quickAddData.name || quickAddData.ticker.toUpperCase(),
            asset_class: quickAddData.asset_class,
            currency_quote: quickAddData.currency,
            pricing_source: quickAddData.pricing_source,
          })
          .select("id")
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
          ? parseFloat(quickAddData.quantity) *
            parseFloat(quickAddData.purchase_price)
          : null,
      };

      const validationResult = holdingSchema.safeParse(holdingPayload);
      if (!validationResult.success) {
        const errors = validationResult.error.errors
          .map((e) => e.message)
          .join(", ");
        toast({
          title: "Erreur de validation",
          description: errors,
          variant: "destructive",
        });
        return;
      }

      const { error: insertError } = await supabase
        .from("holdings")
        .insert(holdingPayload);
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
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Handlers — Holdings CRUD
  // ─────────────────────────────────────────────────────────────

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
    if (
      !holdingFormData.account_id ||
      !holdingFormData.security_id ||
      !holdingFormData.shares
    ) {
      toast({
        title: "Erreur",
        description: "Remplis tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }
    const payload = {
      user_id: user!.id,
      account_id: holdingFormData.account_id,
      security_id: holdingFormData.security_id,
      shares: parseFloat(holdingFormData.shares),
      amount_invested_eur: holdingFormData.amount_invested_eur
        ? parseFloat(holdingFormData.amount_invested_eur)
        : null,
    };
    const validationResult = holdingSchema.safeParse(payload);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => e.message)
        .join(", ");
      toast({
        title: "Erreur de validation",
        description: errors,
        variant: "destructive",
      });
      return;
    }
    if (editingHolding) {
      const { error } = await supabase
        .from("holdings")
        .update(payload)
        .eq("id", editingHolding.id);
      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Succès", description: "Position mise à jour" });
        setHoldingDialogOpen(false);
        setEditingHolding(null);
        setHoldingFormData({
          account_id: "",
          security_id: "",
          shares: "",
          amount_invested_eur: "",
        });
        fetchData();
      }
    }
  };

  const handleDeleteHolding = async (id: string) => {
    if (!confirm("Es-tu sûr de vouloir supprimer cette position ?")) return;
    const { error } = await supabase.from("holdings").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "Position supprimée" });
      fetchData();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Handlers — DCA CRUD
  // ─────────────────────────────────────────────────────────────

  const handleDcaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !dcaFormData.account_id ||
      !dcaFormData.security_id ||
      !dcaFormData.amount
    ) {
      toast({
        title: "Erreur",
        description: "Remplis tous les champs obligatoires",
        variant: "destructive",
      });
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
      interval_days:
        dcaFormData.frequency === "interval"
          ? parseInt(dcaFormData.interval_days)
          : null,
      weekday:
        dcaFormData.frequency === "weekly"
          ? parseInt(dcaFormData.weekday)
          : null,
      monthday:
        dcaFormData.frequency === "monthly"
          ? parseInt(dcaFormData.monthday)
          : null,
    };
    try {
      if (editingDca) {
        const { error } = await supabase
          .from("dca_plans")
          .update(payload)
          .eq("id", editingDca.id);
        if (error) throw error;
        toast({ title: "Succès", description: "DCA mis à jour" });
      } else {
        const { error } = await supabase.from("dca_plans").insert(payload);
        if (error) throw error;
        toast({ title: "Succès", description: "DCA créé" });
      }
      setDcaDialogOpen(false);
      setEditingDca(null);
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
        start_date: new Date().toISOString().split("T")[0],
        active: true,
      });
      fetchData();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
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
    const { error } = await supabase.from("dca_plans").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Succès", description: "DCA supprimé" });
      fetchData();
    }
  };

  const handleToggleDca = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from("dca_plans")
      .update({ active })
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Succès",
        description: `DCA ${active ? "activé" : "mis en pause"}`,
      });
      fetchData();
    }
  };

  const formatNextExecution = (plan: DcaPlan) => {
    if (plan.next_execution_date)
      return new Date(plan.next_execution_date).toLocaleDateString("fr-FR");
    switch (plan.frequency) {
      case "weekly": {
        const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
        return `Chaque ${dayNames[plan.weekday || 0]}`;
      }
      case "monthly":
        return `Le ${plan.monthday} du mois`;
      case "interval":
        return `Tous les ${plan.interval_days} jours`;
      default:
        return new Date(plan.start_date).toLocaleDateString("fr-FR");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // États de chargement / erreur
  // ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <h1 className="text-xl font-bold tracking-tight">Patrimoine</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

      {/* ── Bannière contextuelle (?suggest) */}
      {suggestAmount !== null && suggestAmount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-900">
          <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
          <p className="text-sm">
            <span className="font-semibold">
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
              }).format(suggestAmount)}
            </span>{" "}
            disponibles depuis vos revenus pro ce mois — allouez ce montant à
            vos investissements.
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Patrimoine</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mis à jour : {formatDate(lastUpdated ?? null)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Ajouter position */}
          <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Ajouter un investissement</DialogTitle>
                <DialogDescription>
                  Ajoute rapidement une nouvelle position.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <form
                  id="quick-add-form"
                  onSubmit={handleQuickAddSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label>Compte *</Label>
                    <Select
                      value={quickAddData.account_id}
                      onValueChange={(v) =>
                        setQuickAddData({ ...quickAddData, account_id: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionne un compte..." />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} ({a.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ticker *</Label>
                    <Input
                      placeholder="ex: CW8.PA, BTC"
                      value={quickAddData.ticker}
                      onChange={(e) =>
                        setQuickAddData({
                          ...quickAddData,
                          ticker: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom (optionnel)</Label>
                    <Input
                      placeholder="ex: MSCI World ETF"
                      value={quickAddData.name}
                      onChange={(e) =>
                        setQuickAddData({ ...quickAddData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantité *</Label>
                      <Input
                        type="number"
                        step="0.00000001"
                        placeholder="10"
                        value={quickAddData.quantity}
                        onChange={(e) =>
                          setQuickAddData({
                            ...quickAddData,
                            quantity: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Prix unitaire</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="100.00"
                        value={quickAddData.purchase_price}
                        onChange={(e) =>
                          setQuickAddData({
                            ...quickAddData,
                            purchase_price: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Classe d'actif</Label>
                    <Select
                      value={quickAddData.asset_class}
                      onValueChange={(v) =>
                        setQuickAddData({
                          ...quickAddData,
                          asset_class: v as AssetClass,
                        })
                      }
                    >
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
                </form>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuickAddOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" form="quick-add-form">
                  Ajouter
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* DCA */}
          <Dialog
            open={dcaDialogOpen}
            onOpenChange={(open) => {
              setDcaDialogOpen(open);
              if (!open) {
                setEditingDca(null);
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
                  start_date: new Date().toISOString().split("T")[0],
                  active: true,
                });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                <TrendingUp className="mr-1.5 h-4 w-4" />
                DCA
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingDca ? "Modifier le DCA" : "Nouveau DCA"}
                </DialogTitle>
                <DialogDescription>
                  Plan d'investissement récurrent
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <form
                  id="dca-form"
                  onSubmit={handleDcaSubmit}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Compte *</Label>
                      <Select
                        value={dcaFormData.account_id}
                        onValueChange={(v) =>
                          setDcaFormData({ ...dcaFormData, account_id: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionne..." />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name} ({a.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Actif *</Label>
                      <Select
                        value={dcaFormData.security_id}
                        onValueChange={(v) =>
                          setDcaFormData({ ...dcaFormData, security_id: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionne..." />
                        </SelectTrigger>
                        <SelectContent>
                          {securities.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.symbol} - {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mode *</Label>
                      <Select
                        value={dcaFormData.investment_mode}
                        onValueChange={(v: "amount" | "shares") =>
                          setDcaFormData({
                            ...dcaFormData,
                            investment_mode: v,
                          })
                        }
                      >
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
                      <Label>
                        {dcaFormData.investment_mode === "amount"
                          ? "Montant (€) *"
                          : "Budget max (€) *"}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="1"
                        value={dcaFormData.amount}
                        onChange={(e) =>
                          setDcaFormData({
                            ...dcaFormData,
                            amount: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                  {bridgeAccounts.length > 0 && (
                    <div className="space-y-2">
                      <Label>Source de liquidité</Label>
                      <Select
                        value={dcaFormData.source_account_id || "none"}
                        onValueChange={(v) =>
                          setDcaFormData({
                            ...dcaFormData,
                            source_account_id: v === "none" ? "" : v,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Aucune" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucune</SelectItem>
                          {bridgeAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name} ({a.balance?.toFixed(2) || 0} {a.currency})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fréquence *</Label>
                      <Select
                        value={dcaFormData.frequency}
                        onValueChange={(v: any) =>
                          setDcaFormData({ ...dcaFormData, frequency: v })
                        }
                      >
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
                    {dcaFormData.frequency === "weekly" && (
                      <div className="space-y-2">
                        <Label>Jour *</Label>
                        <Select
                          value={dcaFormData.weekday}
                          onValueChange={(v) =>
                            setDcaFormData({ ...dcaFormData, weekday: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Lundi</SelectItem>
                            <SelectItem value="2">Mardi</SelectItem>
                            <SelectItem value="3">Mercredi</SelectItem>
                            <SelectItem value="4">Jeudi</SelectItem>
                            <SelectItem value="5">Vendredi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {dcaFormData.frequency === "monthly" && (
                      <div className="space-y-2">
                        <Label>Jour du mois *</Label>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={dcaFormData.monthday}
                          onChange={(e) =>
                            setDcaFormData({
                              ...dcaFormData,
                              monthday: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    )}
                    {dcaFormData.frequency === "interval" && (
                      <div className="space-y-2">
                        <Label>Tous les N jours *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={dcaFormData.interval_days}
                          onChange={(e) =>
                            setDcaFormData({
                              ...dcaFormData,
                              interval_days: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Date de début *</Label>
                      <Input
                        type="date"
                        value={dcaFormData.start_date}
                        onChange={(e) =>
                          setDcaFormData({
                            ...dcaFormData,
                            start_date: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="flex items-center space-x-2 pb-2">
                      <Switch
                        checked={dcaFormData.active}
                        onCheckedChange={(c) =>
                          setDcaFormData({ ...dcaFormData, active: c })
                        }
                      />
                      <Label>Actif</Label>
                    </div>
                  </div>
                </form>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDcaDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" form="dca-form">
                  {editingDca ? "Mettre à jour" : "Créer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Rafraîchir les prix */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefreshPrices}
            disabled={refreshing}
            title="Rafraîchir les prix"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>

          {/* Point mensuel */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/monthly-review")}
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            Revue mensuelle
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1 — KPIs GLOBAUX
      ═══════════════════════════════════════════════════════════════════════ */}
      <section aria-label="Vue globale du patrimoine">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {/* Patrimoine total */}
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Patrimoine Total
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-semibold tabular-nums text-foreground">
                <CountUp
                  end={totalWealth}
                  duration={0.8}
                  decimals={0}
                  decimal=","
                  separator=" "
                  suffix=" €"
                />
              </div>
            </CardContent>
          </Card>

          {/* Investi */}
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Investi
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-semibold tabular-nums text-foreground">
                <CountUp
                  end={totalValue}
                  duration={0.8}
                  decimals={0}
                  decimal=","
                  separator=" "
                  suffix=" €"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {investedPct.toFixed(0)}% du patrimoine
              </p>
            </CardContent>
          </Card>

          {/* Liquidités */}
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <PiggyBank className="h-3.5 w-3.5" />
                Liquidités
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-lg sm:text-xl lg:text-2xl font-semibold tabular-nums text-foreground">
                <CountUp
                  end={totalLiquidity}
                  duration={0.8}
                  decimals={0}
                  decimal=","
                  separator=" "
                  suffix=" €"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {liquidityPct.toFixed(0)}% du patrimoine
              </p>
            </CardContent>
          </Card>

          {/* P&L */}
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                {pnl >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-[hsl(var(--destructive))]" />
                )}
                Profit / Loss
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div
                className={`text-lg sm:text-xl lg:text-2xl font-semibold tabular-nums ${
                  pnl >= 0
                    ? "text-[hsl(var(--success))]"
                    : "text-[hsl(var(--destructive))]"
                }`}
              >
                <CountUp
                  end={pnl}
                  duration={0.8}
                  decimals={0}
                  decimal=","
                  separator=" "
                  prefix={pnl >= 0 ? "+" : ""}
                  suffix=" €"
                />
              </div>
              <p
                className={`text-[10px] font-medium mt-0.5 ${
                  pnl >= 0
                    ? "text-[hsl(var(--success))]"
                    : "text-[hsl(var(--destructive))]"
                }`}
              >
                {pnlPct >= 0 ? "+" : ""}
                {pnlPct.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2 — ÉVOLUTION & STRUCTURE
      ═══════════════════════════════════════════════════════════════════════ */}
      <section aria-label="Évolution et structure">
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PortfolioHistory />
          </div>
          <Card className="rounded-xl border border-border bg-card">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">
                Structure du patrimoine
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${investedPct}%` }}
                />
                <div
                  className="h-full bg-[hsl(var(--chart-2))] transition-all duration-500"
                  style={{ width: `${liquidityPct}%` }}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="text-muted-foreground">
                      Investissements
                    </span>
                  </div>
                  <span className="font-medium tabular-nums">
                    {investedPct.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-2))]" />
                    <span className="text-muted-foreground">Liquidités</span>
                  </div>
                  <span className="font-medium tabular-nums">
                    {liquidityPct.toFixed(0)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3 — DIAGNOSTIC
      ═══════════════════════════════════════════════════════════════════════ */}
      <section aria-label="Diagnostic rapide">
        <Card className="rounded-xl border border-border bg-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Diagnostic</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {/* Score de diversification */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div
                  className={`flex items-center justify-center h-12 w-12 rounded-full text-lg font-bold ${
                    !diversificationLoading && diversificationData
                      ? diversificationData.score >= 60
                        ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]"
                        : diversificationData.score >= 40
                        ? "bg-accent/20 text-accent"
                        : "bg-destructive/20 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {diversificationLoading
                    ? "..."
                    : (diversificationData?.score ?? "-")}
                </div>
                <div>
                  <p className="text-sm font-medium">Score de diversification</p>
                  <p className="text-xs text-muted-foreground">
                    {diversificationLoading
                      ? "Chargement..."
                      : (diversificationData?.scoreLabel ?? "Non disponible")}
                  </p>
                </div>
              </div>

              {/* Alertes */}
              <div className="space-y-2">
                {alerts.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">
                    <TrendingUp className="h-4 w-4 flex-shrink-0" />
                    <p className="text-sm">Aucune alerte majeure</p>
                  </div>
                ) : (
                  alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-accent/10 text-accent-foreground"
                    >
                      <alert.icon className="h-4 w-4 flex-shrink-0 text-accent" />
                      <p className="text-xs">{alert.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4 — POSITIONS
      ═══════════════════════════════════════════════════════════════════════ */}
      {enrichedHoldings.length > 0 && (
        <BrokerCards
          holdings={enrichedHoldings}
          totalValue={totalValue}
          selectedBroker={selectedBroker}
          onSelectBroker={setSelectedBroker}
        />
      )}

      {enrichedHoldings.length > 0 ? (
        <PositionsTable
          holdings={enrichedHoldings}
          selectedBroker={selectedBroker}
          onClearBroker={() => setSelectedBroker(null)}
          onEdit={handleEditHolding}
          onDelete={handleDeleteHolding}
          priceMap={priceUpdatedMap}
          brokerNameMap={brokerNameMap}
        />
      ) : (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <p className="text-muted-foreground">
            Aucune position. Ajoute ton premier investissement pour commencer.
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 5 — PLANS DCA
      ═══════════════════════════════════════════════════════════════════════ */}
      <DcaSection
        plans={dcaPlans}
        onAdd={() => setDcaDialogOpen(true)}
        onEdit={handleEditDca}
        onDelete={handleDeleteDca}
        onToggle={handleToggleDca}
        formatNextExecution={formatNextExecution}
      />

      {/* ── Dialog : Édition de position */}
      <Dialog
        open={holdingDialogOpen}
        onOpenChange={(open) => {
          setHoldingDialogOpen(open);
          if (!open) {
            setEditingHolding(null);
            setHoldingFormData({
              account_id: "",
              security_id: "",
              shares: "",
              amount_invested_eur: "",
            });
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier la position</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form
              id="holding-edit-form"
              onSubmit={handleHoldingSubmit}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Compte *</Label>
                  <Select
                    value={holdingFormData.account_id}
                    onValueChange={(v) =>
                      setHoldingFormData({ ...holdingFormData, account_id: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionne..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Actif *</Label>
                  <Select
                    value={holdingFormData.security_id}
                    onValueChange={(v) =>
                      setHoldingFormData({
                        ...holdingFormData,
                        security_id: v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionne..." />
                    </SelectTrigger>
                    <SelectContent>
                      {securities.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.symbol} - {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de parts *</Label>
                  <Input
                    type="number"
                    step="0.00000001"
                    value={holdingFormData.shares}
                    onChange={(e) =>
                      setHoldingFormData({
                        ...holdingFormData,
                        shares: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Montant investi (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={holdingFormData.amount_invested_eur}
                    onChange={(e) =>
                      setHoldingFormData({
                        ...holdingFormData,
                        amount_invested_eur: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </form>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setHoldingDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" form="holding-edit-form">
              Mettre à jour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
