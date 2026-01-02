import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { fmtEUR, fmtPct } from "@/lib/format";
import { ASSET_CLASS_LABEL } from "@/constants";
import type { EnrichedHolding } from "./types";

interface HoldingsTableProps {
  holdings: EnrichedHolding[];
  onEdit: (holding: EnrichedHolding) => void;
  onDelete: (id: string) => void;
}

export function HoldingsTable({ holdings, onEdit, onDelete }: HoldingsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Actif</TableHead>
            <TableHead className="hidden md:table-cell">Compte</TableHead>
            <TableHead className="hidden lg:table-cell">Classe</TableHead>
            <TableHead className="text-right">Poids</TableHead>
            <TableHead className="text-right">Valeur</TableHead>
            <TableHead className="text-right hidden sm:table-cell">P/L</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((holding) => {
            const isPositive = holding.pnl >= 0;
            return (
              <TableRow key={holding.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{holding.security.name}</div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {holding.security.symbol}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-sm">{holding.account.name}</span>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent-foreground">
                    {ASSET_CLASS_LABEL[(holding.security.asset_class as any) ?? 'STOCK']}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {holding.weight.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtEUR(holding.marketValue)}
                </TableCell>
                <TableCell className={`text-right tabular-nums hidden sm:table-cell ${isPositive ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                  <div>
                    <div>{fmtEUR(holding.pnl)}</div>
                    <div className="text-xs">{fmtPct(holding.pnlPct)}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(holding)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(holding.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
