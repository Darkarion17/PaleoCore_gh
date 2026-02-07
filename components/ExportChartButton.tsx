import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ExportChartButtonProps {
  chartRef: React.RefObject<HTMLDivElement>;
  fileName: string;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info'; show: boolean; }) => void;
}

const ExportChartButton: React.FC<ExportChartButtonProps> = ({ chartRef, fileName, setToast }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!chartRef.current) {
      setToast({ message: 'Chart element not found for export.', type: 'error', show: true });
      return;
    }

    setIsExporting(true);
    setToast({ message: 'Preparando exportación de alta resolución...', type: 'info', show: true });

    try {
      // Temporarily add a class to the body to ensure consistent background during capture
      document.body.classList.add('chart-export-active');
      const chartBackgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-tertiary').trim();
      
      await new Promise(resolve => setTimeout(resolve, 50));

      const canvas = await html2canvas(chartRef.current, {
        useCORS: true,
        scale: 3, // Higher resolution
        logging: false,
        backgroundColor: chartBackgroundColor,
      });

      const link = document.createElement('a');
      link.download = `${fileName.replace(/[^a-zA-Z0-9]/g, '_')}.jpeg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
      setToast({ message: '¡Gráfico exportado con éxito!', type: 'success', show: true });

    } catch (error: any) {
      console.error('Failed to export chart:', error);
      setToast({ message: `Error al exportar el gráfico: ${error.message}`, type: 'error', show: true });
    } finally {
      document.body.classList.remove('chart-export-active');
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="p-2 rounded-md bg-background-interactive text-content-secondary hover:bg-background-interactive-hover hover:text-content-primary transition-colors disabled:cursor-wait"
      title="Exportar gráfico como JPG"
    >
      {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
    </button>
  );
};

export default ExportChartButton;