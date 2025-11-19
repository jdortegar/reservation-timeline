import type { Reservation, Table } from '@/lib/types/Reservation';
import { parseISO, addMinutes } from 'date-fns';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import { checkAllConflicts } from './conflicts';
import { suggestTables } from './tableSuggestions';

export interface CSVReservationRow {
  customerName: string;
  phone: string;
  email?: string;
  partySize: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  status?: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'FINISHED' | 'NO_SHOW' | 'CANCELLED';
  priority?: 'STANDARD' | 'VIP' | 'LARGE_GROUP';
  notes?: string;
  preferredTableId?: string;
  preferredSectorId?: string;
}

export interface CSVImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    data: CSVReservationRow;
    error: string;
  }>;
  reservations: Reservation[];
}

/**
 * Parse CSV content into reservation rows
 */
export function parseCSV(csvContent: string): CSVReservationRow[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: CSVReservationRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    if (values.length !== headers.length) {
      continue; // Skip malformed rows
    }

    const row: Partial<CSVReservationRow> = {};
    headers.forEach((header, index) => {
      const value = values[index];
      switch (header) {
        case 'customer name':
        case 'name':
        case 'customer':
          row.customerName = value;
          break;
        case 'phone':
        case 'phone number':
          row.phone = value;
          break;
        case 'email':
          row.email = value || undefined;
          break;
        case 'party size':
        case 'guests':
        case 'party':
          row.partySize = parseInt(value, 10) || 0;
          break;
        case 'date':
          row.date = value;
          break;
        case 'time':
        case 'start time':
          row.time = value;
          break;
        case 'duration':
        case 'duration minutes':
          row.durationMinutes = parseInt(value, 10) || TIMELINE_CONFIG.DEFAULT_DURATION_MINUTES;
          break;
        case 'status':
          row.status = value.toUpperCase() as CSVReservationRow['status'];
          break;
        case 'priority':
          row.priority = value.toUpperCase() as CSVReservationRow['priority'];
          break;
        case 'notes':
          row.notes = value || undefined;
          break;
        case 'preferred table':
        case 'table id':
          row.preferredTableId = value || undefined;
          break;
        case 'preferred sector':
        case 'sector id':
          row.preferredSectorId = value || undefined;
          break;
      }
    });

    // Validate required fields
    if (row.customerName && row.phone && row.partySize && row.date && row.time) {
      rows.push({
        customerName: row.customerName,
        phone: row.phone,
        email: row.email,
        partySize: row.partySize,
        date: row.date,
        time: row.time,
        durationMinutes: row.durationMinutes || TIMELINE_CONFIG.DEFAULT_DURATION_MINUTES,
        status: row.status || 'CONFIRMED',
        priority: row.priority || 'STANDARD',
        notes: row.notes,
        preferredTableId: row.preferredTableId,
        preferredSectorId: row.preferredSectorId,
      });
    }
  }

  return rows;
}

/**
 * Convert CSV row to Reservation object
 */
function csvRowToReservation(
  row: CSVReservationRow,
  tableId: string,
  rowIndex: number,
): Reservation {
  // Parse date and time
  const [hours, minutes] = row.time.split(':').map(Number);
  const [year, month, day] = row.date.split('-').map(Number);
  const startDate = new Date(year, month - 1, day, hours, minutes);
  const endDate = addMinutes(startDate, row.durationMinutes);

  return {
    id: `CSV_${Date.now()}_${rowIndex}`,
    tableId,
    customer: {
      name: row.customerName,
      phone: row.phone,
      email: row.email,
    },
    partySize: row.partySize,
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
    durationMinutes: row.durationMinutes,
    status: row.status || 'CONFIRMED',
    priority: row.priority || 'STANDARD',
    notes: row.notes,
    source: 'CSV_IMPORT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Auto-assign table for a reservation based on party size, time, and preferences
 */
function autoAssignTable(
  row: CSVReservationRow,
  tables: Table[],
  existingReservations: Reservation[],
  preferredTableId?: string,
  preferredSectorId?: string,
): { tableId: string; reason: string } | null {
  // If preferred table is specified and available, use it
  if (preferredTableId) {
    const preferredTable = tables.find((t) => t.id === preferredTableId);
    if (preferredTable) {
      const [hours, minutes] = row.time.split(':').map(Number);
      const [year, month, day] = row.date.split('-').map(Number);
      const startDate = new Date(year, month - 1, day, hours, minutes);
      const endDate = addMinutes(startDate, row.durationMinutes);

      const tempReservation: Reservation = {
        id: 'TEMP_CHECK',
        tableId: preferredTable.id,
        customer: { name: 'Temp', phone: '' },
        partySize: row.partySize,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        durationMinutes: row.durationMinutes,
        status: 'CONFIRMED',
        priority: 'STANDARD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const tableReservations = existingReservations.filter(
        (r) => r.tableId === preferredTable.id,
      );
      const conflict = checkAllConflicts(
        tempReservation,
        tableReservations,
        preferredTable,
        'TEMP_CHECK',
      );

      if (!conflict.hasConflict && row.partySize >= preferredTable.capacity.min && row.partySize <= preferredTable.capacity.max) {
        return { tableId: preferredTable.id, reason: 'Preferred table available' };
      }
    }
  }

  // Filter tables by sector preference if specified
  let candidateTables = tables;
  if (preferredSectorId) {
    candidateTables = tables.filter((t) => t.sectorId === preferredSectorId);
  }

  // Filter tables that can accommodate party size
  candidateTables = candidateTables.filter(
    (t) => row.partySize >= t.capacity.min && row.partySize <= t.capacity.max,
  );

  if (candidateTables.length === 0) {
    return null;
  }

  // Use table suggestions algorithm to find best table
  const [hours, minutes] = row.time.split(':').map(Number);
  const [year, month, day] = row.date.split('-').map(Number);
  const startDate = new Date(year, month - 1, day, hours, minutes);

  const suggestions = suggestTables({
    partySize: row.partySize,
    startTime: startDate.toISOString(),
    durationMinutes: row.durationMinutes,
    reservations: existingReservations,
    tables: candidateTables,
    sectors: [], // Not needed for basic assignment
    preferredSectorIds: preferredSectorId ? [preferredSectorId] : [],
  });

  if (suggestions.length > 0) {
    return {
      tableId: suggestions[0].table.id,
      reason: suggestions[0].reasons.join(', '),
    };
  }

  // Fallback: try any available table
  for (const table of candidateTables) {
    const tempReservation: Reservation = {
      id: 'TEMP_CHECK',
      tableId: table.id,
      customer: { name: 'Temp', phone: '' },
      partySize: row.partySize,
      startTime: startDate.toISOString(),
      endTime: addMinutes(startDate, row.durationMinutes).toISOString(),
      durationMinutes: row.durationMinutes,
      status: 'CONFIRMED',
      priority: 'STANDARD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const tableReservations = existingReservations.filter((r) => r.tableId === table.id);
    const conflict = checkAllConflicts(
      tempReservation,
      tableReservations,
      table,
      'TEMP_CHECK',
    );

    if (!conflict.hasConflict) {
      return { tableId: table.id, reason: 'First available table' };
    }
  }

  return null;
}

/**
 * Import reservations from CSV with auto-assignment
 */
export function importReservationsFromCSV(
  csvRows: CSVReservationRow[],
  tables: Table[],
  existingReservations: Reservation[],
  autoAssign: boolean = true,
): CSVImportResult {
  const result: CSVImportResult = {
    success: true,
    totalRows: csvRows.length,
    imported: 0,
    skipped: 0,
    errors: [],
    reservations: [],
  };

  const newReservations: Reservation[] = [];

  for (let i = 0; i < csvRows.length; i++) {
    const row = csvRows[i];
    const rowNumber = i + 2; // +2 because CSV has header row and is 1-indexed

    try {
      // Validate required fields
      if (!row.customerName || !row.phone || !row.partySize || !row.date || !row.time) {
        result.errors.push({
          row: rowNumber,
          data: row,
          error: 'Missing required fields (customerName, phone, partySize, date, time)',
        });
        result.skipped++;
        continue;
      }

      // Validate party size
      if (row.partySize < 1 || row.partySize > 20) {
        result.errors.push({
          row: rowNumber,
          data: row,
          error: 'Party size must be between 1 and 20',
        });
        result.skipped++;
        continue;
      }

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
        result.errors.push({
          row: rowNumber,
          data: row,
          error: 'Invalid date format. Expected YYYY-MM-DD',
        });
        result.skipped++;
        continue;
      }

      // Validate time format
      if (!/^\d{2}:\d{2}$/.test(row.time)) {
        result.errors.push({
          row: rowNumber,
          data: row,
          error: 'Invalid time format. Expected HH:mm',
        });
        result.skipped++;
        continue;
      }

      // Validate duration
      if (row.durationMinutes < TIMELINE_CONFIG.MIN_DURATION_MINUTES || row.durationMinutes > 360) {
        result.errors.push({
          row: rowNumber,
          data: row,
          error: `Duration must be between ${TIMELINE_CONFIG.MIN_DURATION_MINUTES} and 360 minutes`,
        });
        result.skipped++;
        continue;
      }

      // Parse date and validate it's not in the past
      const [hours, minutes] = row.time.split(':').map(Number);
      const [year, month, day] = row.date.split('-').map(Number);
      const startDate = new Date(year, month - 1, day, hours, minutes);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        result.errors.push({
          row: rowNumber,
          data: row,
          error: 'Cannot create reservations in the past',
        });
        result.skipped++;
        continue;
      }

      // Validate service hours
      const startHour = startDate.getHours();
      if (startHour < TIMELINE_CONFIG.START_HOUR || startHour >= TIMELINE_CONFIG.END_HOUR) {
        result.errors.push({
          row: rowNumber,
          data: row,
          error: `Reservation must be within service hours (${TIMELINE_CONFIG.START_HOUR}:00 - ${TIMELINE_CONFIG.END_HOUR}:00)`,
        });
        result.skipped++;
        continue;
      }

      // Assign table
      let tableId: string;
      let assignmentReason: string;

      if (row.preferredTableId && !autoAssign) {
        // Use preferred table if specified and auto-assign is disabled
        tableId = row.preferredTableId;
        assignmentReason = 'Preferred table (manual)';
      } else {
        // Auto-assign table
        const assignment = autoAssignTable(
          row,
          tables,
          [...existingReservations, ...newReservations],
          row.preferredTableId,
          row.preferredSectorId,
        );

        if (!assignment) {
          result.errors.push({
            row: rowNumber,
            data: row,
            error: 'No available table found for this reservation',
          });
          result.skipped++;
          continue;
        }

        tableId = assignment.tableId;
        assignmentReason = assignment.reason;
      }

      // Validate table exists
      const table = tables.find((t) => t.id === tableId);
      if (!table) {
        result.errors.push({
          row: rowNumber,
          data: row,
          error: `Table ${tableId} not found`,
        });
        result.skipped++;
        continue;
      }

      // Create reservation
      const reservation = csvRowToReservation(row, tableId, i);
      reservation.notes = assignmentReason
        ? `${row.notes ? row.notes + ' | ' : ''}Auto-assigned: ${assignmentReason}`
        : row.notes;

      // Final conflict check
      const tableReservations = [...existingReservations, ...newReservations].filter(
        (r) => r.tableId === tableId,
      );
      const conflict = checkAllConflicts(
        reservation,
        tableReservations,
        table,
        reservation.id,
      );

      if (conflict.hasConflict) {
        result.errors.push({
          row: rowNumber,
          data: row,
          error: `Conflict detected: ${conflict.reason}`,
        });
        result.skipped++;
        continue;
      }

      newReservations.push(reservation);
      result.imported++;
    } catch (error) {
      result.errors.push({
        row: rowNumber,
        data: row,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      result.skipped++;
    }
  }

  result.reservations = newReservations;
  result.success = result.errors.length === 0 || result.imported > 0;

  return result;
}

