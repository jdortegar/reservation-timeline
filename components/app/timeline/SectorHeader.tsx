'use client';

import { useMemo, memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import type { Sector } from '@/lib/types/Reservation';

interface SectorHeaderProps {
  sector: Sector;
  isCollapsed: boolean;
  onToggle: () => void;
  timeSlots: Date[];
  zoom: number;
}

export const SectorHeader = memo(function SectorHeader({
  sector,
  isCollapsed,
  onToggle,
  timeSlots,
  zoom,
}: SectorHeaderProps) {
  const cellWidth = useMemo(() => TIMELINE_CONFIG.CELL_WIDTH_PX * zoom, [zoom]);
  const gridWidth = useMemo(
    () => timeSlots.length * cellWidth,
    [timeSlots.length, cellWidth],
  );

  return (
    <div className="flex" style={{ height: 40 }}>
      <div
        className="border-r-2 border-gray-300 cursor-pointer hover:opacity-80 flex items-center px-4 font-semibold text-sm transition-colors shrink-0"
        style={{
          backgroundColor: sector.color + '20',
          color: sector.color,
          width: 200,
          height: '100%',
        }}
        onClick={onToggle}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 mr-2" />
        ) : (
          <ChevronDown className="h-4 w-4 mr-2" />
        )}
        {sector.name}
      </div>
      <div
        className="border-b border-t border-r-2 border-gray-300 shrink-0 overflow-hidden"
        style={{
          backgroundColor: sector.color + '20',
          width: gridWidth,
          height: '100%',
        }}
      />
    </div>
  );
});

