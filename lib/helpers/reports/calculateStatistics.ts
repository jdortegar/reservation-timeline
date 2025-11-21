import { parseISO } from 'date-fns';
import type { Reservation, Table } from '@/lib/types/Reservation';

export interface Statistics {
  totalReservations: number;
  totalCovers: number;
  averagePartySize: number;
  statusBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  reservationsByHour: Record<number, number>;
  tableUtilization: number;
  cancelledCount: number;
  noShowCount: number;
}

export function calculateStatistics(
  reservations: Reservation[],
  tables: Table[],
  date: string,
): Statistics {
  // Filter out cancelled reservations for most calculations
  const activeReservations = reservations.filter(
    (r) => r.status !== 'CANCELLED',
  );

  // Total covers (sum of party sizes, excluding cancelled)
  const totalCovers = activeReservations.reduce(
    (sum, r) => sum + r.partySize,
    0,
  );

  // Average party size
  const averagePartySize =
    activeReservations.length > 0
      ? totalCovers / activeReservations.length
      : 0;

  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  reservations.forEach((r) => {
    statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1;
  });

  // Priority breakdown
  const priorityBreakdown: Record<string, number> = {};
  reservations.forEach((r) => {
    priorityBreakdown[r.priority] = (priorityBreakdown[r.priority] || 0) + 1;
  });

  // Reservations by hour
  const reservationsByHour: Record<number, number> = {};
  reservations.forEach((r) => {
    const startDate = parseISO(r.startTime);
    const hour = startDate.getHours();
    reservationsByHour[hour] = (reservationsByHour[hour] || 0) + 1;
  });

  // Table utilization (simplified: percentage of tables with at least one reservation)
  const tablesWithReservations = new Set(
    reservations.map((r) => r.tableId),
  ).size;
  const tableUtilization =
    tables.length > 0 ? (tablesWithReservations / tables.length) * 100 : 0;

  // Cancelled and no-show counts
  const cancelledCount = reservations.filter(
    (r) => r.status === 'CANCELLED',
  ).length;
  const noShowCount = reservations.filter((r) => r.status === 'NO_SHOW').length;

  return {
    totalReservations: reservations.length,
    totalCovers,
    averagePartySize: Math.round(averagePartySize * 10) / 10,
    statusBreakdown,
    priorityBreakdown,
    reservationsByHour,
    tableUtilization: Math.round(tableUtilization * 10) / 10,
    cancelledCount,
    noShowCount,
  };
}

export interface ShiftStatistics {
  shift: 'lunch' | 'dinner';
  reservations: Reservation[];
  totalCovers: number;
  averagePartySize: number;
  tableUtilization: number;
}

export function calculateShiftStatistics(
  reservations: Reservation[],
  tables: Table[],
  shift: 'lunch' | 'dinner',
): ShiftStatistics {
  // Define shift times
  const shiftStart = shift === 'lunch' ? 11 : 18;
  const shiftEnd = shift === 'lunch' ? 15 : 23;

  // Filter reservations within shift
  const shiftReservations = reservations.filter((r) => {
    const startDate = parseISO(r.startTime);
    const hour = startDate.getHours();
    return hour >= shiftStart && hour < shiftEnd;
  });

  const activeReservations = shiftReservations.filter(
    (r) => r.status !== 'CANCELLED',
  );

  const totalCovers = activeReservations.reduce(
    (sum, r) => sum + r.partySize,
    0,
  );

  const averagePartySize =
    activeReservations.length > 0
      ? totalCovers / activeReservations.length
      : 0;

  const tablesWithReservations = new Set(
    shiftReservations.map((r) => r.tableId),
  ).size;
  const tableUtilization =
    tables.length > 0 ? (tablesWithReservations / tables.length) * 100 : 0;

  return {
    shift,
    reservations: shiftReservations,
    totalCovers,
    averagePartySize: Math.round(averagePartySize * 10) / 10,
    tableUtilization: Math.round(tableUtilization * 10) / 10,
  };
}

