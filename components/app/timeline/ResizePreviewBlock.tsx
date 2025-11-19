'use client';

import { formatTimeRange, slotIndexToTime } from '@/lib/helpers/time';
import { addMinutes } from 'date-fns';
import { RESERVATION_STATUS_COLORS } from '@/lib/constants/TIMELINE';
import type { Reservation } from '@/lib/types/Reservation';

interface ResizePreviewBlockProps {
  reservation: Reservation;
  left: number;
  top: number;
  width: number;
  height: number;
  startSlotIndex: number;
  endSlotIndex: number;
  newDurationMinutes: number;
  configDate: string;
  configTimezone?: string;
  hasConflict: boolean;
}

export function ResizePreviewBlock({
  reservation,
  left,
  top,
  width,
  height,
  startSlotIndex,
  endSlotIndex,
  newDurationMinutes,
  configDate,
  configTimezone,
  hasConflict,
}: ResizePreviewBlockProps) {
  const backgroundColor =
    RESERVATION_STATUS_COLORS[reservation.status] || '#9CA3AF';
  const startTime = slotIndexToTime(startSlotIndex, configDate, configTimezone);
  const endTime = slotIndexToTime(endSlotIndex, configDate, configTimezone);
  const timeRange = formatTimeRange(startTime, endTime, configTimezone);

  // Format duration
  const hours = Math.floor(newDurationMinutes / 60);
  const minutes = newDurationMinutes % 60;
  const durationText =
    hours > 0
      ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim()
      : `${minutes}m`;

  // Use green for valid resize, red for conflicts
  const borderColor = hasConflict ? '#EF4444' : '#10B981';

  return (
    <div
      className="absolute rounded border-2 border-dashed pointer-events-none"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: hasConflict ? '#EF444420' : '#10B98120',
        borderColor,
        borderWidth: hasConflict ? '3px' : '2px',
        borderStyle: 'dashed',
        opacity: 0.8,
        zIndex: 9999,
        position: 'absolute',
        boxShadow: hasConflict
          ? '0 0 8px rgba(239, 68, 68, 0.5)'
          : '0 0 8px rgba(16, 185, 129, 0.3)',
      }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 py-1 text-white text-xs">
        <div className="font-semibold truncate leading-tight">
          {reservation.customer.name}
        </div>
        <div className="text-xs opacity-95 leading-tight mt-0.5 flex items-center gap-1">
          <span>{reservation.partySize} guests</span>
          <span>•</span>
          <span>{timeRange}</span>
        </div>
        <div className="text-xs font-bold mt-1 leading-tight bg-white/20 px-2 py-0.5 rounded">
          Duration: {durationText}
        </div>
        {hasConflict && (
          <div className="text-xs font-bold mt-1 leading-tight text-red-300">
            Conflict
          </div>
        )}
      </div>
    </div>
  );
}
