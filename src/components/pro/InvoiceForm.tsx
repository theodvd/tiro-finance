/**
 * InvoiceForm — dialog modal de création / édition d'une facture.
 *
 * - Création : tous les champs, status='draft' imposé par le hook
 * - Édition  : pré-remplit les champs depuis la facture existante
 * - amount_ttc affiché en temps réel (non soumis, calculé via watch)
 * - Validation Zod : montant > 0, dates valides, client obligatoire
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fmtEUR } from '@/lib/format';
import type { Invoice, CreateInvoiceInput, UpdateInvoiceInput } from '@/hooks/useInvoices';

// ─────────────────────────────────────────────────────────────
// Schéma Zod
// ─────────────────────────────────────────────────────────────

const schema = z.object({
  client_name: z.string().min(1, 'Le nom du client est requis'),
  invoice_number: z.string().optional(),
  issue_date: z.string().min(1, "La date d'émission est requise"),
  due_date: z.string().optional(),
  amount_ht: z
    .number({ invalid_type_error: 'Montant invalide' })
    .positive('Le montant doit être supérieur à 0'),
  tva_rate: z.number().min(0).max(100),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface InvoiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Facture existante → mode édition. Absent → mode création. */
  invoice?: Invoice;
  onSubmit: (data: CreateInvoiceInput | UpdateInvoiceInput) => Promise<void>;
  isSubmitting: boolean;
}

// ─────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────

export function InvoiceForm({
  open,
  onOpenChange,
  invoice,
  onSubmit,
  isSubmitting,
}: InvoiceFormProps) {
  const isEditing = !!invoice;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_name: '',
      invoice_number: '',
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: '',
      amount_ht: 0,
      tva_rate: 0,
      notes: '',
    },
  });

  // Pré-remplit en mode édition
  useEffect(() => {
    if (invoice) {
      form.reset({
        client_name: invoice.client_name,
        invoice_number: invoice.invoice_number ?? '',
        issue_date: invoice.issue_date,
        due_date: invoice.due_date ?? '',
        amount_ht: invoice.amount_ht,
        tva_rate: invoice.tva_rate,
        notes: invoice.notes ?? '',
      });
    } else {
      form.reset({
        client_name: '',
        invoice_number: '',
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: '',
        amount_ht: 0,
        tva_rate: 0,
        notes: '',
      });
    }
  }, [invoice, open, form]);

  // Calcul TTC en temps réel
  const amountHt = form.watch('amount_ht') ?? 0;
  const tvaRate = form.watch('tva_rate') ?? 0;
  const amountTtc = Math.round(amountHt * (1 + tvaRate / 100) * 100) / 100;

  const handleSubmit = async (values: FormValues) => {
    const data = {
      client_name: values.client_name,
      invoice_number: values.invoice_number || null,
      issue_date: values.issue_date,
      due_date: values.due_date || null,
      amount_ht: values.amount_ht,
      tva_rate: values.tva_rate,
      notes: values.notes || null,
    };
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        flex flex-col overflow-hidden : transforme le grid en colonne flex pour que
        DialogBody (flex-1 overflow-y-auto) prenne l'espace disponible et scroll.
        sm:max-w-xl : plus large que le défaut max-w-lg pour les grilles 2 colonnes.
      */}
      <DialogContent className="sm:max-w-xl flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier la facture' : 'Nouvelle facture'}
          </DialogTitle>
        </DialogHeader>

        {/* Zone scrollable — tous les champs du formulaire */}
        <DialogBody>
          <Form {...form}>
            {/*
              id="invoice-form" permet au bouton submit placé dans DialogFooter
              (hors du <form>) de déclencher la soumission via l'attribut form="invoice-form".
            */}
            <form
              id="invoice-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="client_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom du client ou entreprise" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="invoice_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>N° facture</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex : 2026-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issue_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'émission *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'échéance</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="amount_ht"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant HT *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0"
                            className="pr-6"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            €
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tva_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taux TVA</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            placeholder="0"
                            className="pr-6"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* TTC calculé en temps réel */}
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 text-sm">
                <span className="text-muted-foreground">Montant TTC</span>
                <span className="font-semibold">{fmtEUR(amountTtc)}</span>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Référence, commentaire…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </DialogBody>

        {/* Footer sticky en bas — hors du <form>, lié par form="invoice-form" */}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button type="submit" form="invoice-form" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Enregistrement…
              </>
            ) : isEditing ? (
              'Enregistrer'
            ) : (
              'Créer la facture'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
