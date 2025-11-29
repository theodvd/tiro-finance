import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { Target, TrendingUp } from "lucide-react";

const PRIORITY_OPTIONS = [
  "Constituer une épargne de sécurité",
  "Commencer à investir en bourse",
  "Économiser pour un projet précis",
  "Apprendre à gérer mon argent",
  "Générer des revenus passifs",
  "Préparer mon indépendance financière",
  "Investir dans l'immobilier",
];

export function ObjectivesSection({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Target className="text-primary" size={24} />
        <h2 className="text-xl font-semibold text-foreground">Tes Objectifs</h2>
      </div>

      <FormField
        control={form.control}
        name="priorities"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Dans les 3 prochaines années, quelles sont tes 3 priorités ?</FormLabel>
            <p className="text-sm text-muted-foreground mb-3">Sélectionne jusqu'à 3 priorités</p>
            <div className="space-y-2">
              {PRIORITY_OPTIONS.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    checked={field.value?.includes(option)}
                    onCheckedChange={(checked) => {
                      const current = field.value || [];
                      if (checked) {
                        if (current.length < 3) {
                          field.onChange([...current, option]);
                        }
                      } else {
                        field.onChange(current.filter((v: string) => v !== option));
                      }
                    }}
                  />
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {option}
                  </label>
                </div>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex items-center gap-3 mt-8 mb-4">
        <TrendingUp className="text-primary" size={20} />
        <h3 className="text-lg font-medium text-foreground">Projet Principal</h3>
      </div>

      <FormField
        control={form.control}
        name="main_project"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Quel projet ?</FormLabel>
            <FormControl>
              <Input placeholder="Ex: Acheter une voiture, Voyage autour du monde..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="project_budget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget estimé (€)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="10000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="project_horizon_months"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Horizon (mois)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="24" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
