import { addMinutes, format, parse, setHours, setMinutes } from 'date-fns';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import type { SlotIndex, Minutes } from '@/lib/types/Reservation';

// Timezone helper functions
// Note: For now, timezone is stored but conversion is deferred
// Full timezone support can be added later with proper date-fns/tz integration
function applyTimezone(date: Date, timezone?: string): Date {
  // TODO: Implement proper timezone conversion using @date-fns/tz
  // For now, return date as-is (assumes local timezone)
  return date;
}

function formatInTimezone(date: Date, timezone?: string): Date {
  // TODO: Implement proper timezone conversion for display
  // For now, return date as-is (assumes local timezone)
  return date;
}

export function getTimeSlots(date: string, timezone?: string): Date[] {
  const slots: Date[] = [];
  const baseDate = parse(date, 'yyyy-MM-dd', new Date());

  // Generate slots from START_HOUR (11) to END_HOUR (24, which is 00:00)
  // This creates 13 hours: 11:00, 11:15, ..., 23:45, 00:00 (52 slots total)
  for (
    let hour = TIMELINE_CONFIG.START_HOUR;
    hour < TIMELINE_CONFIG.END_HOUR;
    hour++
  ) {
    // For all hours 11-23, add all 15-minute slots
    for (let minute = 0; minute < 60; minute += TIMELINE_CONFIG.SLOT_MINUTES) {
      const slotTime = setMinutes(setHours(baseDate, hour), minute);
      // Apply timezone if specified
      const zonedTime = applyTimezone(slotTime, timezone);
      slots.push(zonedTime);
    }
  }

  // Add 00:00 (midnight) as the final slot
  // This is technically the start of the next day, but displayed as part of current day
  const nextDay = addMinutes(baseDate, 24 * 60);
  const midnight = setMinutes(setHours(nextDay, 0), 0);
  const zonedMidnight = applyTimezone(midnight, timezone);
  slots.push(zonedMidnight);

  return slots;
}

export function timeToSlotIndex(
  time: Date,
  date: string,
  timezone?: string,
): SlotIndex {
  const baseDate = parse(date, 'yyyy-MM-dd', new Date());
  const startOfDay = setHours(
    setMinutes(baseDate, 0),
    TIMELINE_CONFIG.START_HOUR,
  );

  // Apply timezone if specified
  const zonedTime = formatInTimezone(time, timezone);
  const zonedStartOfDay = applyTimezone(startOfDay, timezone);

  const diffMinutes = Math.floor(
    (zonedTime.getTime() - zonedStartOfDay.getTime()) / (1000 * 60),
  );
  return Math.floor(diffMinutes / TIMELINE_CONFIG.SLOT_MINUTES);
}

export function slotIndexToTime(
  slotIndex: SlotIndex,
  date: string,
  timezone?: string,
): Date {
  const baseDate = parse(date, 'yyyy-MM-dd', new Date());
  const startOfDay = setHours(
    setMinutes(baseDate, 0),
    TIMELINE_CONFIG.START_HOUR,
  );
  const slotTime = addMinutes(
    startOfDay,
    slotIndex * TIMELINE_CONFIG.SLOT_MINUTES,
  );

  // Apply timezone if specified
  return applyTimezone(slotTime, timezone);
}

export function minutesToSlots(minutes: Minutes): number {
  return Math.floor(minutes / TIMELINE_CONFIG.SLOT_MINUTES);
}

export function slotsToMinutes(slots: number): Minutes {
  return slots * TIMELINE_CONFIG.SLOT_MINUTES;
}

export function formatTimeSlot(time: Date, timezone?: string): string {
  const zonedTime = formatInTimezone(time, timezone);
  return format(zonedTime, 'HH:mm');
}

export function formatTimeRange(
  start: Date,
  end: Date,
  timezone?: string,
): string {
  return `${formatTimeSlot(start, timezone)}-${formatTimeSlot(end, timezone)}`;
}
