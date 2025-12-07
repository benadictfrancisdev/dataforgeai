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

  return (
    <Card className="bg-card/50 border-border/50 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={250}>
          <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />}
            <XAxis 
              type="number"
              dataKey="x" 
              name={xKey}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <YAxis 
              type="number"
              dataKey="y" 
              name={yKey}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <ZAxis type="number" dataKey="z" range={[50, 200]} />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))"
              }}
            />
            <Scatter 
              data={chartData} 
              fill="hsl(var(--primary))"
              fillOpacity={0.7}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DataScatterChart;
