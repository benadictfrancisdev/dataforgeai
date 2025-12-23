import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, Table, BarChart3, MessageSquare, PieChart, Loader2, FileText, Sparkles, Activity, LayoutDashboard, Zap } from "lucide-react";

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
  const [dataset, setDataset] = useState<DatasetState | null>(null);
  const [activeTab, setActiveTab] = useState("upload");

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-glow animate-pulse">
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
    { value: "preview", label: "Preview", icon: Table, requiresData: true },
    { value: "nlp", label: "NLP Engine", icon: Zap, requiresData: true },
    { value: "visualize", label: "Visualize", icon: PieChart, requiresData: true },
    { value: "dashboard", label: "Dashboard", icon: LayoutDashboard, requiresData: true },
    { value: "predict", label: "Predict", icon: Activity, requiresData: true },
    { value: "analyze", label: "Analyze", icon: BarChart3, requiresData: true },
    { value: "report", label: "Report", icon: FileText, requiresData: true },
    { value: "chat", label: "Chat", icon: MessageSquare, requiresData: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10 sm:mb-14 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Analytics</span>
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
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {dataset.name} • {dataset.rawData.length.toLocaleString()} rows • {dataset.columns.length} columns
                {dataset.status === "cleaned" && (
                  <Badge className="ml-2 bg-primary/20 text-primary border-0">Cleaned</Badge>
                )}
              </Badge>
            </div>
          )}

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full flex flex-wrap justify-center gap-1 sm:gap-2 mb-8 bg-card/80 backdrop-blur-sm p-2 rounded-2xl border border-border shadow-card">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isDisabled = tab.requiresData && !dataset;
                return (
                  <TabsTrigger 
                    key={tab.value}
                    value={tab.value} 
                    disabled={isDisabled}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-button ${
                      isDisabled ? 'opacity-50' : ''
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline font-medium">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <div className="animate-fade-in">
              <TabsContent value="upload" className="mt-0 focus-visible:outline-none">
                <DataUpload onDataLoaded={handleDataLoaded} />
              </TabsContent>

              <TabsContent value="preview" className="mt-0 focus-visible:outline-none">
                {dataset && (
                  <DataPreview 
                    dataset={dataset} 
                    onDataCleaned={handleDataCleaned}
                  />
                )}
              </TabsContent>

              <TabsContent value="visualize" className="mt-0 focus-visible:outline-none">
                {dataset && <VisualizationDashboard dataset={dataset} />}
              </TabsContent>

              <TabsContent value="analyze" className="mt-0 focus-visible:outline-none">
                {dataset && <AnalysisPanel dataset={dataset} />}
              </TabsContent>

              <TabsContent value="report" className="mt-0 focus-visible:outline-none">
                {dataset && <ReportGenerator dataset={dataset} />}
              </TabsContent>

              <TabsContent value="chat" className="mt-0 focus-visible:outline-none">
                {dataset && <DataChat dataset={dataset} />}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DataAgent;