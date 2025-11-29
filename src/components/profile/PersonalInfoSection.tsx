import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UseFormReturn } from "react-hook-form";
import { User } from "lucide-react";

const SITUATION_OPTIONS = ["Étudiant", "Alternant", "Jeune actif", "Entrepreneur", "Autre"];
const HOUSING_OPTIONS = [
  "Chez les parents",
  "Résidence étudiante",
  "Colocation",
  "Appartement seul",
  "Propriétaire",
];

export function PersonalInfoSection({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="text-primary" size={24} />
        <h2 className="text-xl font-semibold text-foreground">Qui Tu Es</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prénom</FormLabel>
              <FormControl>
                <Input placeholder="Alex" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="age"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Âge</FormLabel>
              <FormControl>
                <Input type="number" placeholder="25" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ville</FormLabel>
              <FormControl>
                <Input placeholder="Paris" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="current_situation"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Situation actuelle</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {SITUATION_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`situation-${option}`} />
                    <label
                      htmlFor={`situation-${option}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
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
        name="housing_situation"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Logement</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                {HOUSING_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`housing-${option}`} />
                    <label
                      htmlFor={`housing-${option}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
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
