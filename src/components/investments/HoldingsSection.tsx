import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HoldingsTable } from "./HoldingsTable";
import { HoldingCard } from "./HoldingCard";
import type { EnrichedHolding } from "./types";

interface HoldingsSectionProps {
  holdings: EnrichedHolding[];
  onEdit: (holding: EnrichedHolding) => void;
  onDelete: (id: string) => void;
}

export function HoldingsSection({ holdings, onEdit, onDelete }: HoldingsSectionProps) {
  if (holdings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">
            Aucune position. Ajoute ton premier investissement pour commencer.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tes positions</h2>
          <p className="text-sm text-muted-foreground">
            {holdings.length} position{holdings.length > 1 ? 's' : ''} en portefeuille
          </p>
        </div>
      </div>

      {/* Desktop Table */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <HoldingsTable holdings={holdings} onEdit={onEdit} onDelete={onDelete} />
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {holdings.map((holding) => (
          <HoldingCard
            key={holding.id}
            holding={holding}
            onEdit={() => onEdit(holding)}
            onDelete={() => onDelete(holding.id)}
          />
        ))}
      </div>
    </div>
  );
}
