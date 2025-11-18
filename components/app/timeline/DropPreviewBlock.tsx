'use client';

import { formatTimeRange, slotIndexToTime } from '@/lib/helpers/time';
import { addMinutes } from 'date-fns';
import { RESERVATION_STATUS_COLORS } from '@/lib/constants/TIMELINE';
import type { Reservation, Table } from '@/lib/types/Reservation';

interface DropPreviewBlockProps {
  reservation: Reservation;
  left: number;
  top: number;
  width: number;
  height: number;
  slotIndex: number;
  tableIndex: number;
  originalTableIndex: number;
  configDate: string;
  visibleTables: Table[];
  hasConflict?: boolean;
  conflictReason?: 'overlap' | 'capacity_exceeded' | 'outside_service_hours';
}

export function DropPreviewBlock({
  reservation,
  left,
  top,
  width,
  height,
  slotIndex,
  tableIndex,
  originalTableIndex,
  configDate,
  visibleTables,
  hasConflict = false,
  conflictReason,
}: DropPreviewBlockProps) {
  // Use green for valid drops, red for conflicts
  const borderColor = hasConflict ? '#EF4444' : '#10B981'; // Green: #10B981, Red: #EF4444
  const borderWidth = hasConflict ? '3px' : '2px';

  return (
    <div
      className="absolute rounded border-2 border-dashed pointer-events-none"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: hasConflict ? '#EF444420' : '#10B98120', // Red tint for conflicts, green tint for valid
        borderColor,
        borderWidth,
        borderStyle: 'dashed',
        opacity: hasConflict ? 0.8 : 0.6,
        zIndex: 9998,
        position: 'absolute',
        boxShadow: hasConflict
          ? '0 0 8px rgba(239, 68, 68, 0.5)'
          : '0 0 8px rgba(16, 185, 129, 0.3)', // Green glow for valid drops
      }}
    />
  );
}

