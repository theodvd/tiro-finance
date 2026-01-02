import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { fmtEUR, fmtPct } from "@/lib/format";
import { ASSET_CLASS_LABEL } from "@/constants";
import type { EnrichedHolding } from "./types";

interface HoldingCardProps {
  holding: EnrichedHolding;
  onEdit: () => void;
  onDelete: () => void;
}

export function HoldingCard({ holding, onEdit, onDelete }: HoldingCardProps) {
  const isPositive = holding.pnl >= 0;

  return (
    <Card className="transition-all duration-200 hover:border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground truncate">
                {holding.security.name}
              </span>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {holding.security.symbol}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{holding.account.name}</span>
              <span>•</span>
              <span>{ASSET_CLASS_LABEL[(holding.security.asset_class as any) ?? 'STOCK']}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Poids</p>
            <p className="text-lg font-bold text-foreground">
              {holding.weight.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Valeur</p>
            <p className="text-base font-semibold tabular-nums">
              {fmtEUR(holding.marketValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">P/L</p>
            <p className={`text-base font-semibold tabular-nums ${isPositive ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
              {fmtPct(holding.pnlPct)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
