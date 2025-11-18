'use client';

import { useState, useRef, useEffect } from 'react';
import { RESERVATION_STATUS_COLORS } from '@/lib/constants/TIMELINE';
import { formatTimeRange } from '@/lib/helpers/time';
import { parseISO } from 'date-fns';
import type { Reservation, Table } from '@/lib/types/Reservation';
import clsx from 'clsx';

interface ReservationBlockProps {
  reservation: Reservation;
  style?: React.CSSProperties;
  isSelected?: boolean;
  isDragging?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.MouseEvent) => void;
  onResizeStart?: (e: React.MouseEvent, edge: 'left' | 'right') => void;
  configDate: string;
  zoom: number;
  tableIndex: number;
  visibleTables: Table[];
  gridContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function ReservationBlock({
  reservation,
  style,
  isSelected,
  isDragging: isDraggingProp = false,
  onSelect,
  onDragStart,
  onResizeStart,
  configDate,
  zoom,
  tableIndex,
  visibleTables,
  gridContainerRef,
}: ReservationBlockProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const backgroundColor =
    RESERVATION_STATUS_COLORS[reservation.status] || '#9CA3AF';
  const startTime = parseISO(reservation.startTime);
  const endTime = parseISO(reservation.endTime);
  const timeRange = formatTimeRange(startTime, endTime);
  const isCancelled = reservation.status === 'CANCELLED';

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (isCancelled) return;

    // Check if clicking on resize handle
    const target = e.target as HTMLElement;
    if (target.dataset.resizeHandle === 'left' && onResizeStart) {
      e.stopPropagation();
      onResizeStart(e, 'left');
      return;
    }
    if (target.dataset.resizeHandle === 'right' && onResizeStart) {
      e.stopPropagation();
      onResizeStart(e, 'right');
      return;
    }

    // Otherwise, start drag
    // Stop propagation to prevent CreateDragArea from interfering
    e.stopPropagation();
    if (onDragStart) {
      onDragStart(e);
    }
    setHasDragged(false);
    setShowTooltip(false);
  };

  const blockStyle = isDraggingProp
    ? {
        ...style,
        pointerEvents: 'none' as const,
        opacity: 0.5,
        userSelect: 'none' as const,
        zIndex: 5,
        transform: 'none',
        transition: 'none',
      }
    : style;

  return (
    <>
      <div
        ref={blockRef}
        data-reservation-block
        className={clsx(
          'absolute rounded px-2 py-1 text-white text-xs shadow-lg border border-white/20',
          !isDraggingProp && 'transition-all',
          isSelected && 'ring-2 ring-blue-500 ring-offset-1',
          isCancelled && 'opacity-60',
          !isCancelled && 'cursor-move',
          isDraggingProp && 'transition-none',
        )}
        style={{
          ...blockStyle,
          backgroundColor: isCancelled ? '#9CA3AF' : backgroundColor,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          backgroundImage: isCancelled
            ? 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 10px)'
            : undefined,
          zIndex: isDraggingProp ? 20 : 5,
          pointerEvents: 'auto',
        }}
        onClick={(e) => {
          if (!isDraggingProp && !hasDragged && onSelect) {
            onSelect(e);
          }
          setHasDragged(false);
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={(e) => {
          if (!isDraggingProp) {
            setTooltipPosition({ x: e.clientX + 10, y: e.clientY + 10 });
            setShowTooltip(true);
          }
        }}
        onMouseLeave={() => {
          if (!isDraggingProp) {
            setShowTooltip(false);
          }
        }}
      >
        <div className="font-semibold truncate leading-tight">
          {reservation.customer.name}
        </div>
        <div className="text-xs opacity-95 leading-tight mt-0.5 flex items-center gap-1">
          <span>👥</span>
          <span>{reservation.partySize} guests</span>
          <span>•</span>
          <span>{timeRange}</span>
        </div>
        {reservation.priority !== 'STANDARD' && (
          <div className="text-xs font-bold mt-0.5 leading-tight">
            {reservation.priority}
          </div>
        )}
        {/* Resize handles */}
        {!isCancelled && !isDraggingProp && (
          <>
            <div
              data-resize-handle="left"
              className="absolute cursor-ew-resize h-full left-0 top-0 w-2 hover:bg-white/30 transition-colors"
              style={{
                borderLeft: '2px solid rgba(255, 255, 255, 0.5)',
                zIndex: 10,
                pointerEvents: 'auto',
              }}
            />
            <div
              data-resize-handle="right"
              className="absolute cursor-ew-resize h-full right-0 top-0 w-2 hover:bg-white/30 transition-colors"
              style={{
                borderRight: '2px solid rgba(255, 255, 255, 0.5)',
                zIndex: 10,
                pointerEvents: 'auto',
              }}
            />
          </>
        )}
      </div>
      {showTooltip && (
        <Tooltip
          initialPosition={tooltipPosition}
          reservation={reservation}
          timeRange={timeRange}
        />
      )}
    </>
  );
}

function Tooltip({
  initialPosition,
  reservation,
  timeRange,
}: {
  initialPosition: { x: number; y: number };
  reservation: Reservation;
  timeRange: string;
}) {
  const [position, setPosition] = useState(initialPosition);

  useEffect(() => {
    setPosition(initialPosition);
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX + 10, y: e.clientY + 10 });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [initialPosition]);

  return (
    <div
      className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl pointer-events-none"
      style={{
        maxWidth: 250,
        left: position.x,
        top: position.y,
      }}
    >
      <div className="font-bold mb-2">{reservation.customer.name}</div>
      <div className="space-y-1">
        <div>
          <span className="opacity-70">Phone:</span>{' '}
          {reservation.customer.phone}
        </div>
        {reservation.customer.email && (
          <div>
            <span className="opacity-70">Email:</span>{' '}
            {reservation.customer.email}
          </div>
        )}
        <div>
          <span className="opacity-70">Party Size:</span>{' '}
          {reservation.partySize} guests
        </div>
        <div>
          <span className="opacity-70">Time:</span> {timeRange}
        </div>
        <div>
          <span className="opacity-70">Status:</span> {reservation.status}
        </div>
        <div>
          <span className="opacity-70">Priority:</span> {reservation.priority}
        </div>
        {reservation.notes && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <span className="opacity-70">Notes:</span> {reservation.notes}
          </div>
        )}
      </div>
    </div>
  );
}
