import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { UseFormReturn } from "react-hook-form";
import { LineChart, TrendingUp } from "lucide-react";

const KNOWLEDGE_AREAS = [
  { key: "livrets", label: "Livrets" },
  { key: "etf", label: "ETF" },
  { key: "actions", label: "Actions" },
  { key: "crypto", label: "Crypto" },
  { key: "immobilier", label: "Immobilier" },
  { key: "assurance_vie", label: "Assurance-vie" },
];

const EXPERIENCE_OPTIONS = ["Jamais", "< 6 mois", "6-12 mois", "> 1 an"];
const RISK_VISION_OPTIONS = ["Je vends", "J'attends", "C'est normal", "Je remets de l'argent"];
const MAX_LOSS_OPTIONS = ["0%", "-5%", "-10%", "-20%", "-30% ou plus"];
const HORIZON_OPTIONS = ["< 1 an", "1-2 ans", "3-5 ans", "> 5 ans"];

export function InvestorProfileSection({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <LineChart className="text-primary" size={24} />
        <h2 className="text-xl font-semibold text-foreground">Profil Investisseur</h2>
      </div>

      <div className="space-y-6">
        <FormLabel>Connaissance (1 à 5)</FormLabel>
        {KNOWLEDGE_AREAS.map(({ key, label }) => (
          <FormField
            key={key}
            control={form.control}
            name={`knowledge_levels.${key}`}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel className="font-normal">{label}</FormLabel>
                  <span className="text-sm text-muted-foreground">{field.value || 1}/5</span>
                </div>
                <FormControl>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[field.value || 1]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                    className="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>

      <FormField
        control={form.control}
        name="investment_experience"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Expérience d'investissement</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {EXPERIENCE_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`exp-${option}`} />
                    <label htmlFor={`exp-${option}`} className="text-sm font-medium">
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
        name="risk_vision"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Si tu investis 1 000€ et que ça tombe à 800€ (-20%) :</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {RISK_VISION_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`risk-${option}`} />
                    <label htmlFor={`risk-${option}`} className="text-sm font-medium">
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
        name="max_acceptable_loss"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Perte maximale acceptable</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {MAX_LOSS_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`loss-${option}`} />
                    <label htmlFor={`loss-${option}`} className="text-sm font-medium">
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
        name="investment_horizon"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Horizon d'investissement</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {HORIZON_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`horizon-${option}`} />
                    <label htmlFor={`horizon-${option}`} className="text-sm font-medium">
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
