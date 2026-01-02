import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from "recharts";

interface DataScatterChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  title: string;
  showGrid?: boolean;
}

const DataScatterChart = ({ data, xKey, yKey, title, showGrid = true }: DataScatterChartProps) => {
  const chartData = data.slice(0, 50).map((item) => ({
    x: Number(item[xKey]) || 0,
    y: Number(item[yKey]) || 0,
    z: 100,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl px-4 py-3 shadow-2xl">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{xKey}</p>
            <p className="text-lg font-bold text-foreground">{payload[0].payload.x.toLocaleString()}</p>
          </div>
          <div className="space-y-1 mt-2">
            <p className="text-xs font-medium text-muted-foreground">{yKey}</p>
            <p className="text-lg font-bold text-foreground">{payload[0].payload.y.toLocaleString()}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-to-br from-card via-card to-muted/20 border-border/50 h-full overflow-hidden group hover:shadow-xl transition-shadow duration-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <radialGradient id="scatterGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              </radialGradient>
              <filter id="scatterGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.2}
              />
            )}
            <XAxis 
              type="number"
              dataKey="x" 
              name={xKey}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
              axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              tickLine={false}
              dy={8}
            />
            <YAxis 
              type="number"
              dataKey="y" 
              name={yKey}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dx={-5}
            />
            <ZAxis type="number" dataKey="z" range={[60, 150]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '5 5', stroke: 'hsl(var(--primary))' }} />
            <Scatter 
              data={chartData} 
              fill="url(#scatterGradient)"
              filter="url(#scatterGlow)"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DataScatterChart;
