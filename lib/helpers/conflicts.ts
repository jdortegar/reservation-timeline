import type {
  Reservation,
  ConflictCheck,
  Table,
} from '@/lib/types/Reservation';
import { parseISO, isBefore, isAfter } from 'date-fns';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';

/**
 * Conflict Detection Algorithms
 *
 * These functions detect various types of conflicts when creating or updating reservations:
 * 1. Time overlap: Two reservations on the same table with overlapping time ranges
 * 2. Capacity: Party size outside table's min/max capacity range
 * 3. Service hours: Reservation outside restaurant operating hours
 *
 * All checks are performed independently and can be combined via checkAllConflicts().
 */

/**
 * Detects time overlap conflicts between reservations on the same table.
 *
 * Algorithm:
 * Two time ranges overlap if any of these conditions are true:
 * 1. New start is within existing range: start > existingStart && start < existingEnd
 * 2. Existing start is within new range: existingStart > start && existingStart < end
 * 3. Exact match: start === existingStart && end === existingEnd
 * 4. General overlap: start < existingEnd && end > existingStart
 *
 * Time Complexity: O(n) where n = number of reservations on the same table
 *
 * @param reservation - The reservation to check
 * @param existingReservations - All existing reservations to check against
 * @param excludeId - Optional ID to exclude from conflict check (useful when editing)
 * @returns ConflictCheck with hasConflict flag and list of conflicting reservation IDs
 */
export function checkOverlap(
  reservation: Reservation,
  existingReservations: Reservation[],
  excludeId?: string,
): ConflictCheck {
  const start = parseISO(reservation.startTime);
  const end = parseISO(reservation.endTime);
  const conflictingIds: string[] = [];

  for (const existing of existingReservations) {
    // Skip excluded reservation (e.g., when editing the same reservation)
    if (excludeId && existing.id === excludeId) continue;
    // Only check reservations on the same table
    if (existing.tableId !== reservation.tableId) continue;

    const existingStart = parseISO(existing.startTime);
    const existingEnd = parseISO(existing.endTime);

    // Check all possible overlap scenarios
    const overlaps =
      // New reservation starts during existing reservation
      (isAfter(start, existingStart) && isBefore(start, existingEnd)) ||
      // Existing reservation starts during new reservation
      (isAfter(existingStart, start) && isBefore(existingStart, end)) ||
      // Exact time match
      (start.getTime() === existingStart.getTime() &&
        end.getTime() === existingEnd.getTime()) ||
      // General overlap case (covers all other scenarios)
      (start.getTime() < existingEnd.getTime() &&
        end.getTime() > existingStart.getTime());

    if (overlaps) {
      conflictingIds.push(existing.id);
    }
  }

  return {
    hasConflict: conflictingIds.length > 0,
    conflictingReservationIds: conflictingIds,
    reason: conflictingIds.length > 0 ? 'overlap' : undefined,
  };
}

export function checkCapacity(partySize: number, table: Table): ConflictCheck {
  const exceedsCapacity =
    partySize < table.capacity.min || partySize > table.capacity.max;

  return {
    hasConflict: exceedsCapacity,
    conflictingReservationIds: [],
    reason: exceedsCapacity ? 'capacity_exceeded' : undefined,
  };
}

export function checkServiceHours(
  startTime: string,
  endTime: string,
): ConflictCheck {
  const start = parseISO(startTime);
  const end = parseISO(endTime);

  // Extract date components from ISO strings to get the actual date
  // ISO strings are in UTC, but we need to check the local time of the reservation
  // Since reservations are created in local time and converted to ISO, we need to
  // extract the date part and reconstruct the time in local timezone
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  // Use local hours since reservations are created in local time
  // The ISO string represents the same moment, but we need the local time components
  const startHourDecimal = startDate.getHours() + startDate.getMinutes() / 60;
  const endHourDecimal =
    endDate.getHours() === 0 && endDate.getMinutes() === 0
      ? 24 // Midnight (00:00) = 24:00
      : endDate.getHours() + endDate.getMinutes() / 60;

  // Check if reservation is outside service hours
  // Service hours: START_HOUR:00 to END_HOUR:00 (11:00 to 00:00)
  const outsideHours =
    startHourDecimal < TIMELINE_CONFIG.START_HOUR ||
    endHourDecimal > TIMELINE_CONFIG.END_HOUR;

  return {
    hasConflict: outsideHours,
    conflictingReservationIds: [],
    reason: outsideHours ? 'outside_service_hours' : undefined,
  };
}

/**
 * Performs all conflict checks in sequence with early return optimization.
 *
 * Algorithm:
 * Checks are performed in order of likelihood and severity:
 * 1. Time overlap (most common conflict)
 * 2. Capacity (quick check, no iteration needed)
 * 3. Service hours (final validation)
 *
 * Early return on first conflict found to optimize performance.
 *
 * Performance Note:
 * This function is called frequently during drag operations and when rendering
 * reservation blocks. For optimal performance, callers should use memoization
 * (e.g., useMemo, useCallback, or caching) when the inputs haven't changed.
 * See ReservationBlock.tsx and useReservationDrag.ts for examples.
 *
 * @param reservation - The reservation to validate
 * @param existingReservations - All existing reservations
 * @param table - The table for the reservation
 * @param excludeId - Optional ID to exclude from overlap check
 * @returns ConflictCheck with the first conflict found, or no conflict
 */
export function checkAllConflicts(
  reservation: Reservation,
  existingReservations: Reservation[],
  table: Table,
  excludeId?: string,
): ConflictCheck {
  // Performance optimization: Pre-filter reservations by table before checking overlap
  // This reduces complexity from O(n) to O(m) where n = all reservations, m = reservations for this table
  // For large datasets, this significantly improves performance
  const tableReservations = existingReservations.filter(
    (r) => r.tableId === reservation.tableId,
  );

  // Check overlap first (most common conflict type)
  // Pass only table-specific reservations to reduce iteration
  const overlapCheck = checkOverlap(reservation, tableReservations, excludeId);
  if (overlapCheck.hasConflict) return overlapCheck;

  // Check capacity (quick validation)
  const capacityCheck = checkCapacity(reservation.partySize, table);
  if (capacityCheck.hasConflict) return capacityCheck;

  // Check service hours (final validation)
  const hoursCheck = checkServiceHours(
    reservation.startTime,
    reservation.endTime,
  );
  if (hoursCheck.hasConflict) return hoursCheck;

  // No conflicts found
  return {
    hasConflict: false,
    conflictingReservationIds: [],
  };
}

export function getConflictMessage(
  reason: 'overlap' | 'capacity_exceeded' | 'outside_service_hours' | undefined,
  table?: Table,
): string {
  switch (reason) {
    case 'overlap':
      return 'This reservation overlaps with another reservation on the same table';
    case 'capacity_exceeded':
      return table
        ? `Party size must be between ${table.capacity.min} and ${table.capacity.max} guests`
        : 'Party size exceeds table capacity';
    case 'outside_service_hours':
      return 'Reservation is outside service hours';
    default:
      return 'Conflict detected';
  }
}
