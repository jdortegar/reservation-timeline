import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import type { SlotIndex } from '@/lib/types/Reservation';

export function slotToX(slotIndex: SlotIndex, zoom: number = 1): number {
  return slotIndex * TIMELINE_CONFIG.CELL_WIDTH_PX * zoom;
}

export function xToSlot(x: number, zoom: number = 1): SlotIndex {
  return Math.floor(x / (TIMELINE_CONFIG.CELL_WIDTH_PX * zoom));
}

export function durationToWidth(durationMinutes: number, zoom: number = 1): number {
  const slots = Math.floor(durationMinutes / TIMELINE_CONFIG.SLOT_MINUTES);
  return slots * TIMELINE_CONFIG.CELL_WIDTH_PX * zoom;
}

export function widthToDuration(width: number, zoom: number = 1): number {
  const slots = Math.floor(width / (TIMELINE_CONFIG.CELL_WIDTH_PX * zoom));
  return slots * TIMELINE_CONFIG.SLOT_MINUTES;
}

export function tableToY(tableIndex: number): number {
  return tableIndex * TIMELINE_CONFIG.ROW_HEIGHT_PX;
}

export function yToTable(y: number): number {
  return Math.floor(y / TIMELINE_CONFIG.ROW_HEIGHT_PX);
}

