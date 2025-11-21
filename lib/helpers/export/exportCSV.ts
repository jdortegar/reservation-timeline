import { format, parseISO } from 'date-fns';
import type { Reservation, Table } from '@/lib/types/Reservation';

interface ExportOptions {
  includeHeaders?: boolean;
  dateFormat?: string;
  timeFormat?: string;
}

export function exportReservationsToCSV(
  reservations: Reservation[],
  tables: Table[],
  options: ExportOptions = {},
): string {
  const {
    includeHeaders = true,
    dateFormat = 'yyyy-MM-dd',
    timeFormat = 'HH:mm',
  } = options;

  const rows: string[] = [];

  // Headers
  if (includeHeaders) {
    rows.push(
      [
        'ID',
        'Customer Name',
        'Phone',
        'Email',
        'Table',
        'Party Size',
        'Start Date',
        'Start Time',
        'End Date',
        'End Time',
        'Duration (minutes)',
        'Status',
        'Priority',
        'Source',
        'Notes',
        'Created At',
        'Updated At',
      ].join(','),
    );
  }

  // Data rows
  reservations.forEach((reservation) => {
    const table = tables.find((t) => t.id === reservation.tableId);
    const startDate = parseISO(reservation.startTime);
    const endDate = parseISO(reservation.endTime);
    const createdAt = parseISO(reservation.createdAt);
    const updatedAt = parseISO(reservation.updatedAt);

    const row = [
      escapeCSV(reservation.id),
      escapeCSV(reservation.customer.name),
      escapeCSV(reservation.customer.phone),
      escapeCSV(reservation.customer.email || ''),
      escapeCSV(table?.name || 'Unknown'),
      reservation.partySize.toString(),
      format(startDate, dateFormat),
      format(startDate, timeFormat),
      format(endDate, dateFormat),
      format(endDate, timeFormat),
      reservation.durationMinutes.toString(),
      reservation.status,
      reservation.priority,
      escapeCSV(reservation.source || ''),
      escapeCSV(reservation.notes || ''),
      format(createdAt, `${dateFormat} ${timeFormat}`),
      format(updatedAt, `${dateFormat} ${timeFormat}`),
    ].join(',');

    rows.push(row);
  });

  return rows.join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string): string {
  if (!value) return '';
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

