import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, LineChart, PieChart, TrendingUp, Grid3X3, Database, Hash, Type } from "lucide-react";
import DataBarChart from "./charts/DataBarChart";
import DataLineChart from "./charts/DataLineChart";
import DataPieChart from "./charts/DataPieChart";
import DataAreaChart from "./charts/DataAreaChart";
import DataScatterChart from "./charts/DataScatterChart";
import KPICard from "./charts/KPICard";
import type { DatasetState } from "@/pages/DataAgent";

interface VisualizationDashboardProps {
  dataset: DatasetState;
}

const VisualizationDashboard = ({ dataset }: VisualizationDashboardProps) => {
  const data = dataset.cleanedData || dataset.rawData;
  const columns = dataset.columns;

  const [selectedXAxis, setSelectedXAxis] = useState(columns[0] || "");
  const [selectedYAxis, setSelectedYAxis] = useState(columns[1] || "");

  // Detect column types
  const columnTypes = useMemo(() => {
    const types: Record<string, "numeric" | "categorical" | "date"> = {};
    columns.forEach(col => {
      const sampleValues = data.slice(0, 10).map(row => row[col]);
      const numericCount = sampleValues.filter(v => !isNaN(Number(v))).length;
      const isDateLike = sampleValues.some(v => {
        const str = String(v);
        return /^\d{4}-\d{2}-\d{2}/.test(str) || /^\d{2}\/\d{2}\/\d{4}/.test(str);
      });
      
      if (isDateLike) types[col] = "date";
      else if (numericCount > 7) types[col] = "numeric";
      else types[col] = "categorical";
    });
    return types;
  }, [columns, data]);

  const numericColumns = columns.filter(c => columnTypes[c] === "numeric");
  const categoricalColumns = columns.filter(c => columnTypes[c] === "categorical");

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (numericColumns.length === 0) return [];
    
    return numericColumns.slice(0, 4).map(col => {
      const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = values.length > 0 ? sum / values.length : 0;
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      return {
        column: col,
        sum,
        avg,
        max,
        min,
        count: values.length,
      };
    });
  }, [data, numericColumns]);

  // Auto-generate visualizations based on data types
  const autoCharts = useMemo(() => {
    const charts: Array<{
      type: "bar" | "line" | "pie" | "area" | "scatter";
      title: string;
      xKey: string;
      yKey: string;
    }> = [];

    // Bar chart: categorical x numeric
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      charts.push({
        type: "bar",
        title: `${numericColumns[0]} by ${categoricalColumns[0]}`,
        xKey: categoricalColumns[0],
        yKey: numericColumns[0],
      });
    }

    // Pie chart: categorical distribution
    if (categoricalColumns.length > 0) {
      charts.push({
        type: "pie",
        title: `${categoricalColumns[0]} Distribution`,
        xKey: categoricalColumns[0],
        yKey: categoricalColumns[0],
      });
    }

    // Line/Area chart: if we have sequential data
    if (numericColumns.length > 0) {
      charts.push({
        type: "area",
        title: `${numericColumns[0]} Trend`,
        xKey: columns[0],
        yKey: numericColumns[0],
      });
    }

    // Scatter plot: two numeric columns
    if (numericColumns.length >= 2) {
      charts.push({
        type: "scatter",
        title: `${numericColumns[0]} vs ${numericColumns[1]}`,
        xKey: numericColumns[0],
        yKey: numericColumns[1],
      });
    }

    return charts;
  }, [columns, numericColumns, categoricalColumns]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Total Rows"
            value={data.length.toLocaleString()}
            icon={Database}
            color="primary"
          />
          <KPICard
            title="Columns"
            value={columns.length}
            icon={Grid3X3}
            color="success"
          />
          <KPICard
            title="Numeric Fields"
            value={numericColumns.length}
            icon={Hash}
            color="warning"
          />
          <KPICard
            title="Category Fields"
            value={categoricalColumns.length}
            icon={Type}
            color="danger"
          />
        </div>
      )}

      {/* Numeric Column Stats */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi, index) => (
            <KPICard
              key={kpi.column}
              title={`Avg ${kpi.column.slice(0, 10)}${kpi.column.length > 10 ? '...' : ''}`}
              value={kpi.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              icon={TrendingUp}
              color={["primary", "success", "warning", "danger"][index % 4] as "primary" | "success" | "warning" | "danger"}
            />
          ))}
        </div>
      )}

      {/* Chart Tabs */}
      <Tabs defaultValue="auto" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-card/50">
          <TabsTrigger value="auto" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Auto Visualizations
          </TabsTrigger>
          <TabsTrigger value="custom" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Custom Charts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="auto" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {autoCharts.map((chart, index) => {
              switch (chart.type) {
                case "bar":
                  return (
                    <DataBarChart
                      key={index}
                      data={data}
                      xKey={chart.xKey}
                      yKey={chart.yKey}
                      title={chart.title}
                    />
                  );
                case "pie":
                  return (
                    <DataPieChart
                      key={index}
                      data={data}
                      nameKey={chart.xKey}
                      valueKey={chart.yKey}
                      title={chart.title}
                    />
                  );
                case "area":
                  return (
                    <DataAreaChart
                      key={index}
                      data={data}
                      xKey={chart.xKey}
                      yKey={chart.yKey}
                      title={chart.title}
                    />
                  );
                case "scatter":
                  return (
                    <DataScatterChart
                      key={index}
                      data={data}
                      xKey={chart.xKey}
                      yKey={chart.yKey}
                      title={chart.title}
                    />
                  );
                default:
                  return null;
              }
            })}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="mt-4 space-y-4">
          {/* Axis Selection */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Configure Chart</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">X-Axis:</span>
                <Select value={selectedXAxis} onValueChange={setSelectedXAxis}>
                  <SelectTrigger className="w-40 bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Y-Axis:</span>
                <Select value={selectedYAxis} onValueChange={setSelectedYAxis}>
                  <SelectTrigger className="w-40 bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(col => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Custom Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DataBarChart
              data={data}
              xKey={selectedXAxis}
              yKey={selectedYAxis}
              title={`Bar: ${selectedYAxis} by ${selectedXAxis}`}
            />
            <DataLineChart
              data={data}
              xKey={selectedXAxis}
              yKeys={[selectedYAxis]}
              title={`Line: ${selectedYAxis} over ${selectedXAxis}`}
            />
            <DataAreaChart
              data={data}
              xKey={selectedXAxis}
              yKey={selectedYAxis}
              title={`Area: ${selectedYAxis} Trend`}
            />
            {columnTypes[selectedXAxis] === "numeric" && columnTypes[selectedYAxis] === "numeric" && (
              <DataScatterChart
                data={data}
                xKey={selectedXAxis}
                yKey={selectedYAxis}
                title={`Scatter: ${selectedXAxis} vs ${selectedYAxis}`}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VisualizationDashboard;
