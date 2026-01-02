import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, TrendingUp } from "lucide-react";
import { DcaTable } from "./DcaTable";
import { DcaCard } from "./DcaCard";
import type { DcaPlan } from "./types";

interface DcaSectionProps {
  plans: DcaPlan[];
  onAdd: () => void;
  onEdit: (plan: DcaPlan) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  formatNextExecution: (plan: DcaPlan) => string;
}

export function DcaSection({ plans, onAdd, onEdit, onDelete, onToggle, formatNextExecution }: DcaSectionProps) {
  const activePlans = plans.filter(p => p.active);
  const inactivePlans = plans.filter(p => !p.active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Investissements programmés (DCA)</h2>
            <p className="text-sm text-muted-foreground">
              {activePlans.length} plan{activePlans.length > 1 ? 's' : ''} actif{activePlans.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un DCA
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">
                Aucun investissement programmé. Le DCA est une stratégie puissante pour investir régulièrement.
              </p>
              <Button onClick={onAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Créer mon premier DCA
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <DcaTable
                plans={plans}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggle={onToggle}
                formatNextExecution={formatNextExecution}
              />
            </CardContent>
          </Card>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {plans.map((plan) => (
              <DcaCard
                key={plan.id}
                plan={plan}
                onEdit={() => onEdit(plan)}
                onDelete={() => onDelete(plan.id)}
                onToggle={(active) => onToggle(plan.id, active)}
                formatNextExecution={formatNextExecution}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
