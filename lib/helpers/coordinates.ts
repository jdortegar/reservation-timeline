import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import type { SlotIndex } from '@/lib/types/Reservation';

/**
 * Coordinate Transform Functions
 *
 * These functions convert between different coordinate systems used in the timeline:
 * - Time slots (15-minute intervals) ↔ Pixel positions (X coordinates)
 * - Duration (minutes) ↔ Width (pixels)
 * - Table indices ↔ Pixel positions (Y coordinates)
 *
 * All functions support zoom scaling for responsive timeline views.
 */

/**
 * Converts a time slot index to its X pixel position on the timeline.
 *
 * Algorithm:
 * - Each slot represents 15 minutes (SLOT_MINUTES)
 * - Each slot has a fixed width (CELL_WIDTH_PX)
 * - Position = slotIndex × cellWidth × zoom
 *
 * @param slotIndex - The time slot index (0 = first slot of the day)
 * @param zoom - Zoom multiplier (1.0 = normal, 2.0 = double width)
 * @returns X coordinate in pixels from the left edge of the timeline
 */
export function slotToX(slotIndex: SlotIndex, zoom: number = 1): number {
  return slotIndex * TIMELINE_CONFIG.CELL_WIDTH_PX * zoom;
}

/**
 * Converts an X pixel position to the corresponding time slot index.
 *
 * Algorithm:
 * - Reverse of slotToX: divide pixel position by cell width
 * - Use Math.floor to snap to the nearest slot boundary
 *
 * @param x - X coordinate in pixels from the left edge
 * @param zoom - Zoom multiplier (must match the zoom used in slotToX)
 * @returns The slot index containing this X position
 */
export function xToSlot(x: number, zoom: number = 1): SlotIndex {
  return Math.floor(x / (TIMELINE_CONFIG.CELL_WIDTH_PX * zoom));
}

/**
 * Converts a duration in minutes to the corresponding width in pixels.
 *
 * Algorithm:
 * - Convert minutes to slots: duration / SLOT_MINUTES
 * - Convert slots to pixels: slots × CELL_WIDTH_PX × zoom
 * - Use Math.floor to ensure pixel-perfect alignment
 *
 * @param durationMinutes - Duration in minutes (e.g., 90 = 1.5 hours)
 * @param zoom - Zoom multiplier
 * @returns Width in pixels
 */
export function durationToWidth(
  durationMinutes: number,
  zoom: number = 1,
): number {
  const slots = Math.floor(durationMinutes / TIMELINE_CONFIG.SLOT_MINUTES);
  return slots * TIMELINE_CONFIG.CELL_WIDTH_PX * zoom;
}

/**
 * Converts a width in pixels to the corresponding duration in minutes.
 *
 * Algorithm:
 * - Convert pixels to slots: width / (CELL_WIDTH_PX × zoom)
 * - Convert slots to minutes: slots × SLOT_MINUTES
 * - Use Math.floor to snap to slot boundaries
 *
 * @param width - Width in pixels
 * @param zoom - Zoom multiplier (must match the zoom used in durationToWidth)
 * @returns Duration in minutes, rounded down to nearest slot
 */
export function widthToDuration(width: number, zoom: number = 1): number {
  const slots = Math.floor(width / (TIMELINE_CONFIG.CELL_WIDTH_PX * zoom));
  return slots * TIMELINE_CONFIG.SLOT_MINUTES;
}

/**
 * Converts a table index to its Y pixel position on the timeline.
 *
 * Algorithm:
 * - Each table row has a fixed height (ROW_HEIGHT_PX)
 * - Position = tableIndex × rowHeight
 *
 * @param tableIndex - The table's index in the visible tables array
 * @returns Y coordinate in pixels from the top of the timeline
 */
export function tableToY(tableIndex: number): number {
  return tableIndex * TIMELINE_CONFIG.ROW_HEIGHT_PX;
}

/**
 * Converts a Y pixel position to the corresponding table index.
 *
 * Algorithm:
 * - Reverse of tableToY: divide pixel position by row height
 * - Use Math.floor to determine which row contains this Y position
 *
 * @param y - Y coordinate in pixels from the top
 * @returns The table index for the row containing this Y position
 */
export function yToTable(y: number): number {
  return Math.floor(y / TIMELINE_CONFIG.ROW_HEIGHT_PX);
}
