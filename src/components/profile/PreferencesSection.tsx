import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UseFormReturn } from "react-hook-form";
import { Settings } from "lucide-react";

const MANAGEMENT_STYLES = ["Full autonomie", "Accompagné", "Automatique", "Mix"];
const TIME_OPTIONS = ["10 min / semaine", "1h / semaine", "Plusieurs heures", "Très peu"];
const ESG_OPTIONS = ["Très important", "Important", "Peu important", "Non important"];
const TONE_OPTIONS = ["Direct", "Décontracté", "Pédagogue", "Pro"];
const CONSTRAINT_OPTIONS = ["Permis", "Voyage", "Déménagement", "Matériel", "Aucun"];

export function PreferencesSection({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-primary" size={24} />
        <h2 className="text-xl font-semibold text-foreground">Préférences & Contraintes</h2>
      </div>

      <FormField
        control={form.control}
        name="management_style"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Style de gestion</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {MANAGEMENT_STYLES.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`management-${option}`} />
                    <label htmlFor={`management-${option}`} className="text-sm font-medium">
                      {option}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="available_time"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Temps disponible</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {TIME_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`time-${option}`} />
                    <label htmlFor={`time-${option}`} className="text-sm font-medium">
                      {option}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="learning_topics"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ce que tu veux apprendre (séparé par des virgules)</FormLabel>
            <FormControl>
              <Input
                placeholder="Budget, ETF, Volatilité, Crypto, Fiscalité..."
                value={field.value?.join(", ") || ""}
                onChange={(e) => field.onChange(e.target.value.split(",").map((t) => t.trim()))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="upcoming_constraints"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contraintes 12 prochains mois</FormLabel>
            <div className="space-y-2">
              {CONSTRAINT_OPTIONS.map((option) => (
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
                  <label className="text-sm font-medium">{option}</label>
                </div>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="esg_importance"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Importance de l'ESG</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {ESG_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`esg-${option}`} />
                    <label htmlFor={`esg-${option}`} className="text-sm font-medium">
                      {option}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="sectors_to_avoid"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Secteurs à éviter (séparé par des virgules)</FormLabel>
            <FormControl>
              <Input
                placeholder="Pétrole, Tabac, Armement..."
                value={field.value?.join(", ") || ""}
                onChange={(e) => field.onChange(e.target.value.split(",").map((t) => t.trim()))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="sectors_of_interest"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Secteurs d'intérêt (séparé par des virgules)</FormLabel>
            <FormControl>
              <Input
                placeholder="Tech, Climat, Santé, Émergents..."
                value={field.value?.join(", ") || ""}
                onChange={(e) => field.onChange(e.target.value.split(",").map((t) => t.trim()))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="communication_tone"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Ton de communication préféré</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {TONE_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`tone-${option}`} />
                    <label htmlFor={`tone-${option}`} className="text-sm font-medium">
                      {option}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
