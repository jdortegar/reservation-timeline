'use client';

import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import type { Table } from '@/lib/types/Reservation';

interface TimelineRowProps {
  table: Table;
  timeSlots: Date[];
  zoom: number;
  children?: React.ReactNode;
  isLastRow?: boolean;
}

export function TimelineRow({
  table,
  timeSlots,
  zoom,
  children,
  isLastRow = false,
}: TimelineRowProps) {
  const cellWidth = TIMELINE_CONFIG.CELL_WIDTH_PX * zoom;
  const gridWidth = timeSlots.length * cellWidth;

  return (
    <div
      className={`relative hover:bg-gray-50/50 ${
        isLastRow ? 'border-b-2 border-black' : 'border-b border-gray-200'
      }`}
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
          className="relative bg-white shrink-0 border-r-2 border-gray-300 overflow-hidden"
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
  const gridWidth = timeSlots.length * cellWidth;

  return (
    <>
      {timeSlots.map((slot, index) => {
        const isHour = slot.getMinutes() === 0;
        const isHalfHour = slot.getMinutes() === 30;
        const isLastSlot = index === timeSlots.length - 1;

        // Don't render border for the last slot (00:00) - it will be the final border
        if (isLastSlot) {
          return null;
        }

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
      {/* Final border at the end of the grid (00:00) - right edge of last slot */}
      <div
        className="absolute border-r-2 border-gray-300"
        style={{
          left: gridWidth,
          top: 0,
          width: 0,
          height: '100%',
        }}
      />
    </>
  );
}
