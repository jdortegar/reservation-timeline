import { useState, useEffect, useRef, useMemo } from 'react';

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
  innerGridRef?: RefObject<HTMLDivElement | null>;
  zoom: number;
  configDate: string;
  configTimezone?: string;
  visibleTables: Table[];
  groupedTables: Array<{
    sector: Sector | null;
    tables: Table[];
  }>;
  collapsedSectors: string[];
  selectedSectors: string[];
  reservations: Reservation[];
  onUpdateReservation: (
    reservationId: string,
    updates: {
      startTime?: string;
      endTime?: string;
      tableId?: string;
    },
  ) => void;
  onDragStart?: () => void;
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
  innerGridRef,
  zoom,
  configDate,
  configTimezone,
  visibleTables,
  groupedTables,
  collapsedSectors,
  selectedSectors,
  reservations,
  onUpdateReservation,
  onDragStart: onDragStartCallback,
}: UseReservationDragProps) {
  const [draggingReservation, setDraggingReservation] =
    useState<DraggingReservation | null>(null);
  const [ghostPreview, setGhostPreview] = useState<GhostPreview | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Use refs to store latest mouse event for RAF throttling
  const latestMouseEventRef = useRef<MouseEvent | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Cache for conflict checks to avoid recalculating on every mouse move
  // Only recalculate when slot or table index actually changes
  const conflictCacheRef = useRef<{
    slotIndex: number;
    tableIndex: number;
    result: ReturnType<typeof checkAllConflicts>;
  } | null>(null);

  const handleDragStart = (
    reservation: Reservation,
    e: React.MouseEvent,
    originalLeft: number,
    originalTableIndex: number,
  ) => {
    if (reservation.status === 'CANCELLED') return;

    // Prevent text selection during drag
    e.preventDefault();

    const gridContainer = gridContainerRef?.current;
    if (!gridContainer) return;

    // Use inner grid ref if available, otherwise use outer container
    // The inner div is where the ghost is actually positioned
    const targetElement = innerGridRef?.current || gridContainer;
    const gridRect = targetElement.getBoundingClientRect();
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

    // Call onDragStart callback if provided (e.g., to close context menu)
    if (onDragStartCallback) {
      onDragStartCallback();
    }

    // Store initial mouse position for immediate first update
    // This ensures the first RAF update processes the initial position
    latestMouseEventRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
    } as MouseEvent;

    // Immediately set initial ghost preview position
    // Ghost is rendered in a Portal with position: fixed, so use viewport coordinates directly
    const blockWidth = durationToWidth(reservation.durationMinutes, zoom);
    const blockHeight = TIMELINE_CONFIG.ROW_HEIGHT_PX;
    const initialGhostLeft = e.clientX - clickOffsetX;
    const initialGhostTop = e.clientY - clickOffsetY;

    setCursorPosition({ x: e.clientX, y: e.clientY });
    setGhostPreview({
      left: initialGhostLeft,
      top: initialGhostTop,
      width: blockWidth,
      height: blockHeight,
      slotIndex: timeToSlotIndex(
        parseISO(reservation.startTime),
        configDate,
        configTimezone,
      ),
      tableIndex: originalTableIndex,
    });
  };

  // Handle mouse move, scroll, and mouse up for drag
  useEffect(() => {
    if (!draggingReservation) {
      // Clean up RAF if drag ends
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      latestMouseEventRef.current = null;
      return;
    }

    const updateGhostAndDropPreview = (mouseEvent: MouseEvent | null) => {
      // Use latest mouse event if available, otherwise use cursor position
      const currentMouseX = mouseEvent?.clientX ?? cursorPosition?.x ?? 0;
      const currentMouseY = mouseEvent?.clientY ?? cursorPosition?.y ?? 0;

      const gridContainer = gridContainerRef?.current;
      if (!gridContainer) return;

      // Use inner grid ref if available, otherwise use outer container
      const targetElement = innerGridRef?.current || gridContainer;
      const gridRect = targetElement.getBoundingClientRect();
      const currentPointerGridX = currentMouseX - gridRect.left - 200;
      const currentPointerGridY = currentMouseY - gridRect.top - 70;

      // Store cursor position for ghost that follows cursor
      if (mouseEvent) {
        setCursorPosition({ x: currentMouseX, y: currentMouseY });
      }

      const deltaX = currentPointerGridX - draggingReservation.pointerGridX;
      const deltaY = currentPointerGridY - draggingReservation.pointerGridY;

      const cellWidth = TIMELINE_CONFIG.CELL_WIDTH_PX * zoom;
      const absGridDeltaX = Math.abs(deltaX);
      const absGridDeltaY = Math.abs(deltaY);
      const minDragThresholdX = cellWidth * 0.3;
      const minDragThresholdY = TIMELINE_CONFIG.ROW_HEIGHT_PX * 0.3;

      const hasHorizontalMovement = absGridDeltaX >= minDragThresholdX;
      const hasVerticalMovement = absGridDeltaY >= minDragThresholdY;

      const blockWidth = durationToWidth(
        draggingReservation.reservation.durationMinutes,
        zoom,
      );
      const blockHeight = TIMELINE_CONFIG.ROW_HEIGHT_PX;

      // Calculate where the block's left edge would be in grid coordinates based on cursor
      // Ghost follows cursor: ghostLeft = e.clientX - clickOffsetX
      // The ghost position in viewport coordinates
      const ghostLeftInViewport =
        currentMouseX - draggingReservation.clickOffsetX;
      const ghostTopInViewport =
        currentMouseY - draggingReservation.clickOffsetY;

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
      // Start with original position as fallback
      let dropLeft = draggingReservation.originalLeft;
      let dropSlotIndex = timeToSlotIndex(
        parseISO(draggingReservation.reservation.startTime),
        configDate,
        configTimezone,
      );
      let dropTableIndex = draggingReservation.originalTableIndex;

      // Calculate drop position from current cursor position
      // Use the block's left edge position in grid coordinates
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
      // This must match exactly how rows are rendered in TimelineGrid using react-window
      // Structure: Header (70px) -> List (at top: 70) -> [Sector Header (40px) -> Rows (60px each)]
      // React-window calculates positions as cumulative heights of previous items
      // We need to replicate this calculation exactly
      const headerHeight = 70;
      const sectorHeaderHeight = 40;

      // Start at header height (where List begins)
      let targetRowY = headerHeight;
      let currentTableIndex = 0;
      let foundTarget = false;

      // Ensure dropTableIndex is valid
      const validDropTableIndex = Math.max(
        0,
        Math.min(dropTableIndex, visibleTables.length - 1),
      );

      // Replicate the virtualItems array structure to calculate position
      // This matches exactly how useVirtualItems creates the array
      for (const group of groupedTables) {
        const isCollapsed =
          group.sector && collapsedSectors.includes(group.sector.id);

        // Add sector header if it exists (matches virtualItems structure)
        if (group.sector) {
          // Check if selected sectors filter includes this sector
          const isSectorSelected =
            selectedSectors.length === 0 ||
            selectedSectors.includes(group.sector.id);

          if (isSectorSelected && !isCollapsed) {
            targetRowY += sectorHeaderHeight;
          }
        }

        // Add table rows if not collapsed (matches virtualItems structure)
        if (!isCollapsed) {
          for (const table of group.tables) {
            // Filter by selected sectors (matches virtualItems filtering)
            if (
              selectedSectors.length === 0 ||
              selectedSectors.includes(table.sectorId)
            ) {
              if (currentTableIndex === validDropTableIndex) {
                // Found target row - break out of all loops
                foundTarget = true;
                break;
              }
              targetRowY += TIMELINE_CONFIG.ROW_HEIGHT_PX;
              currentTableIndex++;
            }
          }
        }

        // Break if we found the target
        if (foundTarget) {
          break;
        }
      }

      // Ghost preview follows cursor exactly
      // Ghost is rendered in a Portal with position: fixed, so use viewport coordinates directly
      const ghostLeft = ghostLeftInViewport;
      const ghostTop = ghostTopInViewport;

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
      // Convert grid-relative coordinates to viewport coordinates for Portal rendering
      // dropLeft is relative to timeline content area (after 200px sidebar), targetRowY is relative to inner grid div top
      // Use gridRect (outer container) for consistency with ghost calculation
      // The timeline content area starts at gridRect.left + 200 (sidebar width)
      // dropLeft is the position within the timeline content (from slotToX)
      // Account for scroll: dropLeft - scrollLeft converts from grid coordinates to viewport
      const dropScrollLeft = gridContainer.scrollLeft || 0;
      const dropLeftInViewport =
        gridRect.left + 200 + dropLeft - dropScrollLeft;
      // Use innerGridRect for vertical positioning to match row positions
      const innerGridRect =
        innerGridRef?.current?.getBoundingClientRect() || gridRect;
      const dropTopInViewport = innerGridRect.top + targetRowY;

      setDropPreview({
        left: dropLeftInViewport,
        top: dropTopInViewport,
        width: blockWidth,
        height: blockHeight,
        slotIndex: dropSlotIndex,
        tableIndex: dropTableIndex,
        hasConflict: conflictCheck.hasConflict,
        conflictReason: conflictCheck.reason,
      });
    };

    const handleScroll = () => {
      // Update ghost and drop preview on scroll using latest mouse position
      if (latestMouseEventRef.current) {
        processMouseMove(latestMouseEventRef.current);
      }
    };

    const processMouseMove = (e: MouseEvent) => {
      const gridContainer = gridContainerRef?.current;
      if (!gridContainer) return;

      // Get bounding rect of outer container for coordinate conversions
      // (needed for converting grid-relative positions to viewport coordinates)
      const gridRect = gridContainer.getBoundingClientRect();
      const currentPointerGridX = e.clientX - gridRect.left - 200;
      const currentPointerGridY = e.clientY - gridRect.top - 70;

      // Store cursor position for ghost that follows cursor
      setCursorPosition({ x: e.clientX, y: e.clientY });

      const deltaX = currentPointerGridX - draggingReservation.pointerGridX;
      const deltaY = currentPointerGridY - draggingReservation.pointerGridY;

      const cellWidth = TIMELINE_CONFIG.CELL_WIDTH_PX * zoom;
      const absGridDeltaX = Math.abs(deltaX);
      const absGridDeltaY = Math.abs(deltaY);
      const minDragThresholdX = cellWidth * 0.3;
      const minDragThresholdY = TIMELINE_CONFIG.ROW_HEIGHT_PX * 0.3;

      const hasHorizontalMovement = absGridDeltaX >= minDragThresholdX;
      const hasVerticalMovement = absGridDeltaY >= minDragThresholdY;

      const blockWidth = durationToWidth(
        draggingReservation.reservation.durationMinutes,
        zoom,
      );
      const blockHeight = TIMELINE_CONFIG.ROW_HEIGHT_PX;

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
      // Start with original position as fallback
      let dropLeft = draggingReservation.originalLeft;
      let dropSlotIndex = timeToSlotIndex(
        parseISO(draggingReservation.reservation.startTime),
        configDate,
        configTimezone,
      );
      let dropTableIndex = draggingReservation.originalTableIndex;

      // Calculate drop position from current cursor position
      // Use the block's left edge position in grid coordinates
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
      // This must match exactly how rows are rendered in TimelineGrid using react-window
      // Structure: Header (70px) -> List (at top: 70) -> [Sector Header (40px) -> Rows (60px each)]
      // React-window calculates positions as cumulative heights of previous items
      // We need to replicate this calculation exactly
      const headerHeight = 70;
      const sectorHeaderHeight = 40;

      // Start at header height (where List begins)
      let targetRowY = headerHeight;
      let currentTableIndex = 0;
      let foundTarget = false;

      // Ensure dropTableIndex is valid
      const validDropTableIndex = Math.max(
        0,
        Math.min(dropTableIndex, visibleTables.length - 1),
      );

      // Replicate the virtualItems array structure to calculate position
      // This matches exactly how useVirtualItems creates the array
      for (const group of groupedTables) {
        const isCollapsed =
          group.sector && collapsedSectors.includes(group.sector.id);

        // Add sector header if it exists (matches virtualItems structure)
        if (group.sector) {
          // Check if selected sectors filter includes this sector
          const isSectorSelected =
            selectedSectors.length === 0 ||
            selectedSectors.includes(group.sector.id);

          if (isSectorSelected && !isCollapsed) {
            targetRowY += sectorHeaderHeight;
          }
        }

        // Add table rows if not collapsed (matches virtualItems structure)
        if (!isCollapsed) {
          for (const table of group.tables) {
            // Filter by selected sectors (matches virtualItems filtering)
            if (
              selectedSectors.length === 0 ||
              selectedSectors.includes(table.sectorId)
            ) {
              if (currentTableIndex === validDropTableIndex) {
                // Found target row - break out of all loops
                foundTarget = true;
                break;
              }
              targetRowY += TIMELINE_CONFIG.ROW_HEIGHT_PX;
              currentTableIndex++;
            }
          }
        }

        // Break if we found the target
        if (foundTarget) {
          break;
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
      // Convert grid-relative coordinates to viewport coordinates for Portal rendering
      // dropLeft is relative to timeline content area (after 200px sidebar), targetRowY is relative to inner grid div top
      // Use gridRect (outer container) for consistency with ghost calculation
      // The timeline content area starts at gridRect.left + 200 (sidebar width)
      // dropLeft is the position within the timeline content (from slotToX)
      // Account for scroll: dropLeft - scrollLeft converts from grid coordinates to viewport
      const dropScrollLeft = gridContainer.scrollLeft || 0;
      const dropLeftInViewport =
        gridRect.left + 200 + dropLeft - dropScrollLeft;
      // Use innerGridRect for vertical positioning to match row positions
      const innerGridRect =
        innerGridRef?.current?.getBoundingClientRect() || gridRect;
      const dropTopInViewport = innerGridRect.top + targetRowY;

      setDropPreview({
        left: dropLeftInViewport,
        top: dropTopInViewport,
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

      // Get the current dropPreview value (might be stale in closure, so we'll use a ref or recalculate)
      // For now, let's recalculate the drop position from the current mouse position
      // This ensures we always have the correct position even if dropPreview state is stale
      const gridRect = gridContainer.getBoundingClientRect();
      const scrollLeft = gridContainer.scrollLeft || 0;
      const scrollTop = gridContainer.scrollTop || 0;

      // Calculate block position from mouse
      const ghostLeftInViewport = e.clientX - draggingReservation.clickOffsetX;
      const ghostTopInViewport = e.clientY - draggingReservation.clickOffsetY;
      const blockLeftInGrid =
        ghostLeftInViewport - (gridRect.left + 200) + scrollLeft;
      const blockTopInGrid =
        ghostTopInViewport - (gridRect.top + 70) + scrollTop;

      const safeBlockLeft = Math.max(0, blockLeftInGrid);
      const safeBlockTop = Math.max(0, blockTopInGrid);

      // Use dropPreview if available (it has the snapped position), otherwise calculate from mouse
      const finalSlotIndex =
        dropPreview?.slotIndex ?? xToSlot(safeBlockLeft, zoom);
      const finalTableIndex = dropPreview?.tableIndex ?? yToTable(safeBlockTop);

      // Ensure table index is valid
      const validTableIndex = Math.max(
        0,
        Math.min(finalTableIndex, visibleTables.length - 1),
      );
      const newTable = visibleTables[validTableIndex];

      if (!newTable) return;

      const newStartTime = slotIndexToTime(
        finalSlotIndex,
        configDate,
        configTimezone,
      );
      const newEndTime = addMinutes(
        newStartTime,
        draggingReservation.reservation.durationMinutes,
      );

      // Create temporary reservation to check conflicts
      const tempReservation: Reservation = {
        ...draggingReservation.reservation,
        tableId: newTable.id,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
      };

      // Check for conflicts
      const conflictCheck = checkAllConflicts(
        tempReservation,
        reservations,
        newTable,
        draggingReservation.reservation.id,
      );

      // Only apply if no conflict
      if (!conflictCheck.hasConflict) {
        onUpdateReservation(draggingReservation.reservation.id, {
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
          tableId: newTable.id,
        });
      }

      setDraggingReservation(null);
      setGhostPreview(null);
      setDropPreview(null);
      setCursorPosition(null);
      // Clear conflict cache when drag ends
      conflictCacheRef.current = null;
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
