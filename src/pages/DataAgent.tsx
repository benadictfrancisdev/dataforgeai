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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Table, BarChart3, MessageSquare, PieChart, Loader2, FileText } from "lucide-react";

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-24">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              AI Data
              <span className="block bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Agent
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your data and let our AI agents clean, validate, analyze, and help you explore insights.
            </p>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-8 bg-card/50 p-1">
              <TabsTrigger 
                value="upload" 
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload</span>
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                disabled={!dataset}
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Table className="w-4 h-4" />
                <span className="hidden sm:inline">Preview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="visualize" 
                disabled={!dataset}
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <PieChart className="w-4 h-4" />
                <span className="hidden sm:inline">Visualize</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analyze" 
                disabled={!dataset}
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analyze</span>
              </TabsTrigger>
              <TabsTrigger 
                value="report" 
                disabled={!dataset}
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Report</span>
              </TabsTrigger>
              <TabsTrigger 
                value="chat" 
                disabled={!dataset}
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-0">
              <DataUpload onDataLoaded={handleDataLoaded} />
            </TabsContent>

            <TabsContent value="preview" className="mt-0">
              {dataset && (
                <DataPreview 
                  dataset={dataset} 
                  onDataCleaned={handleDataCleaned}
                />
              )}
            </TabsContent>

            <TabsContent value="visualize" className="mt-0">
              {dataset && <VisualizationDashboard dataset={dataset} />}
            </TabsContent>

            <TabsContent value="analyze" className="mt-0">
              {dataset && <AnalysisPanel dataset={dataset} />}
            </TabsContent>

            <TabsContent value="report" className="mt-0">
              {dataset && <ReportGenerator dataset={dataset} />}
            </TabsContent>

            <TabsContent value="chat" className="mt-0">
              {dataset && <DataChat dataset={dataset} />}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DataAgent;
