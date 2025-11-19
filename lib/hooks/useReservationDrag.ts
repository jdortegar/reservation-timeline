import { useState, useEffect } from 'react';
import type { RefObject } from 'react';
import { parseISO, addMinutes } from 'date-fns';
import { timeToSlotIndex, slotIndexToTime } from '@/lib/helpers/time';
import {
  xToSlot,
  yToTable,
  slotToX,
  durationToWidth,
} from '@/lib/helpers/coordinates';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import { checkAllConflicts } from '@/lib/helpers/conflicts';
import type { Reservation, Table, Sector } from '@/lib/types/Reservation';

interface UseReservationDragProps {
  gridContainerRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  configDate: string;
  configTimezone?: string;
  visibleTables: Table[];
  groupedTables: Array<{
    sector: Sector | null;
    tables: Table[];
  }>;
  collapsedSectors: string[];
  reservations: Reservation[];
  onUpdateReservation: (
    reservationId: string,
    updates: {
      startTime?: string;
      endTime?: string;
      tableId?: string;
    },
  ) => void;
}

interface DraggingReservation {
  reservation: Reservation;
  originalLeft: number;
  originalTop: number;
  originalTableIndex: number;
  pointerGridX: number;
  pointerGridY: number;
  clickOffsetX: number; // Offset from block left edge where user clicked
  clickOffsetY: number; // Offset from block top edge where user clicked
}

interface GhostPreview {
  left: number;
  top: number;
  width: number;
  height: number;
  slotIndex: number;
  tableIndex: number;
}

interface DropPreview {
  left: number;
  top: number;
  width: number;
  height: number;
  slotIndex: number;
  tableIndex: number;
  hasConflict: boolean;
  conflictReason?: 'overlap' | 'capacity_exceeded' | 'outside_service_hours';
}

export function useReservationDrag({
  gridContainerRef,
  zoom,
  configDate,
  configTimezone,
  visibleTables,
  groupedTables,
  collapsedSectors,
  reservations,
  onUpdateReservation,
}: UseReservationDragProps) {
  const [draggingReservation, setDraggingReservation] =
    useState<DraggingReservation | null>(null);
  const [ghostPreview, setGhostPreview] = useState<GhostPreview | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleDragStart = (
    reservation: Reservation,
    e: React.MouseEvent,
    originalLeft: number,
    originalTableIndex: number,
  ) => {
    if (reservation.status === 'CANCELLED') return;

    const gridContainer = gridContainerRef?.current;
    if (!gridContainer) return;

    const gridRect = gridContainer.getBoundingClientRect();
    const pointerGridX = e.clientX - gridRect.left - 200;
    const pointerGridY = e.clientY - gridRect.top - 70;
    const originalTop = 0; // Relative to TimelineRow

    // Calculate click offset within the block
    const blockRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickOffsetX = e.clientX - blockRect.left;
    const clickOffsetY = e.clientY - blockRect.top;

    setDraggingReservation({
      reservation,
      originalLeft,
      originalTop,
      originalTableIndex,
      pointerGridX,
      pointerGridY,
      clickOffsetX,
      clickOffsetY,
    });
  };

  // Handle mouse move and mouse up for drag
  useEffect(() => {
    if (!draggingReservation) return;

    const handleMouseMove = (e: MouseEvent) => {
      const gridContainer = gridContainerRef?.current;
      if (!gridContainer) return;

      const gridRect = gridContainer.getBoundingClientRect();
      const currentPointerGridX = e.clientX - gridRect.left - 200;
      const currentPointerGridY = e.clientY - gridRect.top - 70;

      // Store cursor position for ghost that follows cursor
      setCursorPosition({ x: e.clientX, y: e.clientY });

      const deltaX = currentPointerGridX - draggingReservation.pointerGridX;
      const deltaY = currentPointerGridY - draggingReservation.pointerGridY;

      const cellWidth = TIMELINE_CONFIG.CELL_WIDTH_PX * zoom;
      const rowHeight = TIMELINE_CONFIG.ROW_HEIGHT_PX;
      const absGridDeltaX = Math.abs(deltaX);
      const absGridDeltaY = Math.abs(deltaY);
      const minDragThresholdX = cellWidth * 0.3;
      const minDragThresholdY = rowHeight * 0.3;

      const hasHorizontalMovement = absGridDeltaX >= minDragThresholdX;
      const hasVerticalMovement = absGridDeltaY >= minDragThresholdY;

      const blockWidth = durationToWidth(
        draggingReservation.reservation.durationMinutes,
        zoom,
      );
      const blockHeight = rowHeight;

      // Calculate where the block's left edge would be in grid coordinates based on cursor
      // Ghost follows cursor: ghostLeft = e.clientX - clickOffsetX
      // The ghost position in viewport coordinates
      const ghostLeftInViewport = e.clientX - draggingReservation.clickOffsetX;
      const ghostTopInViewport = e.clientY - draggingReservation.clickOffsetY;

      // Convert viewport coordinates to grid coordinates
      // gridRect.left is the left edge of the grid container in viewport
      // 200 is the sidebar width, so grid content starts at gridRect.left + 200
      // We need to account for scroll position: gridContainer.scrollLeft
      const scrollLeft = gridContainer.scrollLeft || 0;
      const scrollTop = gridContainer.scrollTop || 0;
      const blockLeftInGrid =
        ghostLeftInViewport - (gridRect.left + 200) + scrollLeft;
      // gridRect.top is the top edge of the grid container in viewport
      // 70 is the header height, so grid content starts at gridRect.top + 70
      const blockTopInGrid =
        ghostTopInViewport - (gridRect.top + 70) + scrollTop;

      // Calculate snapped drop position based on current cursor position
      let dropLeft = draggingReservation.originalLeft;
      let dropSlotIndex = timeToSlotIndex(
        parseISO(draggingReservation.reservation.startTime),
        configDate,
        configTimezone,
      );
      let dropTableIndex = draggingReservation.originalTableIndex;

      // Always calculate drop position from current cursor position
      const safeBlockLeft = Math.max(0, blockLeftInGrid);
      const newSlot = xToSlot(safeBlockLeft, zoom);
      dropLeft = slotToX(newSlot, zoom);
      dropSlotIndex = newSlot;

      const safeBlockTop = Math.max(0, blockTopInGrid);
      const newTableIndex = yToTable(safeBlockTop);
      if (newTableIndex >= 0 && newTableIndex < visibleTables.length) {
        dropTableIndex = newTableIndex;
      }

      // Calculate absolute top position for drop preview (snapped position)
      // This must match exactly how rows are rendered in TimelineGrid
      // Structure: Header (70px) -> [Sector Header (40px) -> Rows (60px each)] for each group
      const headerHeight = 70;
      const sectorHeaderHeight = 40;
      let targetRowY = headerHeight;

      let currentTableIndex = 0;
      let foundTarget = false;

      // Ensure dropTableIndex is valid
      const validDropTableIndex = Math.max(
        0,
        Math.min(dropTableIndex, visibleTables.length - 1),
      );

      for (const group of groupedTables) {
        const isCollapsed =
          group.sector && collapsedSectors.includes(group.sector.id);
        const visibleGroupTables = isCollapsed ? [] : group.tables;

        // Add sector header for this group BEFORE processing its rows
        // This matches the rendering: SectorHeader is rendered before TimelineRows
        if (group.sector && !isCollapsed) {
          targetRowY += sectorHeaderHeight;
        }

        // Process each row in this group
        for (let idx = 0; idx < visibleGroupTables.length; idx++) {
          // Check if this is the target row
          // targetRowY is currently the position where THIS row starts
          if (currentTableIndex === validDropTableIndex) {
            foundTarget = true;
            break;
          }
          // Move to the next row position
          targetRowY += rowHeight;
          currentTableIndex++;
        }

        if (foundTarget) {
          break;
        }
      }

      // Fallback: if target wasn't found, calculate based on table index directly
      // This shouldn't happen, but ensures we always have a valid position
      if (!foundTarget && validDropTableIndex < visibleTables.length) {
        // Recalculate from scratch as fallback
        targetRowY = headerHeight;
        currentTableIndex = 0;
        for (const group of groupedTables) {
          const isCollapsed =
            group.sector && collapsedSectors.includes(group.sector.id);
          const visibleGroupTables = isCollapsed ? [] : group.tables;

          if (group.sector && !isCollapsed) {
            targetRowY += sectorHeaderHeight;
          }

          for (let idx = 0; idx < visibleGroupTables.length; idx++) {
            if (currentTableIndex === validDropTableIndex) {
              break;
            }
            targetRowY += rowHeight;
            currentTableIndex++;
          }
          if (currentTableIndex > validDropTableIndex) {
            break;
          }
        }
      }

      // Ghost preview follows cursor exactly (positioned at cursor minus click offset)
      const ghostLeft = e.clientX - draggingReservation.clickOffsetX;
      const ghostTop = e.clientY - draggingReservation.clickOffsetY;

      setGhostPreview({
        left: ghostLeft,
        top: ghostTop,
        width: blockWidth,
        height: blockHeight,
        slotIndex: dropSlotIndex,
        tableIndex: dropTableIndex,
      });

      // Check for conflicts at the drop position
      const dropTable = visibleTables[dropTableIndex];
      const dropStartTime = slotIndexToTime(
        dropSlotIndex,
        configDate,
        configTimezone,
      );
      const dropEndTime = addMinutes(
        dropStartTime,
        draggingReservation.reservation.durationMinutes,
      );

      // Create a temporary reservation to check conflicts
      const tempReservation: Reservation = {
        ...draggingReservation.reservation,
        tableId: dropTable?.id || draggingReservation.reservation.tableId,
        startTime: dropStartTime.toISOString(),
        endTime: dropEndTime.toISOString(),
      };

      const conflictCheck = dropTable
        ? checkAllConflicts(
            tempReservation,
            reservations,
            dropTable,
            draggingReservation.reservation.id,
          )
        : {
            hasConflict: true,
            conflictingReservationIds: [],
            reason: undefined,
          };

      // Drop preview shows snapped position
      setDropPreview({
        left: 200 + dropLeft,
        top: targetRowY,
        width: blockWidth,
        height: blockHeight,
        slotIndex: dropSlotIndex,
        tableIndex: dropTableIndex,
        hasConflict: conflictCheck.hasConflict,
        conflictReason: conflictCheck.reason,
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!draggingReservation) return;

      const gridContainer = gridContainerRef?.current;
      if (!gridContainer) {
        setDraggingReservation(null);
        setGhostPreview(null);
        setDropPreview(null);
        setCursorPosition(null);
        return;
      }

      const gridRect = gridContainer.getBoundingClientRect();

      // Use the same calculation as handleMouseMove to get the drop position
      const ghostLeftInViewport = e.clientX - draggingReservation.clickOffsetX;
      const ghostTopInViewport = e.clientY - draggingReservation.clickOffsetY;

      const scrollLeft = gridContainer.scrollLeft || 0;
      const scrollTop = gridContainer.scrollTop || 0;
      const blockLeftInGrid =
        ghostLeftInViewport - (gridRect.left + 200) + scrollLeft;
      const blockTopInGrid =
        ghostTopInViewport - (gridRect.top + 70) + scrollTop;

      // Calculate the snapped drop position (same as preview)
      const safeBlockLeft = Math.max(0, blockLeftInGrid);
      const newSlot = xToSlot(safeBlockLeft, zoom);
      const safeBlockTop = Math.max(0, blockTopInGrid);
      const newTableIndex = yToTable(safeBlockTop);

      // Check if there was enough movement to trigger an update
      const originalSlot = timeToSlotIndex(
        parseISO(draggingReservation.reservation.startTime),
        configDate,
        configTimezone,
      );
      const slotDiff = newSlot - originalSlot;
      const tableDiff = newTableIndex - draggingReservation.originalTableIndex;

      const cellWidth = TIMELINE_CONFIG.CELL_WIDTH_PX * zoom;
      const rowHeight = TIMELINE_CONFIG.ROW_HEIGHT_PX;
      const minDragThresholdX = cellWidth * 0.3;
      const minDragThresholdY = rowHeight * 0.3;

      // Calculate movement deltas to check thresholds
      const originalBlockLeft = draggingReservation.originalLeft;
      const blockLeftDelta = safeBlockLeft - originalBlockLeft;
      const blockTopDelta = safeBlockTop - draggingReservation.originalTop;
      const absBlockDeltaX = Math.abs(blockLeftDelta);
      const absBlockDeltaY = Math.abs(blockTopDelta);

      const hasHorizontalMovement = absBlockDeltaX >= minDragThresholdX;
      const hasVerticalMovement = absBlockDeltaY >= minDragThresholdY;

      const updates: {
        startTime?: string;
        endTime?: string;
        tableId?: string;
      } = {};

      // Calculate potential new times and table
      let newStartTime: Date | null = null;
      let newEndTime: Date | null = null;
      let newTable: Table | null = null;

      if (hasHorizontalMovement && Math.abs(slotDiff) <= 200) {
        newStartTime = slotIndexToTime(newSlot, configDate, configTimezone);
        newEndTime = addMinutes(
          newStartTime,
          draggingReservation.reservation.durationMinutes,
        );
      }

      if (
        hasVerticalMovement &&
        newTableIndex >= 0 &&
        newTableIndex < visibleTables.length &&
        newTableIndex !== draggingReservation.originalTableIndex
      ) {
        newTable = visibleTables[newTableIndex];
      }

      // If we have changes, check for conflicts before applying
      if (newStartTime || newTable) {
        const finalStartTime = newStartTime
          ? newStartTime
          : parseISO(draggingReservation.reservation.startTime);
        const finalEndTime = newEndTime
          ? newEndTime
          : parseISO(draggingReservation.reservation.endTime);
        const finalTable =
          newTable || visibleTables[draggingReservation.originalTableIndex];

        // Create temporary reservation to check conflicts
        const tempReservation: Reservation = {
          ...draggingReservation.reservation,
          tableId: finalTable.id,
          startTime: finalStartTime.toISOString(),
          endTime: finalEndTime.toISOString(),
        };

        // Check for conflicts
        const conflictCheck = checkAllConflicts(
          tempReservation,
          reservations,
          finalTable,
          draggingReservation.reservation.id,
        );

        // Only apply updates if there's no conflict
        if (!conflictCheck.hasConflict) {
          if (newStartTime && newEndTime) {
            updates.startTime = newStartTime.toISOString();
            updates.endTime = newEndTime.toISOString();
          }

          if (newTable) {
            updates.tableId = newTable.id;
          }

          if (Object.keys(updates).length > 0) {
            onUpdateReservation(draggingReservation.reservation.id, updates);
          }
        }
        // If there's a conflict, silently prevent the drop (no update)
      } else if (Object.keys(updates).length > 0) {
        // Fallback for edge cases
        onUpdateReservation(draggingReservation.reservation.id, updates);
      }

      setDraggingReservation(null);
      setGhostPreview(null);
      setDropPreview(null);
      setCursorPosition(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    draggingReservation,
    zoom,
    configDate,
    visibleTables,
    groupedTables,
    collapsedSectors,
    reservations,
    onUpdateReservation,
    gridContainerRef,
  ]);

  return {
    draggingReservation,
    ghostPreview,
    dropPreview,
    handleDragStart,
  };
}
