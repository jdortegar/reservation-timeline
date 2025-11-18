'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/store';
import { TimelineGrid } from './TimelineGrid';
import type { Sector, Table, Reservation } from '@/lib/types/Reservation';

const SEED_SECTORS: Sector[] = [
  { id: 'S1', name: 'Main Hall', color: '#3B82F6', sortOrder: 0 },
  { id: 'S2', name: 'Terrace', color: '#10B981', sortOrder: 1 },
];

const SEED_TABLES: Table[] = [
  {
    id: 'T1',
    sectorId: 'S1',
    name: 'Table 1',
    capacity: { min: 2, max: 2 },
    sortOrder: 0,
  },
  {
    id: 'T2',
    sectorId: 'S1',
    name: 'Table 2',
    capacity: { min: 2, max: 4 },
    sortOrder: 1,
  },
  {
    id: 'T3',
    sectorId: 'S1',
    name: 'Table 3',
    capacity: { min: 4, max: 6 },
    sortOrder: 2,
  },
  {
    id: 'T4',
    sectorId: 'S2',
    name: 'Table 4',
    capacity: { min: 2, max: 4 },
    sortOrder: 0,
  },
  {
    id: 'T5',
    sectorId: 'S2',
    name: 'Table 5',
    capacity: { min: 4, max: 8 },
    sortOrder: 1,
  },
];

const HARDCODED_RESERVATIONS: Reservation[] = [
  {
    id: 'RES_001',
    tableId: 'T1',
    customer: {
      name: 'John Doe',
      phone: '+54 9 11 5555-1234',
      email: 'john@example.com',
    },
    partySize: 2,
    startTime: '2025-01-15T20:00:00-03:00',
    endTime: '2025-01-15T21:30:00-03:00',
    durationMinutes: 90,
    status: 'CONFIRMED',
    priority: 'STANDARD',
    source: 'web',
    createdAt: '2025-01-14T15:30:00-03:00',
    updatedAt: '2025-01-14T15:30:00-03:00',
  },
  {
    id: 'RES_002',
    tableId: 'T3',
    customer: {
      name: 'Jane Smith',
      phone: '+54 9 11 5555-5678',
      email: 'jane@example.com',
    },
    partySize: 6,
    startTime: '2025-01-15T20:30:00-03:00',
    endTime: '2025-01-15T22:00:00-03:00',
    durationMinutes: 90,
    status: 'SEATED',
    priority: 'VIP',
    notes: 'Birthday celebration',
    source: 'phone',
    createdAt: '2025-01-15T19:45:00-03:00',
    updatedAt: '2025-01-15T20:35:00-03:00',
  },
  {
    id: 'RES_003',
    tableId: 'T2',
    customer: {
      name: 'Michael Johnson',
      phone: '+1 555 123-4567',
    },
    partySize: 3,
    startTime: '2025-01-15T19:00:00-03:00',
    endTime: '2025-01-15T20:30:00-03:00',
    durationMinutes: 90,
    status: 'PENDING',
    priority: 'STANDARD',
    source: 'app',
    createdAt: '2025-01-15T18:00:00-03:00',
    updatedAt: '2025-01-15T18:00:00-03:00',
  },
  {
    id: 'RES_004',
    tableId: 'T4',
    customer: {
      name: 'Sarah Brown',
      phone: '+54 9 15 4444-9999',
      email: 'sarah@example.com',
    },
    partySize: 4,
    startTime: '2025-01-15T21:00:00-03:00',
    endTime: '2025-01-15T22:30:00-03:00',
    durationMinutes: 90,
    status: 'FINISHED',
    priority: 'STANDARD',
    source: 'web',
    createdAt: '2025-01-15T20:00:00-03:00',
    updatedAt: '2025-01-15T22:30:00-03:00',
  },
  {
    id: 'RES_005',
    tableId: 'T5',
    customer: {
      name: 'Robert Taylor',
      phone: '+54 9 11 7777-8888',
    },
    partySize: 8,
    startTime: '2025-01-15T18:00:00-03:00',
    endTime: '2025-01-15T20:00:00-03:00',
    durationMinutes: 120,
    status: 'NO_SHOW',
    priority: 'LARGE_GROUP',
    source: 'phone',
    createdAt: '2025-01-14T10:00:00-03:00',
    updatedAt: '2025-01-15T18:30:00-03:00',
  },
  {
    id: 'RES_006',
    tableId: 'T1',
    customer: {
      name: 'Emily Davis',
      phone: '+1 555 987-6543',
      email: 'emily@example.com',
    },
    partySize: 2,
    startTime: '2025-01-15T22:00:00-03:00',
    endTime: '2025-01-15T23:30:00-03:00',
    durationMinutes: 90,
    status: 'CANCELLED',
    priority: 'STANDARD',
    source: 'web',
    createdAt: '2025-01-15T15:00:00-03:00',
    updatedAt: '2025-01-15T21:00:00-03:00',
  },
];

export function TimelineView() {
  const { config, setSectors, setTables, setReservations } = useStore();

  useEffect(() => {
    setSectors(SEED_SECTORS);
    setTables(SEED_TABLES);
    const today = new Date().toISOString().split('T')[0];
    const reservations = HARDCODED_RESERVATIONS.map((r) => ({
      ...r,
      startTime: r.startTime.replace('2025-01-15', today),
      endTime: r.endTime.replace('2025-01-15', today),
    }));
    setReservations(reservations);
  }, [config.date, setSectors, setTables, setReservations]);

  return <TimelineGrid />;
}
