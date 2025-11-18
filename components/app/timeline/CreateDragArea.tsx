'use client';

import { useState, useRef, useEffect } from 'react';
import { slotIndexToTime, minutesToSlots, slotsToMinutes } from '@/lib/helpers/time';
import { slotToX, xToSlot, durationToWidth } from '@/lib/helpers/coordinates';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import type { Table } from '@/lib/types/Reservation';

interface CreateDragAreaProps {
  table: Table;
  timeSlots: Date[];
  zoom: number;
  configDate: string;
  onDragComplete: (tableId: string, startTime: string, duration: number) => void;
}

export function CreateDragArea({
  table,
  timeSlots,
  zoom,
  configDate,
  onDragComplete,
}: CreateDragAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startSlot, setStartSlot] = useState<number | null>(null);
  const [endSlot, setEndSlot] = useState<number | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-reservation-block]')) return;

    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const slot = Math.max(0, xToSlot(x, zoom));
    const snappedSlot = Math.floor(slot);

    setStartPos({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
    setStartSlot(snappedSlot);
    setEndSlot(snappedSlot);
  };


  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      if (startSlot === null || !startPos) return;
      
      const dragDistance = Math.abs(e.clientX - startPos.x) + Math.abs(e.clientY - startPos.y);
      if (dragDistance < 5) return;

      const rect = areaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const slot = Math.max(startSlot, xToSlot(x, zoom));
      const snappedSlot = Math.floor(slot);
      setEndSlot(snappedSlot);
    };

    const handleUp = () => {
      if (startSlot === null || endSlot === null || !startPos) {
        setIsDragging(false);
        setStartSlot(null);
        setEndSlot(null);
        setStartPos(null);
        return;
      }

      const minSlots = minutesToSlots(TIMELINE_CONFIG.MIN_DURATION_MINUTES);
      const slots = Math.max(minSlots, endSlot - startSlot + 1);
      const duration = slotsToMinutes(slots);
      const startTime = slotIndexToTime(startSlot, configDate);

      if (duration >= TIMELINE_CONFIG.MIN_DURATION_MINUTES) {
        onDragComplete(table.id, startTime.toISOString(), duration);
      }

      setIsDragging(false);
      setStartSlot(null);
      setEndSlot(null);
      setStartPos(null);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, startSlot, endSlot, startPos, zoom, configDate, table.id, onDragComplete]);

  const previewWidth =
    startSlot !== null && endSlot !== null
      ? durationToWidth(slotsToMinutes(endSlot - startSlot + 1), zoom)
      : 0;
  const previewX = startSlot !== null ? slotToX(startSlot, zoom) : 0;

  return (
    <>
      <div
        ref={areaRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        style={{ zIndex: 1 }}
      />
      {isDragging && startSlot !== null && endSlot !== null && (
        <div
          className="absolute border-2 border-dashed border-blue-500 bg-blue-100 bg-opacity-30 pointer-events-none"
          style={{
            left: previewX,
            top: 0,
            width: previewWidth,
            height: TIMELINE_CONFIG.ROW_HEIGHT_PX,
            zIndex: 10,
          }}
        />
      )}
    </>
  );
}

