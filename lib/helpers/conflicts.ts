import type {
  Reservation,
  ConflictCheck,
  Table,
} from '@/lib/types/Reservation';
import { parseISO, isBefore, isAfter } from 'date-fns';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';

export function checkOverlap(
  reservation: Reservation,
  existingReservations: Reservation[],
  excludeId?: string,
): ConflictCheck {
  const start = parseISO(reservation.startTime);
  const end = parseISO(reservation.endTime);
  const conflictingIds: string[] = [];

  for (const existing of existingReservations) {
    if (excludeId && existing.id === excludeId) continue;
    if (existing.tableId !== reservation.tableId) continue;

    const existingStart = parseISO(existing.startTime);
    const existingEnd = parseISO(existing.endTime);

    const overlaps =
      (isAfter(start, existingStart) && isBefore(start, existingEnd)) ||
      (isAfter(existingStart, start) && isBefore(existingStart, end)) ||
      (start.getTime() === existingStart.getTime() &&
        end.getTime() === existingEnd.getTime()) ||
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

  // Convert to hours with minutes as decimal (e.g., 11:30 = 11.5)
  const startHourDecimal = start.getHours() + start.getMinutes() / 60;
  const endHourDecimal =
    end.getHours() === 0 && end.getMinutes() === 0
      ? 24 // Midnight (00:00) = 24:00
      : end.getHours() + end.getMinutes() / 60;

  // Check if reservation is outside service hours
  // Service hours: START_HOUR:00 to END_HOUR:00
  const outsideHours =
    startHourDecimal < TIMELINE_CONFIG.START_HOUR ||
    endHourDecimal > TIMELINE_CONFIG.END_HOUR;

  return {
    hasConflict: outsideHours,
    conflictingReservationIds: [],
    reason: outsideHours ? 'outside_service_hours' : undefined,
  };
}

export function checkAllConflicts(
  reservation: Reservation,
  existingReservations: Reservation[],
  table: Table,
  excludeId?: string,
): ConflictCheck {
  const overlapCheck = checkOverlap(
    reservation,
    existingReservations,
    excludeId,
  );
  if (overlapCheck.hasConflict) return overlapCheck;

  const capacityCheck = checkCapacity(reservation.partySize, table);
  if (capacityCheck.hasConflict) return capacityCheck;

  const hoursCheck = checkServiceHours(
    reservation.startTime,
    reservation.endTime,
  );
  if (hoursCheck.hasConflict) return hoursCheck;

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
