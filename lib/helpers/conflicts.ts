import type { Reservation, ConflictCheck, Table } from '@/lib/types/Reservation';
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

export function checkCapacity(
  partySize: number,
  table: Table,
): ConflictCheck {
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
  const startHour = start.getHours();
  const endHour = end.getHours() === 0 ? 24 : end.getHours();

  const outsideHours =
    startHour < TIMELINE_CONFIG.START_HOUR ||
    endHour > TIMELINE_CONFIG.END_HOUR;

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

