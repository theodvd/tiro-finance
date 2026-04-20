/**
 * FiscalProfileForm — formulaire de configuration du profil fiscal.
 *
 * Champs : régime, type d'activité, régime TVA, versement libératoire,
 * CA cible annuel.
 *
 * SASU et EURL sont présents dans le schéma mais désactivés en Phase A/B.
 * La logique métier pour ces régimes est prévue pour la Phase C.
 */

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, Info, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useFiscalProfile,
  type FiscalRegime,
  type ActivityType,
  type TvaRegime,
  type FiscalProfileInput,
} from '@/hooks/useFiscalProfile';

// ─────────────────────────────────────────────────────────────
// Config des régimes
// ─────────────────────────────────────────────────────────────

const REGIMES: {
  value: FiscalRegime;
  label: string;
  description: string;
  disabled?: boolean;
}[] = [
  {
    value: 'micro_bnc',
    label: 'Micro-entreprise — Services / Libéral',
    description: 'Abattement 34 % · Cotisations 24,6 %',
  },
  {
    value: 'micro_bic',
    label: 'Micro-entreprise — Commerce / Vente',
    description: 'Abattement 50 % · Cotisations 12,8 %',
  },
  {
    value: 'ei_reel',
    label: 'EI au régime réel',
    description: 'Charges réelles déductibles',
  },
  {
    value: 'sasu',
    label: 'SASU',
    description: 'Bientôt supporté',
    disabled: true,
  },
  {
    value: 'eurl',
    label: 'EURL',
    description: 'Bientôt supporté',
    disabled: true,
  },
];

// ─────────────────────────────────────────────────────────────
// Formulaire
// ─────────────────────────────────────────────────────────────

interface FormValues {
  regime: FiscalRegime;
  activity_type: ActivityType | '';
  tva_regime: TvaRegime;
  versement_liberatoire: boolean;
  annual_revenue_target: string; // string pour l'input, converti au save
}

const isMicro = (r: FiscalRegime) => r === 'micro_bnc' || r === 'micro_bic';

export function FiscalProfileForm() {
  const { profile, isLoading, isSaving, save } = useFiscalProfile();

  const { control, handleSubmit, watch, reset, register } = useForm<FormValues>({
    defaultValues: {
      regime: 'micro_bnc',
      activity_type: '',
      tva_regime: 'franchise_base',
      versement_liberatoire: true,
      annual_revenue_target: '',
    },
  });

  const regime = watch('regime');

  // Pré-remplit le formulaire si un profil existe
  useEffect(() => {
    if (profile) {
      reset({
        regime: profile.regime,
        activity_type: profile.activity_type ?? '',
        tva_regime: profile.tva_regime ?? 'franchise_base',
        versement_liberatoire: profile.versement_liberatoire,
        annual_revenue_target: profile.annual_revenue_target?.toString() ?? '',
      });
    }
  }, [profile, reset]);

  const onSubmit = async (values: FormValues) => {
    const input: FiscalProfileInput = {
      regime: values.regime,
      activity_type: values.activity_type || null,
      tva_regime: values.tva_regime,
      versement_liberatoire: values.versement_liberatoire,
      annual_revenue_target: values.annual_revenue_target
        ? parseFloat(values.annual_revenue_target)
        : null,
    };
    await save(input);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">

      {/* Régime fiscal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Régime fiscal</CardTitle>
          <CardDescription>
            Sélectionne ton statut juridique et fiscal. Il détermine tes taux
            de cotisations sociales et ton abattement fiscal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Controller
            control={control}
            name="regime"
            rules={{ required: true }}
            render={({ field }) => (
              <div className="grid gap-2">
                {REGIMES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    disabled={r.disabled}
                    onClick={() => !r.disabled && field.onChange(r.value)}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                      r.disabled
                        ? 'opacity-50 cursor-not-allowed bg-muted/30'
                        : field.value === r.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center',
                        field.value === r.value && !r.disabled
                          ? 'border-primary'
                          : 'border-muted-foreground/50'
                      )}
                    >
                      {field.value === r.value && !r.disabled && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium flex items-center gap-2">
                        {r.label}
                        {r.disabled && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {r.description}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Type d'activité */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Type d'activité</CardTitle>
          <CardDescription>
            Précise la nature de ton activité — utile pour les projections
            URSSAF en Phase B.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Controller
            control={control}
            name="activity_type"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionne un type d'activité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Prestation de services</SelectItem>
                  <SelectItem value="commerce">Commerce / Vente</SelectItem>
                  <SelectItem value="liberal">Profession libérale</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </CardContent>
      </Card>

      {/* Versement libératoire — micro uniquement */}
      {isMicro(regime) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Versement libératoire de l'IR</CardTitle>
            <CardDescription>
              Si activé, ton IR est payé en même temps que tes cotisations
              URSSAF à un taux forfaitaire sur ton CA (2,2 % pour BNC, 1 % pour BIC).
              Sinon, ton IR est calculé au barème progressif.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              control={control}
              name="versement_liberatoire"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">
                      Versement libératoire activé
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {field.value
                        ? 'Taux forfaitaire sur CA (plus simple)'
                        : 'Barème progressif (estimation avec avertissement)'}
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* Régime TVA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Régime TVA</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            control={control}
            name="tva_regime"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="franchise_base">
                    Franchise en base (pas de TVA collectée)
                  </SelectItem>
                  <SelectItem value="reel_simplifie">
                    Réel simplifié
                  </SelectItem>
                  <SelectItem value="reel_normal">
                    Réel normal
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </CardContent>
      </Card>

      {/* CA cible annuel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Objectif de chiffre d'affaires annuel</CardTitle>
          <CardDescription>
            Optionnel. Utilisé pour les projections de charges et le calcul
            du net investissable mensuel prévisionnel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Input
              type="number"
              min={0}
              step={1000}
              placeholder="Ex : 60000"
              className="pr-8"
              {...register('annual_revenue_target')}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              €
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Info className="h-3 w-3 shrink-0" />
            Montant hors taxes (HT).
          </p>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
        {isSaving ? (
          <>
            <Loader2 className="animate-spin mr-2 h-4 w-4" />
            Enregistrement…
          </>
        ) : (
          'Enregistrer mon profil fiscal'
        )}
      </Button>
    </form>
  );
}
