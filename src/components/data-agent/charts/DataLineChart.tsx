import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DataLineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  title: string;
  showGrid?: boolean;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(180, 80%, 45%)",
  "hsl(280, 80%, 55%)",
  "hsl(45, 95%, 50%)",
];

const DataLineChart = ({ data, xKey, yKeys, title, showGrid = true }: DataLineChartProps) => {
  const chartData = data.slice(0, 20).map((item, index) => ({
    name: String(item[xKey] || `Point ${index + 1}`).slice(0, 12),
    ...yKeys.reduce((acc, key) => ({ ...acc, [key]: Number(item[key]) || 0 }), {}),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl px-4 py-3 shadow-2xl">
          <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <p className="text-sm font-bold text-foreground">
                {entry.name}: {entry.value.toLocaleString()}
              </p>
            </div>
          ))}
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
          <LineChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
            <defs>
              {COLORS.map((color, index) => (
                <linearGradient key={index} id={`lineGrad${index}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
                  <stop offset="100%" stopColor={color} stopOpacity={1}/>
                </linearGradient>
              ))}
              <filter id="lineGlow">
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
                vertical={false}
              />
            )}
            <XAxis 
              dataKey="name" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
              axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              tickLine={false}
              dy={8}
            />
            <YAxis 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: 12, paddingTop: 10 }} 
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-muted-foreground font-medium">{value}</span>}
            />
            {yKeys.map((key, index) => (
              <Line 
                key={key}
                type="monotone" 
                dataKey={key} 
                stroke={`url(#lineGrad${index % COLORS.length})`}
                strokeWidth={3}
                dot={false}
                activeDot={{ 
                  r: 6, 
                  stroke: COLORS[index % COLORS.length], 
                  strokeWidth: 2, 
                  fill: "hsl(var(--background))",
                  filter: "url(#lineGlow)"
                }}
                filter="url(#lineGlow)"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DataLineChart;
