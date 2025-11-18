'use client';

import { useMemo, useRef } from 'react';
import { useStore } from '@/store/store';
import { getTimeSlots, timeToSlotIndex } from '@/lib/helpers/time';
import { slotToX, durationToWidth } from '@/lib/helpers/coordinates';
import { parseISO } from 'date-fns';
import { TimelineHeader } from './TimelineHeader';
import { TimelineRow } from './TimelineRow';
import { ReservationBlock } from './ReservationBlock';
import { ReservationGhostBlock } from './ReservationGhostBlock';
import { DropPreviewBlock } from './DropPreviewBlock';
import { CreateDragArea } from './CreateDragArea';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import { useReservationDrag } from '@/lib/hooks/useReservationDrag';
import type { Reservation, Sector } from '@/lib/types/Reservation';

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
}: {
  sector: Sector;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="border-b border-t cursor-pointer hover:opacity-80 flex items-center px-4 font-semibold text-sm transition-colors"
      style={{
        backgroundColor: sector.color + '20',
        color: sector.color,
        height: 40,
      }}
      onClick={onToggle}
    >
      <span className="mr-2 text-lg">{isCollapsed ? '▶' : '▼'}</span>
      {sector.name}
    </div>
  );
}

export function TimelineGrid({ onOpenModal }: TimelineGridProps) {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const {
    config,
    zoom,
    tables,
    reservations,
    sectors,
    collapsedSectors,
    selectedReservationIds,
    updateReservation,
  } = useStore();

  const timeSlots = useMemo(() => getTimeSlots(config.date), [config.date]);

  const reservationsByTable = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    reservations.forEach((r) => {
      const existing = map.get(r.tableId) || [];
      map.set(r.tableId, [...existing, r]);
    });
    return map;
  }, [reservations]);

  const currentTimeSlot = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (today !== config.date) return -1;

    return timeSlots.findIndex((slot) => {
      const slotTime = slot.getTime();
      const nextSlotTime = slotTime + 15 * 60 * 1000;
      return now.getTime() >= slotTime && now.getTime() < nextSlotTime;
    });
  }, [timeSlots, config.date]);

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
    return groupedTables.flatMap((group) => {
      if (group.sector && collapsedSectors.includes(group.sector.id)) {
        return [];
      }
      return group.tables;
    });
  }, [groupedTables, collapsedSectors]);

  // Use custom hook for drag logic (after groupedTables and visibleTables are defined)
  const { draggingReservation, ghostPreview, dropPreview, handleDragStart } =
    useReservationDrag({
      collapsedSectors,
      configDate: config.date,
      gridContainerRef,
      groupedTables,
      onUpdateReservation: updateReservation,
      reservations,
      visibleTables,
      zoom,
    });

  const gridWidth = timeSlots.length * 60 * zoom;
  const gridHeight = visibleTables.length * 60 + groupedTables.length * 40 + 70;

  const currentTimeX =
    currentTimeSlot >= 0 ? slotToX(currentTimeSlot, zoom) : null;

  return (
    <div ref={gridContainerRef} className="h-full overflow-auto relative">
      <div
        style={{ width: gridWidth, height: gridHeight, position: 'relative' }}
      >
        <TimelineHeader timeSlots={timeSlots} zoom={zoom} />
        {currentTimeX !== null && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: 200 + currentTimeX,
              top: 70,
              width: 2,
              height: visibleTables.length * 60,
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
                  />
                )}
                {visibleGroupTables.map((table, idx) => {
                  const tableReservations =
                    reservationsByTable.get(table.id) || [];
                  const absoluteIndex = tableIndexOffset + idx;
                  return (
                    <TimelineRow
                      key={table.id}
                      table={table}
                      timeSlots={timeSlots}
                      zoom={zoom}
                    >
                      <CreateDragArea
                        table={table}
                        timeSlots={timeSlots}
                        zoom={zoom}
                        configDate={config.date}
                        onDragComplete={(tableId, startTime, duration) => {
                          if (onOpenModal) {
                            onOpenModal(tableId, startTime, duration);
                          }
                        }}
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

                        return (
                          <ReservationBlock
                            key={reservation.id}
                            configDate={config.date}
                            gridContainerRef={gridContainerRef}
                            isDragging={isDragging}
                            isSelected={isSelected}
                            onDragStart={(e) => {
                              handleDragStart(reservation, e, x, absoluteIndex);
                            }}
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
                              left: x,
                              top: 0,
                              width,
                              height: 60,
                            }}
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
      </div>
    </div>
  );
}
