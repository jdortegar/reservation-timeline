import { describe, it, expect } from 'vitest';
import {
  slotToX,
  xToSlot,
  durationToWidth,
  widthToDuration,
} from '../coordinates';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';

describe('Coordinate Helper Functions', () => {
  describe('slotToX and xToSlot', () => {
    it('should convert slot 0 to x position 0', () => {
      const x = slotToX(0);
      expect(x).toBe(0);
    });

    it('should convert slot 1 to correct x position', () => {
      const x = slotToX(1);
      expect(x).toBe(TIMELINE_CONFIG.CELL_WIDTH_PX);
    });

    it('should be inverse operations', () => {
      const slot = 5;
      const x = slotToX(slot);
      const convertedBack = xToSlot(x);

      expect(convertedBack).toBe(slot);
    });

    it('should handle zoom correctly', () => {
      const slot = 2;
      const zoom = 1.5;
      const x = slotToX(slot, zoom);

      expect(x).toBe(slot * TIMELINE_CONFIG.CELL_WIDTH_PX * zoom);
    });
  });

  describe('durationToWidth and widthToDuration', () => {
    it('should convert 30 minutes to correct width', () => {
      const width = durationToWidth(30);
      // 30 minutes = 2 slots = 2 * CELL_WIDTH_PX
      expect(width).toBe(2 * TIMELINE_CONFIG.CELL_WIDTH_PX);
    });

    it('should convert 90 minutes to correct width', () => {
      const width = durationToWidth(90);
      // 90 minutes = 6 slots = 6 * CELL_WIDTH_PX
      expect(width).toBe(6 * TIMELINE_CONFIG.CELL_WIDTH_PX);
    });

    it('should be inverse operations', () => {
      const duration = 45;
      const width = durationToWidth(duration);
      const convertedBack = widthToDuration(width);

      expect(convertedBack).toBe(duration);
    });

    it('should handle zoom correctly', () => {
      const duration = 30;
      const zoom = 2;
      const width = durationToWidth(duration, zoom);

      expect(width).toBe(2 * TIMELINE_CONFIG.CELL_WIDTH_PX * zoom);
    });
  });
});
