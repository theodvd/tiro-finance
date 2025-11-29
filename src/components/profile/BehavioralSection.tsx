import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UseFormReturn } from "react-hook-form";
import { Brain } from "lucide-react";

const GAIN_REACTIONS = ["Je sécurise tout de suite", "Je prends une partie", "Je laisse tourner", "Je renforce"];
const VOLATILITY_REACTIONS = ["Stress extrême", "Inconfort", "Je m'en fiche", "Je renforce"];
const FOMO_OPTIONS = ["Je veux acheter", "J'hésite", "Je m'en fiche", "Je méfie"];
const STABILITY_OPTIONS = ["Impulsif", "Réactif", "Calme", "Très stable"];
const LOSS_IMPACT_OPTIONS = ["Ton quotidien", "Ton projet principal", "Ton loyer", "Rien du tout"];
const INCOME_STABILITY_OPTIONS = ["Stables", "Irréguliers", "Variables", "Inexistants"];
const RESILIENCE_OPTIONS = ["< 1 mois", "1-3 mois", "3-6 mois", "6-12 mois", "> 12 mois"];

export function BehavioralSection({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="text-primary" size={24} />
        <h2 className="text-xl font-semibold text-foreground">Module Comportemental</h2>
      </div>

      <FormField
        control={form.control}
        name="reaction_to_gains"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Si ton investissement prend +20% en 3 mois :</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {GAIN_REACTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`gain-${option}`} />
                    <label htmlFor={`gain-${option}`} className="text-sm font-medium">
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
        name="reaction_to_volatility"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Si ton investissement fait -5% en 1 jour :</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {VOLATILITY_REACTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`volatility-${option}`} />
                    <label htmlFor={`volatility-${option}`} className="text-sm font-medium">
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
        name="fomo_tendency"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Quand tout le monde parle d'un actif qui monte vite :</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {FOMO_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`fomo-${option}`} />
                    <label htmlFor={`fomo-${option}`} className="text-sm font-medium">
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
        name="panic_selling_history"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>As-tu déjà vendu en panique ?</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={(v) => field.onChange(v === "oui")} value={field.value ? "oui" : "non"}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oui" id="panic-oui" />
                  <label htmlFor="panic-oui" className="text-sm font-medium">
                    Oui
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non" id="panic-non" />
                  <label htmlFor="panic-non" className="text-sm font-medium">
                    Non
                  </label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="regretted_purchases_history"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>As-tu déjà acheté un truc "parce que ça montait" puis regretté ?</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={(v) => field.onChange(v === "oui")} value={field.value ? "oui" : "non"}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="oui" id="regret-oui" />
                  <label htmlFor="regret-oui" className="text-sm font-medium">
                    Oui
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non" id="regret-non" />
                  <label htmlFor="regret-non" className="text-sm font-medium">
                    Non
                  </label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="emotional_stability"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Dans la vie, tu te décrirais comme :</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {STABILITY_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`stability-${option}`} />
                    <label htmlFor={`stability-${option}`} className="text-sm font-medium">
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
        name="loss_impact"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Une perte de 20% mettrait en danger :</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {LOSS_IMPACT_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`impact-${option}`} />
                    <label htmlFor={`impact-${option}`} className="text-sm font-medium">
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
        name="income_stability"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Tes revenus sont :</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {INCOME_STABILITY_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`income-${option}`} />
                    <label htmlFor={`income-${option}`} className="text-sm font-medium">
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
        name="financial_resilience_months"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Combien de mois peux-tu vivre sans revenu ?</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {RESILIENCE_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`resilience-${option}`} />
                    <label htmlFor={`resilience-${option}`} className="text-sm font-medium">
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
        name="risk_percentage_on_main_goal"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Pour ton objectif principal, quel % du budget peux-tu risquer ?</FormLabel>
            <FormControl>
              <Input type="number" min="0" max="100" placeholder="20" {...field} />
            </FormControl>
            <p className="text-xs text-muted-foreground">Entre 0% et 100%</p>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
