'use client';

import { useState } from 'react';
import { useStore } from '@/store/store';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Download, FileText, Image, Mail, Printer } from 'lucide-react';
import {
  exportReservationsToCSV,
  downloadCSV,
} from '@/lib/helpers/export/exportCSV';
import {
  exportTimelineAsPNG,
  exportTimelineAsPDF,
} from '@/lib/helpers/export/exportImage';
import { generateEmailDigest } from '@/lib/helpers/export/generateEmailDigest';

interface ExportMenuProps {
  gridContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function ExportMenu({ gridContainerRef }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { reservations, tables, config } = useStore();

  const handleExportCSV = () => {
    try {
      const csv = exportReservationsToCSV(reservations, tables);
      const filename = `reservations_${config.date}.csv`;
      downloadCSV(csv, filename);
      setIsOpen(false);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const handleExportPNG = async () => {
    if (!gridContainerRef?.current) {
      alert('Unable to export: Timeline grid not found.');
      return;
    }

    setIsExporting(true);
    try {
      const filename = `timeline_${config.date}.png`;
      await exportTimelineAsPNG(gridContainerRef.current, filename);
      setIsOpen(false);
    } catch (error) {
      console.error('Error exporting PNG:', error);
      alert('Failed to export image. Please check the console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!gridContainerRef?.current) {
      alert('Unable to export: Timeline grid not found.');
      return;
    }

    setIsExporting(true);
    try {
      const filename = `timeline_${config.date}.pdf`;
      await exportTimelineAsPDF(gridContainerRef.current, filename);
      setIsOpen(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please check the console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
    setIsOpen(false);
  };

  const handleCopyEmailDigest = async () => {
    try {
      const html = generateEmailDigest(reservations, tables, {
        date: config.date,
        includeReservationList: true,
      });

      // Copy HTML to clipboard
      await navigator.clipboard.writeText(html);
      alert(
        'Email digest copied to clipboard! You can paste it into your email client.',
      );
      setIsOpen(false);
    } catch (error) {
      console.error('Error generating email digest:', error);
      alert('Failed to generate email digest. Please try again.');
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={isExporting}
          size="sm"
          variant="outline"
          title="Export and reports"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <div className="space-y-1">
          <Button
            className="w-full justify-start"
            size="sm"
            variant="ghost"
            onClick={handleExportCSV}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            className="w-full justify-start"
            disabled={isExporting}
            size="sm"
            variant="ghost"
            onClick={handleExportPNG}
          >
            <Image className="h-4 w-4 mr-2" />
            Export as PNG
          </Button>
          <Button
            className="w-full justify-start"
            disabled={isExporting}
            size="sm"
            variant="ghost"
            onClick={handleExportPDF}
          >
            <Image className="h-4 w-4 mr-2" />
            Export as PDF
          </Button>
          <Button
            className="w-full justify-start"
            size="sm"
            variant="ghost"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Timeline
          </Button>
          <div className="border-t my-1" />
          <Button
            className="w-full justify-start"
            size="sm"
            variant="ghost"
            onClick={handleCopyEmailDigest}
          >
            <Mail className="h-4 w-4 mr-2" />
            Copy Email Digest
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
