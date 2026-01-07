import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DataPieChartProps {
  data: Record<string, unknown>[];
  valueKey: string;
  nameKey: string;
  title: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(180, 80%, 45%)",
  "hsl(280, 80%, 55%)",
  "hsl(45, 95%, 50%)",
  "hsl(340, 85%, 50%)",
  "hsl(160, 70%, 45%)",
  "hsl(200, 85%, 55%)",
  "hsl(30, 90%, 55%)",
];

const DataPieChart = ({ data, valueKey, nameKey, title }: DataPieChartProps) => {
  // Aggregate data by category
  const aggregated = data.reduce<Record<string, number>>((acc, item) => {
    const key = String(item[nameKey] || "Other");
    acc[key] = (acc[key] || 0) + (Number(item[valueKey]) || 1);
    return acc;
  }, {});

  const chartData = Object.entries(aggregated)
    .slice(0, 8)
    .map(([name, value]) => ({
      name: name.slice(0, 15),
      value,
    }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = ((payload[0].value / total) * 100).toFixed(1);
      return (
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl px-4 py-3 shadow-2xl">
          <p className="text-xs font-medium text-muted-foreground mb-1">{payload[0].name}</p>
          <p className="text-lg font-bold text-foreground">
            {payload[0].value.toLocaleString()}
          </p>
          <p className="text-xs text-primary font-semibold">{percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-xs font-bold drop-shadow-lg"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
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
          <PieChart>
            <defs>
              {COLORS.map((color, index) => (
                <linearGradient key={index} id={`pieGradient${index}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                </linearGradient>
              ))}
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.3"/>
              </filter>
            </defs>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
              filter="url(#shadow)"
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#pieGradient${index % COLORS.length})`}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                  className="transition-all duration-300 hover:opacity-80"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
              formatter={(value) => <span className="text-muted-foreground font-medium">{value}</span>}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DataPieChart;
