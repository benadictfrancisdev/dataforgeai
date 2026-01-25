import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
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
import { MLWorkbench } from "@/components/data-agent/ml";
import { CollaborationProvider, JoinCollaborationDialog } from "@/components/data-agent/collaboration";
import { cn } from "@/lib/utils";
import { 
  Upload, 
  Table, 
  BarChart3, 
  MessageSquare, 
  PieChart, 
  Loader2, 
  FileText, 
  Activity, 
  LayoutDashboard, 
  Zap, 
  Radio, 
  Layers, 
  Link2, 
  Brain,
  ChevronRight,
  Database
} from "lucide-react";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
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
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navGroups = [
    {
      label: "Data",
      items: [
        { value: "upload", label: "Upload", icon: Upload },
        { value: "connect", label: "Connect", icon: Link2 },
        { value: "preview", label: "Preview", icon: Table, requiresData: true },
      ]
    },
    {
      label: "Analysis",
      items: [
        { value: "nlp", label: "NLP Engine", icon: Zap, requiresData: true },
        { value: "analyze", label: "Analyze", icon: BarChart3, requiresData: true },
        { value: "predict", label: "Predict", icon: Activity, requiresData: true },
        { value: "ml", label: "ML Workbench", icon: Brain, requiresData: true },
      ]
    },
    {
      label: "Visualize",
      items: [
        { value: "powerbi", label: "Dashboard", icon: Layers, requiresData: true },
        { value: "visualize", label: "Charts", icon: PieChart, requiresData: true },
        { value: "dashboard", label: "Auto Dashboard", icon: LayoutDashboard, requiresData: true },
        { value: "stream", label: "Live Stream", icon: Radio, requiresData: true },
      ]
    },
    {
      label: "Export",
      items: [
        { value: "report", label: "Report", icon: FileText, requiresData: true },
        { value: "chat", label: "Chat", icon: MessageSquare, requiresData: true },
      ]
    },
  ];

  return (
    <CollaborationProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        
        <div className="flex-1 flex pt-16">
          {/* Linear-style Sidebar */}
          <aside 
            data-onboarding="sidebar"
            className={cn(
              "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card border-r border-border z-40 transition-all duration-200 flex flex-col",
              sidebarCollapsed ? "w-16" : "w-56"
            )}
          >
            {/* Sidebar Header */}
            <div className="p-3 border-b border-border">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary transition-colors"
              >
                <Database className="w-4 h-4 text-primary shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="text-sm font-semibold text-foreground flex-1 text-left">Data Agent</span>
                    <ChevronRight className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      !sidebarCollapsed && "rotate-180"
                    )} />
                  </>
                )}
              </button>
            </div>

            {/* Dataset Badge */}
            {dataset && !sidebarCollapsed && (
              <div className="px-3 py-2 border-b border-border">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-secondary/50 rounded-md">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{dataset.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {dataset.rawData.length.toLocaleString()} rows • {dataset.columns.length} cols
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Groups */}
            <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
              {navGroups.map((group) => (
                <div key={group.label} className="mb-1">
                  {!sidebarCollapsed && (
                    <div className="px-4 py-2">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.label}
                      </span>
                    </div>
                  )}
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.value;
                    const isDisabled = item.requiresData && !dataset;
                    
                    return (
                      <button
                        key={item.value}
                        onClick={() => !isDisabled && setActiveTab(item.value)}
                        disabled={isDisabled}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 text-sm transition-all duration-150",
                          sidebarCollapsed && "justify-center px-2",
                          isActive 
                            ? "bg-primary/10 text-primary border-r-2 border-primary" 
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                          isDisabled && "opacity-40 cursor-not-allowed"
                        )}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
                        {!sidebarCollapsed && (
                          <span className={cn("font-medium", isActive && "text-primary")}>
                            {item.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Collaboration */}
            <div className="p-3 border-t border-border">
              <JoinCollaborationDialog datasetName={dataset?.name} />
            </div>
          </aside>

          {/* Main Content */}
          <main 
            className={cn(
              "flex-1 transition-all duration-200",
              sidebarCollapsed ? "ml-16" : "ml-56"
            )}
          >
            <div className="max-w-6xl mx-auto p-6">
              {/* Page Header */}
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-foreground tracking-tight">
                  {navGroups.flatMap(g => g.items).find(t => t.value === activeTab)?.label || "Data Agent"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeTab === "upload" && "Upload your data files to get started"}
                  {activeTab === "connect" && "Connect to external data sources"}
                  {activeTab === "preview" && "Preview and clean your dataset"}
                  {activeTab === "nlp" && "Query your data using natural language"}
                  {activeTab === "powerbi" && "Build interactive dashboards"}
                  {activeTab === "stream" && "Monitor real-time data streams"}
                  {activeTab === "visualize" && "Create custom visualizations"}
                  {activeTab === "dashboard" && "Auto-generate insights dashboard"}
                  {activeTab === "ml" && "Train and deploy ML models"}
                  {activeTab === "predict" && "Generate predictive analytics"}
                  {activeTab === "analyze" && "Deep dive into your data"}
                  {activeTab === "report" && "Generate and export reports"}
                  {activeTab === "chat" && "Chat with your data"}
                </p>
              </div>

              {/* Content Panels */}
              <div className="animate-fade-in">
                <div className={activeTab === "upload" ? "block" : "hidden"}>
                  <DataUpload onDataLoaded={handleDataLoaded} />
                </div>

                <div className={activeTab === "connect" ? "block" : "hidden"}>
                  <WorkflowBuilder onDataLoaded={handleDataLoaded} />
                </div>

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

                <div className={activeTab === "ml" ? "block" : "hidden"}>
                  {dataset && (
                    <MLWorkbench
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
            </div>
          </main>
        </div>
      </div>
    </CollaborationProvider>
  );
};

export default DataAgent;