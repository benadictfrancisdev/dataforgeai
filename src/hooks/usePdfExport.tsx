import { useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface ExportOptions {
  title: string;
  subtitle?: string;
  datasetName?: string;
  sections?: {
    title: string;
    content: string | string[];
    type?: "text" | "list" | "table";
    tableData?: { headers: string[]; rows: string[][] };
  }[];
  statistics?: Record<string, string | number>;
  insights?: { title: string; description: string; importance?: string }[];
  recommendations?: string[];
  footer?: string;
}

export const usePdfExport = () => {
  const exportToPdf = useCallback((options: ExportOptions) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Helper function to add new page if needed
      const checkNewPage = (height: number) => {
        if (yPosition + height > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Header with gradient-like effect
      pdf.setFillColor(99, 102, 241); // Primary color
      pdf.rect(0, 0, pageWidth, 40, "F");
      
      // Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text(options.title, margin, 25);

      // Subtitle
      if (options.subtitle) {
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        pdf.text(options.subtitle, margin, 34);
      }

      yPosition = 55;

      // Dataset info
      if (options.datasetName) {
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(10);
        pdf.text(`Dataset: ${options.datasetName}`, margin, yPosition);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 60, yPosition);
        yPosition += 15;
      }

      // Sections
      if (options.sections) {
        for (const section of options.sections) {
          checkNewPage(30);

          // Section title
          pdf.setTextColor(99, 102, 241);
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.text(section.title, margin, yPosition);
          yPosition += 8;

          pdf.setTextColor(60, 60, 60);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");

          if (section.type === "table" && section.tableData) {
            autoTable(pdf, {
              startY: yPosition,
              head: [section.tableData.headers],
              body: section.tableData.rows,
              margin: { left: margin, right: margin },
              styles: { fontSize: 9, cellPadding: 3 },
              headStyles: { fillColor: [99, 102, 241], textColor: 255 },
              alternateRowStyles: { fillColor: [245, 245, 250] },
            });
            yPosition = (pdf as any).lastAutoTable.finalY + 10;
          } else if (section.type === "list" && Array.isArray(section.content)) {
            for (const item of section.content) {
              checkNewPage(8);
              const lines = pdf.splitTextToSize(`• ${item}`, pageWidth - margin * 2 - 5);
              pdf.text(lines, margin + 5, yPosition);
              yPosition += lines.length * 5 + 3;
            }
            yPosition += 5;
          } else {
            const content = Array.isArray(section.content) ? section.content.join("\n") : section.content;
            const lines = pdf.splitTextToSize(content, pageWidth - margin * 2);
            for (const line of lines) {
              checkNewPage(6);
              pdf.text(line, margin, yPosition);
              yPosition += 5;
            }
            yPosition += 8;
          }
        }
      }

      // Statistics
      if (options.statistics && Object.keys(options.statistics).length > 0) {
        checkNewPage(40);
        pdf.setTextColor(99, 102, 241);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Key Statistics", margin, yPosition);
        yPosition += 10;

        const statsData = Object.entries(options.statistics).map(([key, value]) => [
          key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          String(value),
        ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [["Metric", "Value"]],
          body: statsData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 10, cellPadding: 4 },
          headStyles: { fillColor: [99, 102, 241], textColor: 255 },
          columnStyles: { 0: { fontStyle: "bold" } },
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 10;
      }

      // Insights
      if (options.insights && options.insights.length > 0) {
        checkNewPage(30);
        pdf.setTextColor(99, 102, 241);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Key Insights", margin, yPosition);
        yPosition += 10;

        for (const insight of options.insights) {
          checkNewPage(20);
          pdf.setTextColor(40, 40, 40);
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          const titleText = insight.importance ? `[${insight.importance.toUpperCase()}] ${insight.title}` : insight.title;
          pdf.text(titleText, margin, yPosition);
          yPosition += 6;

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(80, 80, 80);
          const descLines = pdf.splitTextToSize(insight.description, pageWidth - margin * 2);
          pdf.text(descLines, margin, yPosition);
          yPosition += descLines.length * 5 + 8;
        }
      }

      // Recommendations
      if (options.recommendations && options.recommendations.length > 0) {
        checkNewPage(30);
        pdf.setTextColor(99, 102, 241);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Recommendations", margin, yPosition);
        yPosition += 10;

        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");

        options.recommendations.forEach((rec, index) => {
          checkNewPage(10);
          const lines = pdf.splitTextToSize(`${index + 1}. ${rec}`, pageWidth - margin * 2 - 5);
          pdf.text(lines, margin, yPosition);
          yPosition += lines.length * 5 + 4;
        });
      }

      // Footer on each page
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `AIDataForge Report - Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
        if (options.footer) {
          pdf.text(options.footer, margin, pageHeight - 10);
        }
      }

      // Save the PDF
      const filename = `${options.title.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF. Please try again.");
    }
  }, []);

  return { exportToPdf };
};

export default usePdfExport;
