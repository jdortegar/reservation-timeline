import { useState, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { parseISO, addMinutes } from 'date-fns';
import { timeToSlotIndex, slotIndexToTime } from '@/lib/helpers/time';
import { xToSlot, slotToX, durationToWidth } from '@/lib/helpers/coordinates';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import { checkAllConflicts } from '@/lib/helpers/conflicts';
import type { Reservation, Table } from '@/lib/types/Reservation';

interface UseReservationResizeProps {
  gridContainerRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  configDate: string;
  configTimezone?: string;
  visibleTables: Table[];
  reservations: Reservation[];
  groupedTables: Array<{
    sector: {
      id: string;
      name: string;
      color: string;
      sortOrder: number;
    } | null;
    tables: Table[];
  }>;
  collapsedSectors: string[];
  onUpdateReservation: (
    reservationId: string,
    updates: {
      startTime?: string;
      endTime?: string;
      durationMinutes?: number;
    },
  ) => void;
}

interface ResizingReservation {
  reservation: Reservation;
  edge: 'left' | 'right';
  originalStartTime: Date;
  originalEndTime: Date;
  originalLeft: number;
  originalWidth: number;
  initialPointerX: number;
}

interface ResizePreview {
  left: number;
  top: number;
  width: number;
  startSlotIndex: number;
  endSlotIndex: number;
  newDurationMinutes: number;
  hasConflict: boolean;
  conflictReason?: 'overlap' | 'capacity_exceeded' | 'outside_service_hours';
}

export function useReservationResize({
  gridContainerRef,
  zoom,
  configDate,
  configTimezone,
  visibleTables,
  reservations,
  groupedTables,
  collapsedSectors,
  onUpdateReservation,
}: UseReservationResizeProps) {
  const [resizingReservation, setResizingReservation] =
    useState<ResizingReservation | null>(null);
  const [resizePreview, setResizePreview] = useState<ResizePreview | null>(
    null,
  );

  // Use refs to store latest mouse event for RAF throttling
  const latestMouseEventRef = useRef<MouseEvent | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const handleResizeStart = (
    reservation: Reservation,
    edge: 'left' | 'right',
    e: React.MouseEvent,
    originalLeft: number,
  ) => {
    if (reservation.status === 'CANCELLED') return;

    // Prevent text selection during resize
    e.preventDefault();

    const gridContainer = gridContainerRef?.current;
    if (!gridContainer) return;

    const gridRect = gridContainer.getBoundingClientRect();
    const scrollLeft = gridContainer.scrollLeft || 0;
    // Calculate initial pointer position in grid coordinates (accounting for scroll)
    const initialPointerX = e.clientX - gridRect.left - 200 + scrollLeft;

    const originalStartTime = parseISO(reservation.startTime);
    const originalEndTime = parseISO(reservation.endTime);
    const originalWidth = durationToWidth(reservation.durationMinutes, zoom);

    setResizingReservation({
      reservation,
      edge,
      originalStartTime,
      originalEndTime,
      originalLeft,
      originalWidth,
      initialPointerX,
    });
  };

  useEffect(() => {
    if (!resizingReservation) {
      // Clean up RAF if resize ends
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      latestMouseEventRef.current = null;
      return;
    }

    const processMouseMove = (e: MouseEvent) => {
      const gridContainer = gridContainerRef?.current;
      if (!gridContainer) return;

      const gridRect = gridContainer.getBoundingClientRect();
      const scrollLeft = gridContainer.scrollLeft || 0;
      // Calculate current pointer position in grid coordinates (accounting for scroll)
      const currentPointerX = e.clientX - gridRect.left - 200 + scrollLeft;

      const deltaX = currentPointerX - resizingReservation.initialPointerX;
      const cellWidth = TIMELINE_CONFIG.CELL_WIDTH_PX * zoom;
      const minDurationSlots =
        TIMELINE_CONFIG.MIN_DURATION_MINUTES / TIMELINE_CONFIG.SLOT_MINUTES; // 2 slots
      const maxDurationSlots =
        TIMELINE_CONFIG.MAX_DURATION_MINUTES / TIMELINE_CONFIG.SLOT_MINUTES; // 16 slots

      let newLeft = resizingReservation.originalLeft;
      let newWidth = resizingReservation.originalWidth;
      let newStartTime = resizingReservation.originalStartTime;
      let newEndTime = resizingReservation.originalEndTime;

      if (resizingReservation.edge === 'right') {
        // Resize right edge: extend/shrink duration
        // Calculate where the right edge would be
        const newRightEdgeX =
          resizingReservation.originalLeft +
          resizingReservation.originalWidth +
          deltaX;
        const safeRightEdgeX = Math.max(
          resizingReservation.originalLeft + cellWidth * minDurationSlots,
          Math.min(
            resizingReservation.originalLeft + cellWidth * maxDurationSlots,
            newRightEdgeX,
          ),
        );

        // Snap right edge to slot boundary
        const newRightEdgeSlot = xToSlot(safeRightEdgeX, zoom);
        const snappedRightEdgeX = slotToX(newRightEdgeSlot, zoom);

        // Calculate new width from original left to snapped right edge
        newWidth = snappedRightEdgeX - resizingReservation.originalLeft;
        newLeft = resizingReservation.originalLeft; // Start position doesn't change

        // Calculate new end time based on slot difference
        const originalStartSlot = timeToSlotIndex(
          resizingReservation.originalStartTime,
          configDate,
          configTimezone,
        );
        const newDurationSlots = newRightEdgeSlot - originalStartSlot;
        const clampedDurationSlots = Math.max(
          minDurationSlots,
          Math.min(maxDurationSlots, newDurationSlots),
        );

        newWidth = clampedDurationSlots * cellWidth;
        newEndTime = addMinutes(
          resizingReservation.originalStartTime,
          clampedDurationSlots * TIMELINE_CONFIG.SLOT_MINUTES,
        );
      } else {
        // Resize left edge: change start time + duration
        newLeft = Math.max(0, resizingReservation.originalLeft + deltaX);

        // Snap to slot boundaries
        const newStartSlot = xToSlot(newLeft, zoom);
        newLeft = slotToX(newStartSlot, zoom);
        newStartTime = slotIndexToTime(newStartSlot, configDate, configTimezone);

        // Calculate new duration (keep end time, adjust start)
        const originalEndSlot = timeToSlotIndex(
          resizingReservation.originalEndTime,
          configDate,
          configTimezone,
        );
        const newDurationSlots = Math.max(
          minDurationSlots,
          Math.min(maxDurationSlots, originalEndSlot - newStartSlot),
        );

        newWidth = newDurationSlots * cellWidth;
        newEndTime = addMinutes(
          newStartTime,
          newDurationSlots * TIMELINE_CONFIG.SLOT_MINUTES,
        );
      }

      // Check for conflicts
      const table = visibleTables.find(
        (t) => t.id === resizingReservation.reservation.tableId,
      );
      const tempReservation: Reservation = {
        ...resizingReservation.reservation,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        durationMinutes: Math.round(
          (newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60),
        ),
      };

      const conflictCheck = table
        ? checkAllConflicts(
            tempReservation,
            reservations,
            table,
            resizingReservation.reservation.id,
          )
        : {
            hasConflict: true,
            conflictingReservationIds: [],
            reason: undefined,
          };

      const newStartSlotIndex = timeToSlotIndex(newStartTime, configDate);
      const newEndSlotIndex = timeToSlotIndex(newEndTime, configDate);

      // Calculate top position (same logic as drag hook)
      const headerHeight = 70;
      const sectorHeaderHeight = 40;
      const rowHeight = TIMELINE_CONFIG.ROW_HEIGHT_PX;
      let targetRowY = headerHeight;

      const tableIndex = visibleTables.findIndex(
        (t) => t.id === resizingReservation.reservation.tableId,
      );

      if (tableIndex >= 0) {
        let currentTableIndex = 0;
        let foundTarget = false;

        for (const group of groupedTables) {
          const isCollapsed =
            group.sector && collapsedSectors.includes(group.sector.id);
          const visibleGroupTables = isCollapsed ? [] : group.tables;

          if (group.sector && !isCollapsed) {
            targetRowY += sectorHeaderHeight;
          }

          for (let idx = 0; idx < visibleGroupTables.length; idx++) {
            if (currentTableIndex === tableIndex) {
              foundTarget = true;
              break;
            }
            targetRowY += rowHeight;
            currentTableIndex++;
          }

          if (foundTarget) {
            break;
          }
        }
      }

      setResizePreview({
        left: 200 + newLeft, // Add sidebar width
        top: targetRowY,
        width: newWidth,
        startSlotIndex: newStartSlotIndex,
        endSlotIndex: newEndSlotIndex,
        newDurationMinutes: tempReservation.durationMinutes,
        hasConflict: conflictCheck.hasConflict,
        conflictReason: conflictCheck.reason,
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!resizingReservation || !resizePreview) {
        setResizingReservation(null);
        setResizePreview(null);
        return;
      }

      // Only apply if no conflict
      if (!resizePreview.hasConflict) {
        const updates: {
          startTime?: string;
          endTime?: string;
          durationMinutes?: number;
        } = {};

        if (resizingReservation.edge === 'right') {
          // Right edge: only update end time and duration
          updates.endTime = slotIndexToTime(
            resizePreview.endSlotIndex,
            configDate,
            configTimezone,
          ).toISOString();
          updates.durationMinutes = resizePreview.newDurationMinutes;
        } else {
          // Left edge: update start time, end time, and duration
          updates.startTime = slotIndexToTime(
            resizePreview.startSlotIndex,
            configDate,
            configTimezone,
          ).toISOString();
          updates.endTime = slotIndexToTime(
            resizePreview.endSlotIndex,
            configDate,
            configTimezone,
          ).toISOString();
          updates.durationMinutes = resizePreview.newDurationMinutes;
        }

        if (Object.keys(updates).length > 0) {
          onUpdateReservation(resizingReservation.reservation.id, updates);
        }
      }

      setResizingReservation(null);
      setResizePreview(null);
    };

    const handleMouseMove = (e: MouseEvent) => {
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

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Clean up RAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      latestMouseEventRef.current = null;
    };
  }, [
    resizingReservation,
    resizePreview,
    zoom,
    configDate,
    visibleTables,
    reservations,
    groupedTables,
    collapsedSectors,
    onUpdateReservation,
    gridContainerRef,
  ]);

  return {
    resizingReservation,
    resizePreview,
    handleResizeStart,
  };
}
