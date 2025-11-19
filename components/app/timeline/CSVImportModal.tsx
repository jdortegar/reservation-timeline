'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/store/store';
import {
  parseCSV,
  importReservationsFromCSV,
  type CSVReservationRow,
  type CSVImportResult,
} from '@/lib/helpers/csvImport';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CSVImportModal({ isOpen, onClose }: CSVImportModalProps) {
  const { tables, reservations, addReservation, saveToHistory } = useStore();
  const [csvContent, setCsvContent] = useState('');
  const [previewResult, setPreviewResult] = useState<CSVImportResult | null>(
    null,
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      setPreviewResult(null);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handlePreview = () => {
    if (!csvContent.trim()) {
      return;
    }

    try {
      const rows = parseCSV(csvContent);
      const result = importReservationsFromCSV(
        rows,
        tables,
        reservations,
        true,
      );
      setPreviewResult(result);
    } catch (error) {
      setPreviewResult({
        success: false,
        totalRows: 0,
        imported: 0,
        skipped: 0,
        errors: [
          {
            row: 0,
            data: {} as CSVReservationRow,
            error:
              error instanceof Error ? error.message : 'Failed to parse CSV',
          },
        ],
        reservations: [],
      });
    }
  };

  const handleImport = () => {
    console.log('handleImport called', { previewResult });

    if (!previewResult || previewResult.reservations.length === 0) {
      console.warn('No reservations to import', { previewResult });
      return;
    }

    console.log('Starting import', {
      count: previewResult.reservations.length,
    });
    setIsImporting(true);

    try {
      // Save to history for undo
      console.log('Saving to history');
      saveToHistory();

      // Import all reservations
      console.log('Adding reservations', {
        count: previewResult.reservations.length,
      });
      previewResult.reservations.forEach((reservation, index) => {
        try {
          console.log(
            `Adding reservation ${index + 1}/${
              previewResult.reservations.length
            }`,
            reservation,
          );
          addReservation(reservation);
        } catch (error) {
          console.error('Error adding reservation:', error, reservation);
        }
      });

      console.log('Import complete, setting result');
      setImportResult(previewResult);
      setIsImporting(false);
    } catch (error) {
      console.error('Error during import:', error);
      setImportResult({
        success: false,
        totalRows: previewResult.totalRows,
        imported: 0,
        skipped: previewResult.totalRows,
        errors: [
          {
            row: 0,
            data: {} as CSVReservationRow,
            error:
              error instanceof Error
                ? error.message
                : 'Failed to import reservations',
          },
        ],
        reservations: [],
      });
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setCsvContent('');
    setPreviewResult(null);
    setImportResult(null);
    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const csvExample = `Customer Name,Phone,Email,Party Size,Date,Time,Duration,Status,Priority,Notes
John Doe,+1 555-1234,john@example.com,4,2025-11-20,19:00,90,CONFIRMED,STANDARD,Window seat preferred
Jane Smith,+1 555-5678,jane@example.com,2,2025-11-20,20:00,60,CONFIRMED,VIP,Anniversary dinner
Bob Johnson,+1 555-9012,,6,2025-11-21,18:30,120,CONFIRMED,LARGE_GROUP,`;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Reservations from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file or paste CSV content to import multiple
            reservations at once. Tables will be automatically assigned based on
            party size and availability.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="csvFile">Upload CSV File</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                id="csvFile"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              <span className="text-sm text-muted-foreground">
                {csvContent ? 'File loaded' : 'No file selected'}
              </span>
            </div>
          </div>

          {/* CSV Content Input */}
          <div className="space-y-2">
            <Label htmlFor="csvContent">Or Paste CSV Content</Label>
            <Textarea
              id="csvContent"
              value={csvContent}
              onChange={(e) => {
                setCsvContent(e.target.value);
                setPreviewResult(null);
                setImportResult(null);
              }}
              placeholder="Paste CSV content here..."
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Expected columns: Customer Name, Phone, Email (optional), Party
              Size, Date (YYYY-MM-DD), Time (HH:mm), Duration (minutes), Status
              (optional), Priority (optional), Notes (optional)
            </p>
          </div>

          {/* Example CSV */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Example CSV Format</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Load sample CSV file
                  fetch('/sample-reservations.csv')
                    .then((res) => res.text())
                    .then((text) => {
                      setCsvContent(text);
                      setPreviewResult(null);
                      setImportResult(null);
                    })
                    .catch((error) => {
                      console.error('Failed to load sample CSV:', error);
                    });
                }}
                className="text-xs"
              >
                Load Sample CSV
              </Button>
            </div>
            <div className="bg-gray-50 p-3 rounded-md border">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {csvExample}
              </pre>
            </div>
          </div>

          {/* Preview Button */}
          {csvContent && !importResult && (
            <Button type="button" onClick={handlePreview} className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Preview Import
            </Button>
          )}

          {/* Preview Results */}
          {previewResult && !importResult && (
            <div className="space-y-4">
              <Alert
                variant={previewResult.success ? 'default' : 'destructive'}
                className={
                  previewResult.imported > 0
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                }
              >
                <div className="flex items-start gap-2">
                  {previewResult.imported > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription>
                      <div className="font-semibold mb-1">Preview Results</div>
                      <div className="text-sm space-y-1">
                        <div>
                          Total rows: <strong>{previewResult.totalRows}</strong>
                        </div>
                        <div>
                          Ready to import:{' '}
                          <strong>{previewResult.imported}</strong>
                        </div>
                        {previewResult.skipped > 0 && (
                          <div>
                            Will skip: <strong>{previewResult.skipped}</strong>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </div>
                </div>
              </Alert>

              {/* Errors */}
              {previewResult.errors.length > 0 && (
                <div className="space-y-2">
                  <Label>Errors ({previewResult.errors.length})</Label>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {previewResult.errors.map((error, index) => (
                      <Alert key={index} variant="destructive" className="py-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          <strong>Row {error.row}:</strong> {error.error}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Button */}
              {previewResult.imported > 0 && (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Import button clicked', { previewResult });
                    handleImport();
                  }}
                  disabled={
                    isImporting ||
                    !previewResult ||
                    previewResult.reservations.length === 0
                  }
                  className="w-full"
                >
                  {isImporting
                    ? 'Importing...'
                    : `Import ${previewResult.imported} Reservations`}
                </Button>
              )}
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-4">
              <Alert
                variant={importResult.success ? 'default' : 'destructive'}
                className={
                  importResult.imported > 0
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                }
              >
                <div className="flex items-start gap-2">
                  {importResult.imported > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription>
                      <div className="font-semibold mb-1">Import Complete</div>
                      <div className="text-sm space-y-1">
                        <div>
                          Imported: <strong>{importResult.imported}</strong>{' '}
                          reservations
                        </div>
                        {importResult.skipped > 0 && (
                          <div>
                            Skipped: <strong>{importResult.skipped}</strong>{' '}
                            rows
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </div>
                </div>
              </Alert>

              <Button type="button" onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
