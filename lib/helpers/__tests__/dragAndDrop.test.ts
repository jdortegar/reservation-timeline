import { describe, it, expect, beforeEach } from 'vitest';
import { checkAllConflicts } from '../conflicts';
import { slotToX, xToSlot, durationToWidth } from '../coordinates';
import { timeToSlotIndex, slotIndexToTime } from '../time';
import type { Reservation, Table } from '@/lib/types/Reservation';

describe('Drag & Drop Operations', () => {
  const mockTable: Table = {
    id: 'T1',
    sectorId: 'S1',
    name: 'Table 1',
    capacity: { min: 2, max: 4 },
    sortOrder: 0,
  };

  const createReservation = (
    id: string,
    startTime: string,
    endTime: string,
    tableId: string = 'T1',
  ): Reservation => ({
    id,
    tableId,
    customer: { name: 'Test', phone: '123' },
    partySize: 2,
    startTime,
    endTime,
    durationMinutes: 90,
    status: 'CONFIRMED',
    priority: 'STANDARD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  describe('Coordinate Calculations for Drag', () => {
    it('should calculate correct X position for dragged reservation', () => {
      const slotIndex = 4; // 12:00 (4 slots after 11:00)
      const x = slotToX(slotIndex);
      const convertedBack = xToSlot(x);

      expect(convertedBack).toBe(slotIndex);
    });

    it('should handle zoom in coordinate calculations', () => {
      const slotIndex = 4;
      const zoom = 2.0;
      const x = slotToX(slotIndex, zoom);
      const convertedBack = xToSlot(x, zoom);

      expect(convertedBack).toBe(slotIndex);
      expect(x).toBe(slotToX(slotIndex) * zoom);
    });

    it('should calculate width for reservation duration', () => {
      const duration = 90; // 90 minutes
      const width = durationToWidth(duration);
      const slots = Math.floor(duration / 15); // 6 slots

      expect(width).toBe(slots * 60); // 6 * 60px = 360px
    });
  });

  describe('Time Slot Conversion for Drag', () => {
    it('should convert time to slot index correctly', () => {
      const date = '2025-11-20';
      const time = new Date('2025-11-20T12:00:00');
      const slotIndex = timeToSlotIndex(time, date);

      // 12:00 is 1 hour (4 slots) after 11:00
      expect(slotIndex).toBe(4);
    });

    it('should convert slot index back to time', () => {
      const date = '2025-11-20';
      const slotIndex = 4;
      const time = slotIndexToTime(slotIndex, date);

      expect(time.getHours()).toBe(12);
      expect(time.getMinutes()).toBe(0);
    });
  });

  describe('Conflict Detection During Drag', () => {
    it('should detect conflict when dragging to overlapping time', () => {
      const existing = createReservation(
        'RES_1',
        '2025-11-20T19:00:00.000Z',
        '2025-11-20T20:30:00.000Z',
      );

      const dragged = createReservation(
        'RES_2',
        '2025-11-20T19:30:00.000Z', // Overlaps with existing
        '2025-11-20T21:00:00.000Z',
      );

      const result = checkAllConflicts(dragged, [existing], mockTable);

      expect(result.hasConflict).toBe(true);
      expect(result.reason).toBe('overlap');
      expect(result.conflictingReservationIds).toContain('RES_1');
    });

    it('should not detect conflict when dragging to non-overlapping time', () => {
      const existing = createReservation(
        'RES_1',
        '2025-11-20T19:00:00.000Z',
        '2025-11-20T20:30:00.000Z',
      );

      const dragged = createReservation(
        'RES_2',
        '2025-11-20T21:00:00.000Z', // After existing
        '2025-11-20T22:30:00.000Z',
      );

      const result = checkAllConflicts(dragged, [existing], mockTable);

      expect(result.hasConflict).toBe(false);
    });

    it('should exclude current reservation when checking conflicts during drag', () => {
      const existing = createReservation(
        'RES_1',
        '2025-11-20T19:00:00.000Z',
        '2025-11-20T20:30:00.000Z',
      );

      // Dragging the same reservation (editing)
      const dragged = createReservation(
        'RES_1',
        '2025-11-20T19:15:00.000Z', // Slightly different time
        '2025-11-20T20:45:00.000Z',
      );

      const result = checkAllConflicts(dragged, [existing], mockTable, 'RES_1');

      // Should not conflict with itself
      expect(result.hasConflict).toBe(false);
    });
  });

  describe('Table Change During Drag', () => {
    const mockTable2: Table = {
      id: 'T2',
      sectorId: 'S1',
      name: 'Table 2',
      capacity: { min: 2, max: 4 },
      sortOrder: 1,
    };

    it('should allow dragging to different table with same time', () => {
      const existing = createReservation(
        'RES_1',
        '2025-11-20T19:00:00.000Z',
        '2025-11-20T20:30:00.000Z',
        'T1',
      );

      const dragged = createReservation(
        'RES_2',
        '2025-11-20T19:00:00.000Z', // Same time, different table
        '2025-11-20T20:30:00.000Z',
        'T2',
      );

      const result = checkAllConflicts(dragged, [existing], mockTable2);

      // No conflict because different table
      expect(result.hasConflict).toBe(false);
    });

    it('should check capacity when dragging to different table', () => {
      const largeTable: Table = {
        id: 'T3',
        sectorId: 'S1',
        name: 'Table 3',
        capacity: { min: 4, max: 6 },
        sortOrder: 2,
      };

      const dragged = createReservation(
        'RES_1',
        '2025-11-20T19:00:00.000Z',
        '2025-11-20T20:30:00.000Z',
        'T3',
      );

      // Party size is 2, but table min is 4
      dragged.partySize = 2;

      const result = checkAllConflicts(dragged, [], largeTable);

      expect(result.hasConflict).toBe(true);
      expect(result.reason).toBe('capacity_exceeded');
    });
  });
});

