import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { DatasetState } from "@/pages/DataAgent";

interface DataUploadProps {
  onDataLoaded: (data: DatasetState) => void;
}

const DataUpload = ({ onDataLoaded }: DataUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const parseCSV = (text: string): Record<string, unknown>[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ''));
    const data: Record<string, unknown>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        const value = values[index] || '';
        // Try to parse numbers
        const num = parseFloat(value);
        row[header] = !isNaN(num) && value !== '' ? num : value;
      });
      data.push(row);
    }
    
    return data;
  };

  const parseJSON = (text: string): Record<string, unknown>[] => {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  };

  const processFile = async (file: File) => {
    if (!user) {
      toast.error("Please sign in to upload data");
      return;
    }

    setIsLoading(true);
    try {
      const text = await file.text();
      let data: Record<string, unknown>[];
      
      if (file.name.endsWith('.csv')) {
        data = parseCSV(text);
      } else if (file.name.endsWith('.json')) {
        data = parseJSON(text);
      } else {
        throw new Error("Unsupported file format. Please upload CSV or JSON files.");
      }

      if (data.length === 0) {
        throw new Error("No data found in file");
      }

      const columns = Object.keys(data[0]);
      const datasetName = file.name.replace(/\.(csv|json)$/i, '');

      // Save to database
      const { data: savedDataset, error } = await supabase
        .from('datasets')
        .insert([{
          name: datasetName,
          original_filename: file.name,
          raw_data: JSON.parse(JSON.stringify(data)),
          columns: JSON.parse(JSON.stringify(columns)),
          row_count: data.length,
          column_count: columns.length,
          file_size: file.size,
          status: 'uploaded',
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      onDataLoaded({
        id: savedDataset.id,
        name: datasetName,
        rawData: data,
        columns,
        status: "uploaded"
      });

      toast.success(`Loaded ${data.length} rows from ${file.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-12
          transition-all duration-300 cursor-pointer
          ${isDragging 
            ? 'border-primary bg-primary/10 scale-[1.02]' 
            : 'border-border/50 bg-card/30 hover:border-primary/50 hover:bg-card/50'
          }
        `}
      >
        <input
          type="file"
          accept=".csv,.json"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`
            w-16 h-16 rounded-2xl flex items-center justify-center
            ${isDragging ? 'bg-primary text-primary-foreground' : 'bg-muted'}
            transition-colors duration-300
          `}>
            {isLoading ? (
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-2">
              {isDragging ? "Drop your file here" : "Upload your data"}
            </h3>
            <p className="text-muted-foreground">
              Drag & drop your CSV or JSON file, or click to browse
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Supports CSV and JSON formats</span>
          </div>
        </div>
      </div>

      {/* Sample Data Info */}
      <div className="bg-card/50 border border-border/50 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">Tips for best results</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Ensure your CSV has headers in the first row</li>
              <li>• JSON should be an array of objects with consistent keys</li>
              <li>• For large datasets, keep it under 10,000 rows for best performance</li>
              <li>• Your data is saved securely and linked to your account</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataUpload;
