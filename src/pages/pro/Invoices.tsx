/**
 * Page /pro/invoices — liste et gestion des factures professionnelles.
 *
 * Fonctionnalités Phase B :
 *   - Tableau : numéro, client, montant HT/TTC, TVA, statut, échéance
 *   - Badge statut coloré : draft (gris), sent (bleu), paid (vert), late (rouge)
 *   - Bouton "Marquer payée" sur les factures sent/late
 *   - Bouton "Modifier" sur les factures non payées
 *   - Bouton "Nouvelle facture" → ouvre InvoiceForm
 *   - État vide avec CTA
 */

import { useState } from 'react';
import { Plus, Loader2, CheckCircle2, FileText, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useInvoices, type Invoice, type InvoiceStatus } from '@/hooks/useInvoices';
import { InvoiceForm } from '@/components/pro/InvoiceForm';
import { fmtEUR } from '@/lib/format';

// ─────────────────────────────────────────────────────────────
// Helpers — badge statut
// ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; variant: 'secondary' | 'default' | 'outline' | 'destructive' }
> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  sent:  { label: 'Envoyée',   variant: 'default' },
  paid:  { label: 'Payée',     variant: 'outline' },
  late:  { label: 'En retard', variant: 'destructive' },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <Badge
      variant={config.variant}
      className={
        status === 'paid'
          ? 'border-green-500 text-green-700 bg-green-50'
          : undefined
      }
    >
      {config.label}
    </Badge>
  );
}

/** Formate une date ISO en format court français (ex. "14 avr. 2026"). */
function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function Invoices() {
  const {
    invoices,
    isLoading,
    createInvoice,
    isCreating,
    updateInvoice,
    isUpdating,
    markAsPaid,
    isMarkingPaid,
  } = useInvoices();

  const [formOpen, setFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>(undefined);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const handleNewInvoice = () => {
    setEditingInvoice(undefined);
    setFormOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormOpen(true);
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    setMarkingPaidId(invoice.id);
    try {
      await markAsPaid(invoice);
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleFormSubmit = async (data: Parameters<typeof createInvoice>[0]) => {
    if (editingInvoice) {
      await updateInvoice(editingInvoice.id, data);
    } else {
      await createInvoice(data);
    }
  };

  // Totaux rapides
  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount_ht, 0);

  // "En attente" : factures émises non encore encaissées (sent + late, hors brouillons)
  const totalPending = invoices
    .filter((inv) => inv.status === 'sent' || inv.status === 'late')
    .reduce((sum, inv) => sum + inv.amount_ht, 0);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Factures</h1>
          <p className="text-muted-foreground mt-1">
            Suivez vos factures émises et leurs encaissements.
          </p>
        </div>
        <Button onClick={handleNewInvoice} disabled={isLoading}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle facture
        </Button>
      </div>

      {/* Résumé */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Encaissé cette année</p>
              <p className="text-xl font-bold text-green-700 mt-0.5">{fmtEUR(totalPaid)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className="text-xl font-bold mt-0.5">{fmtEUR(totalPending)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contenu principal */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-muted-foreground" size={28} />
        </div>
      ) : invoices.length === 0 ? (
        /* État vide */
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="p-4 bg-muted rounded-full">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Aucune facture pour cette année</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Créez votre première facture pour suivre vos encaissements et
              activer le calcul de votre net investissable réel.
            </p>
          </div>
          <Button onClick={handleNewInvoice} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Créer ma première facture
          </Button>
        </div>
      ) : (
        /* Tableau */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Montant HT</TableHead>
                <TableHead className="text-right">TVA</TableHead>
                <TableHead className="text-right">TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const isThisMarkingPaid =
                  isMarkingPaid && markingPaidId === invoice.id;
                const canSend = invoice.status === 'draft';
                const canMarkPaid =
                  invoice.status === 'sent' || invoice.status === 'late';
                const canEdit = invoice.status !== 'paid';

                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {invoice.invoice_number ?? '—'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {invoice.client_name}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtEUR(invoice.amount_ht)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {invoice.tva_rate > 0 ? `${invoice.tva_rate} %` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmtEUR(invoice.amount_ttc)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(invoice.due_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(invoice)}
                            disabled={isUpdating}
                          >
                            Modifier
                          </Button>
                        )}
                        {canSend && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateInvoice(invoice.id, { status: 'sent' })}
                            disabled={isUpdating}
                          >
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                            Envoyer
                          </Button>
                        )}
                        {canMarkPaid && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkPaid(invoice)}
                            disabled={isThisMarkingPaid}
                            className="border-green-500 text-green-700 hover:bg-green-50"
                          >
                            {isThisMarkingPaid ? (
                              <Loader2 className="animate-spin w-3 h-3" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                Payée
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialog formulaire */}
      <InvoiceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        invoice={editingInvoice}
        onSubmit={handleFormSubmit}
        isSubmitting={isCreating || isUpdating}
      />
    </div>
  );
}
