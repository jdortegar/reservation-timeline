import { describe, it, expect } from 'vitest';
import { checkOverlap, checkCapacity, checkServiceHours } from '../conflicts';
import type { Reservation, Table } from '@/lib/types/Reservation';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';

describe('Conflict Detection', () => {
  const mockTable: Table = {
    id: 'T1',
    sectorId: 'S1',
    name: 'Table 1',
    capacity: { min: 2, max: 4 },
    sortOrder: 0,
  };

  describe('checkOverlap', () => {
    it('should detect overlapping reservations on the same table', () => {
      const existing: Reservation = {
        id: 'RES_001',
        tableId: 'T1',
        customer: { name: 'John', phone: '123' },
        partySize: 2,
        startTime: '2025-11-18T12:00:00.000Z',
        endTime: '2025-11-18T13:30:00.000Z',
        durationMinutes: 90,
        status: 'CONFIRMED',
        priority: 'STANDARD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newReservation: Reservation = {
        id: 'RES_002',
        tableId: 'T1',
        customer: { name: 'Jane', phone: '456' },
        partySize: 2,
        startTime: '2025-11-18T12:30:00.000Z',
        endTime: '2025-11-18T14:00:00.000Z',
        durationMinutes: 90,
        status: 'CONFIRMED',
        priority: 'STANDARD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = checkOverlap(newReservation, [existing]);
      expect(result.hasConflict).toBe(true);
      expect(result.conflictingReservationIds).toContain('RES_001');
    });

    it('should not detect conflict for reservations on different tables', () => {
      const existing: Reservation = {
        id: 'RES_001',
        tableId: 'T1',
        customer: { name: 'John', phone: '123' },
        partySize: 2,
        startTime: '2025-11-18T12:00:00.000Z',
        endTime: '2025-11-18T13:30:00.000Z',
        durationMinutes: 90,
        status: 'CONFIRMED',
        priority: 'STANDARD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newReservation: Reservation = {
        id: 'RES_002',
        tableId: 'T2', // Different table
        customer: { name: 'Jane', phone: '456' },
        partySize: 2,
        startTime: '2025-11-18T12:00:00.000Z',
        endTime: '2025-11-18T13:30:00.000Z',
        durationMinutes: 90,
        status: 'CONFIRMED',
        priority: 'STANDARD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = checkOverlap(newReservation, [existing]);
      expect(result.hasConflict).toBe(false);
    });
  });

  describe('checkCapacity', () => {
    it('should detect when party size exceeds table capacity', () => {
      const result = checkCapacity(5, mockTable); // Table max is 4
      expect(result.hasConflict).toBe(true);
      expect(result.reason).toBe('capacity_exceeded');
    });

    it('should detect when party size is below table minimum', () => {
      const result = checkCapacity(1, mockTable); // Table min is 2
      expect(result.hasConflict).toBe(true);
      expect(result.reason).toBe('capacity_exceeded');
    });

    it('should not detect conflict for valid party sizes', () => {
      const result = checkCapacity(3, mockTable); // Within 2-4 range
      expect(result.hasConflict).toBe(false);
    });
  });

  describe('checkServiceHours', () => {
    it('should detect reservations outside service hours (before 11:00)', () => {
      const startTime = '2025-11-18T10:00:00.000Z';
      const endTime = '2025-11-18T10:30:00.000Z';
      
      const result = checkServiceHours(startTime, endTime);
      expect(result.hasConflict).toBe(true);
      expect(result.reason).toBe('outside_service_hours');
    });

    it('should detect reservations outside service hours (after 00:00)', () => {
      const startTime = '2025-11-18T23:30:00.000Z';
      const endTime = '2025-11-19T01:00:00.000Z'; // Ends after midnight
      
      const result = checkServiceHours(startTime, endTime);
      expect(result.hasConflict).toBe(true);
      expect(result.reason).toBe('outside_service_hours');
    });

    it('should not detect conflict for reservations within service hours', () => {
      const startTime = '2025-11-18T12:00:00.000Z';
      const endTime = '2025-11-18T13:30:00.000Z';
      
      const result = checkServiceHours(startTime, endTime);
      expect(result.hasConflict).toBe(false);
    });

    it('should allow reservations ending exactly at 00:00', () => {
      const startTime = '2025-11-18T23:00:00.000Z';
      const endTime = '2025-11-19T00:00:00.000Z';
      
      const result = checkServiceHours(startTime, endTime);
      expect(result.hasConflict).toBe(false);
    });
  });
});

