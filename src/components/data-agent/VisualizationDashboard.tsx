import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart3, LineChart, PieChart, TrendingUp, Grid3X3, Database, Hash, Type, Maximize2, X, ScatterChart as ScatterIcon, AreaChart as AreaIcon } from "lucide-react";
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

type ChartType = "bar" | "line" | "pie" | "area" | "scatter";

const VisualizationDashboard = ({ dataset }: VisualizationDashboardProps) => {
  const data = dataset.cleanedData || dataset.rawData;
  const columns = dataset.columns;

  const [selectedXAxis, setSelectedXAxis] = useState(columns[0] || "");
  const [selectedYAxis, setSelectedYAxis] = useState(columns[1] || "");
  const [selectedChartType, setSelectedChartType] = useState<ChartType>("bar");
  const [fullscreenChart, setFullscreenChart] = useState<{ type: ChartType; xKey: string; yKey: string; title: string } | null>(null);

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
      type: ChartType;
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

  const renderChart = (type: ChartType, xKey: string, yKey: string, title: string, isFullscreen = false) => {
    const height = isFullscreen ? 500 : 250;
    
    const ChartWrapper = ({ children }: { children: React.ReactNode }) => (
      <div className="relative group">
        {!isFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setFullscreenChart({ type, xKey, yKey, title })}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}
        {children}
      </div>
    );

    switch (type) {
      case "bar":
        return (
          <ChartWrapper>
            <DataBarChart data={data} xKey={xKey} yKey={yKey} title={title} />
          </ChartWrapper>
        );
      case "line":
        return (
          <ChartWrapper>
            <DataLineChart data={data} xKey={xKey} yKeys={[yKey]} title={title} />
          </ChartWrapper>
        );
      case "pie":
        return (
          <ChartWrapper>
            <DataPieChart data={data} nameKey={xKey} valueKey={yKey} title={title} />
          </ChartWrapper>
        );
      case "area":
        return (
          <ChartWrapper>
            <DataAreaChart data={data} xKey={xKey} yKey={yKey} title={title} />
          </ChartWrapper>
        );
      case "scatter":
        return (
          <ChartWrapper>
            <DataScatterChart data={data} xKey={xKey} yKey={yKey} title={title} />
          </ChartWrapper>
        );
      default:
        return null;
    }
  };

  const chartTypeOptions: { value: ChartType; label: string; icon: React.ReactNode }[] = [
    { value: "bar", label: "Bar Chart", icon: <BarChart3 className="h-4 w-4" /> },
    { value: "line", label: "Line Chart", icon: <LineChart className="h-4 w-4" /> },
    { value: "area", label: "Area Chart", icon: <AreaIcon className="h-4 w-4" /> },
    { value: "pie", label: "Pie Chart", icon: <PieChart className="h-4 w-4" /> },
    { value: "scatter", label: "Scatter Plot", icon: <ScatterIcon className="h-4 w-4" /> },
  ];

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
            {autoCharts.map((chart, index) => (
              <div key={index}>
                {renderChart(chart.type, chart.xKey, chart.yKey, chart.title)}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="mt-4 space-y-4">
          {/* Chart Configuration */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Configure Your Chart
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Chart Type Selection */}
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Chart Type:</span>
                <div className="flex flex-wrap gap-2">
                  {chartTypeOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={selectedChartType === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedChartType(option.value)}
                      className="flex items-center gap-2"
                    >
                      {option.icon}
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Axis Selection */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">X-Axis / Category:</span>
                  <Select value={selectedXAxis} onValueChange={setSelectedXAxis}>
                    <SelectTrigger className="flex-1 bg-background border-border">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              columnTypes[col] === "numeric" ? "bg-blue-500/20 text-blue-400" :
                              columnTypes[col] === "date" ? "bg-purple-500/20 text-purple-400" :
                              "bg-green-500/20 text-green-400"
                            }`}>
                              {columnTypes[col]?.charAt(0).toUpperCase()}
                            </span>
                            {col}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Y-Axis / Value:</span>
                  <Select value={selectedYAxis} onValueChange={setSelectedYAxis}>
                    <SelectTrigger className="flex-1 bg-background border-border">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              columnTypes[col] === "numeric" ? "bg-blue-500/20 text-blue-400" :
                              columnTypes[col] === "date" ? "bg-purple-500/20 text-purple-400" :
                              "bg-green-500/20 text-green-400"
                            }`}>
                              {columnTypes[col]?.charAt(0).toUpperCase()}
                            </span>
                            {col}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recommendation hint */}
              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                💡 <strong>Tip:</strong> For best results, use categorical columns (C) for X-axis grouping and numeric columns (N) for Y-axis values.
                {selectedChartType === "scatter" && " Scatter plots work best with two numeric columns."}
                {selectedChartType === "pie" && " Pie charts work best with a categorical column to show distribution."}
              </div>
            </CardContent>
          </Card>

          {/* Custom Chart Display */}
          {selectedXAxis && selectedYAxis && (
            <div className="grid grid-cols-1 gap-4">
              {renderChart(
                selectedChartType,
                selectedXAxis,
                selectedYAxis,
                `${selectedChartType.charAt(0).toUpperCase() + selectedChartType.slice(1)}: ${selectedYAxis} by ${selectedXAxis}`
              )}
            </div>
          )}

          {/* Quick Comparison - Show multiple chart types for same data */}
          {selectedXAxis && selectedYAxis && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Compare Chart Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chartTypeOptions
                    .filter(opt => opt.value !== selectedChartType)
                    .slice(0, 3)
                    .map(opt => (
                      <div key={opt.value}>
                        {renderChart(
                          opt.value,
                          selectedXAxis,
                          selectedYAxis,
                          `${opt.label}: ${selectedYAxis}`
                        )}
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Fullscreen Chart Dialog */}
      <Dialog open={!!fullscreenChart} onOpenChange={() => setFullscreenChart(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[80vh] bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {fullscreenChart?.title}
              <Button variant="ghost" size="icon" onClick={() => setFullscreenChart(null)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {fullscreenChart && renderChart(
              fullscreenChart.type,
              fullscreenChart.xKey,
              fullscreenChart.yKey,
              fullscreenChart.title,
              true
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VisualizationDashboard;
