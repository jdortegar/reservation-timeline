'use client';

import { formatTimeRange, slotIndexToTime } from '@/lib/helpers/time';
import { addMinutes } from 'date-fns';
import { RESERVATION_STATUS_COLORS } from '@/lib/constants/TIMELINE';
import type { Reservation, Table } from '@/lib/types/Reservation';

interface ReservationGhostBlockProps {
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
}

export function ReservationGhostBlock({
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
}: ReservationGhostBlockProps) {
  const backgroundColor =
    RESERVATION_STATUS_COLORS[reservation.status] || '#9CA3AF';

  return (
    <div
      className="fixed rounded px-2 py-1 border-2 border-solid pointer-events-none shadow-lg"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: backgroundColor + '80',
        borderColor: backgroundColor,
        borderWidth: '2px',
        borderStyle: 'solid',
        opacity: 0.7,
        zIndex: 9999,
        position: 'fixed',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="font-semibold truncate leading-tight text-white text-xs">
        {reservation.customer.name}
      </div>
      <div className="text-xs opacity-95 leading-tight mt-0.5 flex items-center gap-1 text-white">
        <span>{reservation.partySize} guests</span>
        <span>•</span>
        <span>
          {formatTimeRange(
            slotIndexToTime(slotIndex, configDate),
            addMinutes(
              slotIndexToTime(slotIndex, configDate),
              reservation.durationMinutes,
            ),
          )}
        </span>
      </div>
      {visibleTables[tableIndex] &&
        tableIndex !== originalTableIndex && (
          <div className="text-xs opacity-95 leading-tight mt-0.5 text-white">
            → {visibleTables[tableIndex].name}
          </div>
        )}
    </div>
  );
}

