import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { fmtEUR, fmtPct } from "@/lib/format";
import { useState } from "react";

// Generic interface for chart - works with both hooks
interface ChartAllocationBreakdown {
  name: string;
  value: number;
  percentage: number;
  holdings: Array<{
    id: string;
    ticker: string;
    name: string;
    sector?: string | null;
    region?: string | null;
  }>;
}

interface AllocationChartProps {
  data: ChartAllocationBreakdown[];
  title: string;
  onSliceClick: (breakdown: ChartAllocationBreakdown) => void;
}

// Finance-friendly neutral palette with warm accent for risky concentrations
const CHART_COLORS = [
  "hsl(var(--chart-1))", // Primary gold
  "hsl(var(--chart-2))", // Blue
  "hsl(var(--chart-3))", // Purple
  "hsl(var(--chart-4))", // Green
  "hsl(var(--chart-5))", // Orange
  "hsl(215 14% 50%)", // Neutral gray-blue
  "hsl(180 50% 45%)", // Teal
  "hsl(340 70% 55%)", // Pink
];

const RISKY_COLOR = "hsl(30 90% 55%)"; // Warm orange for concentrations

export function AllocationChart({ data, title, onSliceClick }: AllocationChartProps) {
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter out zero values and sort by value
  const chartData = data
    .filter((d) => d.value > 0)
    .filter((d) => !["Non classifié", "Unknown", "Inconnu"].includes(d.name)) // ✅ Filtrer les non-classifiés
    .sort((a, b) => b.value - a.value)
    .map((d, index) => ({
      ...d,
      fill: d.percentage > 50 ? RISKY_COLOR : CHART_COLORS[index % CHART_COLORS.length],
    }));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", notation: "compact" }).format(value);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const item = payload[0].payload as ChartAllocationBreakdown & { fill: string };

    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-foreground">{item.name}</p>
        <p className="text-sm text-muted-foreground">{fmtPct(item.percentage / 100)} du portefeuille</p>
        <p className="text-sm font-medium text-foreground">{fmtEUR(item.value)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {item.holdings.length} position{item.holdings.length > 1 ? "s" : ""}
        </p>
        <p className="text-xs text-primary mt-1">Cliquez pour voir le détail</p>
      </div>
    );
  };

  const handleClick = (entry: any) => {
    const breakdown = data.find((d) => d.name === entry.name);
    if (breakdown) {
      onSliceClick(breakdown);
    }
  };

  if (chartData.length === 0) {
    // Calculer le % non classifié
    const unclassifiedData = data.filter((d) => ["Non classifié", "Unknown", "Inconnu"].includes(d.name));
    const unclassifiedPct = unclassifiedData.reduce((sum, d) => sum + d.percentage, 0);

    return (
      <Card className="rounded-xl sm:rounded-2xl border-amber-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            {title}
            <span className="text-xs font-normal text-amber-500">⚠️ Données manquantes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8 space-y-3">
            <div className="text-4xl">📊</div>
            <p className="text-sm font-medium text-foreground">
              {unclassifiedPct > 0
                ? `${unclassifiedPct.toFixed(0)}% de votre portefeuille n'est pas classifié`
                : "Aucune donnée classifiée disponible"}
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              L'enrichissement automatique n'a pas pu classifier ces actifs. Vérifiez que les symboles et noms sont
              corrects, ou ajoutez-les manuellement à la base de données dans{" "}
              <code className="text-xs bg-muted px-1 rounded">assetEnrichment.ts</code>.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-xl sm:rounded-2xl hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-primary/20 transition-all duration-300">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm sm:text-base md:text-lg">{title}</CardTitle>
          <div className="flex gap-1">
            <button
              onClick={() => setChartType("pie")}
              className={`p-1.5 rounded text-xs ${chartType === "pie" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              aria-label="Afficher en camembert"
            >
              🥧
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`p-1.5 rounded text-xs ${chartType === "bar" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              aria-label="Afficher en barres"
            >
              📊
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {chartType === "pie" ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    paddingAngle={2}
                    onClick={(_, index) => handleClick(chartData[index])}
                    onMouseEnter={(_, index) => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                        stroke={hoveredIndex === index ? "hsl(var(--primary))" : "transparent"}
                        strokeWidth={hoveredIndex === index ? 3 : 0}
                        opacity={hoveredIndex !== null && hoveredIndex !== index ? 0.6 : 1}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={75} />
                  <ChartTooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="percentage"
                    radius={[0, 4, 4, 0]}
                    onClick={(data) => handleClick(data)}
                    style={{ cursor: "pointer" }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            {chartData.slice(0, 6).map((item, index) => (
              <button
                key={item.name}
                onClick={() => handleClick(item)}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted transition-colors"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                <span className="text-xs font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</span>
              </button>
            ))}
            {chartData.length > 6 && (
              <span className="text-xs text-muted-foreground">+{chartData.length - 6} autres</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section actifs non classifiés */}
      {data.some((d) => ["Non classifié", "Unknown", "Inconnu"].includes(d.name)) && (
        <Card className="rounded-xl sm:rounded-2xl border-amber-500/20 bg-amber-500/5 mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-amber-600 flex items-center gap-2">
              ⚠️ Actifs non classifiés (
              {data
                .filter((d) => ["Non classifié", "Unknown", "Inconnu"].includes(d.name))
                .reduce((sum, d) => sum + d.percentage, 0)
                .toFixed(1)}
              %)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-1">
              {data
                .filter((d) => ["Non classifié", "Unknown", "Inconnu"].includes(d.name))
                .flatMap((d) => d.holdings)
                .map((h) => (
                  <div
                    key={h.id}
                    className="text-xs flex justify-between items-center p-2 rounded hover:bg-amber-100/50"
                  >
                    <span className="font-medium">{h.ticker}</span>
                    <span className="text-muted-foreground">{h.name}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
