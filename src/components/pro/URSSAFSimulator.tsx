/**
 * URSSAFSimulator — simulateur interactif de cotisations URSSAF et provisions IR.
 *
 * Calculs en temps réel via fiscalEngine.ts (non modifié) :
 *   CA saisi → computeNetInvestable → URSSAF + CFP + IR + net après charges
 *
 * CFP (Contribution à la Formation Professionnelle) :
 *   Inclus dans les taux globaux de fiscalEngine (24,6 % BNC / 12,8 % BIC).
 *   Affiché séparément pour la transparence via CFP_RATES locaux :
 *     micro_bnc : 0,2 % du CA
 *     micro_bic : 0,1 % du CA
 *
 * Layout : deux colonnes desktop (inputs gauche, résultats droite).
 * La prop onSave est passée par la page parente — absente en B2.1.
 */

import { useState, useEffect, useMemo } from 'react';
import { Lock, Info, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fmtEUR } from '@/lib/format';
import { useFiscalProfile, type FiscalRegime } from '@/hooks/useFiscalProfile';
import { computeNetInvestable, FISCAL_RATES } from '@/lib/fiscalEngine';

// ─────────────────────────────────────────────────────────────
// Constantes locales
// ─────────────────────────────────────────────────────────────

/** CFP inclus dans les taux URSSAF globaux — extrait pour affichage séparé. */
const CFP_RATES: Partial<Record<FiscalRegime, number>> = {
  micro_bnc: 0.002, // 0,2 %
  micro_bic: 0.001, // 0,1 %
};

const REGIMES: {
  value: FiscalRegime;
  label: string;
  description: string;
  disabled?: boolean;
}[] = [
  { value: 'micro_bnc', label: 'Micro-BNC', description: 'Services / Libéral — 24,6 %' },
  { value: 'micro_bic', label: 'Micro-BIC', description: 'Commerce / Vente — 12,8 %' },
  { value: 'ei_reel',   label: 'EI réel',   description: 'Charges réelles déductibles' },
  { value: 'sasu',      label: 'SASU',      description: 'Bientôt supporté', disabled: true },
  { value: 'eurl',      label: 'EURL',      description: 'Bientôt supporté', disabled: true },
];

const MONTHS = [
  { value: 1,  label: 'Janvier'   }, { value: 2,  label: 'Février'    },
  { value: 3,  label: 'Mars'      }, { value: 4,  label: 'Avril'      },
  { value: 5,  label: 'Mai'       }, { value: 6,  label: 'Juin'       },
  { value: 7,  label: 'Juillet'   }, { value: 8,  label: 'Août'       },
  { value: 9,  label: 'Septembre' }, { value: 10, label: 'Octobre'    },
  { value: 11, label: 'Novembre'  }, { value: 12, label: 'Décembre'   },
];

const isMicro = (r: FiscalRegime) => r === 'micro_bnc' || r === 'micro_bic';

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

export interface SimulationResult {
  ca: number;
  regime: FiscalRegime;
  versement_liberatoire: boolean;
  month: number;
  year: number;
  urssaf: number;         // total cotisations (URSSAF + CFP)
  cfp: number;            // CFP extrait du total
  ir: number;             // provision IR
  totalCharges: number;   // urssaf + ir
  netAfterCharges: number;
}

interface URSSAFSimulatorProps {
  /** Appelé quand l'utilisateur clique "Enregistrer". Absent = bouton désactivé (B2.1). */
  onSave?: (result: SimulationResult) => Promise<void>;
  isSaving?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────

export function URSSAFSimulator({ onSave, isSaving }: URSSAFSimulatorProps) {
  const { profile, isLoading: profileLoading } = useFiscalProfile();

  const now = new Date();
  const [ca, setCa] = useState<string>('');
  const [regime, setRegime] = useState<FiscalRegime>('micro_bnc');
  const [versementLiberatoire, setVersementLiberatoire] = useState(true);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  // Pré-remplissage depuis le profil fiscal
  useEffect(() => {
    if (profile) {
      setRegime(profile.regime);
      setVersementLiberatoire(profile.versement_liberatoire);
    }
  }, [profile]);

  // Valeur numérique du CA (0 si vide ou invalide)
  const caNum = useMemo(() => {
    const v = parseFloat(ca);
    return isNaN(v) || v < 0 ? 0 : v;
  }, [ca]);

  // ── Calcul temps réel via fiscalEngine ─────────────────────
  const breakdown = useMemo(() => {
    if (caNum <= 0) return null;
    return computeNetInvestable({
      monthlyRevenue: caNum,
      regime,
      versement_liberatoire: versementLiberatoire,
    });
  }, [caNum, regime, versementLiberatoire]);

  // CFP extrait du total URSSAF pour affichage séparé
  const cfp = useMemo(() => {
    if (!breakdown || caNum <= 0) return 0;
    const rate = CFP_RATES[regime] ?? 0;
    return Math.round(caNum * rate * 100) / 100;
  }, [breakdown, caNum, regime]);

  // Résultat à passer à onSave
  const simulationResult = useMemo((): SimulationResult | null => {
    if (!breakdown || caNum <= 0) return null;
    return {
      ca: caNum,
      regime,
      versement_liberatoire: versementLiberatoire,
      month,
      year,
      urssaf: breakdown.urssaf,
      cfp,
      ir: breakdown.ir,
      totalCharges: breakdown.totalDeductions,
      netAfterCharges: breakdown.netAfterDeductions,
    };
  }, [breakdown, caNum, regime, versementLiberatoire, month, year, cfp]);

  const handleSave = async () => {
    if (!onSave || !simulationResult) return;
    await onSave(simulationResult);
  };

  const yearOptions = [year - 1, year, year + 1].filter((y) => y >= 2024);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

      {/* ── Colonne gauche : Inputs ───────────────────────── */}
      <div className="space-y-4">

        {/* CA du mois */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Chiffre d'affaires HT du mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Input
                type="number"
                min={0}
                step={100}
                placeholder="Ex : 5 000"
                className="pr-8 text-lg font-medium"
                value={ca}
                onChange={(e) => setCa(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                €
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Période */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Période</CardTitle>
            <CardDescription>
              Mois et année de la déclaration URSSAF.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Mois</Label>
                <Select
                  value={String(month)}
                  onValueChange={(v) => setMonth(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Année</Label>
                <Select
                  value={String(year)}
                  onValueChange={(v) => setYear(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Régime fiscal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Régime fiscal</CardTitle>
            {profile && (
              <CardDescription className="flex items-center gap-1">
                <Info className="h-3 w-3 shrink-0" />
                Pré-rempli depuis votre profil fiscal
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {REGIMES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  disabled={r.disabled}
                  onClick={() => !r.disabled && setRegime(r.value)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                    r.disabled
                      ? 'opacity-50 cursor-not-allowed bg-muted/30'
                      : regime === r.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center',
                      regime === r.value && !r.disabled
                        ? 'border-primary'
                        : 'border-muted-foreground/50'
                    )}
                  >
                    {regime === r.value && !r.disabled && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium flex items-center gap-2">
                      {r.label}
                      {r.disabled && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </span>
                    <span className="text-xs text-muted-foreground">{r.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Versement libératoire — micro uniquement */}
        {isMicro(regime) && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    Versement libératoire de l'IR
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {versementLiberatoire
                      ? `Taux forfaitaire ${regime === 'micro_bnc' ? '2,2' : '1'} % sur CA`
                      : 'Barème progressif (estimation)'}
                  </p>
                </div>
                <Switch
                  checked={versementLiberatoire}
                  onCheckedChange={setVersementLiberatoire}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Colonne droite : Résultats ────────────────────── */}
      <div className="space-y-4">
        <Card className={cn(!breakdown && 'opacity-60')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Résultats — {MONTHS.find((m) => m.value === month)?.label} {year}
            </CardTitle>
            {!breakdown && (
              <CardDescription>
                Saisissez un CA pour afficher les calculs.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {breakdown && breakdown.isEstimate && breakdown.warning && !isMicro(regime) ? (
              /* EI réel / SASU / EURL — impossible de simuler */
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <p>{breakdown.warning}</p>
              </div>
            ) : breakdown ? (
              <div className="space-y-3">
                {/* CA de base */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CA HT déclaré</span>
                  <span className="font-medium">{fmtEUR(caNum)}</span>
                </div>

                <div className="border-t pt-3 space-y-2">
                  {/* URSSAF hors CFP */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Cotisations sociales
                      {isMicro(regime) && (
                        <span className="ml-1 text-xs">
                          ({Math.round((breakdown.rates.urssaf - (CFP_RATES[regime] ?? 0)) * 1000) / 10} %)
                        </span>
                      )}
                    </span>
                    <span className="text-destructive/80">
                      − {fmtEUR(breakdown.urssaf - cfp)}
                    </span>
                  </div>

                  {/* CFP */}
                  {cfp > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        CFP — formation prof.
                        <span className="ml-1 text-xs">
                          ({(CFP_RATES[regime] ?? 0) * 100} %)
                        </span>
                      </span>
                      <span className="text-destructive/80">− {fmtEUR(cfp)}</span>
                    </div>
                  )}

                  {/* IR */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Provision IR
                      {breakdown.irMethod === 'versement_liberatoire' ? (
                        <span className="ml-1 text-xs">
                          (VL {Math.round(breakdown.rates.ir * 1000) / 10} %)
                        </span>
                      ) : (
                        <span className="ml-1 text-xs text-amber-600">(estimé)</span>
                      )}
                    </span>
                    <span className="text-destructive/80">− {fmtEUR(breakdown.ir)}</span>
                  </div>
                </div>

                {/* Totaux */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total charges</span>
                    <span className="text-destructive/80">
                      − {fmtEUR(breakdown.totalDeductions)}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold">
                    <span>Net après charges</span>
                    <span className="text-green-700">{fmtEUR(breakdown.netAfterDeductions)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Taux de charges effectif :{' '}
                    {Math.round((breakdown.totalDeductions / caNum) * 1000) / 10} %
                  </p>
                </div>

                {/* Warning barème progressif */}
                {breakdown.irMethod === 'bareme_progressif_estimate' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <p>
                      Provision IR estimée sur 1 part fiscale (barème progressif). Activez le
                      versement libératoire pour un calcul précis.
                    </p>
                  </div>
                )}

                {/* Bouton Enregistrer */}
                <div className="pt-2">
                  <Button
                    className="w-full"
                    disabled={!onSave || isSaving}
                    onClick={handleSave}
                  >
                    {isSaving ? 'Enregistrement…' : 'Enregistrer cette déclaration'}
                  </Button>
                  {!onSave && (
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      La sauvegarde sera disponible prochainement.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Placeholder résultats */
              <div className="space-y-3">
                {[
                  'Cotisations sociales',
                  'CFP — formation prof.',
                  'Provision IR',
                  'Total charges',
                  'Net après charges',
                ].map((label) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-muted-foreground/40 font-mono">—</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info CFP */}
        {isMicro(regime) && (
          <p className="text-xs text-muted-foreground flex items-start gap-1.5 px-1">
            <Info className="h-3 w-3 shrink-0 mt-0.5" />
            La CFP est incluse dans le taux URSSAF global ({regime === 'micro_bnc' ? '24,6' : '12,8'} %)
            et prélevée avec vos cotisations — elle est affichée séparément pour la transparence.
          </p>
        )}
      </div>
    </div>
  );
}
