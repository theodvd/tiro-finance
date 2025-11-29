import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { Wallet, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const INVESTMENT_OPTIONS = ["PEA", "Assurance-vie", "Compte titres", "Crypto", "SCPI / crowdfunding"];
const DEBT_OPTIONS = ["Aucune", "Crédit étudiant", "Crédit conso", "Découvert récurrent", "Dettes perso"];

export function FinancialSituationSection({ form }: { form: UseFormReturn<any> }) {
  const [incomeEntries, setIncomeEntries] = useState<Array<{ source: string; amount: string }>>([
    { source: "", amount: "" },
  ]);
  const [expenseEntries, setExpenseEntries] = useState<Array<{ category: string; amount: string }>>([
    { category: "", amount: "" },
  ]);

  const addIncomeEntry = () => setIncomeEntries([...incomeEntries, { source: "", amount: "" }]);
  const removeIncomeEntry = (index: number) => setIncomeEntries(incomeEntries.filter((_, i) => i !== index));

  const addExpenseEntry = () => setExpenseEntries([...expenseEntries, { category: "", amount: "" }]);
  const removeExpenseEntry = (index: number) => setExpenseEntries(expenseEntries.filter((_, i) => i !== index));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Wallet className="text-primary" size={24} />
        <h2 className="text-xl font-semibold text-foreground">Ton Argent Aujourd'hui</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <FormLabel>Revenus mensuels</FormLabel>
          <Button type="button" variant="outline" size="sm" onClick={addIncomeEntry}>
            <Plus size={16} />
            Ajouter
          </Button>
        </div>
        {incomeEntries.map((entry, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="Source (ex: Salaire)"
              value={entry.source}
              onChange={(e) => {
                const updated = [...incomeEntries];
                updated[index].source = e.target.value;
                setIncomeEntries(updated);
              }}
            />
            <Input
              type="number"
              placeholder="Montant"
              value={entry.amount}
              onChange={(e) => {
                const updated = [...incomeEntries];
                updated[index].amount = e.target.value;
                setIncomeEntries(updated);
              }}
            />
            {incomeEntries.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => removeIncomeEntry(index)}>
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <FormLabel>Dépenses mensuelles</FormLabel>
          <Button type="button" variant="outline" size="sm" onClick={addExpenseEntry}>
            <Plus size={16} />
            Ajouter
          </Button>
        </div>
        {expenseEntries.map((entry, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="Catégorie (ex: Loyer)"
              value={entry.category}
              onChange={(e) => {
                const updated = [...expenseEntries];
                updated[index].category = e.target.value;
                setExpenseEntries(updated);
              }}
            />
            <Input
              type="number"
              placeholder="Montant"
              value={entry.amount}
              onChange={(e) => {
                const updated = [...expenseEntries];
                updated[index].amount = e.target.value;
                setExpenseEntries(updated);
              }}
            />
            {expenseEntries.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => removeExpenseEntry(index)}>
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="remaining_monthly"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Argent restant chaque mois (€)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="500" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="saveable_monthly"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Montant épargnable (€)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="300" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="existing_investments"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Placements déjà détenus</FormLabel>
            <div className="space-y-2">
              {INVESTMENT_OPTIONS.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    checked={field.value?.includes(option)}
                    onCheckedChange={(checked) => {
                      const current = field.value || [];
                      if (checked) {
                        field.onChange([...current, option]);
                      } else {
                        field.onChange(current.filter((v: string) => v !== option));
                      }
                    }}
                  />
                  <label className="text-sm font-medium leading-none">{option}</label>
                </div>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="debts"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Dettes</FormLabel>
            <div className="space-y-2">
              {DEBT_OPTIONS.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    checked={field.value?.includes(option)}
                    onCheckedChange={(checked) => {
                      const current = field.value || [];
                      if (checked) {
                        field.onChange([...current, option]);
                      } else {
                        field.onChange(current.filter((v: string) => v !== option));
                      }
                    }}
                  />
                  <label className="text-sm font-medium leading-none">{option}</label>
                </div>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
