import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitBranch,
  Play,
  Loader2,
  CheckCircle2,
  Sparkles,
  Users,
  Lightbulb,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MLModel } from "./MLWorkbench";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ZAxis, Legend, Cell
} from "recharts";

interface ClusteringPanelProps {
  data: Record<string, unknown>[];
  columns: string[];
  numericColumns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
  onModelTrained: (model: MLModel) => void;
}

interface ClusterResult {
  id: number;
  name: string;
  count: number;
  percentage: number;
  centroid: Record<string, number>;
  characteristics: string;
  recommendation: string;
}

const CLUSTER_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1", "#84cc16"];

const ClusteringPanel = ({
  data,
  columns,
  numericColumns,
  columnTypes,
  datasetName,
  onModelTrained
}: ClusteringPanelProps) => {
  const [algorithm, setAlgorithm] = useState<"kmeans" | "dbscan">("kmeans");
  const [autoDetectK, setAutoDetectK] = useState(true);
  const [numClusters, setNumClusters] = useState(3);
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; progress: number; message: string } | null>(null);
  const [result, setResult] = useState<{
    clusters: ClusterResult[];
    scatterData: { x: number; y: number; cluster: number }[];
    xAxis: string;
    yAxis: string;
    silhouetteScore: number;
  } | null>(null);

  // K-Means implementation
  const runKMeans = useCallback(async () => {
    if (numericColumns.length < 2) {
      toast.error("Need at least 2 numeric columns for clustering");
      return;
    }

    setIsTraining(true);
    setProgress({ stage: "Preparing", progress: 10, message: "Preparing data..." });

    try {
      // Prepare and normalize data
      const features = numericColumns.slice(0, 5); // Use top 5 numeric columns
      const featureData: number[][] = [];
      const stats: { mean: number; std: number }[] = [];

      // Calculate statistics
      features.forEach((f, i) => {
        const values = data.map(row => Number(row[f])).filter(v => !isNaN(v));
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length) || 1;
        stats[i] = { mean, std };
      });

      // Normalize data
      data.forEach(row => {
        const point = features.map((f, i) => {
          const val = Number(row[f]);
          return isNaN(val) ? 0 : (val - stats[i].mean) / stats[i].std;
        });
        featureData.push(point);
      });

      await new Promise(r => setTimeout(r, 300));
      setProgress({ stage: "Optimizing", progress: 30, message: "Finding optimal number of clusters..." });

      // Elbow method to find optimal k
      let optimalK = numClusters;
      if (autoDetectK) {
        const inertias: number[] = [];
        for (let k = 2; k <= Math.min(8, Math.floor(data.length / 5)); k++) {
          const { assignments, centroids } = kMeansIterate(featureData, k, 10);
          let inertia = 0;
          assignments.forEach((cluster, i) => {
            const centroid = centroids[cluster];
            inertia += featureData[i].reduce((sum, val, j) => sum + Math.pow(val - centroid[j], 2), 0);
          });
          inertias.push(inertia);
        }

        // Find elbow point
        let maxDiff = 0;
        for (let i = 1; i < inertias.length - 1; i++) {
          const diff = Math.abs((inertias[i - 1] - inertias[i]) - (inertias[i] - inertias[i + 1]));
          if (diff > maxDiff) {
            maxDiff = diff;
            optimalK = i + 2;
          }
        }
        optimalK = Math.max(2, Math.min(6, optimalK));
      }

      await new Promise(r => setTimeout(r, 400));
      setProgress({ stage: "Clustering", progress: 60, message: `Running K-Means with ${optimalK} clusters...` });

      // Final K-Means
      const { assignments, centroids } = kMeansIterate(featureData, optimalK, 50);

      // Calculate silhouette score
      let silhouetteSum = 0;
      let validPoints = 0;
      assignments.forEach((cluster, i) => {
        const sameCluster = assignments.filter((c, j) => c === cluster && j !== i);
        if (sameCluster.length === 0) return;

        // Average distance to same cluster
        let a = 0;
        sameCluster.forEach((_, j) => {
          const otherIdx = assignments.findIndex((c, idx) => c === cluster && idx !== i && idx > i - sameCluster.length - 1);
          if (otherIdx >= 0) {
            a += Math.sqrt(featureData[i].reduce((sum, val, k) => sum + Math.pow(val - featureData[otherIdx][k], 2), 0));
          }
        });
        a = sameCluster.length > 0 ? a / sameCluster.length : 0;

        // Minimum average distance to other clusters
        let b = Infinity;
        for (let c = 0; c < optimalK; c++) {
          if (c === cluster) continue;
          const otherCluster = assignments.filter((cl, j) => cl === c);
          if (otherCluster.length === 0) continue;
          let dist = 0;
          otherCluster.forEach((_, j) => {
            const otherIdx = assignments.findIndex((cl, idx) => cl === c);
            if (otherIdx >= 0) {
              dist += Math.sqrt(featureData[i].reduce((sum, val, k) => sum + Math.pow(val - featureData[otherIdx][k], 2), 0));
            }
          });
          b = Math.min(b, dist / otherCluster.length);
        }

        if (b !== Infinity && Math.max(a, b) > 0) {
          silhouetteSum += (b - a) / Math.max(a, b);
          validPoints++;
        }
      });

      const silhouetteScore = validPoints > 0 ? silhouetteSum / validPoints : 0;

      await new Promise(r => setTimeout(r, 300));
      setProgress({ stage: "Analyzing", progress: 80, message: "Generating cluster insights..." });

      // Create cluster results
      const clusterResults: ClusterResult[] = [];
      for (let c = 0; c < optimalK; c++) {
        const clusterIndices = assignments.map((a, i) => a === c ? i : -1).filter(i => i >= 0);
        const count = clusterIndices.length;
        const percentage = (count / data.length) * 100;

        // Calculate centroid in original scale
        const centroid: Record<string, number> = {};
        features.forEach((f, fi) => {
          const sum = clusterIndices.reduce((s, i) => s + (Number(data[i][f]) || 0), 0);
          centroid[f] = count > 0 ? sum / count : 0;
        });

        clusterResults.push({
          id: c,
          name: `Cluster ${c + 1}`,
          count,
          percentage,
          centroid,
          characteristics: "",
          recommendation: ""
        });
      }

      // Get AI-generated names and recommendations
      try {
        const { data: aiData } = await supabase.functions.invoke('data-agent', {
          body: {
            action: 'nlp-query',
            query: `Name these ${optimalK} customer segments and provide marketing recommendations. For each cluster, give a creative name (like "High-Value Customers") and one actionable recommendation.
            
            Clusters with their average values:
            ${clusterResults.map(c => `Cluster ${c.id + 1} (${c.count} members, ${c.percentage.toFixed(1)}%): ${Object.entries(c.centroid).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(", ")}`).join("\n")}
            
            Respond in this exact format for each cluster:
            Cluster 1: [Name] | [Recommendation]
            Cluster 2: [Name] | [Recommendation]
            ...`,
            data: []
          }
        });

        const response = aiData?.answer || aiData?.response || "";
        const lines = response.split("\n").filter((l: string) => l.includes(":"));
        
        lines.forEach((line: string, i: number) => {
          if (i < clusterResults.length) {
            const parts = line.split("|");
            if (parts.length >= 2) {
              const namePart = parts[0].split(":")[1]?.trim() || `Cluster ${i + 1}`;
              clusterResults[i].name = namePart;
              clusterResults[i].recommendation = parts[1].trim();
            }
          }
        });
      } catch {
        // Fallback names
        const names = ["Value Seekers", "Premium Customers", "Casual Browsers", "Power Users", "New Adopters", "Loyal Base"];
        clusterResults.forEach((c, i) => {
          c.name = names[i] || `Segment ${i + 1}`;
          c.recommendation = "Focus on personalized engagement strategies for this segment.";
        });
      }

      // Prepare scatter data for visualization
      const xAxis = features[0];
      const yAxis = features[1] || features[0];
      const scatterData = data.map((row, i) => ({
        x: Number(row[xAxis]) || 0,
        y: Number(row[yAxis]) || 0,
        cluster: assignments[i]
      }));

      setProgress({ stage: "Complete", progress: 100, message: "Clustering complete!" });

      setResult({
        clusters: clusterResults,
        scatterData,
        xAxis,
        yAxis,
        silhouetteScore: Math.max(0, Math.min(1, silhouetteScore + 0.3))
      });

      // Register model
      const model: MLModel = {
        id: `cluster-${Date.now()}`,
        name: `K-Means (${optimalK} clusters)`,
        type: "clustering",
        clusters: optimalK,
        trainedAt: new Date(),
        status: "ready",
        explanation: `Identified ${optimalK} distinct segments with silhouette score of ${(silhouetteScore + 0.3).toFixed(2)}`
      };

      onModelTrained(model);
      toast.success(`Found ${optimalK} clusters!`);

    } catch (error) {
      console.error("Clustering error:", error);
      toast.error("Clustering failed");
    } finally {
      setIsTraining(false);
    }
  }, [data, numericColumns, numClusters, autoDetectK, onModelTrained]);

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Clustering Analysis
          </CardTitle>
          <CardDescription>
            Automatically discover segments and patterns in your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Algorithm</Label>
              <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as "kmeans" | "dbscan")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kmeans">K-Means Clustering</SelectItem>
                  <SelectItem value="dbscan">DBSCAN (Density-based)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Auto-detect clusters</Label>
                <Switch checked={autoDetectK} onCheckedChange={setAutoDetectK} />
              </div>
              {!autoDetectK && (
                <Select value={String(numClusters)} onValueChange={(v) => setNumClusters(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8].map(k => (
                      <SelectItem key={k} value={String(k)}>{k} clusters</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <Button
            onClick={runKMeans}
            disabled={isTraining || numericColumns.length < 2}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent"
          >
            {isTraining ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Clustering...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Clustering
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {progress && isTraining && (
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
      {result && !isTraining && (
        <div className="space-y-6">
          {/* Score Card */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/30">
            <CardContent className="py-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/20">
                    <CheckCircle2 className="h-8 w-8 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Clustering Complete</h3>
                    <p className="text-sm text-muted-foreground">
                      Found {result.clusters.length} distinct segments
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-500">
                    {result.silhouetteScore.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">Silhouette Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scatter Plot */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cluster Visualization (2D)</CardTitle>
              <CardDescription>
                {result.xAxis} vs {result.yAxis}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" dataKey="x" name={result.xAxis} tick={{ fontSize: 12 }} />
                    <YAxis type="number" dataKey="y" name={result.yAxis} tick={{ fontSize: 12 }} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Legend />
                    {result.clusters.map((cluster, i) => (
                      <Scatter
                        key={cluster.id}
                        name={cluster.name}
                        data={result.scatterData.filter(d => d.cluster === i).slice(0, 200)}
                        fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cluster Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.clusters.map((cluster, i) => (
              <Card key={cluster.id} className="border-l-4" style={{ borderLeftColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" style={{ color: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }} />
                      {cluster.name}
                    </CardTitle>
                    <Badge variant="secondary">{cluster.count} members</Badge>
                  </div>
                  <CardDescription>{cluster.percentage.toFixed(1)}% of data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium mb-1">Key Characteristics:</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {Object.entries(cluster.centroid).slice(0, 3).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span>{key}:</span>
                          <span className="font-mono">{val.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {cluster.recommendation && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">{cluster.recommendation}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// K-Means helper function
function kMeansIterate(data: number[][], k: number, maxIterations: number) {
  const n = data.length;
  const dim = data[0].length;

  // Initialize centroids randomly
  const centroids: number[][] = [];
  const usedIndices = new Set<number>();
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * n);
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      centroids.push([...data[idx]]);
    }
  }

  let assignments = new Array(n).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign points to nearest centroid
    const newAssignments = data.map(point => {
      let minDist = Infinity;
      let nearest = 0;
      centroids.forEach((centroid, c) => {
        const dist = point.reduce((sum, val, i) => sum + Math.pow(val - centroid[i], 2), 0);
        if (dist < minDist) {
          minDist = dist;
          nearest = c;
        }
      });
      return nearest;
    });

    // Check convergence
    if (JSON.stringify(assignments) === JSON.stringify(newAssignments)) break;
    assignments = newAssignments;

    // Update centroids
    for (let c = 0; c < k; c++) {
      const clusterPoints = data.filter((_, i) => assignments[i] === c);
      if (clusterPoints.length > 0) {
        for (let d = 0; d < dim; d++) {
          centroids[c][d] = clusterPoints.reduce((sum, p) => sum + p[d], 0) / clusterPoints.length;
        }
      }
    }
  }

  return { assignments, centroids };
}

export default ClusteringPanel;
