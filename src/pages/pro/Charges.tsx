/**
 * Page /pro/charges — simulateur URSSAF + historique des déclarations.
 * Phase B : simulateur interactif, sauvegarde, historique, marquage payée.
 */

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { URSSAFSimulator } from '@/components/pro/URSSAFSimulator';
import { useURSSAFDeclarations, type URSSAFDeclaration, type DeclarationStatus } from '@/hooks/useURSSAFDeclarations';
import { fmtEUR } from '@/lib/format';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  DeclarationStatus,
  { label: string; variant: 'secondary' | 'default' | 'outline' | 'destructive' }
> = {
  pending: { label: 'À payer',   variant: 'secondary' },
  paid:    { label: 'Payée',     variant: 'outline' },
  late:    { label: 'En retard', variant: 'destructive' },
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(iso));
}

function fmtPeriod(start: string, end: string): string {
  const d = new Date(start);
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(d);
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function Charges() {
  const { declarations, isLoading, save, isSaving, markPaid, isMarkingPaid } =
    useURSSAFDeclarations();
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const handleMarkPaid = async (decl: URSSAFDeclaration) => {
    setMarkingPaidId(decl.id);
    try {
      await markPaid(decl);
    } finally {
      setMarkingPaidId(null);
    }
  };

  // Total déclaré cette année
  const totalDeclared = declarations.reduce((s, d) => s + d.amount_due, 0);
  const totalPaid = declarations
    .filter((d) => d.status === 'paid')
    .reduce((s, d) => s + d.amount_due, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Charges & URSSAF</h1>
        <p className="text-muted-foreground mt-1">
          Simulez vos cotisations sociales et provisions fiscales, puis enregistrez
          votre déclaration mensuelle.
        </p>
      </div>

      {/* Simulateur — onSave branché sur le hook */}
      <URSSAFSimulator onSave={save} isSaving={isSaving} />

      {/* ── Historique des déclarations ─────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Historique des déclarations</h2>
          {declarations.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Payé : <span className="font-medium text-foreground">{fmtEUR(totalPaid)}</span>
              {' / '}
              Déclaré : <span className="font-medium text-foreground">{fmtEUR(totalDeclared)}</span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : declarations.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <p className="text-sm font-medium">Aucune déclaration enregistrée</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Saisissez votre CA du mois dans le simulateur ci-dessus et cliquez
                "Enregistrer cette déclaration".
              </p>
            </div>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead className="text-right">CA déclaré</TableHead>
                  <TableHead className="text-right">Cotisations</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Payée le</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {declarations.map((decl) => {
                  const config = STATUS_CONFIG[decl.status] ?? STATUS_CONFIG.pending;
                  const isThisMarking = isMarkingPaid && markingPaidId === decl.id;

                  return (
                    <TableRow key={decl.id}>
                      <TableCell className="font-medium capitalize">
                        {fmtPeriod(decl.period_start, decl.period_end)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtEUR(decl.declared_revenue)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {fmtEUR(decl.amount_due)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={config.variant}
                          className={
                            decl.status === 'paid'
                              ? 'border-green-500 text-green-700 bg-green-50'
                              : undefined
                          }
                        >
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmtDate(decl.paid_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {decl.status !== 'paid' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkPaid(decl)}
                            disabled={isThisMarking}
                            className="border-green-500 text-green-700 hover:bg-green-50"
                          >
                            {isThisMarking ? (
                              <Loader2 className="animate-spin w-3 h-3" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                Payée
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
