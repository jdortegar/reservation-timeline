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
      try {
        const content = event.target?.result as string;
        if (!content) {
          throw new Error('File is empty or could not be read');
        }
        setCsvContent(content);
        setPreviewResult(null);
        setImportResult(null);
      } catch (error) {
        console.error('Error reading file:', error);
        setImportResult({
          success: false,
          totalRows: 0,
          imported: 0,
          skipped: 0,
          errors: [
            {
              row: 0,
              data: {} as CSVReservationRow,
              error:
                error instanceof Error ? error.message : 'Failed to read file',
            },
          ],
          reservations: [],
        });
      }
    };
    reader.onerror = () => {
      console.error('FileReader error');
      setImportResult({
        success: false,
        totalRows: 0,
        imported: 0,
        skipped: 0,
        errors: [
          {
            row: 0,
            data: {} as CSVReservationRow,
            error:
              'Failed to read file. Please ensure the file is a valid CSV file.',
          },
        ],
        reservations: [],
      });
    };
    reader.readAsText(file);
  };

  const handlePreview = () => {
    if (!csvContent.trim()) {
      setPreviewResult({
        success: false,
        totalRows: 0,
        imported: 0,
        skipped: 0,
        errors: [
          {
            row: 0,
            data: {} as CSVReservationRow,
            error: 'CSV content is empty',
          },
        ],
        reservations: [],
      });
      return;
    }

    try {
      // Parse CSV with error handling
      let rows: CSVReservationRow[];
      try {
        rows = parseCSV(csvContent);
        if (!rows || rows.length === 0) {
          throw new Error('CSV file contains no data rows');
        }
      } catch (parseError) {
        throw new Error(
          parseError instanceof Error
            ? `Failed to parse CSV: ${parseError.message}`
            : 'Failed to parse CSV file. Please check the format.',
        );
      }

      // Import reservations with error handling
      let result: CSVImportResult;
      try {
        result = importReservationsFromCSV(rows, tables, reservations, true);
      } catch (importError) {
        throw new Error(
          importError instanceof Error
            ? `Failed to process reservations: ${importError.message}`
            : 'Failed to process CSV data. Please check the data format.',
        );
      }

      setPreviewResult(result);
    } catch (error) {
      console.error('Error in handlePreview:', error);
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
              error instanceof Error
                ? error.message
                : 'Failed to preview CSV. Please check the file format and try again.',
          },
        ],
        reservations: [],
      });
    }
  };

  const handleImport = async () => {
    if (!previewResult || previewResult.reservations.length === 0) {
      console.warn('No reservations to import', { previewResult });
      setImportResult({
        success: false,
        totalRows: previewResult?.totalRows || 0,
        imported: 0,
        skipped: previewResult?.totalRows || 0,
        errors: [
          {
            row: 0,
            data: {} as CSVReservationRow,
            error: 'No valid reservations to import',
          },
        ],
        reservations: [],
      });
      return;
    }

    setIsImporting(true);

    try {
      // Save to history for undo
      saveToHistory();

      // Import all reservations with error tracking
      const importErrors: Array<{
        row: number;
        data: CSVReservationRow;
        error: string;
      }> = [];
      let successCount = 0;

      for (let index = 0; index < previewResult.reservations.length; index++) {
        const reservation = previewResult.reservations[index];
        try {
          addReservation(reservation);
          successCount++;
        } catch (error) {
          console.error(
            `Error adding reservation ${index + 1}:`,
            error,
            reservation,
          );
          importErrors.push({
            row: index + 1, // 1-indexed for user display
            data: {} as CSVReservationRow, // We don't have the original row data here
            error:
              error instanceof Error
                ? error.message
                : 'Failed to add reservation',
          });
        }
      }

      // Set result with actual import status
      setImportResult({
        success: successCount > 0,
        totalRows: previewResult.totalRows,
        imported: successCount,
        skipped: previewResult.skipped + importErrors.length,
        errors: [...previewResult.errors, ...importErrors],
        reservations: [],
      });
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
                : 'Failed to import reservations. Please try again.',
          },
        ],
        reservations: [],
      });
    } finally {
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
                      <Alert
                        key={index}
                        variant="destructive"
                        className="flex items-start gap-2 [&>svg]:relative [&>svg]:left-0 [&>svg]:top-0 [&>svg~*]:pl-0"
                      >
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <AlertDescription className="text-xs leading-5 flex-1">
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
