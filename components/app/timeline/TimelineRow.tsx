'use client';

import { memo, useMemo } from 'react';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import type { Table } from '@/lib/types/Reservation';

interface TimelineRowProps {
  table: Table;
  timeSlots: Date[];
  zoom: number;
  children?: React.ReactNode;
  isLastRow?: boolean;
}

function TimelineRowComponent({
  table,
  timeSlots,
  zoom,
  children,
  isLastRow = false,
}: TimelineRowProps) {
  const cellWidth = useMemo(() => TIMELINE_CONFIG.CELL_WIDTH_PX * zoom, [zoom]);
  const gridWidth = useMemo(
    () => timeSlots.length * cellWidth,
    [timeSlots.length, cellWidth],
  );

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

const GridCells = memo(function GridCells({
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
        const isFirstSlot = index === 0;

        // Don't render border for the first slot - it's at the start
        if (isFirstSlot) {
          return null;
        }

        return (
          <div
            key={index}
            className="absolute border-l"
            style={{
              left: index * cellWidth,
              top: 0,
              width: cellWidth,
              height: '100%',
              borderLeftWidth: isHour ? 2 : isHalfHour ? 1 : 0.5,
              borderLeftColor: isHour
                ? '#374151'
                : isHalfHour
                ? '#9CA3AF'
                : '#E5E7EB',
            }}
          />
        );
      })}
      {/* Final border at the end of the grid (00:00) - left edge of last slot */}
      <div
        className="absolute border-l-2 border-gray-300"
        style={{
          left: gridWidth,
          top: 0,
          width: 0,
          height: '100%',
        }}
      />
    </>
  );
});

// Memoize TimelineRow to prevent unnecessary re-renders
// Best practice: Use default shallow comparison (React handles it efficiently)
// Custom comparison only needed if table objects are recreated with same values
export const TimelineRow = memo(TimelineRowComponent);
