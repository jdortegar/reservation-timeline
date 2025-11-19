'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useStore } from '@/store/store';
import { getTimeSlots, timeToSlotIndex } from '@/lib/helpers/time';
import { slotToX, durationToWidth } from '@/lib/helpers/coordinates';
import { parseISO, addMinutes } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TimelineHeader } from './TimelineHeader';
import { TimelineRow } from './TimelineRow';
import { ReservationBlock } from './ReservationBlock';
import { ReservationGhostBlock } from './ReservationGhostBlock';
import { DropPreviewBlock } from './DropPreviewBlock';
import { ResizePreviewBlock } from './ResizePreviewBlock';
import { CreateDragArea } from './CreateDragArea';
import { ReservationContextMenu } from './ReservationContextMenu';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import { useReservationDrag } from '@/lib/hooks/useReservationDrag';
import { useReservationResize } from '@/lib/hooks/useReservationResize';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import type {
  Reservation,
  Sector,
  ReservationStatus,
} from '@/lib/types/Reservation';

interface TimelineGridProps {
  onOpenModal?: (
    tableId?: string,
    startTime?: string,
    duration?: number,
    reservationId?: string,
  ) => void;
}

function SectorHeader({
  sector,
  isCollapsed,
  onToggle,
  timeSlots,
  zoom,
}: {
  sector: Sector;
  isCollapsed: boolean;
  onToggle: () => void;
  timeSlots: Date[];
  zoom: number;
}) {
  const cellWidth = TIMELINE_CONFIG.CELL_WIDTH_PX * zoom;
  const gridWidth = timeSlots.length * cellWidth;

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

  const timeSlots = useMemo(() => getTimeSlots(config.date), [config.date]);

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

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute to keep marker accurate
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const currentTimeSlot = useMemo(() => {
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

  // Use custom hook for drag logic (after groupedTables and visibleTables are defined)
  // Use full reservations array for conflict checking, but filtered for display
  const { draggingReservation, ghostPreview, dropPreview, handleDragStart } =
    useReservationDrag({
      collapsedSectors,
      configDate: config.date,
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
      gridContainerRef,
      groupedTables,
      onUpdateReservation: updateReservation,
      reservations, // Use full array for conflict checking
      visibleTables,
      zoom,
    });

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, reservation: Reservation) => {
    setContextMenu({
      reservation,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const handleEdit = (reservation: Reservation) => {
    if (onOpenModal) {
      onOpenModal(
        reservation.tableId,
        reservation.startTime,
        reservation.durationMinutes,
        reservation.id,
      );
    }
  };

  const handleChangeStatus = (
    reservationId: string,
    status: ReservationStatus,
  ) => {
    saveToHistory();
    updateReservation(reservationId, { status });
  };

  const handleMarkNoShow = (reservationId: string) => {
    saveToHistory();
    updateReservation(reservationId, { status: 'NO_SHOW' });
  };

  const handleCancel = (reservationId: string) => {
    saveToHistory();
    updateReservation(reservationId, { status: 'CANCELLED' });
  };

  const handleDuplicate = (reservation: Reservation) => {
    saveToHistory();
    // Duplicate reservation - add 1 hour to start time
    const newStartTime = addMinutes(parseISO(reservation.startTime), 60);
    const newEndTime = addMinutes(newStartTime, reservation.durationMinutes);

    const duplicatedReservation: Reservation = {
      ...reservation,
      id: `RES_${Date.now()}`,
      startTime: newStartTime.toISOString(),
      endTime: newEndTime.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addReservation(duplicatedReservation);
    selectReservation(duplicatedReservation.id);
  };

  const handleDelete = (reservationId: string) => {
    saveToHistory();
    deleteReservation(reservationId);
  };

  const handleDeleteMultiple = (reservationIds: string[]) => {
    saveToHistory();
    deleteReservations(reservationIds);
  };

  const handleCopy = (reservationsToCopy: Reservation[]) => {
    copyReservations(reservationsToCopy);
  };

  const handlePaste = () => {
    // Paste at current time or first selected reservation's time
    const targetStartTime =
      selectedReservationIds.length > 0
        ? reservations.find((r) => r.id === selectedReservationIds[0])
            ?.startTime
        : undefined;
    saveToHistory();
    pasteReservations(undefined, targetStartTime);
  };

  const handleDuplicateMultiple = (reservationIds: string[]) => {
    const reservationsToDuplicate = reservations.filter((r) =>
      reservationIds.includes(r.id),
    );
    saveToHistory();

    reservationsToDuplicate.forEach((reservation) => {
      const newStartTime = addMinutes(parseISO(reservation.startTime), 60);
      const newEndTime = addMinutes(newStartTime, reservation.durationMinutes);

      const duplicatedReservation: Reservation = {
        ...reservation,
        id: `RES_${Date.now()}_${reservation.id}`,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addReservation(duplicatedReservation);
    });
  };

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
  const gridHeight = visibleTables.length * 60 + groupedTables.length * 40 + 70;
  const contentHeight = visibleTables.length * 60 + groupedTables.length * 40; // Height below header

  const currentTimeX =
    currentTimeSlot >= 0 ? slotToX(currentTimeSlot, zoom) : null;

  return (
    <div ref={gridContainerRef} className="h-full overflow-auto relative">
      <div
        style={{ width: gridWidth, height: gridHeight, position: 'relative' }}
      >
        <TimelineHeader timeSlots={timeSlots} zoom={zoom} />
        {currentTimeX !== null && contentHeight > 0 && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: 200 + currentTimeX,
              top: 70,
              width: 2,
              height: Math.max(0, contentHeight), // Extend to bottom of table (all content below header)
              backgroundColor: '#EF4444',
            }}
          />
        )}
        <div className="relative">
          {groupedTables.map((group, groupIndex) => {
            const isCollapsed =
              group.sector && collapsedSectors.includes(group.sector.id);
            const visibleGroupTables = isCollapsed ? [] : group.tables;
            let tableIndexOffset = 0;

            for (let i = 0; i < groupIndex; i++) {
              if (
                !collapsedSectors.includes(groupedTables[i].sector?.id || '')
              ) {
                tableIndexOffset += groupedTables[i].tables.length;
              }
            }

            return (
              <div key={group.sector?.id || 'no-sector'}>
                {group.sector && (
                  <SectorHeader
                    sector={group.sector}
                    isCollapsed={isCollapsed || false}
                    onToggle={() => {
                      const { toggleSectorCollapse } = useStore.getState();
                      toggleSectorCollapse(group.sector!.id);
                    }}
                    timeSlots={timeSlots}
                    zoom={zoom}
                  />
                )}
                {visibleGroupTables.map((table, idx) => {
                  const tableReservations =
                    reservationsByTable.get(table.id) || [];
                  const absoluteIndex = tableIndexOffset + idx;
                  const isLastTableInGroup =
                    idx === visibleGroupTables.length - 1;
                  const isLastGroup = groupIndex === groupedTables.length - 1;
                  const isLastRow = isLastTableInGroup && isLastGroup;

                  return (
                    <TimelineRow
                      key={table.id}
                      table={table}
                      timeSlots={timeSlots}
                      zoom={zoom}
                      isLastRow={isLastRow}
                    >
                      <CreateDragArea
                        configDate={config.date}
                        defaultPartySize={2}
                        isDragActive={!!draggingReservation}
                        isResizeActive={!!resizingReservation}
                        onDragComplete={(tableId, startTime, duration) => {
                          if (onOpenModal) {
                            onOpenModal(tableId, startTime, duration);
                          }
                        }}
                        reservations={reservations}
                        table={table}
                        timeSlots={timeSlots}
                        zoom={zoom}
                      />
                      {tableReservations.map((reservation) => {
                        const startTime = parseISO(reservation.startTime);
                        const slotIndex = timeToSlotIndex(
                          startTime,
                          config.date,
                        );
                        const x = slotToX(slotIndex, zoom);
                        const width = durationToWidth(
                          reservation.durationMinutes,
                          zoom,
                        );
                        const isSelected = selectedReservationIds.includes(
                          reservation.id,
                        );

                        const isDragging =
                          draggingReservation?.reservation.id ===
                          reservation.id;
                        const isResizing =
                          resizingReservation?.reservation.id ===
                          reservation.id;

                        return (
                          <ReservationBlock
                            key={reservation.id}
                            allReservations={reservations}
                            configDate={config.date}
                            gridContainerRef={gridContainerRef}
                            isDragging={isDragging}
                            isSelected={isSelected}
                            onDragStart={(e) => {
                              handleDragStart(reservation, e, x, absoluteIndex);
                            }}
                            onResizeStart={(e, edge) => {
                              handleResizeStart(reservation, edge, e, x);
                            }}
                            onContextMenu={handleContextMenu}
                            onSelect={(e) => {
                              const { selectReservation } = useStore.getState();
                              selectReservation(
                                reservation.id,
                                e.metaKey || e.ctrlKey,
                              );
                            }}
                            reservation={reservation}
                            style={{
                              position: 'absolute',
                              left:
                                isResizing && resizePreview
                                  ? resizePreview.left - 200
                                  : x,
                              top: 0,
                              width:
                                isResizing && resizePreview
                                  ? resizePreview.width
                                  : width,
                              height: 60,
                              opacity: isResizing ? 0.7 : 1,
                            }}
                            table={table}
                            tableIndex={absoluteIndex}
                            visibleTables={visibleTables}
                            zoom={zoom}
                          />
                        );
                      })}
                    </TimelineRow>
                  );
                })}
              </div>
            );
          })}
        </div>
        {/* Ghost Preview - follows cursor exactly */}
        {ghostPreview && draggingReservation && (
          <ReservationGhostBlock
            configDate={config.date}
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
            configDate={config.date}
            conflictReason={dropPreview.conflictReason}
            hasConflict={dropPreview.hasConflict}
            height={dropPreview.height}
            left={dropPreview.left}
            originalTableIndex={draggingReservation.originalTableIndex}
            reservation={draggingReservation.reservation}
            slotIndex={dropPreview.slotIndex}
            tableIndex={dropPreview.tableIndex}
            top={dropPreview.top}
            visibleTables={visibleTables}
            width={dropPreview.width}
          />
        )}
        {/* Resize Preview - shows resize preview with duration */}
        {resizePreview && resizingReservation && (
          <ResizePreviewBlock
            configDate={config.date}
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
