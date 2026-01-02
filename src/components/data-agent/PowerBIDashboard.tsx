import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutDashboard,
  Sparkles,
  Grid3X3,
  List,
  Download,
  Share2,
  Filter,
  SlidersHorizontal,
  Eye,
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  PieChart,
  Target,
  Activity,
  Maximize2,
  RefreshCw,
  Palette,
  Layers,
  Zap,
  FileDown,
  Edit3,
  Wand2,
  CheckCircle2,
  X,
  Settings2,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as RechartsLine,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  Legend,
  ComposedChart
} from "recharts";

interface PowerBIDashboardProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

interface DashboardTile {
  id: string;
  type: "kpi" | "bar" | "line" | "pie" | "area" | "scatter" | "combo" | "table";
  title: string;
  size: "small" | "medium" | "large";
  column?: string;
  xAxis?: string;
  yAxis?: string;
  data?: any[];
  value?: number;
  change?: number;
  color?: string;
}

interface DataTransformation {
  id: string;
  type: "filter" | "sort" | "aggregate" | "rename" | "remove_nulls" | "normalize";
  column?: string;
  operator?: string;
  value?: string | number;
  direction?: "asc" | "desc";
  newName?: string;
}

const POWER_BI_COLORS = [
  "#01B8AA", // Teal
  "#374649", // Dark Gray
  "#FD625E", // Red
  "#F2C80F", // Yellow
  "#5F6B6D", // Gray
  "#8AD4EB", // Light Blue
  "#FE9666", // Orange
  "#A66999", // Purple
  "#3599B8", // Blue
  "#DFBFBF"  // Pink
];

const PowerBIDashboard = ({ data, columns, columnTypes, datasetName }: PowerBIDashboardProps) => {
  const [tiles, setTiles] = useState<DashboardTile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [theme, setTheme] = useState<"light" | "dark" | "colorful">("colorful");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [showDataEditor, setShowDataEditor] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns);
  const [transformations, setTransformations] = useState<DataTransformation[]>([]);
  const [processedData, setProcessedData] = useState<Record<string, unknown>[]>(data);
  const [isProcessing, setIsProcessing] = useState(false);
  const { exportToPdf } = usePdfExport();

  const numericColumns = useMemo(() => 
    columns.filter(c => columnTypes[c] === "numeric"), [columns, columnTypes]);
  const categoricalColumns = useMemo(() => 
    columns.filter(c => columnTypes[c] === "categorical"), [columns, columnTypes]);

  const handleExportPdf = () => {
    exportToPdf({
      title: "Power BI Style Dashboard Report",
      subtitle: `Interactive Dashboard for ${datasetName}`,
      datasetName,
      statistics: {
        "Total Records": data.length,
        "Dashboard Tiles": tiles.length,
        "Numeric Columns": numericColumns.length,
        "Categorical Columns": categoricalColumns.length,
      },
      insights: tiles.filter(t => t.type === "kpi").map(t => ({
        title: t.title,
        description: `Value: ${t.value?.toFixed(2) || "N/A"}, Change: ${t.change?.toFixed(1) || 0}%`,
        importance: (t.change || 0) > 0 ? "high" : "medium" as const
      })),
      sections: [
        {
          title: "Dashboard Overview",
          content: `This Power BI-style dashboard contains ${tiles.length} visualization tiles across ${numericColumns.length} numeric metrics.`,
          type: "text"
        },
        {
          title: "Visualizations",
          type: "list",
          content: tiles.map(t => `${t.type.toUpperCase()}: ${t.title}`)
        }
      ],
      recommendations: [
        "Use slicers to filter data dynamically",
        "Drill down into charts for detailed insights",
        "Share this dashboard with stakeholders"
      ]
    });
  };

  // Data editing functions
  const toggleColumnSelection = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column) 
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const addTransformation = (type: DataTransformation["type"]) => {
    const newTransform: DataTransformation = {
      id: `transform-${Date.now()}`,
      type,
      column: selectedColumns[0] || columns[0]
    };
    setTransformations(prev => [...prev, newTransform]);
  };

  const updateTransformation = (id: string, updates: Partial<DataTransformation>) => {
    setTransformations(prev => 
      prev.map(t => t.id === id ? { ...t, ...updates } : t)
    );
  };

  const removeTransformation = (id: string) => {
    setTransformations(prev => prev.filter(t => t.id !== id));
  };

  const applyTransformations = useCallback(() => {
    setIsProcessing(true);
    
    setTimeout(() => {
      let result = [...data];
      
      // Filter to selected columns only
      result = result.map(row => {
        const newRow: Record<string, unknown> = {};
        selectedColumns.forEach(col => {
          newRow[col] = row[col];
        });
        return newRow;
      });
      
      // Apply each transformation
      transformations.forEach(transform => {
        switch (transform.type) {
          case "filter":
            if (transform.column && transform.operator && transform.value !== undefined) {
              result = result.filter(row => {
                const val = row[transform.column!];
                const compareVal = transform.value;
                switch (transform.operator) {
                  case "equals": return String(val) === String(compareVal);
                  case "contains": return String(val).toLowerCase().includes(String(compareVal).toLowerCase());
                  case "greater": return Number(val) > Number(compareVal);
                  case "less": return Number(val) < Number(compareVal);
                  case "not_empty": return val !== null && val !== undefined && val !== "";
                  default: return true;
                }
              });
            }
            break;
          case "sort":
            if (transform.column) {
              result.sort((a, b) => {
                const aVal = a[transform.column!];
                const bVal = b[transform.column!];
                const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
                return transform.direction === "desc" ? -comparison : comparison;
              });
            }
            break;
          case "remove_nulls":
            if (transform.column) {
              result = result.filter(row => 
                row[transform.column!] !== null && 
                row[transform.column!] !== undefined && 
                row[transform.column!] !== ""
              );
            }
            break;
          case "normalize":
            if (transform.column && columnTypes[transform.column] === "numeric") {
              const values = result.map(r => Number(r[transform.column!])).filter(v => !isNaN(v));
              const min = Math.min(...values);
              const max = Math.max(...values);
              const range = max - min || 1;
              result = result.map(row => ({
                ...row,
                [transform.column!]: ((Number(row[transform.column!]) - min) / range).toFixed(4)
              }));
            }
            break;
        }
      });
      
      setProcessedData(result);
      setIsProcessing(false);
      toast.success(`Applied ${transformations.length} transformations to ${result.length} rows`);
    }, 1000);
  }, [data, selectedColumns, transformations, columnTypes]);

  const autoCleanData = () => {
    setIsProcessing(true);
    
    setTimeout(() => {
      // Auto-clean: remove nulls, trim whitespace, normalize numeric columns
      let result = data.map(row => {
        const newRow: Record<string, unknown> = {};
        selectedColumns.forEach(col => {
          let val = row[col];
          // Trim strings
          if (typeof val === "string") {
            val = val.trim();
          }
          // Convert empty strings to null for consistency
          if (val === "") {
            val = null;
          }
          newRow[col] = val;
        });
        return newRow;
      });
      
      // Remove rows where all selected columns are null
      result = result.filter(row => 
        selectedColumns.some(col => row[col] !== null && row[col] !== undefined)
      );
      
      setProcessedData(result);
      setIsProcessing(false);
      toast.success(`Auto-cleaned data: ${result.length} rows after removing empty rows`);
    }, 1500);
  };

  // Generate Power BI style dashboard
  const generateDashboard = useCallback(() => {
    setIsGenerating(true);
    const dataToUse = processedData.length > 0 ? processedData : data;
    const activeColumns = selectedColumns.length > 0 ? selectedColumns : columns;
    const activeNumericCols = activeColumns.filter(c => columnTypes[c] === "numeric");
    const activeCategoricalCols = activeColumns.filter(c => columnTypes[c] === "categorical");
    
    setTimeout(() => {
      const newTiles: DashboardTile[] = [];

      // Generate KPI tiles for top numeric columns
      activeNumericCols.slice(0, 4).forEach((col, i) => {
        const values = dataToUse.map(row => Number(row[col])).filter(v => !isNaN(v));
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = values.length > 0 ? sum / values.length : 0;
        const prevAvg = values.length > 1 ? 
          values.slice(0, -1).reduce((a, b) => a + b, 0) / (values.length - 1) : avg;
        const change = prevAvg !== 0 ? ((avg - prevAvg) / prevAvg) * 100 : 0;

        newTiles.push({
          id: `kpi-${col}`,
          type: "kpi",
          title: col,
          size: "small",
          column: col,
          value: avg,
          change,
          color: POWER_BI_COLORS[i % POWER_BI_COLORS.length]
        });
      });

      // Bar chart for categorical vs numeric
      if (activeCategoricalCols.length > 0 && activeNumericCols.length > 0) {
        const catCol = activeCategoricalCols[0];
        const numCol = activeNumericCols[0];
        const grouped = dataToUse.reduce((acc: Record<string, number[]>, row) => {
          const key = String(row[catCol]);
          if (!acc[key]) acc[key] = [];
          const val = Number(row[numCol]);
          if (!isNaN(val)) acc[key].push(val);
          return acc;
        }, {});

        const chartData = Object.entries(grouped).slice(0, 10).map(([name, values]: [string, number[]]) => ({
          name,
          value: values.reduce((a: number, b: number) => a + b, 0) / values.length
        }));

        newTiles.push({
          id: `bar-${catCol}-${numCol}`,
          type: "bar",
          title: `${numCol} by ${catCol}`,
          size: "large",
          xAxis: catCol,
          yAxis: numCol,
          data: chartData,
          color: POWER_BI_COLORS[0]
        });
      }

      // Pie chart for distribution
      if (activeCategoricalCols.length > 0) {
        const catCol = activeCategoricalCols[0];
        const counts = dataToUse.reduce((acc: Record<string, number>, row) => {
          const key = String(row[catCol]);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        const chartData = Object.entries(counts).slice(0, 8).map(([name, value]) => ({
          name,
          value
        }));

        newTiles.push({
          id: `pie-${catCol}`,
          type: "pie",
          title: `${catCol} Distribution`,
          size: "medium",
          column: catCol,
          data: chartData
        });
      }

      // Line/Trend chart
      if (activeNumericCols.length > 0) {
        const col = activeNumericCols[0];
        const chartData = dataToUse.slice(0, 50).map((row, i) => ({
          index: i + 1,
          value: Number(row[col]) || 0
        }));

        newTiles.push({
          id: `line-${col}`,
          type: "line",
          title: `${col} Trend`,
          size: "large",
          column: col,
          data: chartData,
          color: POWER_BI_COLORS[2]
        });
      }

      // Area chart
      if (activeNumericCols.length > 1) {
        const col = activeNumericCols[1];
        const chartData = dataToUse.slice(0, 50).map((row, i) => ({
          index: i + 1,
          value: Number(row[col]) || 0
        }));

        newTiles.push({
          id: `area-${col}`,
          type: "area",
          title: `${col} Analysis`,
          size: "medium",
          column: col,
          data: chartData,
          color: POWER_BI_COLORS[4]
        });
      }

      // Combo chart if enough data
      if (activeNumericCols.length >= 2 && activeCategoricalCols.length > 0) {
        const catCol = activeCategoricalCols[0];
        const num1 = activeNumericCols[0];
        const num2 = activeNumericCols[1];

        const grouped = dataToUse.reduce((acc: Record<string, { v1: number[], v2: number[] }>, row) => {
          const key = String(row[catCol]);
          if (!acc[key]) acc[key] = { v1: [], v2: [] };
          const val1 = Number(row[num1]);
          const val2 = Number(row[num2]);
          if (!isNaN(val1)) acc[key].v1.push(val1);
          if (!isNaN(val2)) acc[key].v2.push(val2);
          return acc;
        }, {});

        const chartData = Object.entries(grouped).slice(0, 8).map(([name, vals]: [string, { v1: number[], v2: number[] }]) => ({
          name,
          [num1]: vals.v1.length > 0 ? vals.v1.reduce((a: number, b: number) => a + b, 0) / vals.v1.length : 0,
          [num2]: vals.v2.length > 0 ? vals.v2.reduce((a: number, b: number) => a + b, 0) / vals.v2.length : 0
        }));

        newTiles.push({
          id: `combo-${catCol}`,
          type: "combo",
          title: `${num1} vs ${num2}`,
          size: "large",
          xAxis: catCol,
          yAxis: `${num1}, ${num2}`,
          data: chartData
        });
      }

      setTiles(newTiles);
      setIsGenerating(false);
      toast.success(`Generated ${newTiles.length} dashboard tiles using ${dataToUse.length} rows`);
    }, 2000);
  }, [data, processedData, selectedColumns, columns, columnTypes]);

  const renderTile = (tile: DashboardTile) => {
    const sizeClasses = {
      small: "col-span-1",
      medium: "col-span-1 md:col-span-2",
      large: "col-span-1 md:col-span-2 lg:col-span-3"
    };

    return (
      <Card 
        key={tile.id}
        className={`${sizeClasses[tile.size]} cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] ${
          selectedTile === tile.id ? "ring-2 ring-primary" : ""
        }`}
        onClick={() => setSelectedTile(tile.id === selectedTile ? null : tile.id)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium truncate">{tile.title}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tile.type === "kpi" && (
            <div className="space-y-2">
              <div className="text-3xl font-bold" style={{ color: tile.color }}>
                {tile.value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              {tile.change !== undefined && (
                <div className={`flex items-center text-sm ${
                  tile.change >= 0 ? "text-green-500" : "text-red-500"
                }`}>
                  {tile.change >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {tile.change >= 0 ? "+" : ""}{tile.change.toFixed(2)}%
                </div>
              )}
            </div>
          )}

          {tile.type === "bar" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="value" fill={tile.color || POWER_BI_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "line" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLine data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="index" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke={tile.color || POWER_BI_COLORS[2]} strokeWidth={2} dot={false} />
                </RechartsLine>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "pie" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={tile.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    dataKey="value"
                    label={({ name }) => name}
                    labelLine={false}
                  >
                    {tile.data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={POWER_BI_COLORS[index % POWER_BI_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "area" && tile.data && (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tile.data}>
                  <defs>
                    <linearGradient id={`gradient-${tile.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={tile.color || POWER_BI_COLORS[4]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={tile.color || POWER_BI_COLORS[4]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="index" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke={tile.color || POWER_BI_COLORS[4]} fill={`url(#gradient-${tile.id})`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "combo" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={Object.keys(tile.data[0] || {})[1] || "value"} fill={POWER_BI_COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey={Object.keys(tile.data[0] || {})[2] || "value2"} stroke={POWER_BI_COLORS[2]} strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-transparent border-cyan-500/30">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/25">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  Power BI Style Dashboard
                  <Badge variant="secondary" className="text-xs bg-cyan-500/10 text-cyan-600">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Enterprise-grade visualizations with one-click generation
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={showDataEditor ? "default" : "outline"}
                size="sm"
                onClick={() => setShowDataEditor(!showDataEditor)}
                className={showDataEditor ? "bg-gradient-to-r from-purple-500 to-pink-600" : ""}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Data
              </Button>
              {tiles.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPdf}
                  className="gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Export PDF
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              >
                {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
              <Button
                onClick={generateDashboard}
                disabled={isGenerating}
                className="bg-gradient-to-r from-cyan-500 to-teal-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Dashboard
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-cyan-500/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-cyan-600">
              <Layers className="h-4 w-4" />
              <span className="text-xs font-medium">Total Tiles</span>
            </div>
            <p className="text-2xl font-bold mt-1">{tiles.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-500/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-teal-600">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs font-medium">Charts</span>
            </div>
            <p className="text-2xl font-bold mt-1">{tiles.filter(t => t.type !== "kpi").length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium">KPIs</span>
            </div>
            <p className="text-2xl font-bold mt-1">{tiles.filter(t => t.type === "kpi").length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-600">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium">Data Points</span>
            </div>
            <p className="text-2xl font-bold mt-1">{data.length.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Editor Panel */}
      {showDataEditor && (
        <Card className="bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent border-purple-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                  <Edit3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Data Editor</CardTitle>
                  <CardDescription>Select columns and apply transformations</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowDataEditor(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Column Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  Select Columns
                </Label>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedColumns(columns)}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedColumns([])}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {columns.map(col => (
                  <div
                    key={col}
                    onClick={() => toggleColumnSelection(col)}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      selectedColumns.includes(col)
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-border hover:border-purple-500/50"
                    }`}
                  >
                    <Checkbox 
                      checked={selectedColumns.includes(col)}
                      onCheckedChange={() => toggleColumnSelection(col)}
                    />
                    <span className="text-xs truncate">{col}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      {columnTypes[col]?.slice(0, 3) || "str"}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedColumns.length} of {columns.length} columns selected
              </p>
            </div>

            {/* Transformations */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-purple-500" />
                Data Transformations
              </Label>
              
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => addTransformation("filter")}>
                  <Filter className="h-3 w-3 mr-1" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" onClick={() => addTransformation("sort")}>
                  <SlidersHorizontal className="h-3 w-3 mr-1" />
                  Sort
                </Button>
                <Button variant="outline" size="sm" onClick={() => addTransformation("remove_nulls")}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remove Nulls
                </Button>
                <Button variant="outline" size="sm" onClick={() => addTransformation("normalize")}>
                  <Activity className="h-3 w-3 mr-1" />
                  Normalize
                </Button>
              </div>

              {/* Transformation List */}
              {transformations.length > 0 && (
                <div className="space-y-2 mt-4">
                  {transformations.map((transform, idx) => (
                    <div key={transform.id} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {idx + 1}. {transform.type}
                      </Badge>
                      
                      <Select
                        value={transform.column}
                        onValueChange={(val) => updateTransformation(transform.id, { column: val })}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue placeholder="Column" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedColumns.map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {transform.type === "filter" && (
                        <>
                          <Select
                            value={transform.operator}
                            onValueChange={(val) => updateTransformation(transform.id, { operator: val })}
                          >
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue placeholder="Operator" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="greater">Greater than</SelectItem>
                              <SelectItem value="less">Less than</SelectItem>
                              <SelectItem value="not_empty">Not empty</SelectItem>
                            </SelectContent>
                          </Select>
                          {transform.operator !== "not_empty" && (
                            <Input
                              className="w-24 h-8"
                              placeholder="Value"
                              value={transform.value?.toString() || ""}
                              onChange={(e) => updateTransformation(transform.id, { value: e.target.value })}
                            />
                          )}
                        </>
                      )}

                      {transform.type === "sort" && (
                        <Select
                          value={transform.direction || "asc"}
                          onValueChange={(val) => updateTransformation(transform.id, { direction: val as "asc" | "desc" })}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc">Ascending</SelectItem>
                            <SelectItem value="desc">Descending</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 ml-auto"
                        onClick={() => removeTransformation(transform.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button
                onClick={autoCleanData}
                disabled={isProcessing}
                variant="outline"
                className="gap-2"
              >
                <Wand2 className="h-4 w-4" />
                Auto Clean
              </Button>
              <Button
                onClick={applyTransformations}
                disabled={isProcessing || selectedColumns.length === 0}
                className="bg-gradient-to-r from-purple-500 to-pink-600 gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Apply Changes
                  </>
                )}
              </Button>
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <span>Original: {data.length} rows</span>
                <span>•</span>
                <span className="text-purple-500 font-medium">Processed: {processedData.length} rows</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Grid */}
      {tiles.length === 0 && !isGenerating && (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="py-16 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 rounded-full bg-gradient-to-br from-cyan-500/10 to-teal-500/10 inline-block">
                <LayoutDashboard className="h-12 w-12 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold">Generate Your Dashboard</h3>
              <p className="text-muted-foreground">
                Click "Generate Dashboard" to create a Power BI-style dashboard with AI-powered chart recommendations.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isGenerating && (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-16 w-16 animate-spin mx-auto text-cyan-500 mb-4" />
            <h3 className="text-lg font-semibold">Analyzing your data...</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Creating optimal visualizations for {datasetName}
            </p>
          </CardContent>
        </Card>
      )}

      {tiles.length > 0 && !isGenerating && (
        <div className={`grid gap-4 ${
          viewMode === "grid" 
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
            : "grid-cols-1"
        }`}>
          {tiles.map(renderTile)}
        </div>
      )}
    </div>
  );
};

export default PowerBIDashboard;
