import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DataUpload from "@/components/data-agent/DataUpload";
import DataPreview from "@/components/data-agent/DataPreview";
import AnalysisPanel from "@/components/data-agent/AnalysisPanel";
import DataChat from "@/components/data-agent/DataChat";
import VisualizationDashboard from "@/components/data-agent/VisualizationDashboard";
import ReportGenerator from "@/components/data-agent/ReportGenerator";
import NaturalLanguageEngine from "@/components/data-agent/NaturalLanguageEngine";
import PredictiveAnalytics from "@/components/data-agent/PredictiveAnalytics";
import AutoDashboard from "@/components/data-agent/AutoDashboard";
import RealTimeStream from "@/components/data-agent/RealTimeStream";
import PowerBIDashboard from "@/components/data-agent/PowerBIDashboard";
import WorkflowBuilder from "@/components/data-agent/WorkflowBuilder";
import { CollaborationProvider, JoinCollaborationDialog } from "@/components/data-agent/collaboration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, Table, BarChart3, MessageSquare, PieChart, Loader2, FileText, Sparkles, Activity, LayoutDashboard, Zap, Radio, Layers, Link2 } from "lucide-react";

export interface DatasetState {
  id?: string;
  name: string;
  rawData: Record<string, unknown>[];
  cleanedData?: Record<string, unknown>[];
  columns: string[];
  status: string;
}

const DataAgent = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [dataset, setDataset] = useState<DatasetState | null>(null);
  const [activeTab, setActiveTab] = useState("upload");
  
  // Check for room parameter in URL (for joining via shared link)
  const roomFromUrl = searchParams.get("room");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleDataLoaded = (data: DatasetState) => {
    setDataset(data);
    setActiveTab("preview");
  };

  const handleDataCleaned = (cleanedData: Record<string, unknown>[]) => {
    if (dataset) {
      setDataset({ ...dataset, cleanedData, status: "cleaned" });
    }
  };

  const getColumnTypes = () => {
    if (!dataset) return {};
    return dataset.columns.reduce((acc, col) => {
      const sampleValues = (dataset.cleanedData || dataset.rawData).slice(0, 10).map(row => row[col]);
      const numericCount = sampleValues.filter(v => !isNaN(Number(v))).length;
      acc[col] = numericCount > 7 ? "numeric" : "categorical";
      return acc;
    }, {} as Record<string, "numeric" | "categorical" | "date">);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow animate-pulse">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { value: "upload", label: "Upload", icon: Upload },
    { value: "connect", label: "Connect", icon: Link2 },
    { value: "preview", label: "Preview", icon: Table, requiresData: true },
    { value: "nlp", label: "NLP Engine", icon: Zap, requiresData: true },
    { value: "powerbi", label: "Power BI", icon: Layers, requiresData: true },
    { value: "stream", label: "Live Stream", icon: Radio, requiresData: true },
    { value: "visualize", label: "Visualize", icon: PieChart, requiresData: true },
    { value: "dashboard", label: "Dashboard", icon: LayoutDashboard, requiresData: true },
    { value: "predict", label: "Predict", icon: Activity, requiresData: true },
    { value: "analyze", label: "Analyze", icon: BarChart3, requiresData: true },
    { value: "report", label: "Report", icon: FileText, requiresData: true },
    { value: "chat", label: "Chat", icon: MessageSquare, requiresData: true },
  ];

  return (
    <CollaborationProvider>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10 sm:mb-14 animate-fade-in">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">AI-Powered Analytics</span>
                </div>
                <JoinCollaborationDialog datasetName={dataset?.name} />
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
                AI Data
                <span className="block gradient-text">
                  Agent
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Upload your data and let our AI agents clean, validate, analyze, and help you explore actionable insights.
              </p>
            </div>

            {/* Dataset Info Badge */}
            {dataset && (
              <div className="flex justify-center mb-6 animate-slide-up">
                <Badge variant="secondary" className="px-4 py-2 text-sm gap-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  {dataset.name} • {dataset.rawData.length.toLocaleString()} rows • {dataset.columns.length} columns
                  {dataset.status === "cleaned" && (
                    <Badge className="ml-2 bg-primary/20 text-primary border-0">Cleaned</Badge>
                  )}
                </Badge>
              </div>
            )}

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Fixed two-row grid layout */}
            <div className="mb-8">
              <TabsList className="w-full h-auto bg-card/80 backdrop-blur-sm p-3 rounded-2xl border border-border shadow-card grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isDisabled = tab.requiresData && !dataset;
                  return (
                    <TabsTrigger 
                      key={tab.value}
                      value={tab.value} 
                      disabled={isDisabled}
                      className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2.5 sm:py-2 rounded-xl transition-all text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-button h-auto ${
                        isDisabled ? 'opacity-50' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="font-medium text-center leading-tight">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <div className="animate-fade-in">
              {/* Keep components mounted to preserve state - use CSS to hide instead of conditional rendering */}
              <div className={activeTab === "upload" ? "block" : "hidden"}>
                <DataUpload onDataLoaded={handleDataLoaded} />
              </div>

              <div className={activeTab === "connect" ? "block" : "hidden"}>
                <WorkflowBuilder onDataLoaded={handleDataLoaded} />
              </div>

              {/* Data-dependent components - use CSS visibility for persistence */}
              <div className={activeTab === "preview" ? "block" : "hidden"}>
                {dataset && (
                  <DataPreview 
                    dataset={dataset} 
                    onDataCleaned={handleDataCleaned}
                  />
                )}
              </div>

              <div className={activeTab === "nlp" ? "block" : "hidden"}>
                {dataset && (
                  <NaturalLanguageEngine
                    data={dataset.cleanedData || dataset.rawData}
                    columns={dataset.columns}
                    columnTypes={getColumnTypes()}
                    datasetName={dataset.name}
                  />
                )}
              </div>

              <div className={activeTab === "powerbi" ? "block" : "hidden"}>
                {dataset && (
                  <PowerBIDashboard
                    data={dataset.cleanedData || dataset.rawData}
                    columns={dataset.columns}
                    columnTypes={getColumnTypes()}
                    datasetName={dataset.name}
                  />
                )}
              </div>

              <div className={activeTab === "stream" ? "block" : "hidden"}>
                {dataset && (
                  <RealTimeStream
                    data={dataset.cleanedData || dataset.rawData}
                    columns={dataset.columns}
                    columnTypes={getColumnTypes()}
                    datasetName={dataset.name}
                  />
                )}
              </div>

              <div className={activeTab === "visualize" ? "block" : "hidden"}>
                {dataset && <VisualizationDashboard dataset={dataset} />}
              </div>

              <div className={activeTab === "dashboard" ? "block" : "hidden"}>
                {dataset && (
                  <AutoDashboard
                    data={dataset.cleanedData || dataset.rawData}
                    columns={dataset.columns}
                    columnTypes={getColumnTypes()}
                    datasetName={dataset.name}
                  />
                )}
              </div>

              <div className={activeTab === "predict" ? "block" : "hidden"}>
                {dataset && (
                  <PredictiveAnalytics
                    data={dataset.cleanedData || dataset.rawData}
                    columns={dataset.columns}
                    columnTypes={getColumnTypes()}
                    datasetName={dataset.name}
                  />
                )}
              </div>

              <div className={activeTab === "analyze" ? "block" : "hidden"}>
                {dataset && <AnalysisPanel dataset={dataset} />}
              </div>

              <div className={activeTab === "report" ? "block" : "hidden"}>
                {dataset && <ReportGenerator dataset={dataset} />}
              </div>

              <div className={activeTab === "chat" ? "block" : "hidden"}>
                {dataset && <DataChat dataset={dataset} />}
              </div>
            </div>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
    </CollaborationProvider>
  );
};

export default DataAgent;