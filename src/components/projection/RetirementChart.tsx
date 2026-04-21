/**
 * RetirementChart — visualisation cône de projection retraite.
 *
 * Recharts ComposedChart :
 *   1. Cône (band filled) : deux Area stackées
 *      - coneLow  = prudent   (fill transparent → pose la baseline)
 *      - coneWidth = dynamic − prudent (fill bleu/12% → remplit le cône)
 *   2. Trois lignes de scénarios : prudent / équilibré / dynamique
 *   3. Ligne trajectoire cible (verte pointillée) — visible si gap > 0
 *   4. ReferenceLine horizontale rouge = capital cible (règle des 4 %)
 *   5. Tooltip custom — valeurs des 4 séries + âge
 *   6. Légende custom (pas de légende Recharts auto)
 */

import {
  ComposedChart,
  Area,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { RetirementResult } from '@/lib/retirementEngine';

// ─────────────────────────────────────────────────────────────
// Couleurs
// ─────────────────────────────────────────────────────────────

const COLORS = {
  prudent:  '#93c5fd',  // blue-300
  balanced: '#2563eb',  // blue-600
  dynamic:  '#1d4ed8',  // blue-700
  cone:     'rgba(59,130,246,0.12)',
  target:   '#16a34a',  // green-600
  goal:     '#dc2626',  // red-600
} as const;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmtK(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M€`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k€`;
  return `${Math.round(v)}€`;
}

// ─────────────────────────────────────────────────────────────
// Types internes
// ─────────────────────────────────────────────────────────────

interface ChartPoint {
  age: number;
  prudent: number;
  balanced: number;
  dynamic: number;
  /** Baseline du cône (= prudent). Fill transparent. */
  coneLow: number;
  /** Hauteur du cône (= dynamic − prudent). Fill bleu/12 %. */
  coneWidth: number;
  targetScenario?: number;
}

// ─────────────────────────────────────────────────────────────
// Tooltip custom
// ─────────────────────────────────────────────────────────────

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: number;
  targetCapital: number;
  showTarget: boolean;
}

function CustomTooltip({ active, payload, label, targetCapital, showTarget }: TooltipProps) {
  if (!active || !payload?.length || label == null) return null;

  const get = (key: string) =>
    payload.find((p) => p.dataKey === key)?.value ?? null;

  const prudent  = get('prudent');
  const balanced = get('balanced');
  const dynamic  = get('dynamic');
  const target   = get('targetScenario');

  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-xs min-w-[180px]">
      <p className="font-semibold text-sm mb-2 pb-1.5 border-b border-border">
        {label} ans
      </p>
      <div className="space-y-1">
        {prudent  != null && <Row color={COLORS.prudent}  label="Prudent (3 %)"   value={prudent} />}
        {balanced != null && <Row color={COLORS.balanced} label="Équilibré (5 %)"  value={balanced} bold />}
        {dynamic  != null && <Row color={COLORS.dynamic}  label="Dynamique (7 %)" value={dynamic} />}
        {showTarget && target != null && (
          <Row color={COLORS.target} label="Trajectoire cible" value={target} />
        )}
        <div className="pt-1.5 mt-1 border-t border-border">
          <Row color={COLORS.goal} label="Objectif" value={targetCapital} />
        </div>
      </div>
    </div>
  );
}

function Row({
  color,
  label,
  value,
  bold,
}: {
  color: string;
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span
          className="inline-block h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
      <span className={`tabular-nums ${bold ? 'font-semibold text-foreground' : ''}`}>
        {fmtK(value)}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Légende custom
// ─────────────────────────────────────────────────────────────

function ChartLegend({ showTarget }: { showTarget: boolean }) {
  const items = [
    { color: COLORS.prudent,  label: 'Prudent (3 %/an)',   dash: true  },
    { color: COLORS.balanced, label: 'Équilibré (5 %/an)', dash: false },
    { color: COLORS.dynamic,  label: 'Dynamique (7 %/an)', dash: true  },
    ...(showTarget
      ? [{ color: COLORS.target, label: 'Trajectoire cible', dash: true }]
      : []),
    { color: COLORS.goal, label: 'Capital objectif', dash: true, dotted: true },
  ];

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 justify-center">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <svg width="20" height="10">
            <line
              x1="0" y1="5" x2="20" y2="5"
              stroke={item.color}
              strokeWidth="2"
              strokeDasharray={item.dotted ? '5 3' : item.dash ? '4 3' : undefined}
            />
          </svg>
          {item.label}
        </div>
      ))}
      {/* Cône */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className="inline-block w-5 h-3 rounded-sm"
          style={{ backgroundColor: COLORS.cone, border: '1px solid #93c5fd' }}
        />
        Zone d'incertitude
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────

interface RetirementChartProps {
  result: RetirementResult;
}

export function RetirementChart({ result }: RetirementChartProps) {
  const showTarget = result.gapAtRetirement > 0;

  // Construction des données graphique
  const data: ChartPoint[] = result.years.map((age, i) => {
    const p = result.scenarios.prudent[i];
    const d = result.scenarios.dynamic[i];
    return {
      age,
      prudent: p,
      balanced: result.scenarios.balanced[i],
      dynamic: d,
      coneLow: p,
      coneWidth: Math.max(d - p, 0),
      targetScenario: showTarget ? result.targetScenario[i] : undefined,
    };
  });

  // Ticks X : tous les 5 ans + dernier
  const yearsCount = result.years.length;
  const xTicks = result.years.filter((age, i) => {
    if (i === 0 || i === yearsCount - 1) return true;
    return age % 5 === 0;
  });

  // Domaine Y : du bas à max(dynamic_final, targetCapital) × 1.05
  const dynamicFinal = result.scenarios.dynamic[yearsCount - 1];
  const yMax = Math.max(dynamicFinal, result.targetCapital) * 1.08;

  return (
    <div>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.5}
          />
          <XAxis
            dataKey="age"
            ticks={xTicks}
            tickFormatter={(v) => `${v}`}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={fmtK}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={56}
            domain={[0, yMax]}
          />

          {/* ── Cône (stacked areas) ──────────────────────── */}
          <Area
            type="monotone"
            dataKey="coneLow"
            stackId="cone"
            fill="transparent"
            stroke="none"
            legendType="none"
            isAnimationActive={false}
            activeDot={false}
          />
          <Area
            type="monotone"
            dataKey="coneWidth"
            stackId="cone"
            fill={COLORS.cone}
            stroke="none"
            legendType="none"
            isAnimationActive={false}
            activeDot={false}
          />

          {/* ── Lignes scénarios ─────────────────────────── */}
          <Line
            type="monotone"
            dataKey="prudent"
            stroke={COLORS.prudent}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="balanced"
            stroke={COLORS.balanced}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="dynamic"
            stroke={COLORS.dynamic}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
            legendType="none"
          />

          {/* ── Trajectoire cible (verte) ─────────────────── */}
          {showTarget && (
            <Line
              type="monotone"
              dataKey="targetScenario"
              stroke={COLORS.target}
              strokeWidth={1.5}
              strokeDasharray="8 4"
              dot={false}
              isAnimationActive={false}
              legendType="none"
            />
          )}

          {/* ── Objectif (ligne rouge horizontale) ──────── */}
          <ReferenceLine
            y={result.targetCapital}
            stroke={COLORS.goal}
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: `Objectif : ${fmtK(result.targetCapital)}`,
              fill: COLORS.goal,
              fontSize: 11,
              position: 'insideTopRight',
              dy: -6,
            }}
          />

          {/* ── Tooltip ──────────────────────────────────── */}
          <Tooltip
            content={(props) => (
              <CustomTooltip
                {...props}
                targetCapital={result.targetCapital}
                showTarget={showTarget}
              />
            )}
            cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <ChartLegend showTarget={showTarget} />
    </div>
  );
}
