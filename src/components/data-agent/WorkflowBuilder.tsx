import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { 
  Database, 
  FileSpreadsheet, 
  Globe, 
  Cloud, 
  Link2, 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Settings,
  RefreshCw,
  ArrowRight,
  Zap,
  Table,
  FileJson,
  FileText,
  Server,
  Webhook
} from "lucide-react";
import { DatasetState } from "@/pages/DataAgent";

interface DataConnector {
  id: string;
  name: string;
  type: ConnectorType;
  icon: React.ElementType;
  description: string;
  status: "connected" | "disconnected" | "error";
  config: Record<string, string>;
  lastSync?: string;
}

type ConnectorType = "google_sheets" | "csv_url" | "json_api" | "database" | "webhook" | "s3" | "airtable" | "notion";

interface WorkflowStep {
  id: string;
  name: string;
  type: "source" | "transform" | "output";
  connectorId?: string;
  config: Record<string, unknown>;
}

interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  schedule?: string;
  isActive: boolean;
}

interface WorkflowBuilderProps {
  onDataLoaded: (data: DatasetState) => void;
}

const CONNECTOR_TEMPLATES: Omit<DataConnector, "id" | "status" | "config" | "lastSync">[] = [
  {
    name: "Google Sheets",
    type: "google_sheets",
    icon: FileSpreadsheet,
    description: "Import data directly from Google Sheets"
  },
  {
    name: "CSV URL",
    type: "csv_url",
    icon: Link2,
    description: "Fetch CSV data from any public URL"
  },
  {
    name: "JSON API",
    type: "json_api",
    icon: FileJson,
    description: "Connect to REST APIs returning JSON"
  },
  {
    name: "Database",
    type: "database",
    icon: Database,
    description: "Connect to PostgreSQL, MySQL, or SQLite"
  },
  {
    name: "Webhook",
    type: "webhook",
    icon: Webhook,
    description: "Receive data via webhook endpoint"
  },
  {
    name: "Amazon S3",
    type: "s3",
    icon: Cloud,
    description: "Import files from S3 buckets"
  },
  {
    name: "Airtable",
    type: "airtable",
    icon: Table,
    description: "Sync data from Airtable bases"
  },
  {
    name: "Notion",
    type: "notion",
    icon: FileText,
    description: "Import databases from Notion"
  }
];

const WorkflowBuilder = ({ onDataLoaded }: WorkflowBuilderProps) => {
  const [connectors, setConnectors] = useState<DataConnector[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorType | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("connectors");
  
  // Form states for different connector types
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});

  const handleAddConnector = async () => {
    if (!selectedConnector) return;
    
    setIsConnecting(true);
    
    // Simulate connection process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const template = CONNECTOR_TEMPLATES.find(t => t.type === selectedConnector);
    if (!template) return;

    const newConnector: DataConnector = {
      id: `connector_${Date.now()}`,
      name: formConfig.name || template.name,
      type: selectedConnector,
      icon: template.icon,
      description: template.description,
      status: "connected",
      config: { ...formConfig },
      lastSync: new Date().toISOString()
    };

    setConnectors(prev => [...prev, newConnector]);
    setFormConfig({});
    setSelectedConnector(null);
    setIsConnecting(false);

    toast({
      title: "Connector Added",
      description: `${newConnector.name} has been connected successfully.`
    });
  };

  const handleSyncConnector = async (connectorId: string) => {
    setIsSyncing(connectorId);
    const connector = connectors.find(c => c.id === connectorId);
    
    if (!connector) return;

    // Simulate syncing and fetching data
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate sample data based on connector type
    const sampleData = generateSampleData(connector.type);
    
    setConnectors(prev => prev.map(c => 
      c.id === connectorId 
        ? { ...c, lastSync: new Date().toISOString() }
        : c
    ));

    setIsSyncing(null);

    // Load the data into the platform
    onDataLoaded({
      name: `${connector.name} Import`,
      rawData: sampleData,
      columns: Object.keys(sampleData[0] || {}),
      status: "imported"
    });

    toast({
      title: "Data Synced",
      description: `${sampleData.length} records imported from ${connector.name}.`
    });
  };

  const handleRemoveConnector = (connectorId: string) => {
    setConnectors(prev => prev.filter(c => c.id !== connectorId));
    toast({
      title: "Connector Removed",
      description: "Data connector has been disconnected."
    });
  };

  const generateSampleData = (type: ConnectorType): Record<string, unknown>[] => {
    // Generate realistic sample data based on connector type
    const baseData = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    switch (type) {
      case "google_sheets":
        return baseData.map(row => ({
          ...row,
          name: `Product ${row.id}`,
          category: ["Electronics", "Clothing", "Food", "Home"][Math.floor(Math.random() * 4)],
          price: Math.round(Math.random() * 500 + 10),
          quantity: Math.floor(Math.random() * 100),
          revenue: Math.round(Math.random() * 10000)
        }));
      case "json_api":
        return baseData.map(row => ({
          ...row,
          user_id: `user_${Math.floor(Math.random() * 1000)}`,
          event_type: ["click", "view", "purchase", "signup"][Math.floor(Math.random() * 4)],
          value: Math.round(Math.random() * 100),
          session_duration: Math.floor(Math.random() * 3600)
        }));
      case "database":
        return baseData.map(row => ({
          ...row,
          customer_name: `Customer ${row.id}`,
          email: `customer${row.id}@example.com`,
          total_orders: Math.floor(Math.random() * 50),
          lifetime_value: Math.round(Math.random() * 5000),
          status: ["active", "inactive", "pending"][Math.floor(Math.random() * 3)]
        }));
      default:
        return baseData.map(row => ({
          ...row,
          metric: Math.round(Math.random() * 1000),
          label: `Item ${row.id}`,
          value: Math.random() * 100
        }));
    }
  };

  const renderConnectorForm = () => {
    if (!selectedConnector) return null;

    switch (selectedConnector) {
      case "google_sheets":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Connection Name</Label>
              <Input 
                placeholder="My Google Sheet"
                value={formConfig.name || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Spreadsheet URL</Label>
              <Input 
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={formConfig.url || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Sheet Name (optional)</Label>
              <Input 
                placeholder="Sheet1"
                value={formConfig.sheet || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, sheet: e.target.value }))}
              />
            </div>
          </div>
        );

      case "csv_url":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Connection Name</Label>
              <Input 
                placeholder="My CSV Data"
                value={formConfig.name || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>CSV URL</Label>
              <Input 
                placeholder="https://example.com/data.csv"
                value={formConfig.url || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={formConfig.hasHeaders === "true"}
                onCheckedChange={(checked) => setFormConfig(prev => ({ ...prev, hasHeaders: String(checked) }))}
              />
              <Label>First row contains headers</Label>
            </div>
          </div>
        );

      case "json_api":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Connection Name</Label>
              <Input 
                placeholder="My API Connection"
                value={formConfig.name || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>API Endpoint URL</Label>
              <Input 
                placeholder="https://api.example.com/data"
                value={formConfig.url || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>HTTP Method</Label>
              <Select 
                value={formConfig.method || "GET"} 
                onValueChange={(value) => setFormConfig(prev => ({ ...prev, method: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Key (optional)</Label>
              <Input 
                type="password"
                placeholder="Your API key"
                value={formConfig.apiKey || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>JSON Path (optional)</Label>
              <Input 
                placeholder="data.items"
                value={formConfig.jsonPath || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, jsonPath: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Path to the array in the JSON response</p>
            </div>
          </div>
        );

      case "database":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Connection Name</Label>
              <Input 
                placeholder="My Database"
                value={formConfig.name || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Database Type</Label>
              <Select 
                value={formConfig.dbType || ""} 
                onValueChange={(value) => setFormConfig(prev => ({ ...prev, dbType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="sqlite">SQLite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Connection String</Label>
              <Input 
                type="password"
                placeholder="postgresql://user:pass@host:5432/db"
                value={formConfig.connectionString || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, connectionString: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Query</Label>
              <Input 
                placeholder="SELECT * FROM table_name"
                value={formConfig.query || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, query: e.target.value }))}
              />
            </div>
          </div>
        );

      case "webhook":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Connection Name</Label>
              <Input 
                placeholder="My Webhook"
                value={formConfig.name || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium mb-2">Your Webhook URL</p>
              <code className="text-xs bg-background px-2 py-1 rounded">
                https://api.dataagent.io/webhook/{formConfig.name?.toLowerCase().replace(/\s+/g, '-') || 'my-webhook'}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Send POST requests to this URL to push data
              </p>
            </div>
          </div>
        );

      case "s3":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Connection Name</Label>
              <Input 
                placeholder="My S3 Bucket"
                value={formConfig.name || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Bucket Name</Label>
              <Input 
                placeholder="my-bucket"
                value={formConfig.bucket || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, bucket: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select 
                value={formConfig.region || ""} 
                onValueChange={(value) => setFormConfig(prev => ({ ...prev, region: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                  <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Access Key ID</Label>
              <Input 
                type="password"
                placeholder="AKIA..."
                value={formConfig.accessKey || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, accessKey: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Secret Access Key</Label>
              <Input 
                type="password"
                placeholder="Your secret key"
                value={formConfig.secretKey || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, secretKey: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>File Path/Prefix</Label>
              <Input 
                placeholder="data/exports/"
                value={formConfig.prefix || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, prefix: e.target.value }))}
              />
            </div>
          </div>
        );

      case "airtable":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Connection Name</Label>
              <Input 
                placeholder="My Airtable Base"
                value={formConfig.name || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input 
                type="password"
                placeholder="key..."
                value={formConfig.apiKey || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Base ID</Label>
              <Input 
                placeholder="app..."
                value={formConfig.baseId || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, baseId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Table Name</Label>
              <Input 
                placeholder="Table 1"
                value={formConfig.tableName || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, tableName: e.target.value }))}
              />
            </div>
          </div>
        );

      case "notion":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Connection Name</Label>
              <Input 
                placeholder="My Notion Database"
                value={formConfig.name || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Integration Token</Label>
              <Input 
                type="password"
                placeholder="secret_..."
                value={formConfig.token || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, token: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Database ID</Label>
              <Input 
                placeholder="Database ID from URL"
                value={formConfig.databaseId || ""}
                onChange={(e) => setFormConfig(prev => ({ ...prev, databaseId: e.target.value }))}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-card">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Workflow Builder & Data Connectors
              </CardTitle>
              <CardDescription>
                Connect to external data sources and build automated workflows
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Globe className="w-3 h-3" />
              {connectors.filter(c => c.status === "connected").length} Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 w-full max-w-md mb-6">
              <TabsTrigger value="connectors" className="gap-2">
                <Link2 className="w-4 h-4" />
                Data Connectors
              </TabsTrigger>
              <TabsTrigger value="workflows" className="gap-2">
                <Settings className="w-4 h-4" />
                Workflows
              </TabsTrigger>
            </TabsList>

            <TabsContent value="connectors" className="space-y-6">
              {/* Add New Connector */}
              <Card className="border-dashed border-2 border-border bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Data Connector
                  </CardTitle>
                  <CardDescription>
                    Choose a data source to connect
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedConnector ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {CONNECTOR_TEMPLATES.map((template) => {
                        const Icon = template.icon;
                        return (
                          <button
                            key={template.type}
                            onClick={() => setSelectedConnector(template.type)}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-sm font-medium text-center">{template.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                        {(() => {
                          const template = CONNECTOR_TEMPLATES.find(t => t.type === selectedConnector);
                          const Icon = template?.icon || Database;
                          return (
                            <>
                              <Icon className="w-5 h-5 text-primary" />
                              <div>
                                <p className="font-medium">{template?.name}</p>
                                <p className="text-xs text-muted-foreground">{template?.description}</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {renderConnectorForm()}

                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setSelectedConnector(null);
                            setFormConfig({});
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddConnector}
                          disabled={isConnecting}
                          className="gap-2"
                        >
                          {isConnecting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Connect
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Connected Sources */}
              {connectors.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Connected Sources</h3>
                  <div className="grid gap-4">
                    {connectors.map((connector) => {
                      const Icon = connector.icon;
                      return (
                        <Card key={connector.id} className="border-border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                  <Icon className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{connector.name}</h4>
                                    <Badge 
                                      variant={connector.status === "connected" ? "default" : "destructive"}
                                      className="text-xs"
                                    >
                                      {connector.status === "connected" ? (
                                        <><CheckCircle2 className="w-3 h-3 mr-1" />Connected</>
                                      ) : (
                                        <><AlertCircle className="w-3 h-3 mr-1" />Error</>
                                      )}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {connector.lastSync 
                                      ? `Last synced: ${new Date(connector.lastSync).toLocaleString()}`
                                      : "Never synced"
                                    }
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSyncConnector(connector.id)}
                                  disabled={isSyncing === connector.id}
                                  className="gap-2"
                                >
                                  {isSyncing === connector.id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Syncing...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="w-4 h-4" />
                                      Sync Now
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveConnector(connector.id)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {connectors.length === 0 && !selectedConnector && (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No data connectors configured yet.</p>
                  <p className="text-sm">Add a connector above to import data from external sources.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="workflows" className="space-y-6">
              {/* Workflow Builder */}
              <Card className="border-dashed border-2 border-border bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Create Automation Workflow
                  </CardTitle>
                  <CardDescription>
                    Build automated data pipelines with scheduled syncs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Workflow Steps */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-primary bg-primary/10">
                        <Database className="w-5 h-5 text-primary" />
                        <span className="font-medium">Data Source</span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card">
                        <Settings className="w-5 h-5 text-muted-foreground" />
                        <span>Transform</span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card">
                        <Server className="w-5 h-5 text-muted-foreground" />
                        <span>Output</span>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Source Connector</Label>
                        <Select disabled={connectors.length === 0}>
                          <SelectTrigger>
                            <SelectValue placeholder={connectors.length === 0 ? "Add connector first" : "Select source"} />
                          </SelectTrigger>
                          <SelectContent>
                            {connectors.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Transform Action</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="clean">Clean & Validate</SelectItem>
                            <SelectItem value="aggregate">Aggregate</SelectItem>
                            <SelectItem value="filter">Filter Rows</SelectItem>
                            <SelectItem value="join">Join with Dataset</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Schedule</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select schedule" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="hourly">Every Hour</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button className="gap-2" disabled={connectors.length === 0}>
                      <Play className="w-4 h-4" />
                      Create Workflow
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {workflows.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No workflows created yet.</p>
                  <p className="text-sm">Create a workflow to automate data imports and transformations.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowBuilder;
