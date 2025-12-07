import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

interface DataBarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  title: string;
  color?: string;
  showGrid?: boolean;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(180, 70%, 50%)",
  "hsl(280, 70%, 60%)",
  "hsl(45, 90%, 55%)",
  "hsl(340, 75%, 55%)",
];

const DataBarChart = ({ data, xKey, yKey, title, color, showGrid = true }: DataBarChartProps) => {
  const chartData = data.slice(0, 10).map((item, index) => ({
    name: String(item[xKey] || `Item ${index + 1}`).slice(0, 15),
    value: Number(item[yKey]) || 0,
  }));

  return (
    <Card className="bg-card/50 border-border/50 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />}
            <XAxis 
              dataKey="name" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))"
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={color || COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DataBarChart;
