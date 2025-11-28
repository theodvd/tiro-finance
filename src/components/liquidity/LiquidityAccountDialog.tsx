import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const accountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Le nom est requis" })
    .max(100, { message: "Le nom doit contenir moins de 100 caractères" }),
  type: z.string().min(1, { message: "Le type est requis" }),
  balance: z
    .string()
    .min(1, { message: "Le solde est requis" })
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Le solde doit être un nombre positif",
    }),
  currency: z.string().default("EUR"),
  provider: z
    .string()
    .trim()
    .max(50, { message: "Le fournisseur doit contenir moins de 50 caractères" })
    .default("Manuel"),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface LiquidityAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId: string;
  account?: {
    id: string;
    name: string;
    type: string;
    balance: number;
    currency: string;
    provider: string;
  } | null;
}

const ACCOUNT_TYPES = [
  { value: "checking", label: "Compte courant" },
  { value: "savings", label: "Compte épargne" },
  { value: "livret", label: "Livret" },
  { value: "other", label: "Autre" },
];

export function LiquidityAccountDialog({
  open,
  onOpenChange,
  onSuccess,
  userId,
  account,
}: LiquidityAccountDialogProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!account;

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: account?.name || "",
      type: account?.type || "",
      balance: account?.balance?.toString() || "",
      currency: account?.currency || "EUR",
      provider: account?.provider || "Manuel",
    },
  });

  const onSubmit = async (data: AccountFormData) => {
    setLoading(true);
    try {
      const accountData = {
        user_id: userId,
        name: data.name,
        type: data.type,
        balance: Number(data.balance),
        currency: data.currency,
        provider: data.provider,
        provider_account_id: isEditing ? account.id : `manual_${Date.now()}`,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("bridge_accounts")
          .update(accountData)
          .eq("id", account.id);

        if (error) throw error;
        toast.success("Compte modifié avec succès");
      } else {
        const { error } = await supabase.from("bridge_accounts").insert(accountData);

        if (error) throw error;
        toast.success("Compte ajouté avec succès");
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error("Error saving account:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le compte" : "Ajouter un compte liquide"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations du compte liquide"
              : "Ajoutez un compte liquide manuellement"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du compte</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Livret A, Compte courant..."
                      {...field}
                      maxLength={100}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de compte</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solde (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Établissement (optionnel)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Banque Populaire, LCL..."
                      {...field}
                      maxLength={50}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Modifier" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
