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
  "hsl(180, 70%, 50%)",
  "hsl(280, 70%, 60%)",
  "hsl(45, 90%, 55%)",
  "hsl(340, 75%, 55%)",
  "hsl(120, 60%, 50%)",
  "hsl(200, 80%, 55%)",
  "hsl(30, 85%, 55%)",
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

  return (
    <Card className="bg-card/50 border-border/50 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))"
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value) => <span className="text-muted-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DataPieChart;
