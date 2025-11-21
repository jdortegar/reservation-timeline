'use client';

import { memo, useCallback } from 'react';
import { useStore } from '@/store/store';
import { timeToSlotIndex } from '@/lib/helpers/time';
import { slotToX, durationToWidth } from '@/lib/helpers/coordinates';
import { parseISO } from 'date-fns';
import { TimelineRow } from './TimelineRow';
import { ReservationBlock } from './ReservationBlock';
import { CreateDragArea } from './CreateDragArea';
import { SectorHeader } from './SectorHeader';
import type { RowComponentProps } from 'react-window';
import type { VirtualItem } from '@/lib/hooks/useVirtualItems';
import type { Reservation } from '@/lib/types/Reservation';

interface VirtualTimelineRowProps {
  index: number;
  style: React.CSSProperties;
  item: VirtualItem;
  virtualItems: VirtualItem[];
  collapsedSectors: string[];
  timeSlots: Date[];
  zoom: number;
  configDate: string;
  configTimezone?: string;
  reservationsByTable: Map<string, Reservation[]>;
  draggingReservation: {
    reservation: Reservation;
  } | null;
  resizingReservation: {
    reservation: Reservation;
  } | null;
  resizePreview: {
    left: number;
    width: number;
  } | null;
  selectedReservationIds: string[];
  focusedReservationId?: string | null;
  focusedReservationRef?: React.RefObject<HTMLDivElement>;
  reservations: Reservation[];
  onOpenModal?: (
    tableId?: string,
    startTime?: string,
    duration?: number,
    reservationId?: string,
  ) => void;
  onDragStart: (
    reservation: Reservation,
    e: React.MouseEvent,
    x: number,
    absoluteIndex: number,
  ) => void;
  onResizeStart: (
    reservation: Reservation,
    edge: 'left' | 'right',
    e: React.MouseEvent,
    x: number,
  ) => void;
  onContextMenu: (e: React.MouseEvent, reservation: Reservation) => void;
}

function VirtualTimelineRowComponent({
  index,
  style,
  item,
  virtualItems,
  collapsedSectors,
  timeSlots,
  zoom,
  configDate,
  configTimezone,
  reservationsByTable,
  draggingReservation,
  resizingReservation,
  resizePreview,
  selectedReservationIds,
  focusedReservationId,
  focusedReservationRef,
  reservations,
  onOpenModal,
  onDragStart,
  onResizeStart,
  onContextMenu,
}: VirtualTimelineRowProps) {
  if (!item) {
    // Return empty div if item doesn't exist
    return <div style={style} />;
  }

  if (item.type === 'sector') {
    const isCollapsed = collapsedSectors.includes(item.sector.id);
    return (
      <div style={style}>
        <SectorHeader
          sector={item.sector}
          isCollapsed={isCollapsed}
          onToggle={() => {
            const { toggleSectorCollapse } = useStore.getState();
            toggleSectorCollapse(item.sector.id);
          }}
          timeSlots={timeSlots}
          zoom={zoom}
        />
      </div>
    );
  }

  // Render table row
  const { table, absoluteIndex } = item;
  const tableReservations = reservationsByTable.get(table.id) || [];

  // Determine if this is the last row
  const isLastRow = index === virtualItems.length - 1;

  return (
    <div style={style}>
      <TimelineRow
        key={table.id}
        table={table}
        timeSlots={timeSlots}
        zoom={zoom}
        isLastRow={isLastRow}
      >
        <CreateDragArea
          configDate={configDate}
          configTimezone={configTimezone}
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
          const slotIndex = timeToSlotIndex(startTime, configDate);
          const x = slotToX(slotIndex, zoom);
          const width = durationToWidth(reservation.durationMinutes, zoom);
          const isSelected = selectedReservationIds.includes(reservation.id);

          const isDragging =
            draggingReservation?.reservation.id === reservation.id;
          const isResizing =
            resizingReservation?.reservation.id === reservation.id;

          return (
            <ReservationBlock
              key={reservation.id}
              allReservations={reservations}
              configTimezone={configTimezone}
              focusedReservationRef={
                focusedReservationId === reservation.id
                  ? focusedReservationRef
                  : undefined
              }
              isDragging={isDragging}
              isFocused={focusedReservationId === reservation.id}
              isSelected={isSelected}
              onDragStart={(e: React.MouseEvent) => {
                onDragStart(reservation, e, x, absoluteIndex);
              }}
              onResizeStart={(e: React.MouseEvent, edge: 'left' | 'right') => {
                onResizeStart(reservation, edge, e, x);
              }}
              onContextMenu={onContextMenu}
              onSelect={(e: React.MouseEvent) => {
                const { selectReservation } = useStore.getState();
                selectReservation(reservation.id, e.metaKey || e.ctrlKey);
              }}
              reservation={reservation}
              style={{
                position: 'absolute',
                left: isResizing && resizePreview ? resizePreview.left - 200 : x,
                top: 0,
                width: isResizing && resizePreview ? resizePreview.width : width,
                height: 60,
                opacity: isResizing ? 0.7 : 1,
              }}
              table={table}
              zoom={zoom}
            />
          );
        })}
      </TimelineRow>
    </div>
  );
}

export const VirtualTimelineRow = memo(VirtualTimelineRowComponent);

