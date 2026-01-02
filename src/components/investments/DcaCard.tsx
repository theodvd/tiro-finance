import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Calendar } from "lucide-react";
import { fmtEUR } from "@/lib/format";
import type { DcaPlan } from "./types";

interface DcaCardProps {
  plan: DcaPlan;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
  formatNextExecution: (plan: DcaPlan) => string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Hebdo',
  monthly: 'Mensuel',
  interval: 'Intervalle',
};

export function DcaCard({ plan, onEdit, onDelete, onToggle, formatNextExecution }: DcaCardProps) {
  return (
    <Card className={`transition-all duration-200 ${!plan.active ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground truncate">
                {plan.security?.symbol}
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {FREQUENCY_LABELS[plan.frequency] || plan.frequency}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {plan.account?.name}
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={plan.active}
              onCheckedChange={onToggle}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Montant</p>
            <p className="text-lg font-bold text-foreground tabular-nums">
              {fmtEUR(plan.amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Prochaine exécution</p>
            <div className="flex items-center gap-1.5 text-sm">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{formatNextExecution(plan)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
