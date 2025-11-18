import { addMinutes, format, parse, setHours, setMinutes } from 'date-fns';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import type { SlotIndex, Minutes } from '@/lib/types/Reservation';

export function getTimeSlots(date: string): Date[] {
  const slots: Date[] = [];
  const baseDate = parse(date, 'yyyy-MM-dd', new Date());

  for (
    let hour = TIMELINE_CONFIG.START_HOUR;
    hour < TIMELINE_CONFIG.END_HOUR;
    hour++
  ) {
    for (let minute = 0; minute < 60; minute += TIMELINE_CONFIG.SLOT_MINUTES) {
      const slotTime = setMinutes(setHours(baseDate, hour), minute);
      slots.push(slotTime);
    }
  }

  return slots;
}

export function timeToSlotIndex(time: Date, date: string): SlotIndex {
  const baseDate = parse(date, 'yyyy-MM-dd', new Date());
  const startOfDay = setHours(
    setMinutes(baseDate, 0),
    TIMELINE_CONFIG.START_HOUR,
  );
  const diffMinutes = Math.floor(
    (time.getTime() - startOfDay.getTime()) / (1000 * 60),
  );
  return Math.floor(diffMinutes / TIMELINE_CONFIG.SLOT_MINUTES);
}

export function slotIndexToTime(slotIndex: SlotIndex, date: string): Date {
  const baseDate = parse(date, 'yyyy-MM-dd', new Date());
  const startOfDay = setHours(
    setMinutes(baseDate, 0),
    TIMELINE_CONFIG.START_HOUR,
  );
  return addMinutes(startOfDay, slotIndex * TIMELINE_CONFIG.SLOT_MINUTES);
}

export function minutesToSlots(minutes: Minutes): number {
  return Math.floor(minutes / TIMELINE_CONFIG.SLOT_MINUTES);
}

export function slotsToMinutes(slots: number): Minutes {
  return slots * TIMELINE_CONFIG.SLOT_MINUTES;
}

export function formatTimeSlot(time: Date): string {
  return format(time, 'HH:mm');
}

export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTimeSlot(start)}-${formatTimeSlot(end)}`;
}

