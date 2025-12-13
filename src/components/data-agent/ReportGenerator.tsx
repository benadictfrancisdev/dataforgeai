import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  Download,
  Loader2,
  Sparkles,
  Calendar,
  Target,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Settings,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DatasetState } from "@/pages/DataAgent";

interface ReportGeneratorProps {
  dataset: DatasetState;
}

interface GeneratedReport {
  title: string;
  executiveSummary: string;
  introduction: string;
  objectives: string[];
  problemStatement: string;
  methodology: string;
  datasetOverview: {
    name: string;
    records: number;
    columns: number;
    dataTypes: string[];
  };
  toolsAndTechnologies: string[];
  implementationSteps: string[];
  keyFindings: string[];
  recommendations: string[];
  conclusion: string;
  futureScope: string[];
  generatedAt: string;
}

const ReportGenerator = ({ dataset }: ReportGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [projectDetails, setProjectDetails] = useState("");
  const [projectGoals, setProjectGoals] = useState("");
  const [projectStatus, setProjectStatus] = useState("in-progress");
  const [generationProgress, setGenerationProgress] = useState(0);

  const generateReport = async () => {
    setIsGenerating(true);
    setGenerationProgress(10);

    try {
      const dataToAnalyze = dataset.cleanedData || dataset.rawData;
      
      setGenerationProgress(30);
      
      const { data, error } = await supabase.functions.invoke('data-agent', {
        body: {
          action: 'generate-report',
          data: dataToAnalyze.slice(0, 200),
          datasetName: dataset.name,
          projectDetails,
          projectGoals,
          projectStatus,
          columns: dataset.columns,
        }
      });

      setGenerationProgress(70);

      if (error) throw error;

      // Parse the AI response
      const reportData: GeneratedReport = {
        title: data.title || `${dataset.name} Analysis Report`,
        executiveSummary: data.executiveSummary || data.summary || "Analysis complete.",
        introduction: data.introduction || `This report presents a comprehensive analysis of the ${dataset.name} dataset.`,
        objectives: data.objectives || ["Analyze data patterns", "Identify insights", "Provide recommendations"],
        problemStatement: data.problemStatement || "Understanding the data to derive actionable insights.",
        methodology: data.methodology || "Data was analyzed using AI-powered analysis techniques including statistical analysis and pattern recognition.",
        datasetOverview: {
          name: dataset.name,
          records: dataToAnalyze.length,
          columns: dataset.columns.length,
          dataTypes: dataset.columns.map(c => {
            const sample = dataToAnalyze[0]?.[c];
            return typeof sample === 'number' ? 'Numeric' : 'Text';
          }),
        },
        toolsAndTechnologies: data.toolsAndTechnologies || ["AI Data Analysis", "Statistical Processing", "Pattern Recognition"],
        implementationSteps: data.implementationSteps || ["Data Upload", "Data Cleaning", "Analysis", "Report Generation"],
        keyFindings: data.keyFindings || data.insights?.map((i: { title?: string; description?: string }) => i.title || i.description) || ["Analysis completed successfully"],
        recommendations: data.recommendations?.map((r: { action?: string; reason?: string }) => r.action || r.reason) || data.recommendations || ["Review the detailed findings"],
        conclusion: data.conclusion || "The analysis has been completed successfully with actionable insights provided.",
        futureScope: data.futureScope || ["Continuous monitoring", "Advanced analysis", "Predictive modeling"],
        generatedAt: new Date().toISOString(),
      };

      setReport(reportData);
      setGenerationProgress(100);
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToPDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(report.title, pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Date
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date(report.generatedAt).toLocaleDateString()}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 20;

    // Executive Summary
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Executive Summary", 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const summaryLines = doc.splitTextToSize(report.executiveSummary, pageWidth - 28);
    doc.text(summaryLines, 14, yPos);
    yPos += summaryLines.length * 5 + 10;

    // Dataset Overview Table
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Dataset Overview", 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [["Property", "Value"]],
      body: [
        ["Dataset Name", report.datasetOverview.name],
        ["Total Records", report.datasetOverview.records.toString()],
        ["Total Columns", report.datasetOverview.columns.toString()],
      ],
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
    });

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

    // Check for page break
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // Key Findings
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Key Findings", 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    report.keyFindings.forEach((finding, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const findingText = `${idx + 1}. ${finding}`;
      const lines = doc.splitTextToSize(findingText, pageWidth - 28);
      doc.text(lines, 14, yPos);
      yPos += lines.length * 5 + 3;
    });
    yPos += 10;

    // Recommendations
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Recommendations", 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    report.recommendations.forEach((rec, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const recText = `${idx + 1}. ${rec}`;
      const lines = doc.splitTextToSize(recText, pageWidth - 28);
      doc.text(lines, 14, yPos);
      yPos += lines.length * 5 + 3;
    });
    yPos += 10;

    // Conclusion
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Conclusion", 14, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const conclusionLines = doc.splitTextToSize(report.conclusion, pageWidth - 28);
    doc.text(conclusionLines, 14, yPos);

    // Save
    doc.save(`${report.title.replace(/\s+/g, '_')}_Report.pdf`);
    toast.success("PDF exported successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            AI Report Generator
          </CardTitle>
          <CardDescription>
            Generate comprehensive project reports automatically based on your dataset
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Details</label>
              <Textarea
                placeholder="Describe your project, requirements, and context..."
                value={projectDetails}
                onChange={(e) => setProjectDetails(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Goals</label>
              <Textarea
                placeholder="What are the goals and expected outcomes?"
                value={projectGoals}
                onChange={(e) => setProjectGoals(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Project Status</label>
              <Select value={projectStatus} onValueChange={setProjectStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button
                onClick={generateReport}
                disabled={isGenerating}
                className="bg-gradient-to-r from-primary to-cyan-400 hover:opacity-90"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>

          {isGenerating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Generating report...</span>
                <span>{generationProgress}%</span>
              </div>
              <Progress value={generationProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Report Preview */}
      {report && (
        <div className="space-y-4">
          {/* Report Header */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{report.title}</CardTitle>
                  <CardDescription className="mt-1">
                    Dataset: {dataset.name}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(report.generatedAt).toLocaleDateString()}
                  </Badge>
                  <Button onClick={exportToPDF} variant="outline" size="sm">
                    <FileDown className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Executive Summary */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{report.executiveSummary}</p>
            </CardContent>
          </Card>

          {/* Dataset Overview */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dataset Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold">{report.datasetOverview.records.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Records</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold">{report.datasetOverview.columns}</p>
                  <p className="text-xs text-muted-foreground">Columns</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <Badge variant="secondary" className="capitalize">{projectStatus}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">Status</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Findings */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Key Findings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {report.keyFindings.map((finding, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {report.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Conclusion */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Conclusion</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{report.conclusion}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;
