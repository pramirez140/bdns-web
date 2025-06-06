import { useState } from 'react';

interface ExportParams {
  query?: string;
  organismos?: string[];
  region?: string[];
  limit?: number;
  format: 'xlsx' | 'csv';
}

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = async (params: ExportParams) => {
    try {
      setIsExporting(true);
      setError(null);

      console.log('🔄 Starting export with params:', params);

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `convocatorias_export.${params.format}`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Export completed successfully:', filename);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      console.error('❌ Export error:', errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportData,
    isExporting,
    error,
    clearError: () => setError(null),
  };
}