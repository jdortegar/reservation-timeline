'use client';

import { memo, useMemo } from 'react';
import { formatTimeSlot } from '@/lib/helpers/time';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';

interface TimelineHeaderProps {
  timeSlots: Date[];
  zoom: number;
  timezone?: string;
}

function TimelineHeaderComponent({
  timeSlots,
  zoom,
  timezone,
}: TimelineHeaderProps) {
  const cellWidth = useMemo(() => TIMELINE_CONFIG.CELL_WIDTH_PX * zoom, [zoom]);

  return (
    <div
      className="sticky top-0 z-10 bg-white border-b-2 border-gray-300 shadow-sm"
      style={{ height: 70 }}
    >
      <div className="flex relative" style={{ height: '100%' }}>
        <div
          className="border-r-2 border-gray-300 bg-gray-100 flex items-center justify-center font-bold text-sm text-gray-700 shrink-0"
          style={{ width: 200, height: '100%' }}
        >
          Time
        </div>
        <div
          className="flex relative bg-white shrink-0 overflow-hidden"
          style={{ width: timeSlots.length * cellWidth }}
        >
          {timeSlots.map((slot, index) => {
            const isHour = slot.getMinutes() === 0;
            const isHalfHour = slot.getMinutes() === 30;
            const isLastSlot = index === timeSlots.length - 1;
            const isFirstSlot = index === 0;
            const isMidnight = slot.getHours() === 0 && slot.getMinutes() === 0;

            return (
              <div
                key={index}
                className={`flex items-center justify-center text-xs font-medium text-gray-700 ${
                  isFirstSlot ? '' : 'border-l'
                }`}
                style={{
                  width: cellWidth,
                  height: '100%',
                  borderLeftWidth: isFirstSlot
                    ? 0
                    : isHour
                    ? 2
                    : isHalfHour
                    ? 1
                    : 0.5,
                  borderLeftColor: isFirstSlot
                    ? 'transparent'
                    : isHour
                    ? '#374151'
                    : isHalfHour
                    ? '#9CA3AF'
                    : '#E5E7EB',
                  backgroundColor: isHour ? '#F9FAFB' : 'white',
                }}
              >
                {isHour && (
                  <span className={isMidnight ? 'font-bold text-gray-900' : ''}>
                    {formatTimeSlot(slot, timezone)}
                  </span>
                )}
              </div>
            );
          })}
          {/* Final border at the end of the grid (00:00) - left edge of last slot */}
          <div
            className="absolute border-l-2 border-gray-300"
            style={{
              left: timeSlots.length * cellWidth,
              top: 0,
              width: 0,
              height: '100%',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Memoize TimelineHeader to prevent unnecessary re-renders
// Best practice: Use default shallow comparison (React handles it efficiently)
// Custom comparison only needed if timeSlots array is recreated with same values
export const TimelineHeader = memo(TimelineHeaderComponent);
