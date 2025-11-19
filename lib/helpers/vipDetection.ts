import type { Reservation, Table } from '@/lib/types/Reservation';
import { parseISO, differenceInDays, isAfter, isBefore } from 'date-fns';

export interface VIPSuggestion {
  isVIP: boolean;
  confidence: number; // 0-100
  reasons: string[];
  recommendedPriority: 'STANDARD' | 'VIP' | 'LARGE_GROUP';
}

export interface CustomerHistory {
  phone: string;
  name: string;
  reservations: Reservation[];
  totalReservations: number;
  averagePartySize: number;
  preferredTables: string[];
  preferredSectors: string[];
  averageAdvanceBookingDays: number;
  hasSpecialRequests: boolean;
  previousVIPCount: number;
  lastVisitDate: Date | null;
  frequentVisitor: boolean; // 3+ reservations in last 30 days
}

/**
 * Analyze customer history from reservations
 */
export function analyzeCustomerHistory(
  phone: string,
  reservations: Reservation[],
): CustomerHistory | null {
  const customerReservations = reservations.filter(
    (r) => r.customer.phone === phone,
  );

  if (customerReservations.length === 0) {
    return null;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentReservations = customerReservations.filter((r) => {
    const reservationDate = parseISO(r.startTime);
    return isAfter(reservationDate, thirtyDaysAgo);
  });

  const totalPartySize = customerReservations.reduce(
    (sum, r) => sum + r.partySize,
    0,
  );
  const averagePartySize = totalPartySize / customerReservations.length;

  const tableCounts = new Map<string, number>();
  const sectorCounts = new Map<string, number>();
  let specialRequestsCount = 0;
  let vipCount = 0;
  let totalAdvanceDays = 0;
  let advanceBookingCount = 0;
  let lastVisit: Date | null = null;

  customerReservations.forEach((reservation) => {
    // Count table preferences
    tableCounts.set(
      reservation.tableId,
      (tableCounts.get(reservation.tableId) || 0) + 1,
    );

    // Count VIP status
    if (reservation.priority === 'VIP') {
      vipCount++;
    }

    // Check for special requests
    if (reservation.notes && reservation.notes.trim().length > 0) {
      specialRequestsCount++;
    }

    // Calculate advance booking
    const reservationDate = parseISO(reservation.startTime);
    const createdAt = parseISO(reservation.createdAt);
    const daysInAdvance = differenceInDays(reservationDate, createdAt);
    if (daysInAdvance > 0) {
      totalAdvanceDays += daysInAdvance;
      advanceBookingCount++;
    }

    // Track last visit
    if (!lastVisit || isAfter(reservationDate, lastVisit)) {
      lastVisit = reservationDate;
    }
  });

  // Find preferred tables (used 2+ times)
  const preferredTables = Array.from(tableCounts.entries())
    .filter(([_, count]) => count >= 2)
    .map(([tableId]) => tableId);

  // Get sectors from tables (would need tables array, but for now we'll skip)
  const preferredSectors: string[] = [];

  const averageAdvanceBookingDays =
    advanceBookingCount > 0 ? totalAdvanceDays / advanceBookingCount : 0;

  return {
    phone,
    name: customerReservations[0].customer.name,
    reservations: customerReservations,
    totalReservations: customerReservations.length,
    averagePartySize: Math.round(averagePartySize * 10) / 10,
    preferredTables,
    preferredSectors,
    averageAdvanceBookingDays: Math.round(averageAdvanceBookingDays * 10) / 10,
    hasSpecialRequests: specialRequestsCount > 0,
    previousVIPCount: vipCount,
    lastVisitDate: lastVisit,
    frequentVisitor: recentReservations.length >= 3,
  };
}

/**
 * Detect if a customer might be a VIP based on patterns
 * This is a simulation - in production, this would use ML/AI
 */
export function detectVIP(
  phone: string,
  partySize: number,
  reservations: Reservation[],
  tables: Table[],
  currentReservation?: Partial<Reservation>,
): VIPSuggestion {
  const history = analyzeCustomerHistory(phone, reservations);

  const reasons: string[] = [];
  let confidence = 0;
  let recommendedPriority: 'STANDARD' | 'VIP' | 'LARGE_GROUP' = 'STANDARD';

  // If no history, check if it's a large group
  if (!history) {
    if (partySize >= 8) {
      return {
        isVIP: false,
        confidence: 0,
        reasons: ['New customer with large party size'],
        recommendedPriority: 'LARGE_GROUP',
      };
    }
    return {
      isVIP: false,
      confidence: 0,
      reasons: ['New customer - no history available'],
      recommendedPriority: 'STANDARD',
    };
  }

  // Factor 1: Frequent visitor (high weight)
  if (history.frequentVisitor) {
    confidence += 30;
    reasons.push(
      `Frequent visitor: ${
        history.reservations.filter((r) => {
          const reservationDate = parseISO(r.startTime);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return reservationDate > thirtyDaysAgo;
        }).length
      } reservations in the last 30 days`,
    );
  }

  // Factor 2: Previous VIP status
  if (history.previousVIPCount > 0) {
    confidence += 25;
    reasons.push(
      `Previously marked as VIP ${history.previousVIPCount} time${
        history.previousVIPCount > 1 ? 's' : ''
      }`,
    );
  }

  // Factor 3: Total reservation count (loyalty)
  if (history.totalReservations >= 10) {
    confidence += 20;
    reasons.push(
      `Loyal customer: ${history.totalReservations} total reservations`,
    );
  } else if (history.totalReservations >= 5) {
    confidence += 10;
    reasons.push(`Regular customer: ${history.totalReservations} reservations`);
  }

  // Factor 4: Special requests/notes (indicates preference for service)
  if (history.hasSpecialRequests) {
    confidence += 10;
    reasons.push('Has made special requests in the past');
  }

  // Factor 5: Advance booking patterns (planning ahead)
  if (history.averageAdvanceBookingDays >= 7) {
    confidence += 10;
    reasons.push(
      `Plans ahead: Average ${Math.round(
        history.averageAdvanceBookingDays,
      )} days advance booking`,
    );
  }

  // Factor 6: Consistent table preferences (shows they care about experience)
  if (history.preferredTables.length > 0) {
    confidence += 5;
    reasons.push(
      `Has preferred tables: ${history.preferredTables.length} table${
        history.preferredTables.length > 1 ? 's' : ''
      }`,
    );
  }

  // Factor 7: Large party size (potential high-value customer)
  if (partySize >= 6) {
    confidence += 5;
    reasons.push(`Large party size: ${partySize} guests`);
  }

  // Factor 8: Recent visit (active customer)
  if (history.lastVisitDate) {
    const daysSinceLastVisit = differenceInDays(
      new Date(),
      history.lastVisitDate,
    );
    if (daysSinceLastVisit <= 7) {
      confidence += 5;
      reasons.push('Recent visit within the last week');
    }
  }

  // Determine recommended priority
  if (confidence >= 50) {
    recommendedPriority = 'VIP';
  } else if (partySize >= 8) {
    recommendedPriority = 'LARGE_GROUP';
  } else {
    recommendedPriority = 'STANDARD';
  }

  // If current reservation already has VIP priority, boost confidence
  if (currentReservation?.priority === 'VIP') {
    confidence = Math.min(100, confidence + 15);
    reasons.push('Currently marked as VIP');
  }

  return {
    isVIP: confidence >= 40, // Threshold for VIP suggestion
    confidence: Math.min(100, confidence),
    reasons,
    recommendedPriority,
  };
}

/**
 * Get VIP suggestions for a new or existing reservation
 */
export function getVIPSuggestions(
  phone: string,
  partySize: number,
  reservations: Reservation[],
  tables: Table[],
  currentReservation?: Partial<Reservation>,
): VIPSuggestion {
  return detectVIP(phone, partySize, reservations, tables, currentReservation);
}
