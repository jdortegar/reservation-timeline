'use client';

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { List } from 'react-window';
import type { RowComponentProps, ListImperativeAPI } from 'react-window';
import { useStore } from '@/store/store';
import { getTimeSlots } from '@/lib/helpers/time';
import { slotToX } from '@/lib/helpers/coordinates';
import { TimelineHeader } from './TimelineHeader';
import { ReservationGhostBlock } from './ReservationGhostBlock';
import { DropPreviewBlock } from './DropPreviewBlock';
import { ResizePreviewBlock } from './ResizePreviewBlock';
import { ReservationContextMenu } from './ReservationContextMenu';
import { VirtualTimelineRow } from './VirtualTimelineRow';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import { useReservationDrag } from '@/lib/hooks/useReservationDrag';
import { useReservationResize } from '@/lib/hooks/useReservationResize';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { useVirtualItems } from '@/lib/hooks/useVirtualItems';
import { useReservationActions } from '@/lib/hooks/useReservationActions';
import type { Reservation } from '@/lib/types/Reservation';

interface TimelineGridProps {
  onOpenModal?: (
    tableId?: string,
    startTime?: string,
    duration?: number,
    reservationId?: string,
  ) => void;
}

export function TimelineGrid({ onOpenModal }: TimelineGridProps) {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    reservation: Reservation;
    position: { x: number; y: number };
  } | null>(null);
  const {
    config,
    zoom,
    tables,
    reservations,
    sectors,
    collapsedSectors,
    selectedSectors,
    selectedStatuses,
    searchQuery,
    selectedReservationIds,
    updateReservation,
    deleteReservation,
    deleteReservations,
    addReservation,
    selectReservation,
    copyReservations,
    pasteReservations,
    saveToHistory,
    undo,
    redo,
  } = useStore();

  const timeSlots = useMemo(
    () => getTimeSlots(config.date, config.timezone),
    [config.date, config.timezone],
  );

  // Apply filters to reservations
  const filteredReservations = useMemo(() => {
    let filtered = [...reservations];

    // Filter by date (only show reservations for the selected date)
    const selectedDate = config.date;
    filtered = filtered.filter((r) => {
      const reservationDate = r.startTime.split('T')[0];
      return reservationDate === selectedDate;
    });

    // Filter by sector
    if (selectedSectors.length > 0) {
      filtered = filtered.filter((r) => {
        const table = tables.find((t) => t.id === r.tableId);
        return table && selectedSectors.includes(table.sectorId);
      });
    }

    // Filter by status
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((r) => selectedStatuses.includes(r.status));
    }

    // Filter by search query (customer name or phone)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.customer.name.toLowerCase().includes(query) ||
          r.customer.phone.toLowerCase().includes(query) ||
          (r.customer.email && r.customer.email.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [
    reservations,
    config.date,
    selectedSectors,
    selectedStatuses,
    searchQuery,
    tables,
  ]);

  const reservationsByTable = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    filteredReservations.forEach((r) => {
      const existing = map.get(r.tableId) || [];
      map.set(r.tableId, [...existing, r]);
    });
    return map;
  }, [filteredReservations]);

  // Initialize with null to avoid hydration mismatch, then set on client mount
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Update current time every minute to keep marker accurate
  useEffect(() => {
    // Set initial time on client mount
    setCurrentTime(new Date());

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const currentTimeSlot = useMemo(() => {
    // Don't calculate on server or before client mount
    if (!currentTime) {
      return -1;
    }

    const now = currentTime;
    // Get today's date in YYYY-MM-DD format, handling timezone correctly
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      .toISOString()
      .split('T')[0];

    // Compare dates (config.date is in YYYY-MM-DD format)
    if (today !== config.date) {
      return -1; // Not viewing today, don't show marker
    }

    // Find the slot that contains the current time
    const slotIndex = timeSlots.findIndex((slot, index) => {
      const slotTime = slot.getTime();
      // For the last slot (00:00), check if we're at or after it
      if (index === timeSlots.length - 1) {
        return now.getTime() >= slotTime;
      }
      // For other slots, check if current time is within this slot's 15-minute window
      const nextSlotTime = timeSlots[index + 1]?.getTime();
      if (!nextSlotTime) return false;
      return now.getTime() >= slotTime && now.getTime() < nextSlotTime;
    });

    return slotIndex;
  }, [timeSlots, config.date, currentTime]);

  const groupedTables = useMemo(() => {
    const sortedTables = [...tables].sort((a, b) => {
      const sectorA = sectors.find((s) => s.id === a.sectorId);
      const sectorB = sectors.find((s) => s.id === b.sectorId);
      if (sectorA?.sortOrder !== sectorB?.sortOrder) {
        return (sectorA?.sortOrder || 0) - (sectorB?.sortOrder || 0);
      }
      return a.sortOrder - b.sortOrder;
    });

    const groups: Array<{
      sector: typeof sectors[0] | null;
      tables: typeof tables;
    }> = [];
    let currentSector: typeof sectors[0] | null = null;
    let currentGroup: typeof tables = [];

    sortedTables.forEach((table) => {
      const sector = sectors.find((s) => s.id === table.sectorId);
      if (sector?.id !== currentSector?.id) {
        if (currentGroup.length > 0) {
          groups.push({ sector: currentSector, tables: currentGroup });
        }
        currentSector = sector || null;
        currentGroup = [table];
      } else {
        currentGroup.push(table);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ sector: currentSector, tables: currentGroup });
    }

    return groups;
  }, [tables, sectors]);

  const visibleTables = useMemo(() => {
    let tables = groupedTables.flatMap((group) => {
      if (group.sector && collapsedSectors.includes(group.sector.id)) {
        return [];
      }
      return group.tables;
    });

    // Filter tables by selected sectors
    if (selectedSectors.length > 0) {
      tables = tables.filter((table) =>
        selectedSectors.includes(table.sectorId),
      );
    }

    return tables;
  }, [groupedTables, collapsedSectors, selectedSectors]);

  // Use virtual items hook
  const { virtualItems, getRowHeight, totalHeight } = useVirtualItems({
    collapsedSectors,
    groupedTables,
    selectedSectors,
  });

  const listRef = useRef<ListImperativeAPI | null>(null);

  // Use custom hook for drag logic (after groupedTables and visibleTables are defined)
  // Use full reservations array for conflict checking, but filtered for display
  const { draggingReservation, ghostPreview, dropPreview, handleDragStart } =
    useReservationDrag({
      collapsedSectors,
      configDate: config.date,
      configTimezone: config.timezone,
      gridContainerRef,
      groupedTables,
      onUpdateReservation: updateReservation,
      reservations, // Use full array for conflict checking
      visibleTables,
      zoom,
    });

  // Use custom hook for resize logic
  // Use full reservations array for conflict checking
  const { resizingReservation, resizePreview, handleResizeStart } =
    useReservationResize({
      collapsedSectors,
      configDate: config.date,
      configTimezone: config.timezone,
      gridContainerRef,
      groupedTables,
      onUpdateReservation: updateReservation,
      reservations, // Use full array for conflict checking
      visibleTables,
      zoom,
    });

  // Use reservation actions hook
  const {
    handleEdit,
    handleChangeStatus,
    handleMarkNoShow,
    handleCancel,
    handleDuplicate,
    handleDelete,
    handleDeleteMultiple,
    handleCopy,
    handlePaste,
    handleDuplicateMultiple,
  } = useReservationActions({ onOpenModal });

  // Context menu handler
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, reservation: Reservation) => {
      setContextMenu({
        reservation,
        position: { x: e.clientX, y: e.clientY },
      });
    },
    [],
  );

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: !contextMenu, // Disable when context menu is open
    onCopy: handleCopy,
    onDelete: handleDeleteMultiple,
    onDuplicate: handleDuplicateMultiple,
    onPaste: handlePaste,
    onRedo: redo,
    onUndo: undo,
    reservations,
    selectedReservationIds,
  });

  const cellWidth = TIMELINE_CONFIG.CELL_WIDTH_PX * zoom;
  const timelineGridWidth = timeSlots.length * cellWidth;
  const gridWidth = 200 + timelineGridWidth; // Sidebar (200px) + Timeline grid
  const contentHeight = totalHeight; // Height below header
  const gridHeight = contentHeight + 70; // Content + header

  const currentTimeX =
    currentTimeSlot >= 0 ? slotToX(currentTimeSlot, zoom) : null;

  // Row component for virtual list
  const RowComponent = useCallback(
    ({ index, style }: RowComponentProps) => {
      const item = virtualItems[index];
      if (!item) {
        return <div style={style} />;
      }

      return (
        <VirtualTimelineRow
          collapsedSectors={collapsedSectors}
          configDate={config.date}
          configTimezone={config.timezone}
          draggingReservation={draggingReservation}
          index={index}
          item={item}
          onContextMenu={handleContextMenu}
          onDragStart={handleDragStart}
          onOpenModal={onOpenModal}
          onResizeStart={handleResizeStart}
          reservations={reservations}
          reservationsByTable={reservationsByTable}
          resizingReservation={resizingReservation}
          resizePreview={resizePreview}
          selectedReservationIds={selectedReservationIds}
          style={style}
          timeSlots={timeSlots}
          virtualItems={virtualItems}
          zoom={zoom}
        />
      );
    },
    [
      virtualItems,
      collapsedSectors,
      config.date,
      config.timezone,
      draggingReservation,
      handleContextMenu,
      handleDragStart,
      handleResizeStart,
      onOpenModal,
      reservations,
      reservationsByTable,
      resizingReservation,
      resizePreview,
      selectedReservationIds,
      timeSlots,
      zoom,
    ],
  );

  return (
    <div
      ref={gridContainerRef}
      className="h-full overflow-auto relative"
      style={{
        userSelect:
          draggingReservation || resizingReservation ? 'none' : 'auto',
        // Optimize scrolling performance
        willChange: 'scroll-position',
        overscrollBehavior: 'contain',
        // Enable hardware acceleration
        transform: 'translateZ(0)',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        style={{ width: gridWidth, height: gridHeight, position: 'relative' }}
      >
        <TimelineHeader
          timeSlots={timeSlots}
          timezone={config.timezone}
          zoom={zoom}
        />
        {currentTimeX !== null && contentHeight > 0 && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: 200 + currentTimeX,
              top: 70,
              width: 2,
              height: Math.max(0, contentHeight),
              backgroundColor: '#EF4444',
            }}
          />
        )}
        <List
          listRef={listRef}
          rowCount={virtualItems.length}
          rowHeight={getRowHeight}
          rowComponent={RowComponent}
          rowProps={{}}
          style={{
            position: 'absolute',
            top: 70, // Below header
            left: 0,
            height: contentHeight,
            width: gridWidth,
          }}
        />
        {/* Ghost Preview - follows cursor exactly */}
        {ghostPreview && draggingReservation && (
          <ReservationGhostBlock
            configDate={config.date}
            configTimezone={config.timezone}
            height={ghostPreview.height}
            left={ghostPreview.left}
            originalTableIndex={draggingReservation.originalTableIndex}
            reservation={draggingReservation.reservation}
            slotIndex={ghostPreview.slotIndex}
            tableIndex={ghostPreview.tableIndex}
            top={ghostPreview.top}
            visibleTables={visibleTables}
            width={ghostPreview.width}
          />
        )}
        {/* Drop Preview - shows snapped drop position */}
        {dropPreview && draggingReservation && (
          <DropPreviewBlock
            hasConflict={dropPreview.hasConflict}
            height={dropPreview.height}
            left={dropPreview.left}
            top={dropPreview.top}
            width={dropPreview.width}
          />
        )}
        {/* Resize Preview - shows resize preview with duration */}
        {resizePreview && resizingReservation && (
          <ResizePreviewBlock
            configDate={config.date}
            configTimezone={config.timezone}
            endSlotIndex={resizePreview.endSlotIndex}
            hasConflict={resizePreview.hasConflict}
            height={60}
            left={resizePreview.left}
            newDurationMinutes={resizePreview.newDurationMinutes}
            reservation={resizingReservation.reservation}
            startSlotIndex={resizePreview.startSlotIndex}
            top={resizePreview.top}
            width={resizePreview.width}
          />
        )}
        {/* Context Menu */}
        {contextMenu && (
          <ReservationContextMenu
            onCancel={handleCancel}
            onClose={() => setContextMenu(null)}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onEdit={handleEdit}
            onChangeStatus={handleChangeStatus}
            onMarkNoShow={handleMarkNoShow}
            position={contextMenu.position}
            reservation={contextMenu.reservation}
          />
        )}
      </div>
    </div>
  );
}
