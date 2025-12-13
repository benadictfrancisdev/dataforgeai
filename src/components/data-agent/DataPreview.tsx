import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DatasetState } from "@/pages/DataAgent";

interface DataPreviewProps {
  dataset: DatasetState;
  onDataCleaned: (cleanedData: Record<string, unknown>[]) => void;
}

interface ValidationReport {
  isValid: boolean;
  validationReport: { 
    errors: Array<string | { column?: string; message?: string }>; 
    warnings: Array<string | { column?: string; message?: string }>; 
    suggestions: Array<string | { column?: string; message?: string }>; 
  };
  columnStats?: Record<string, { type: string; nullCount: number; uniqueCount: number; issues: string[] }>;
}

interface CleaningReport {
  issuesFound: Array<string | { column?: string; message?: string }>;
  actionsTaken: Array<string | { column?: string; message?: string }>;
  rowsAffected: number;
}

// Helper function to safely render report items
const renderReportItem = (item: string | { column?: string; message?: string } | unknown): string => {
  if (typeof item === 'string') return item;
  if (typeof item === 'object' && item !== null) {
    const obj = item as { column?: string; message?: string };
    if (obj.column && obj.message) return `${obj.column}: ${obj.message}`;
    if (obj.message) return obj.message;
    return JSON.stringify(item);
  }
  return String(item);
};

const DataPreview = ({ dataset, onDataCleaned }: DataPreviewProps) => {
  const [isValidating, setIsValidating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [cleaningReport, setCleaningReport] = useState<CleaningReport | null>(null);

  const displayData = dataset.cleanedData || dataset.rawData;
  const previewRows = displayData.slice(0, 10);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('data-agent', {
        body: { 
          action: 'validate', 
          data: dataset.rawData.slice(0, 100),
          datasetName: dataset.name 
        }
      });

      if (error) throw error;
      
      // Normalize the validation report data
      const normalizedReport: ValidationReport = {
        isValid: data.isValid ?? false,
        validationReport: {
          errors: Array.isArray(data.validationReport?.errors) ? data.validationReport.errors : [],
          warnings: Array.isArray(data.validationReport?.warnings) ? data.validationReport.warnings : [],
          suggestions: Array.isArray(data.validationReport?.suggestions) ? data.validationReport.suggestions : []
        },
        columnStats: data.columnStats
      };
      
      setValidationReport(normalizedReport);
      toast.success("Validation complete!");
    } catch (error) {
      console.error("Validation error:", error);
      toast.error(error instanceof Error ? error.message : "Validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  const handleClean = async () => {
    setIsCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke('data-agent', {
        body: { 
          action: 'clean', 
          data: dataset.rawData.slice(0, 500),
          datasetName: dataset.name 
        }
      });

      if (error) throw error;
      
      if (data.cleanedData) {
        onDataCleaned(data.cleanedData);
        
        // Normalize cleaning report
        const normalizedCleaningReport: CleaningReport = {
          issuesFound: Array.isArray(data.cleaningReport?.issuesFound) ? data.cleaningReport.issuesFound : [],
          actionsTaken: Array.isArray(data.cleaningReport?.actionsTaken || data.cleaningReport?.actionsToken) 
            ? (data.cleaningReport?.actionsTaken || data.cleaningReport?.actionsToken) 
            : [],
          rowsAffected: data.cleaningReport?.rowsAffected ?? 0
        };
        
        setCleaningReport(normalizedCleaningReport);
        toast.success("Data cleaned successfully!");
      } else {
        toast.warning("Cleaning completed but no cleaned data returned");
      }
    } catch (error) {
      console.error("Cleaning error:", error);
      toast.error(error instanceof Error ? error.message : "Cleaning failed");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/50 rounded-xl p-4 border border-border/50">
        <div>
          <h3 className="font-semibold text-lg">{dataset.name}</h3>
          <p className="text-sm text-muted-foreground">
            {dataset.rawData.length} rows • {dataset.columns.length} columns
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleValidate}
            disabled={isValidating || isCleaning}
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Validate
          </Button>
          <Button 
            onClick={handleClean}
            disabled={isValidating || isCleaning}
            className="bg-gradient-to-r from-primary to-cyan-400 hover:opacity-90"
          >
            {isCleaning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            AI Clean
          </Button>
        </div>
      </div>

      {/* Validation Report */}
      {validationReport && (
        <div className="bg-card/50 rounded-xl p-4 border border-border/50 space-y-3">
          <div className="flex items-center gap-2">
            {validationReport.isValid ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle className="w-3 h-3 mr-1" /> Valid
              </Badge>
            ) : (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" /> Issues Found
              </Badge>
            )}
          </div>
          
          {validationReport.validationReport.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-destructive mb-1">Errors:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                {validationReport.validationReport.errors.map((e, i) => (
                  <li key={i}>{renderReportItem(e)}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validationReport.validationReport.warnings.length > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-400 mb-1">Warnings:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                {validationReport.validationReport.warnings.map((w, i) => (
                  <li key={i}>{renderReportItem(w)}</li>
                ))}
              </ul>
            </div>
          )}

          {validationReport.validationReport.suggestions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-primary mb-1">Suggestions:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                {validationReport.validationReport.suggestions.map((s, i) => (
                  <li key={i}>{renderReportItem(s)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Cleaning Report */}
      {cleaningReport && (
        <div className="bg-card/50 rounded-xl p-4 border border-primary/30 space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/20 text-primary border-primary/30">
              <Sparkles className="w-3 h-3 mr-1" /> Cleaned
            </Badge>
            <span className="text-sm text-muted-foreground">
              {cleaningReport.rowsAffected} rows affected
            </span>
          </div>
          
          {cleaningReport.issuesFound.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Issues Found:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                {cleaningReport.issuesFound.map((item, idx) => (
                  <li key={idx}>{renderReportItem(item)}</li>
                ))}
              </ul>
            </div>
          )}

          {cleaningReport.actionsTaken.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Actions Taken:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                {cleaningReport.actionsTaken.map((item, idx) => (
                  <li key={idx}>{renderReportItem(item)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-card/50 rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                {dataset.columns.map((col) => (
                  <TableHead key={col} className="text-foreground font-semibold whitespace-nowrap">
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, i) => (
                <TableRow key={i} className="border-border/30 hover:bg-muted/30">
                  {dataset.columns.map((col) => (
                    <TableCell key={col} className="whitespace-nowrap">
                      {String(row[col] ?? '-')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {displayData.length > 10 && (
          <div className="p-3 text-center text-sm text-muted-foreground border-t border-border/30">
            Showing 10 of {displayData.length} rows
          </div>
        )}
      </div>
    </div>
  );
};

export default DataPreview;
