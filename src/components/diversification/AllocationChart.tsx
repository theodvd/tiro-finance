import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AllocationBreakdown } from '@/hooks/useDiversification';
import { fmtEUR, fmtPct } from '@/lib/format';
import { useState } from 'react';

interface AllocationChartProps {
  data: AllocationBreakdown[];
  title: string;
  onSliceClick: (breakdown: AllocationBreakdown) => void;
}

// Finance-friendly neutral palette with warm accent for risky concentrations
const CHART_COLORS = [
  'hsl(var(--chart-1))',   // Primary gold
  'hsl(var(--chart-2))',   // Blue
  'hsl(var(--chart-3))',   // Purple
  'hsl(var(--chart-4))',   // Green
  'hsl(var(--chart-5))',   // Orange
  'hsl(215 14% 50%)',      // Neutral gray-blue
  'hsl(180 50% 45%)',      // Teal
  'hsl(340 70% 55%)',      // Pink
];

const RISKY_COLOR = 'hsl(30 90% 55%)'; // Warm orange for concentrations

export function AllocationChart({ data, title, onSliceClick }: AllocationChartProps) {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter out zero values and sort by value
const chartData = data
  .filter(d => d.value > 0)
  .filter(d => !['Non classifié', 'Unknown', 'Inconnu'].includes(d.name)) // ✅ Filtrer les non-classifiés
  .sort((a, b) => b.value - a.value)
    .map((d, index) => ({
      ...d,
      fill: d.percentage > 50 ? RISKY_COLOR : CHART_COLORS[index % CHART_COLORS.length],
    }));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(value);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const item = payload[0].payload as AllocationBreakdown & { fill: string };
    
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-foreground">{item.name}</p>
        <p className="text-sm text-muted-foreground">
          {fmtPct(item.percentage / 100)} du portefeuille
        </p>
        <p className="text-sm font-medium text-foreground">{fmtEUR(item.value)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {item.holdings.length} position{item.holdings.length > 1 ? 's' : ''}
        </p>
        <p className="text-xs text-primary mt-1">Cliquez pour voir le détail</p>
      </div>
    );
  };

  const handleClick = (entry: any) => {
    const breakdown = data.find(d => d.name === entry.name);
    if (breakdown) {
      onSliceClick(breakdown);
    }
  };

if (chartData.length === 0) {
  // Calculer le % non classifié
  const unclassifiedData = data.filter(d => 
    ['Non classifié', 'Unknown', 'Inconnu'].includes(d.name)
  );
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
              : 'Aucune donnée classifiée disponible'
            }
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            L'enrichissement automatique n'a pas pu classifier ces actifs. 
            Vérifiez que les symboles et noms sont corrects, ou ajoutez-les manuellement 
            à la base de données dans <code className="text-xs bg-muted px-1 rounded">assetEnrichment.ts</code>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

  return (
    <Card className="rounded-xl sm:rounded-2xl hover:shadow-[0_0_30px_rgba(234,179,8,0.15)] hover:border-primary/20 transition-all duration-300">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm sm:text-base md:text-lg">{title}</CardTitle>
        <div className="flex gap-1">
          <button
            onClick={() => setChartType('pie')}
            className={`p-1.5 rounded text-xs ${chartType === 'pie' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            aria-label="Afficher en camembert"
          >
            🥧
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded text-xs ${chartType === 'bar' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            aria-label="Afficher en barres"
          >
            📊
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Chart */}
          <div className="flex-1 h-[250px] sm:h-[300px]" role="img" aria-label={`Graphique ${title}`}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'pie' ? (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={handleClick}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(_, index) => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                        fillOpacity={hoveredIndex === index ? 1 : 0.85}
                        style={{ transform: hoveredIndex === index ? 'scale(1.02)' : 'scale(1)', transformOrigin: 'center' }}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<CustomTooltip />} />
                </PieChart>
              ) : (
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tickFormatter={formatCurrency} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}...` : value}
                  />
                  <ChartTooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    onClick={handleClick}
                    style={{ cursor: 'pointer' }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="lg:w-48 space-y-2 max-h-[250px] overflow-y-auto">
            {chartData.map((item, index) => (
              <button
                key={item.name}
                onClick={() => onSliceClick(item)}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
              >
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.fill }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.percentage.toFixed(1)}% • {formatCurrency(item.value)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
     {data.some(d => ['Non classifié', 'Unknown', 'Inconnu'].includes(d.name)) && (
      <Card className="rounded-xl sm:rounded-2xl border-amber-500/20 bg-amber-500/5 mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs sm:text-sm text-amber-600 flex items-center gap-2">
            ⚠️ Actifs non classifiés ({
              data
                .filter(d => ['Non classifié', 'Unknown', 'Inconnu'].includes(d.name))
                .reduce((sum, d) => sum + d.percentage, 0)
                .toFixed(1)
            }%)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="space-y-1">
            {data
              .filter(d => ['Non classifié', 'Unknown', 'Inconnu'].includes(d.name))
              .flatMap(d => d.holdings)
              .map(h => (
                <div key={h.id} className="text-xs flex justify-between items-center p-2 rounded hover:bg-amber-100/50">
                  <span className="font-medium">{h.ticker}</span>
                  <span className="text-muted-foreground">{h.name}</span>
                </div>
              ))
            }
          </div>
        </CardContent>
      </Card>
    )}
  );
}
