import { addMinutes, parseISO } from 'date-fns';
import type { Reservation, Table } from '@/lib/types/Reservation';
import { checkAllConflicts } from './conflicts';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';

export interface AlternativeTable {
  table: Table;
  hasConflict: boolean;
}

export interface AlternativeTime {
  startTime: string;
  endTime: string;
  offsetMinutes: number;
  hasConflict: boolean;
}

/**
 * Find alternative tables that can accommodate the reservation
 */
export function findAlternativeTables(
  reservation: Reservation,
  allTables: Table[],
  allReservations: Reservation[],
  excludeTableId?: string,
): AlternativeTable[] {
  const alternatives: AlternativeTable[] = [];

  for (const table of allTables) {
    // Skip the current table
    if (excludeTableId && table.id === excludeTableId) continue;

    // Check if table can accommodate party size
    const canFit =
      reservation.partySize >= table.capacity.min &&
      reservation.partySize <= table.capacity.max;

    if (!canFit) continue;

    // Check for conflicts on this table
    const tempReservation: Reservation = {
      ...reservation,
      tableId: table.id,
    };

    const conflictCheck = checkAllConflicts(
      tempReservation,
      allReservations,
      table,
      reservation.id,
    );

    alternatives.push({
      table,
      hasConflict: conflictCheck.hasConflict,
    });
  }

  // Sort: no conflicts first, then by table name
  return alternatives.sort((a, b) => {
    if (a.hasConflict !== b.hasConflict) {
      return a.hasConflict ? 1 : -1;
    }
    return a.table.name.localeCompare(b.table.name);
  });
}

/**
 * Find alternative times (±15, ±30 minutes) for the reservation
 */
export function findAlternativeTimes(
  reservation: Reservation,
  allReservations: Reservation[],
  table: Table,
  offsets: number[] = [-30, -15, 15, 30],
): AlternativeTime[] {
  const alternatives: AlternativeTime[] = [];
  const originalStart = parseISO(reservation.startTime);
  const originalEnd = parseISO(reservation.endTime);
  const durationMinutes = reservation.durationMinutes;

  for (const offsetMinutes of offsets) {
    const newStart = addMinutes(originalStart, offsetMinutes);
    const newEnd = addMinutes(newStart, durationMinutes);

    // Check if new time is within service hours
    const startHourDecimal = newStart.getHours() + newStart.getMinutes() / 60;
    const endHourDecimal =
      newEnd.getHours() === 0 && newEnd.getMinutes() === 0
        ? 24
        : newEnd.getHours() + newEnd.getMinutes() / 60;

    const outsideHours =
      startHourDecimal < TIMELINE_CONFIG.START_HOUR ||
      endHourDecimal > TIMELINE_CONFIG.END_HOUR;

    if (outsideHours) continue;

    // Check for conflicts
    const tempReservation: Reservation = {
      ...reservation,
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
    };

    const conflictCheck = checkAllConflicts(
      tempReservation,
      allReservations,
      table,
      reservation.id,
    );

    alternatives.push({
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
      offsetMinutes,
      hasConflict: conflictCheck.hasConflict,
    });
  }

  // Sort: no conflicts first, then by absolute offset
  return alternatives.sort((a, b) => {
    if (a.hasConflict !== b.hasConflict) {
      return a.hasConflict ? 1 : -1;
    }
    return Math.abs(a.offsetMinutes) - Math.abs(b.offsetMinutes);
  });
}

