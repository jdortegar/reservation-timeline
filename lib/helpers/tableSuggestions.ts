import type { Table, Reservation, Sector } from '@/lib/types/Reservation';
import { checkAllConflicts } from './conflicts';
import { addMinutes, parseISO } from 'date-fns';

export interface TableSuggestion {
  table: Table;
  score: number;
  reasons: string[];
  sector?: Sector;
}

export interface TableSuggestionOptions {
  partySize: number;
  startTime: string;
  durationMinutes: number;
  preferredSectorIds?: string[];
  reservations: Reservation[];
  tables: Table[];
  sectors: Sector[];
}

/**
 * Calculate suitability score for a table based on party size
 * Lower score is better (closest match)
 */
function calculateSizeScore(
  partySize: number,
  table: Table,
): { score: number; reason: string } {
  const { min, max } = table.capacity;

  // Perfect fit: party size matches table capacity exactly
  if (partySize >= min && partySize <= max) {
    const capacityRange = max - min;
    const distanceFromMin = partySize - min;
    const distanceFromMax = max - partySize;

    // Prefer tables where party size is closer to minimum (avoid wasting large tables)
    const wasteScore = distanceFromMax / Math.max(capacityRange, 1);
    const fitScore = 1 - wasteScore;

    return {
      score: fitScore * 10, // Base score for fitting
      reason: `Perfect fit: ${partySize} guests fit ${min}-${max} capacity`,
    };
  }

  // Too small: table can't accommodate party
  if (max < partySize) {
    return {
      score: 1000, // Very high penalty - will be filtered out
      reason: `Too small: ${max} max capacity < ${partySize} guests`,
    };
  }

  // Too large: table is much larger than needed
  const excessCapacity = min - partySize;
  const wasteRatio = excessCapacity / Math.max(min, 1);

  return {
    score: 50 + wasteRatio * 50, // Penalty for wasting capacity
    reason: `Too large: ${min} min capacity > ${partySize} guests (waste: ${excessCapacity} seats)`,
  };
}

/**
 * Check if table is available at the requested time
 */
function isTableAvailable(
  table: Table,
  startTime: string,
  durationMinutes: number,
  partySize: number,
  reservations: Reservation[],
): { available: boolean; reason?: string } {
  const tableReservations = reservations.filter((r) => r.tableId === table.id);
  const endTime = addMinutes(parseISO(startTime), durationMinutes);

  const tempReservation: Reservation = {
    id: 'TEMP_CHECK',
    tableId: table.id,
    customer: { name: 'Temp', phone: '' },
    partySize, // Use actual party size, not hardcoded 1
    startTime,
    endTime: endTime.toISOString(),
    durationMinutes,
    status: 'CONFIRMED',
    priority: 'STANDARD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const conflictCheck = checkAllConflicts(
    tempReservation,
    tableReservations,
    table,
    'TEMP_CHECK',
  );

  return {
    available: !conflictCheck.hasConflict,
    reason: conflictCheck.hasConflict
      ? conflictCheck.reason === 'overlap'
        ? 'Time slot already booked'
        : conflictCheck.reason === 'capacity_exceeded'
        ? 'Party size exceeds capacity'
        : 'Outside service hours'
      : undefined,
  };
}

/**
 * Calculate sector preference score
 */
function calculateSectorScore(
  table: Table,
  preferredSectorIds: string[],
  sectors: Sector[],
): number {
  if (!preferredSectorIds || preferredSectorIds.length === 0) {
    return 0; // No preference, no bonus/penalty
  }

  const tableSector = sectors.find((s) => s.id === table.sectorId);
  if (!tableSector) {
    return 0;
  }

  if (preferredSectorIds.includes(table.sectorId)) {
    return -5; // Bonus for preferred sector (lower score is better)
  }

  return 0; // No penalty for non-preferred sectors
}

/**
 * Find best available tables for a reservation
 * Returns tables ranked by suitability score (lower is better)
 */
export function suggestTables(
  options: TableSuggestionOptions,
): TableSuggestion[] {
  const {
    partySize,
    startTime,
    durationMinutes,
    preferredSectorIds = [],
    reservations,
    tables,
    sectors,
  } = options;

  const suggestions: TableSuggestion[] = [];

  for (const table of tables) {
    // First check if table can accommodate party size
    if (table.capacity.max < partySize) {
      // Skip tables that are too small
      continue;
    }

    // Check availability
    const availability = isTableAvailable(
      table,
      startTime,
      durationMinutes,
      partySize,
      reservations,
    );

    // Skip unavailable tables
    if (!availability.available) {
      continue;
    }

    // Calculate scores
    const sizeScore = calculateSizeScore(partySize, table);
    const sectorScore = calculateSectorScore(
      table,
      preferredSectorIds,
      sectors,
    );
    const totalScore = sizeScore.score + sectorScore;

    const sector = sectors.find((s) => s.id === table.sectorId);

    const reasons: string[] = [sizeScore.reason];
    if (sectorScore < 0) {
      reasons.push(`Preferred sector: ${sector?.name || 'Unknown'}`);
    }

    suggestions.push({
      table,
      score: totalScore,
      reasons,
      sector,
    });
  }

  // Sort by score (lower is better)
  suggestions.sort((a, b) => a.score - b.score);

  return suggestions;
}

/**
 * Find next available time slots for a given table and party size
 * Searches in time windows: ±15, ±30, ±60 minutes
 */
export interface NextAvailableSlot {
  table: Table;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  window: string; // e.g., "+15 min", "-30 min"
}

export function findNextAvailableSlots(
  table: Table,
  requestedStartTime: string,
  durationMinutes: number,
  partySize: number,
  reservations: Reservation[],
  windows: number[] = [15, 30, 60], // minutes
): NextAvailableSlot[] {
  // Validate inputs
  if (
    !partySize ||
    typeof partySize !== 'number' ||
    isNaN(partySize) ||
    partySize <= 0
  ) {
    return [];
  }

  if (!durationMinutes || durationMinutes <= 0) {
    return [];
  }

  if (!requestedStartTime) {
    return [];
  }

  const slots: NextAvailableSlot[] = [];
  const requestedTime = parseISO(requestedStartTime);

  // Validate parsed time
  if (isNaN(requestedTime.getTime())) {
    return [];
  }

  // Check requested time first
  const requestedAvailability = isTableAvailable(
    table,
    requestedStartTime,
    durationMinutes,
    partySize,
    reservations,
  );

  if (requestedAvailability.available) {
    slots.push({
      table,
      startTime: requestedStartTime,
      endTime: addMinutes(requestedTime, durationMinutes).toISOString(),
      durationMinutes,
      window: 'Requested time',
    });
  }

  // Search in time windows
  for (const windowMinutes of windows) {
    // Check +windowMinutes
    const laterTime = addMinutes(requestedTime, windowMinutes);
    const laterAvailability = isTableAvailable(
      table,
      laterTime.toISOString(),
      durationMinutes,
      partySize,
      reservations,
    );

    if (laterAvailability.available) {
      slots.push({
        table,
        startTime: laterTime.toISOString(),
        endTime: addMinutes(laterTime, durationMinutes).toISOString(),
        durationMinutes,
        window: `+${windowMinutes} min`,
      });
    }

    // Check -windowMinutes
    const earlierTime = addMinutes(requestedTime, -windowMinutes);
    const earlierAvailability = isTableAvailable(
      table,
      earlierTime.toISOString(),
      durationMinutes,
      partySize,
      reservations,
    );

    if (earlierAvailability.available) {
      slots.push({
        table,
        startTime: earlierTime.toISOString(),
        endTime: addMinutes(earlierTime, durationMinutes).toISOString(),
        durationMinutes,
        window: `-${windowMinutes} min`,
      });
    }
  }

  // Sort by time
  slots.sort((a, b) => {
    return parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime();
  });

  return slots;
}

/**
 * Find next available slots across all tables
 */
export function findNextAvailableAcrossAllTables(
  requestedStartTime: string,
  durationMinutes: number,
  partySize: number,
  reservations: Reservation[],
  tables: Table[],
  windows: number[] = [15, 30, 60],
): NextAvailableSlot[] {
  // Validate inputs
  if (
    !partySize ||
    typeof partySize !== 'number' ||
    isNaN(partySize) ||
    partySize <= 0
  ) {
    return [];
  }

  if (!durationMinutes || durationMinutes <= 0) {
    return [];
  }

  if (!requestedStartTime) {
    return [];
  }

  if (!tables || tables.length === 0) {
    return [];
  }

  const allSlots: NextAvailableSlot[] = [];

  // Filter tables that can accommodate party size
  const suitableTables = tables.filter(
    (table) =>
      partySize >= table.capacity.min && partySize <= table.capacity.max,
  );

  for (const table of suitableTables) {
    const slots = findNextAvailableSlots(
      table,
      requestedStartTime,
      durationMinutes,
      partySize,
      reservations,
      windows,
    );
    allSlots.push(...slots);
  }

  // Sort by time
  allSlots.sort((a, b) => {
    return parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime();
  });

  return allSlots;
}
