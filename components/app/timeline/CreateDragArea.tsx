'use client';

import { useState, useRef, useEffect } from 'react';
import { addMinutes } from 'date-fns';
import {
  slotIndexToTime,
  minutesToSlots,
  slotsToMinutes,
} from '@/lib/helpers/time';
import { slotToX, xToSlot, durationToWidth } from '@/lib/helpers/coordinates';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import { checkAllConflicts } from '@/lib/helpers/conflicts';
import type { Table, Reservation } from '@/lib/types/Reservation';

interface CreateDragAreaProps {
  table: Table;
  timeSlots: Date[];
  zoom: number;
  configDate: string;
  configTimezone?: string;
  onDragComplete: (
    tableId: string,
    startTime: string,
    duration: number,
  ) => void;
  isDragActive?: boolean;
  isResizeActive?: boolean;
  reservations?: Reservation[];
  defaultPartySize?: number;
}

export function CreateDragArea({
  table,
  timeSlots,
  zoom,
  configDate,
  configTimezone,
  onDragComplete,
  isDragActive = false,
  isResizeActive = false,
  reservations = [],
  defaultPartySize = 2,
}: CreateDragAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startSlot, setStartSlot] = useState<number | null>(null);
  const [endSlot, setEndSlot] = useState<number | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictReason, setConflictReason] = useState<
    'overlap' | 'capacity_exceeded' | 'outside_service_hours' | undefined
  >(undefined);
  const areaRef = useRef<HTMLDivElement>(null);

  // Use refs to store latest mouse event for RAF throttling
  const latestMouseEventRef = useRef<MouseEvent | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Reset conflict state when date changes
  useEffect(() => {
    setHasConflict(false);
    setConflictReason(undefined);
  }, [configDate]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle left mouse button (button 0)
    // Right clicks (button 2) should pass through to reservation blocks
    if (e.button !== 0) {
      // Don't prevent default for right-clicks - let them bubble to reservation blocks
      return;
    }

    // Don't start create drag if:
    // - A drag or resize is already active
    // - Clicking on reservation blocks
    // - Clicking on resize handles
    if (isDragActive || isResizeActive) {
      return;
    }

    const target = e.target as HTMLElement;
    if (
      target.closest('[data-reservation-block]') ||
      target.dataset.resizeHandle === 'left' ||
      target.dataset.resizeHandle === 'right'
    ) {
      return;
    }

    // Prevent text selection during drag
    e.preventDefault();

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
    if (!isDragging) {
      // Clean up RAF if drag ends
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      latestMouseEventRef.current = null;
      return;
    }

    const processMouseMove = (e: MouseEvent) => {
      if (startSlot === null || !startPos) return;

      const dragDistance =
        Math.abs(e.clientX - startPos.x) + Math.abs(e.clientY - startPos.y);
      if (dragDistance < 5) return;

      const rect = areaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const slot = Math.max(startSlot, xToSlot(x, zoom));
      const snappedSlot = Math.floor(slot);
      setEndSlot(snappedSlot);

      // Check for conflicts in real-time
      const minSlots = minutesToSlots(TIMELINE_CONFIG.MIN_DURATION_MINUTES);
      const slots = Math.max(minSlots, snappedSlot - startSlot + 1);
      const duration = slotsToMinutes(slots);
      const startTime = slotIndexToTime(startSlot, configDate, configTimezone);
      const endTime = addMinutes(startTime, duration);

      // Create temporary reservation for conflict check
      const tempReservation: Reservation = {
        id: 'TEMP',
        tableId: table.id,
        customer: {
          name: 'Temp',
          phone: '',
        },
        partySize: defaultPartySize,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes: duration,
        status: 'PENDING',
        priority: 'STANDARD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Filter reservations to only check conflicts for the same table
      // This allows creating reservations on any date
      const tableReservations = reservations.filter(
        (r) => r.tableId === table.id,
      );

      const conflictCheck = checkAllConflicts(
        tempReservation,
        tableReservations,
        table,
      );

      setHasConflict(conflictCheck.hasConflict);
      setConflictReason(conflictCheck.reason);
    };

    const handleUp = () => {
      if (startSlot === null || endSlot === null || !startPos) {
        setIsDragging(false);
        setStartSlot(null);
        setEndSlot(null);
        setStartPos(null);
        setHasConflict(false);
        setConflictReason(undefined);
        return;
      }

      const minSlots = minutesToSlots(TIMELINE_CONFIG.MIN_DURATION_MINUTES);
      const slots = Math.max(minSlots, endSlot - startSlot + 1);
      const duration = slotsToMinutes(slots);
      const startTime = slotIndexToTime(startSlot, configDate, configTimezone);

      // Only complete if no conflict
      if (duration >= TIMELINE_CONFIG.MIN_DURATION_MINUTES && !hasConflict) {
        onDragComplete(table.id, startTime.toISOString(), duration);
      }

      setIsDragging(false);
      setStartSlot(null);
      setEndSlot(null);
      setStartPos(null);
      setHasConflict(false);
      setConflictReason(undefined);
    };

    const handleMove = (e: MouseEvent) => {
      // Store latest mouse event
      latestMouseEventRef.current = e;

      // Schedule update via requestAnimationFrame if not already scheduled
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (latestMouseEventRef.current) {
            processMouseMove(latestMouseEventRef.current);
          }
        });
      }
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      // Clean up RAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      latestMouseEventRef.current = null;
    };
  }, [
    isDragging,
    startSlot,
    endSlot,
    startPos,
    zoom,
    configDate,
    configTimezone,
    table.id,
    table.capacity,
    defaultPartySize,
    reservations,
    hasConflict,
    onDragComplete,
  ]);

  const previewWidth =
    startSlot !== null && endSlot !== null
      ? durationToWidth(slotsToMinutes(endSlot - startSlot + 1), zoom)
      : 0;
  const previewX = startSlot !== null ? slotToX(startSlot, zoom) : 0;

  return (
    <>
      <div
        ref={areaRef}
        role="region"
        aria-label={`Create new reservation on ${table.name}. Click and drag to select time slot.`}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onContextMenu={(e) => {
          // Allow right-click events to pass through to reservation blocks
          // Don't prevent default - let the event bubble to reservation blocks
          const target = e.target as HTMLElement;
          if (target.closest('[data-reservation-block]')) {
            // If clicking on a reservation block, don't interfere
            return;
          }
        }}
        style={{ zIndex: 1, pointerEvents: 'auto' }}
      />
      {isDragging && startSlot !== null && endSlot !== null && (
        <div
          className="absolute border-2 border-dashed pointer-events-none"
          style={{
            left: previewX,
            top: 0,
            width: previewWidth,
            height: TIMELINE_CONFIG.ROW_HEIGHT_PX,
            zIndex: 10,
            borderColor: hasConflict ? '#EF4444' : '#3B82F6',
            backgroundColor: hasConflict ? '#EF444420' : '#3B82F620',
            boxShadow: hasConflict
              ? '0 0 8px rgba(239, 68, 68, 0.5)'
              : '0 0 4px rgba(59, 130, 246, 0.3)',
          }}
        />
      )}
    </>
  );
}
