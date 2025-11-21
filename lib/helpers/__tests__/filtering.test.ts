import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/store/store';
import type { Reservation, Table, Sector } from '@/lib/types/Reservation';

describe('Filtering Operations', () => {
  const mockSector1: Sector = {
    id: 'S1',
    name: 'Main Hall',
    color: '#3B82F6',
    sortOrder: 0,
  };

  const mockSector2: Sector = {
    id: 'S2',
    name: 'Terrace',
    color: '#10B981',
    sortOrder: 1,
  };

  const mockTable1: Table = {
    id: 'T1',
    sectorId: 'S1',
    name: 'Table 1',
    capacity: { min: 2, max: 4 },
    sortOrder: 0,
  };

  const mockTable2: Table = {
    id: 'T2',
    sectorId: 'S2',
    name: 'Table 2',
    capacity: { min: 4, max: 6 },
    sortOrder: 0,
  };

  const createReservation = (
    id: string,
    tableId: string,
    customerName: string,
    status: Reservation['status'] = 'CONFIRMED',
  ): Reservation => ({
    id,
    tableId,
    customer: { name: customerName, phone: '123' },
    partySize: 2,
    startTime: '2025-11-20T19:00:00.000Z',
    endTime: '2025-11-20T20:30:00.000Z',
    durationMinutes: 90,
    status,
    priority: 'STANDARD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  beforeEach(() => {
    const { setSectors, setTables, setReservations, setConfig } =
      useStore.getState();
    setSectors([mockSector1, mockSector2]);
    setTables([mockTable1, mockTable2]);
    setReservations([]);
    setConfig({ date: '2025-11-20' });
  });

  describe('Sector Filtering', () => {
    it('should filter reservations by selected sectors', () => {
      const { setReservations, setSelectedSectors } = useStore.getState();

      const reservations = [
        createReservation('RES_1', 'T1', 'John'), // S1
        createReservation('RES_2', 'T2', 'Jane'), // S2
        createReservation('RES_3', 'T1', 'Bob'), // S1
      ];

      setReservations(reservations);
      setSelectedSectors(['S1']);

      const { reservations: allReservations, selectedSectors, tables } =
        useStore.getState();

      // Filter logic would be in component, but we can test the state
      const filtered = allReservations.filter((r) => {
        const table = tables.find((t) => t.id === r.tableId);
        return table && selectedSectors.includes(table.sectorId);
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.map((r) => r.id)).toEqual(['RES_1', 'RES_3']);
    });

    it('should show all reservations when no sectors selected', () => {
      const { setReservations, setSelectedSectors } = useStore.getState();

      const reservations = [
        createReservation('RES_1', 'T1', 'John'),
        createReservation('RES_2', 'T2', 'Jane'),
      ];

      setReservations(reservations);
      setSelectedSectors([]);

      const { reservations: allReservations } = useStore.getState();
      expect(allReservations).toHaveLength(2);
    });
  });

  describe('Status Filtering', () => {
    it('should filter reservations by selected statuses', () => {
      const { setReservations, setSelectedStatuses } = useStore.getState();

      const reservations = [
        createReservation('RES_1', 'T1', 'John', 'CONFIRMED'),
        createReservation('RES_2', 'T1', 'Jane', 'PENDING'),
        createReservation('RES_3', 'T1', 'Bob', 'CONFIRMED'),
      ];

      setReservations(reservations);
      setSelectedStatuses(['CONFIRMED']);

      const { reservations: allReservations, selectedStatuses } =
        useStore.getState();

      const filtered = allReservations.filter((r) =>
        selectedStatuses.includes(r.status),
      );

      expect(filtered).toHaveLength(2);
      expect(filtered.map((r) => r.id)).toEqual(['RES_1', 'RES_3']);
    });

    it('should show all reservations when no statuses selected', () => {
      const { setReservations, setSelectedStatuses } = useStore.getState();

      const reservations = [
        createReservation('RES_1', 'T1', 'John', 'CONFIRMED'),
        createReservation('RES_2', 'T1', 'Jane', 'PENDING'),
      ];

      setReservations(reservations);
      setSelectedStatuses([]);

      const { reservations: allReservations } = useStore.getState();
      expect(allReservations).toHaveLength(2);
    });
  });

  describe('Search Filtering', () => {
    it('should filter reservations by customer name', () => {
      const { setReservations, setSearchQuery } = useStore.getState();

      const reservations = [
        createReservation('RES_1', 'T1', 'John Doe'),
        createReservation('RES_2', 'T1', 'Jane Smith'),
        createReservation('RES_3', 'T1', 'Johnny Appleseed'),
      ];

      setReservations(reservations);
      setSearchQuery('John');

      const { reservations: allReservations, searchQuery } = useStore.getState();

      const filtered = allReservations.filter(
        (r) =>
          r.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.customer.phone.toLowerCase().includes(searchQuery.toLowerCase()),
      );

      expect(filtered).toHaveLength(2);
      expect(filtered.map((r) => r.customer.name)).toEqual([
        'John Doe',
        'Johnny Appleseed',
      ]);
    });

    it('should filter reservations by phone number', () => {
      const { setReservations, setSearchQuery } = useStore.getState();

      const reservations = [
        {
          ...createReservation('RES_1', 'T1', 'John'),
          customer: { name: 'John', phone: '555-1234' },
        },
        {
          ...createReservation('RES_2', 'T1', 'Jane'),
          customer: { name: 'Jane', phone: '555-5678' },
        },
      ];

      setReservations(reservations);
      setSearchQuery('1234');

      const { reservations: allReservations, searchQuery } = useStore.getState();

      const filtered = allReservations.filter((r) =>
        r.customer.phone.toLowerCase().includes(searchQuery.toLowerCase()),
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].customer.name).toBe('John');
    });

    it('should be case-insensitive', () => {
      const { setReservations, setSearchQuery } = useStore.getState();

      const reservations = [
        createReservation('RES_1', 'T1', 'John Doe'),
        createReservation('RES_2', 'T1', 'Jane Smith'),
      ];

      setReservations(reservations);
      setSearchQuery('JOHN');

      const { reservations: allReservations, searchQuery } = useStore.getState();

      const filtered = allReservations.filter((r) =>
        r.customer.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].customer.name).toBe('John Doe');
    });
  });

  describe('Combined Filtering', () => {
    it('should apply multiple filters simultaneously', () => {
      const {
        setReservations,
        setSelectedSectors,
        setSelectedStatuses,
        setSearchQuery,
      } = useStore.getState();

      const reservations = [
        createReservation('RES_1', 'T1', 'John Doe', 'CONFIRMED'), // S1, matches all
        createReservation('RES_2', 'T1', 'Jane Smith', 'PENDING'), // S1, wrong status
        createReservation('RES_3', 'T2', 'Johnny', 'CONFIRMED'), // S2, wrong sector
        createReservation('RES_4', 'T1', 'Bob', 'CONFIRMED'), // S1, wrong name
      ];

      setReservations(reservations);
      setSelectedSectors(['S1']);
      setSelectedStatuses(['CONFIRMED']);
      setSearchQuery('John');

      const {
        reservations: allReservations,
        selectedSectors,
        selectedStatuses,
        searchQuery,
        tables,
      } = useStore.getState();

      const filtered = allReservations.filter((r) => {
        const table = tables.find((t) => t.id === r.tableId);
        const matchesSector =
          selectedSectors.length === 0 ||
          (table && selectedSectors.includes(table.sectorId));
        const matchesStatus =
          selectedStatuses.length === 0 ||
          selectedStatuses.includes(r.status);
        const matchesSearch =
          !searchQuery.trim() ||
          r.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.customer.phone.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesSector && matchesStatus && matchesSearch;
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('RES_1');
    });
  });
});

