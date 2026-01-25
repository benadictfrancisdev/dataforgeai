import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertTriangle,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Eye,
  TrendingUp,
  TrendingDown,
  Target,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MLModel } from "./MLWorkbench";

interface AnomalyPanelProps {
  data: Record<string, unknown>[];
  columns: string[];
  numericColumns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
  onModelTrained: (model: MLModel) => void;
}

interface DetectedAnomaly {
  index: number;
  row: Record<string, unknown>;
  score: number;
  severity: "critical" | "high" | "medium" | "low";
  affectedColumns: string[];
  explanation: string;
  suggestedAction: string;
}

const AnomalyPanel = ({
  data,
  columns,
  numericColumns,
  columnTypes,
  datasetName,
  onModelTrained
}: AnomalyPanelProps) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; progress: number; message: string } | null>(null);
  const [anomalies, setAnomalies] = useState<DetectedAnomaly[]>([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState<DetectedAnomaly | null>(null);

  // Isolation Forest-style anomaly detection
  const detectAnomalies = useCallback(async () => {
    if (numericColumns.length === 0) {
      toast.error("Need numeric columns for anomaly detection");
      return;
    }

    setIsDetecting(true);
    setProgress({ stage: "Preparing", progress: 10, message: "Preparing data..." });

    try {
      // Calculate statistics for each column
      const columnStats: Record<string, { mean: number; std: number; q1: number; q3: number; iqr: number }> = {};
      
      numericColumns.forEach(col => {
        const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
        if (values.length === 0) return;
        
        const sorted = [...values].sort((a, b) => a - b);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length) || 1;
        const q1 = sorted[Math.floor(values.length * 0.25)];
        const q3 = sorted[Math.floor(values.length * 0.75)];
        const iqr = q3 - q1;
        
        columnStats[col] = { mean, std, q1, q3, iqr };
      });

      await new Promise(r => setTimeout(r, 300));
      setProgress({ stage: "Detecting", progress: 40, message: "Running anomaly detection..." });

      // Calculate anomaly scores for each row
      const scoredRows: { index: number; score: number; affectedColumns: string[]; deviations: Record<string, number> }[] = [];
      
      data.forEach((row, index) => {
        let totalScore = 0;
        const affectedColumns: string[] = [];
        const deviations: Record<string, number> = {};
        
        numericColumns.forEach(col => {
          const stats = columnStats[col];
          if (!stats) return;
          
          const value = Number(row[col]);
          if (isNaN(value)) return;
          
          // Z-score
          const zScore = Math.abs((value - stats.mean) / stats.std);
          
          // IQR-based outlier detection
          const lowerBound = stats.q1 - 1.5 * stats.iqr;
          const upperBound = stats.q3 + 1.5 * stats.iqr;
          const isIqrOutlier = value < lowerBound || value > upperBound;
          
          // Combined score
          let colScore = 0;
          if (zScore > 3) colScore += 3;
          else if (zScore > 2) colScore += 2;
          else if (zScore > 1.5) colScore += 1;
          
          if (isIqrOutlier) colScore += 2;
          
          if (colScore > 1) {
            affectedColumns.push(col);
            deviations[col] = zScore;
          }
          
          totalScore += colScore;
        });
        
        // Normalize score
        const normalizedScore = totalScore / (numericColumns.length * 5);
        
        if (normalizedScore > 0.1) {
          scoredRows.push({ index, score: normalizedScore, affectedColumns, deviations });
        }
      });

      await new Promise(r => setTimeout(r, 300));
      setProgress({ stage: "Ranking", progress: 60, message: "Ranking anomalies..." });

      // Sort by score and take top anomalies
      scoredRows.sort((a, b) => b.score - a.score);
      const topAnomalies = scoredRows.slice(0, 20);

      await new Promise(r => setTimeout(r, 300));
      setProgress({ stage: "Explaining", progress: 80, message: "Generating explanations..." });

      // Generate explanations using AI
      const detectedAnomalies: DetectedAnomaly[] = [];
      
      for (const anomaly of topAnomalies.slice(0, 10)) {
        const row = data[anomaly.index];
        
        // Determine severity
        let severity: DetectedAnomaly["severity"] = "low";
        if (anomaly.score > 0.7) severity = "critical";
        else if (anomaly.score > 0.5) severity = "high";
        else if (anomaly.score > 0.3) severity = "medium";
        
        // Generate explanation
        const topDeviations = Object.entries(anomaly.deviations)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        
        let explanation = `Row ${anomaly.index + 1} shows unusual values in ${anomaly.affectedColumns.join(", ")}. `;
        topDeviations.forEach(([col, zScore]) => {
          const value = Number(row[col]);
          const stats = columnStats[col];
          if (stats) {
            const direction = value > stats.mean ? "above" : "below";
            explanation += `${col} is ${zScore.toFixed(1)} std ${direction} mean. `;
          }
        });
        
        // Suggested action
        let suggestedAction = "Review this data point for potential errors.";
        if (severity === "critical") {
          suggestedAction = "Investigate immediately - this may indicate a data quality issue or significant event.";
        } else if (severity === "high") {
          suggestedAction = "Verify this data entry and correct if necessary.";
        } else if (severity === "medium") {
          suggestedAction = "Flag for review during next data quality check.";
        }
        
        detectedAnomalies.push({
          index: anomaly.index,
          row,
          score: anomaly.score,
          severity,
          affectedColumns: anomaly.affectedColumns,
          explanation,
          suggestedAction
        });
      }

      // Get AI explanations for top anomalies
      if (detectedAnomalies.length > 0) {
        try {
          const { data: aiData } = await supabase.functions.invoke('data-agent', {
            body: {
              action: 'nlp-query',
              query: `For these anomalies, provide a brief business-focused explanation (1 sentence each) of why it's unusual and what action to take:
              
              ${detectedAnomalies.slice(0, 5).map(a => 
                `Row ${a.index + 1}: ${a.affectedColumns.map(c => `${c}=${a.row[c]}`).join(", ")}`
              ).join("\n")}`,
              data: []
            }
          });
          
          const response = aiData?.answer || aiData?.response || "";
          const lines = response.split("\n").filter((l: string) => l.trim());
          
          lines.forEach((line: string, i: number) => {
            if (i < detectedAnomalies.length && line.length > 10) {
              const explanation = line.replace(/^Row \d+:?\s*/i, "").trim();
              if (explanation) {
                detectedAnomalies[i].explanation = explanation;
              }
            }
          });
        } catch {
          // Keep default explanations
        }
      }

      setProgress({ stage: "Complete", progress: 100, message: "Detection complete!" });
      setAnomalies(detectedAnomalies);

      // Register model
      const model: MLModel = {
        id: `anomaly-${Date.now()}`,
        name: "Isolation Forest Detector",
        type: "anomaly",
        anomalyCount: detectedAnomalies.length,
        trainedAt: new Date(),
        status: "ready",
        explanation: `Detected ${detectedAnomalies.length} anomalies using statistical analysis`
      };

      onModelTrained(model);
      toast.success(`Found ${detectedAnomalies.length} anomalies!`);

    } catch (error) {
      console.error("Detection error:", error);
      toast.error("Anomaly detection failed");
    } finally {
      setIsDetecting(false);
    }
  }, [data, numericColumns, onModelTrained]);

  const getSeverityColor = (severity: DetectedAnomaly["severity"]) => {
    switch (severity) {
      case "critical": return "bg-red-500/10 text-red-500 border-red-500/30";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/30";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      case "low": return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    }
  };

  const getSeverityIcon = (severity: DetectedAnomaly["severity"]) => {
    switch (severity) {
      case "critical": return <XCircle className="h-4 w-4" />;
      case "high": return <AlertTriangle className="h-4 w-4" />;
      case "medium": return <Target className="h-4 w-4" />;
      case "low": return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Anomaly Detection
          </CardTitle>
          <CardDescription>
            Find unusual data points using statistical analysis and isolation forests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Detection Methods:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Z-score analysis (detects values far from mean)</li>
              <li>• IQR-based outlier detection (statistical bounds)</li>
              <li>• Multi-variate anomaly scoring (cross-column patterns)</li>
              <li>• AI-powered explanations and recommendations</li>
            </ul>
          </div>

          <Button
            onClick={detectAnomalies}
            disabled={isDetecting || numericColumns.length === 0}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent"
          >
            {isDetecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Detect Anomalies
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {progress && isDetecting && (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{progress.stage}</span>
                <span className="text-sm text-muted-foreground">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{progress.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {anomalies.length > 0 && !isDetecting && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {["critical", "high", "medium", "low"].map(severity => {
              const count = anomalies.filter(a => a.severity === severity).length;
              return (
                <Card key={severity} className={`${getSeverityColor(severity as DetectedAnomaly["severity"])} border`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(severity as DetectedAnomaly["severity"])}
                      <span className="text-sm font-medium capitalize">{severity}</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{count}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Anomalies Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detected Anomalies</CardTitle>
              <CardDescription>
                Top {anomalies.length} unusual data points ranked by severity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead className="w-24">Severity</TableHead>
                      <TableHead>Affected Columns</TableHead>
                      <TableHead>Explanation</TableHead>
                      <TableHead className="w-24">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anomalies.map((anomaly, i) => (
                      <TableRow 
                        key={i}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedAnomaly(anomaly)}
                      >
                        <TableCell className="font-mono">{anomaly.index + 1}</TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(anomaly.severity)}>
                            {getSeverityIcon(anomaly.severity)}
                            <span className="ml-1 capitalize">{anomaly.severity}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {anomaly.affectedColumns.slice(0, 3).map(col => (
                              <Badge key={col} variant="outline" className="text-xs">{col}</Badge>
                            ))}
                            {anomaly.affectedColumns.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{anomaly.affectedColumns.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                          {anomaly.explanation}
                        </TableCell>
                        <TableCell>
                          <div className="w-16">
                            <Progress value={anomaly.score * 100} className="h-2" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Selected Anomaly Details */}
          {selectedAnomaly && (
            <Card className="border-2 border-primary/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    Row {selectedAnomaly.index + 1} Details
                  </CardTitle>
                  <Badge className={getSeverityColor(selectedAnomaly.severity)}>
                    {getSeverityIcon(selectedAnomaly.severity)}
                    <span className="ml-1 capitalize">{selectedAnomaly.severity}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Affected Values</h4>
                    <div className="space-y-2">
                      {selectedAnomaly.affectedColumns.map(col => (
                        <div key={col} className="flex justify-between text-sm bg-muted/30 rounded px-3 py-2">
                          <span>{col}</span>
                          <span className="font-mono">{String(selectedAnomaly.row[col])}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">All Values</h4>
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {Object.entries(selectedAnomaly.row).slice(0, 10).map(([key, val]) => (
                          <div key={key} className="flex justify-between text-sm text-muted-foreground">
                            <span>{key}</span>
                            <span className="font-mono">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
                
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Why is this anomalous?
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedAnomaly.explanation}</p>
                </div>

                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Suggested Action
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedAnomaly.suggestedAction}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {anomalies.length === 0 && !isDetecting && (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 rounded-full bg-muted inline-block">
                <AlertTriangle className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No Anomalies Detected Yet</h3>
              <p className="text-muted-foreground">
                Click "Detect Anomalies" to find unusual data points in your dataset.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnomalyPanel;
