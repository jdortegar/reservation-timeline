'use client';

import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import type { Table } from '@/lib/types/Reservation';

interface TimelineRowProps {
  table: Table;
  timeSlots: Date[];
  zoom: number;
  children?: React.ReactNode;
}

export function TimelineRow({
  table,
  timeSlots,
  zoom,
  children,
}: TimelineRowProps) {
  const cellWidth = TIMELINE_CONFIG.CELL_WIDTH_PX * zoom;
  const gridWidth = timeSlots.length * cellWidth;

  return (
    <div
      className="relative border-b border-gray-200 hover:bg-gray-50/50"
      style={{ height: TIMELINE_CONFIG.ROW_HEIGHT_PX }}
    >
      <div className="flex" style={{ height: '100%' }}>
        <div
          className="border-r-2 border-gray-300 bg-gray-50 flex items-center justify-center text-sm font-semibold text-gray-800 shrink-0"
          style={{ width: 200, height: '100%' }}
        >
          <div className="text-center">
            <div className="font-bold">{table.name}</div>
            <div className="text-xs text-gray-600 mt-0.5">
              {table.capacity.min}-{table.capacity.max} seats
            </div>
          </div>
        </div>
        <div
          className="relative bg-white shrink-0"
          style={{ width: gridWidth, height: '100%' }}
        >
          <GridCells timeSlots={timeSlots} cellWidth={cellWidth} />
          {children}
        </div>
      </div>
    </div>
  );
}

function GridCells({
  timeSlots,
  cellWidth,
}: {
  timeSlots: Date[];
  cellWidth: number;
}) {
  return (
    <>
      {timeSlots.map((slot, index) => {
        const isHour = slot.getMinutes() === 0;
        const isHalfHour = slot.getMinutes() === 30;

        return (
          <div
            key={index}
            className="absolute border-r"
            style={{
              left: index * cellWidth,
              top: 0,
              width: cellWidth,
              height: '100%',
              borderRightWidth: isHour ? 2 : isHalfHour ? 1 : 0.5,
              borderRightColor: isHour
                ? '#374151'
                : isHalfHour
                ? '#9CA3AF'
                : '#E5E7EB',
            }}
          />
        );
      })}
    </>
  );
}
