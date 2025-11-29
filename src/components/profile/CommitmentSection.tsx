import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { Heart } from "lucide-react";

export function CommitmentSection({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Heart className="text-primary" size={24} />
        <h2 className="text-xl font-semibold text-foreground">Ton Engagement</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Ces engagements sont facultatifs mais nous aideront à mieux te guider.
      </p>

      <FormField
        control={form.control}
        name="commitment_apply_advice"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="font-normal cursor-pointer">
              Je suis prêt à appliquer les conseils même si c'est dur
            </FormLabel>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="commitment_regular_learning"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="font-normal cursor-pointer">Je suis prêt à apprendre régulièrement</FormLabel>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="commitment_long_term_investing"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="font-normal cursor-pointer">Je suis prêt à investir sur le long terme</FormLabel>
          </FormItem>
        )}
      />
    </div>
  );
}
