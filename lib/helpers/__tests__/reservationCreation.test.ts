import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/store/store';
import type { Reservation, Table, Sector } from '@/lib/types/Reservation';

describe('Reservation Creation', () => {
  const mockSector: Sector = {
    id: 'S1',
    name: 'Main Hall',
    color: '#3B82F6',
    sortOrder: 0,
  };

  const mockTable: Table = {
    id: 'T1',
    sectorId: 'S1',
    name: 'Table 1',
    capacity: { min: 2, max: 4 },
    sortOrder: 0,
  };

  beforeEach(() => {
    // Reset store state before each test
    const { setSectors, setTables, setReservations } = useStore.getState();
    setSectors([mockSector]);
    setTables([mockTable]);
    setReservations([]);
  });

  it('should create a new reservation with valid data', () => {
    const { addReservation, reservations } = useStore.getState();

    const newReservation: Reservation = {
      id: 'RES_001',
      tableId: 'T1',
      customer: {
        name: 'John Doe',
        phone: '+1 555-1234',
        email: 'john@example.com',
      },
      partySize: 2,
      startTime: '2025-11-20T19:00:00.000Z',
      endTime: '2025-11-20T20:30:00.000Z',
      durationMinutes: 90,
      status: 'CONFIRMED',
      priority: 'STANDARD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addReservation(newReservation);

    const updatedReservations = useStore.getState().reservations;
    expect(updatedReservations).toHaveLength(1);
    expect(updatedReservations[0]).toEqual(newReservation);
  });

  it('should add multiple reservations', () => {
    const { addReservation } = useStore.getState();

    const reservation1: Reservation = {
      id: 'RES_001',
      tableId: 'T1',
      customer: { name: 'John', phone: '123' },
      partySize: 2,
      startTime: '2025-11-20T19:00:00.000Z',
      endTime: '2025-11-20T20:30:00.000Z',
      durationMinutes: 90,
      status: 'CONFIRMED',
      priority: 'STANDARD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const reservation2: Reservation = {
      id: 'RES_002',
      tableId: 'T1',
      customer: { name: 'Jane', phone: '456' },
      partySize: 3,
      startTime: '2025-11-20T21:00:00.000Z',
      endTime: '2025-11-20T22:30:00.000Z',
      durationMinutes: 90,
      status: 'CONFIRMED',
      priority: 'STANDARD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addReservation(reservation1);
    addReservation(reservation2);

    const { reservations } = useStore.getState();
    expect(reservations).toHaveLength(2);
    expect(reservations.map((r) => r.id)).toEqual(['RES_001', 'RES_002']);
  });

  it('should create reservation with all optional fields', () => {
    const { addReservation } = useStore.getState();

    const reservation: Reservation = {
      id: 'RES_001',
      tableId: 'T1',
      customer: {
        name: 'VIP Customer',
        phone: '+1 555-9999',
        email: 'vip@example.com',
      },
      partySize: 4,
      startTime: '2025-11-20T19:00:00.000Z',
      endTime: '2025-11-20T21:00:00.000Z',
      durationMinutes: 120,
      status: 'CONFIRMED',
      priority: 'VIP',
      notes: 'Window seat preferred',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addReservation(reservation);

    const { reservations } = useStore.getState();
    expect(reservations[0].priority).toBe('VIP');
    expect(reservations[0].notes).toBe('Window seat preferred');
  });

  it('should preserve existing reservations when adding new one', () => {
    const { addReservation, setReservations } = useStore.getState();

    const existing: Reservation = {
      id: 'RES_EXISTING',
      tableId: 'T1',
      customer: { name: 'Existing', phone: '111' },
      partySize: 2,
      startTime: '2025-11-20T18:00:00.000Z',
      endTime: '2025-11-20T19:00:00.000Z',
      durationMinutes: 60,
      status: 'CONFIRMED',
      priority: 'STANDARD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setReservations([existing]);

    const newReservation: Reservation = {
      id: 'RES_NEW',
      tableId: 'T1',
      customer: { name: 'New', phone: '222' },
      partySize: 2,
      startTime: '2025-11-20T20:00:00.000Z',
      endTime: '2025-11-20T21:00:00.000Z',
      durationMinutes: 60,
      status: 'CONFIRMED',
      priority: 'STANDARD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addReservation(newReservation);

    const { reservations } = useStore.getState();
    expect(reservations).toHaveLength(2);
    expect(reservations.find((r) => r.id === 'RES_EXISTING')).toBeDefined();
    expect(reservations.find((r) => r.id === 'RES_NEW')).toBeDefined();
  });
});

