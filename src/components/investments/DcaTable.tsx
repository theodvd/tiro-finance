import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2, Calendar } from "lucide-react";
import { fmtEUR } from "@/lib/format";
import type { DcaPlan } from "./types";

interface DcaTableProps {
  plans: DcaPlan[];
  onEdit: (plan: DcaPlan) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  formatNextExecution: (plan: DcaPlan) => string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  interval: 'Intervalle',
};

export function DcaTable({ plans, onEdit, onDelete, onToggle, formatNextExecution }: DcaTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Actif</TableHead>
            <TableHead className="hidden md:table-cell">Compte</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead className="hidden sm:table-cell">Fréquence</TableHead>
            <TableHead>Prochaine exécution</TableHead>
            <TableHead className="text-center">Actif</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => (
            <TableRow key={plan.id} className={!plan.active ? 'opacity-60' : ''}>
              <TableCell>
                <div>
                  <div className="font-medium">{plan.security?.symbol}</div>
                  <div className="text-sm text-muted-foreground">{plan.security?.name}</div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div>
                  <div className="text-sm">{plan.account?.name}</div>
                  {plan.source_account && (
                    <div className="text-xs text-muted-foreground">
                      Source: {plan.source_account.name}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {fmtEUR(plan.amount)}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <span className="capitalize">{FREQUENCY_LABELS[plan.frequency] || plan.frequency}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{formatNextExecution(plan)}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={plan.active}
                  onCheckedChange={(checked) => onToggle(plan.id, checked)}
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(plan)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(plan.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
