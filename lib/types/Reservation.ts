export type UUID = string;
export type ISODateTime = string;
export type Minutes = number;
export type SlotIndex = number;

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SEATED'
  | 'FINISHED'
  | 'NO_SHOW'
  | 'CANCELLED';

export type Priority = 'STANDARD' | 'VIP' | 'LARGE_GROUP';

export interface Sector {
  id: UUID;
  name: string;
  color: string;
  sortOrder: number;
}

export interface Table {
  id: UUID;
  sectorId: UUID;
  name: string;
  capacity: {
    min: number;
    max: number;
  };
  sortOrder: number;
}

export interface Customer {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface Reservation {
  id: UUID;
  tableId: UUID;
  customer: Customer;
  partySize: number;
  startTime: ISODateTime;
  endTime: ISODateTime;
  durationMinutes: Minutes;
  status: ReservationStatus;
  priority: Priority;
  notes?: string;
  source?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface TimelineConfig {
  date: string;
  startHour: number;
  endHour: number;
  slotMinutes: Minutes;
  viewMode: 'day' | '3-day' | 'week';
}

export interface ConflictCheck {
  hasConflict: boolean;
  conflictingReservationIds: UUID[];
  reason?: 'overlap' | 'capacity_exceeded' | 'outside_service_hours';
}

