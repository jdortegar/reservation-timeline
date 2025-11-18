'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/store';
import { TimelineGrid } from './TimelineGrid';
import type { Sector, Table } from '@/lib/types/Reservation';

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

export function TimelineView() {
  const { setSectors, setTables, setReservations } = useStore();

  useEffect(() => {
    setSectors(SEED_SECTORS);
    setTables(SEED_TABLES);
    setReservations([]);
  }, [setSectors, setTables, setReservations]);

  return <TimelineGrid />;
}
