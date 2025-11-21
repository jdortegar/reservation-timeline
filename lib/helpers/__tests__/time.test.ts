import { describe, it, expect } from 'vitest';
import {
  getTimeSlots,
  timeToSlotIndex,
  slotIndexToTime,
  minutesToSlots,
  slotsToMinutes,
} from '../time';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';

describe('Time Helper Functions', () => {
  describe('getTimeSlots', () => {
    it('should generate correct number of slots for a day', () => {
      const date = '2025-11-18';
      const slots = getTimeSlots(date);

      // Should have 53 slots: 11:00-23:45 (13 hours × 4 slots = 52) + 00:00 (1 slot)
      // 13 hours from 11:00 to 23:59 = 13 × 4 = 52 slots, plus 00:00 = 53 total
      expect(slots.length).toBe(53);
    });

    it('should start at 11:00 and end at 00:00', () => {
      const date = '2025-11-18';
      const slots = getTimeSlots(date);

      const firstSlot = slots[0];
      const lastSlot = slots[slots.length - 1];

      expect(firstSlot.getHours()).toBe(TIMELINE_CONFIG.START_HOUR);
      expect(firstSlot.getMinutes()).toBe(0);
      expect(lastSlot.getHours()).toBe(0);
      expect(lastSlot.getMinutes()).toBe(0);
    });
  });

  describe('timeToSlotIndex', () => {
    it('should convert 11:00 to slot index 0', () => {
      const date = '2025-11-18';
      const time = new Date('2025-11-18T11:00:00');
      const slotIndex = timeToSlotIndex(time, date);

      expect(slotIndex).toBe(0);
    });

    it('should convert 12:00 to slot index 4', () => {
      const date = '2025-11-18';
      const time = new Date('2025-11-18T12:00:00');
      const slotIndex = timeToSlotIndex(time, date);

      // 12:00 is 1 hour after 11:00 = 4 slots (15 min each)
      expect(slotIndex).toBe(4);
    });
  });

  describe('slotIndexToTime', () => {
    it('should convert slot index 0 to 11:00', () => {
      const date = '2025-11-18';
      const time = slotIndexToTime(0, date);

      expect(time.getHours()).toBe(TIMELINE_CONFIG.START_HOUR);
      expect(time.getMinutes()).toBe(0);
    });

    it('should convert slot index 4 to 12:00', () => {
      const date = '2025-11-18';
      const time = slotIndexToTime(4, date);

      expect(time.getHours()).toBe(12);
      expect(time.getMinutes()).toBe(0);
    });
  });

  describe('minutesToSlots and slotsToMinutes', () => {
    it('should convert 30 minutes to 2 slots', () => {
      expect(minutesToSlots(30)).toBe(2);
    });

    it('should convert 90 minutes to 6 slots', () => {
      expect(minutesToSlots(90)).toBe(6);
    });

    it('should convert 2 slots to 30 minutes', () => {
      expect(slotsToMinutes(2)).toBe(30);
    });

    it('should convert 6 slots to 90 minutes', () => {
      expect(slotsToMinutes(6)).toBe(90);
    });

    it('should be inverse operations', () => {
      const minutes = 45;
      const slots = minutesToSlots(minutes);
      const convertedBack = slotsToMinutes(slots);

      expect(convertedBack).toBe(minutes);
    });
  });
});
