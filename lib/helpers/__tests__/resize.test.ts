import { describe, it, expect } from 'vitest';
import { checkAllConflicts } from '../conflicts';
import { durationToWidth, widthToDuration } from '../coordinates';
import { minutesToSlots, slotsToMinutes } from '../time';
import type { Reservation, Table } from '@/lib/types/Reservation';

describe('Resize Operations', () => {
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
    durationMinutes: number,
  ): Reservation => ({
    id,
    tableId: 'T1',
    customer: { name: 'Test', phone: '123' },
    partySize: 2,
    startTime,
    endTime,
    durationMinutes,
    status: 'CONFIRMED',
    priority: 'STANDARD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  describe('Duration to Width Conversion', () => {
    it('should convert duration to width correctly', () => {
      const duration = 90; // 90 minutes
      const width = durationToWidth(duration);
      const slots = minutesToSlots(duration); // 6 slots

      expect(width).toBe(slots * 60); // 6 * 60px = 360px
    });

    it('should convert width back to duration', () => {
      const width = 360; // 360px
      const duration = widthToDuration(width);
      const slots = Math.floor(width / 60); // 6 slots

      expect(duration).toBe(slotsToMinutes(slots)); // 6 * 15 = 90 minutes
    });

    it('should handle zoom in width calculations', () => {
      const duration = 90;
      const zoom = 2.0;
      const width = durationToWidth(duration, zoom);

      expect(width).toBe(durationToWidth(duration) * zoom);
    });
  });

  describe('Resize Right Edge (Extend Duration)', () => {
    it('should detect conflict when extending into existing reservation', () => {
      const existing = createReservation(
        'RES_1',
        '2025-11-20T20:00:00.000Z',
        '2025-11-20T21:30:00.000Z',
        90,
      );

      const resized = createReservation(
        'RES_2',
        '2025-11-20T19:00:00.000Z',
        '2025-11-20T20:30:00.000Z', // Extended to overlap
        90,
      );
      resized.durationMinutes = 90; // Original duration
      // Simulating resize: extending end time
      resized.endTime = '2025-11-20T20:30:00.000Z';

      const result = checkAllConflicts(resized, [existing], mockTable);

      expect(result.hasConflict).toBe(true);
      expect(result.reason).toBe('overlap');
    });

    it('should allow extending when no conflict', () => {
      const existing = createReservation(
        'RES_1',
        '2025-11-20T19:00:00.000Z',
        '2025-11-20T20:30:00.000Z',
        90,
      );

      const resized = createReservation(
        'RES_2',
        '2025-11-20T21:00:00.000Z',
        '2025-11-20T22:00:00.000Z', // Extended but no overlap
        60,
      );
      resized.endTime = '2025-11-20T22:30:00.000Z'; // Extended by 30 min

      const result = checkAllConflicts(resized, [existing], mockTable);

      expect(result.hasConflict).toBe(false);
    });
  });

  describe('Resize Left Edge (Change Start Time)', () => {
    it('should detect conflict when moving start time into existing reservation', () => {
      const existing = createReservation(
        'RES_1',
        '2025-11-20T19:00:00.000Z',
        '2025-11-20T20:30:00.000Z',
        90,
      );

      const resized = createReservation(
        'RES_2',
        '2025-11-20T20:00:00.000Z',
        '2025-11-20T21:30:00.000Z',
        90,
      );
      // Simulating resize: moving start time earlier
      resized.startTime = '2025-11-20T19:30:00.000Z'; // Now overlaps

      const result = checkAllConflicts(resized, [existing], mockTable);

      expect(result.hasConflict).toBe(true);
      expect(result.reason).toBe('overlap');
    });

    it('should allow moving start time when no conflict', () => {
      const existing = createReservation(
        'RES_1',
        '2025-11-20T19:00:00.000Z',
        '2025-11-20T20:30:00.000Z',
        90,
      );

      const resized = createReservation(
        'RES_2',
        '2025-11-20T21:00:00.000Z',
        '2025-11-20T22:30:00.000Z',
        90,
      );
      // Moving start time earlier but still no overlap
      resized.startTime = '2025-11-20T20:45:00.000Z';
      resized.endTime = '2025-11-20T22:15:00.000Z';

      const result = checkAllConflicts(resized, [existing], mockTable);

      expect(result.hasConflict).toBe(false);
    });
  });

  describe('Duration Constraints', () => {
    it('should maintain minimum duration (15 minutes = 1 slot)', () => {
      const width = 60; // 1 slot width
      const duration = widthToDuration(width);

      expect(duration).toBe(15); // Minimum duration
    });

    it('should snap to slot boundaries', () => {
      // Width that's between slots
      const width = 90; // 1.5 slots
      const duration = widthToDuration(width);

      // Should snap down to 1 slot = 15 minutes
      expect(duration).toBe(15);
    });
  });

  describe('Service Hours Validation During Resize', () => {
    it('should detect conflict when resizing outside service hours', () => {
      const resized = createReservation(
        'RES_1',
        '2025-11-20T10:00:00.000Z', // Before 11:00
        '2025-11-20T11:30:00.000Z',
        90,
      );

      const result = checkAllConflicts(resized, [], mockTable);

      expect(result.hasConflict).toBe(true);
      expect(result.reason).toBe('outside_service_hours');
    });

    it('should allow resizing within service hours', () => {
      const resized = createReservation(
        'RES_1',
        '2025-11-20T19:00:00.000Z',
        '2025-11-20T20:30:00.000Z',
        90,
      );

      const result = checkAllConflicts(resized, [], mockTable);

      expect(result.hasConflict).toBe(false);
    });
  });
});

