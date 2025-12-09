import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  ScatterChart,
  Settings2,
  Palette,
  Grid3X3,
  Filter,
  Plus,
  Trash2,
  Save,
  RefreshCw,
} from "lucide-react";
import DataBarChart from "./DataBarChart";
import DataLineChart from "./DataLineChart";
import DataPieChart from "./DataPieChart";
import DataAreaChart from "./DataAreaChart";
import DataScatterChart from "./DataScatterChart";

type ChartType = "bar" | "line" | "pie" | "area" | "scatter";

interface CustomChartBuilderProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
}

interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  xAxis: string;
  yAxis: string;
  colorScheme: string;
  showGrid: boolean;
  showLegend: boolean;
  dataLimit: number;
  filterColumn?: string;
  filterValue?: string;
}

const COLOR_SCHEMES = [
  { id: "default", name: "Default", colors: ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"] },
  { id: "ocean", name: "Ocean", colors: ["#0ea5e9", "#06b6d4", "#14b8a6"] },
  { id: "sunset", name: "Sunset", colors: ["#f97316", "#f59e0b", "#eab308"] },
  { id: "forest", name: "Forest", colors: ["#22c55e", "#10b981", "#059669"] },
  { id: "berry", name: "Berry", colors: ["#a855f7", "#ec4899", "#f43f5e"] },
];

const CustomChartBuilder = ({ data, columns, columnTypes }: CustomChartBuilderProps) => {
  const [savedCharts, setSavedCharts] = useState<ChartConfig[]>([]);
  const [currentConfig, setCurrentConfig] = useState<ChartConfig>({
    id: crypto.randomUUID(),
    type: "bar",
    title: "Custom Chart",
    xAxis: columns[0] || "",
    yAxis: columns[1] || "",
    colorScheme: "default",
    showGrid: true,
    showLegend: true,
    dataLimit: 50,
  });

  const numericColumns = columns.filter(c => columnTypes[c] === "numeric");
  const categoricalColumns = columns.filter(c => columnTypes[c] === "categorical");

  // Get unique values for filter
  const filterValues = useMemo(() => {
    if (!currentConfig.filterColumn) return [];
    const values = new Set(data.map(row => String(row[currentConfig.filterColumn!])));
    return Array.from(values).slice(0, 20);
  }, [data, currentConfig.filterColumn]);

  // Apply filters and limits to data
  const filteredData = useMemo(() => {
    let result = [...data];
    
    if (currentConfig.filterColumn && currentConfig.filterValue) {
      result = result.filter(row => String(row[currentConfig.filterColumn!]) === currentConfig.filterValue);
    }
    
    return result.slice(0, currentConfig.dataLimit);
  }, [data, currentConfig.filterColumn, currentConfig.filterValue, currentConfig.dataLimit]);

  const chartTypeOptions = [
    { value: "bar" as ChartType, label: "Bar Chart", icon: <BarChart3 className="h-4 w-4" /> },
    { value: "line" as ChartType, label: "Line Chart", icon: <LineChart className="h-4 w-4" /> },
    { value: "area" as ChartType, label: "Area Chart", icon: <AreaChart className="h-4 w-4" /> },
    { value: "pie" as ChartType, label: "Pie Chart", icon: <PieChart className="h-4 w-4" /> },
    { value: "scatter" as ChartType, label: "Scatter Plot", icon: <ScatterChart className="h-4 w-4" /> },
  ];

  const renderChart = () => {
    const props = {
      data: filteredData,
      title: currentConfig.title,
    };

    switch (currentConfig.type) {
      case "bar":
        return <DataBarChart {...props} xKey={currentConfig.xAxis} yKey={currentConfig.yAxis} />;
      case "line":
        return <DataLineChart {...props} xKey={currentConfig.xAxis} yKeys={[currentConfig.yAxis]} />;
      case "area":
        return <DataAreaChart {...props} xKey={currentConfig.xAxis} yKey={currentConfig.yAxis} />;
      case "pie":
        return <DataPieChart {...props} nameKey={currentConfig.xAxis} valueKey={currentConfig.yAxis} />;
      case "scatter":
        return <DataScatterChart {...props} xKey={currentConfig.xAxis} yKey={currentConfig.yAxis} />;
      default:
        return null;
    }
  };

  const handleSaveChart = () => {
    setSavedCharts(prev => [...prev, { ...currentConfig, id: crypto.randomUUID() }]);
  };

  const handleDeleteSavedChart = (id: string) => {
    setSavedCharts(prev => prev.filter(c => c.id !== id));
  };

  const handleLoadChart = (config: ChartConfig) => {
    setCurrentConfig({ ...config, id: crypto.randomUUID() });
  };

  const handleReset = () => {
    setCurrentConfig({
      id: crypto.randomUUID(),
      type: "bar",
      title: "Custom Chart",
      xAxis: columns[0] || "",
      yAxis: columns[1] || "",
      colorScheme: "default",
      showGrid: true,
      showLegend: true,
      dataLimit: 50,
    });
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Chart Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Chart Type Selection */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Chart Type</Label>
            <div className="flex flex-wrap gap-2">
              {chartTypeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={currentConfig.type === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentConfig(prev => ({ ...prev, type: option.value }))}
                  className="flex items-center gap-2"
                >
                  {option.icon}
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="chart-title" className="text-xs text-muted-foreground">Chart Title</Label>
            <Input
              id="chart-title"
              value={currentConfig.title}
              onChange={(e) => setCurrentConfig(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter chart title"
              className="bg-background"
            />
          </div>

          {/* Axis Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">X-Axis / Category Column</Label>
              <Select
                value={currentConfig.xAxis}
                onValueChange={(value) => setCurrentConfig(prev => ({ ...prev, xAxis: value }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${
                          columnTypes[col] === "numeric" ? "bg-blue-500/20 text-blue-400" :
                          columnTypes[col] === "date" ? "bg-purple-500/20 text-purple-400" :
                          "bg-green-500/20 text-green-400"
                        }`}>
                          {columnTypes[col]?.charAt(0).toUpperCase()}
                        </Badge>
                        {col}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Y-Axis / Value Column</Label>
              <Select
                value={currentConfig.yAxis}
                onValueChange={(value) => setCurrentConfig(prev => ({ ...prev, yAxis: value }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${
                          columnTypes[col] === "numeric" ? "bg-blue-500/20 text-blue-400" :
                          columnTypes[col] === "date" ? "bg-purple-500/20 text-purple-400" :
                          "bg-green-500/20 text-green-400"
                        }`}>
                          {columnTypes[col]?.charAt(0).toUpperCase()}
                        </Badge>
                        {col}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Color Scheme */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-2">
              <Palette className="h-3 w-3" />
              Color Scheme
            </Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_SCHEMES.map((scheme) => (
                <Button
                  key={scheme.id}
                  variant={currentConfig.colorScheme === scheme.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentConfig(prev => ({ ...prev, colorScheme: scheme.id }))}
                  className="flex items-center gap-2"
                >
                  <div className="flex gap-0.5">
                    {scheme.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  {scheme.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Data Filtering */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-2">
              <Filter className="h-3 w-3" />
              Filter Data
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={currentConfig.filterColumn || ""}
                onValueChange={(value) => setCurrentConfig(prev => ({ 
                  ...prev, 
                  filterColumn: value || undefined,
                  filterValue: undefined 
                }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Filter by column..." />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  <SelectItem value="">No filter</SelectItem>
                  {categoricalColumns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentConfig.filterColumn && (
                <Select
                  value={currentConfig.filterValue || ""}
                  onValueChange={(value) => setCurrentConfig(prev => ({ 
                    ...prev, 
                    filterValue: value || undefined 
                  }))}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select value..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    <SelectItem value="">All values</SelectItem>
                    {filterValues.map(val => (
                      <SelectItem key={val} value={val}>{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Data Limit Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Data Points Limit</Label>
              <span className="text-xs font-medium">{currentConfig.dataLimit} rows</span>
            </div>
            <Slider
              value={[currentConfig.dataLimit]}
              onValueChange={([value]) => setCurrentConfig(prev => ({ ...prev, dataLimit: value }))}
              min={10}
              max={Math.min(500, data.length)}
              step={10}
              className="w-full"
            />
          </div>

          {/* Display Options */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="show-grid"
                checked={currentConfig.showGrid}
                onCheckedChange={(checked) => setCurrentConfig(prev => ({ ...prev, showGrid: checked }))}
              />
              <Label htmlFor="show-grid" className="text-xs flex items-center gap-1">
                <Grid3X3 className="h-3 w-3" />
                Show Grid
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-legend"
                checked={currentConfig.showLegend}
                onCheckedChange={(checked) => setCurrentConfig(prev => ({ ...prev, showLegend: checked }))}
              />
              <Label htmlFor="show-legend" className="text-xs">Show Legend</Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
            <Button onClick={handleSaveChart} size="sm" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Chart
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chart Preview */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>Preview: {currentConfig.title}</span>
            <Badge variant="outline" className="text-xs">
              {filteredData.length} data points
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentConfig.xAxis && currentConfig.yAxis ? (
            renderChart()
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Select X and Y axis columns to preview chart
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved Charts */}
      {savedCharts.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Save className="h-4 w-4" />
              Saved Charts ({savedCharts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedCharts.map((chart) => (
                <Card key={chart.id} className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-sm">{chart.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {chart.type} • {chart.xAxis} vs {chart.yAxis}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleLoadChart(chart)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => handleDeleteSavedChart(chart.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomChartBuilder;