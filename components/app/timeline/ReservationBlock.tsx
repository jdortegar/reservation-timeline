'use client';

import { useState, useRef, useMemo, memo } from 'react';
import { RESERVATION_STATUS_COLORS } from '@/lib/constants/TIMELINE';
import { formatTimeRange } from '@/lib/helpers/time';
import { parseISO } from 'date-fns';
import { checkAllConflicts, getConflictMessage } from '@/lib/helpers/conflicts';
import { ReservationTooltip, ConflictTooltip } from './ReservationTooltips';
import type { Reservation, Table } from '@/lib/types/Reservation';
import clsx from 'clsx';

interface ReservationBlockProps {
  reservation: Reservation;
  style?: React.CSSProperties;
  isSelected?: boolean;
  isFocused?: boolean;
  isDragging?: boolean;
  focusedReservationRef?: React.MutableRefObject<HTMLDivElement | null>;
  onSelect?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.MouseEvent) => void;
  onResizeStart?: (e: React.MouseEvent, edge: 'left' | 'right') => void;
  onContextMenu?: (e: React.MouseEvent, reservation: Reservation) => void;
  configTimezone?: string;
  zoom: number;
  allReservations?: Reservation[];
  table?: Table;
}

function ReservationBlockComponent({
  reservation,
  style,
  isSelected,
  isFocused = false,
  isDragging: isDraggingProp = false,
  focusedReservationRef,
  onSelect,
  onDragStart,
  onResizeStart,
  onContextMenu,
  configTimezone,
  zoom,
  allReservations = [],
  table,
}: ReservationBlockProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showConflictTooltip, setShowConflictTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);

  // Memoize expensive calculations
  const backgroundColor = useMemo(
    () => RESERVATION_STATUS_COLORS[reservation.status] || '#9CA3AF',
    [reservation.status],
  );

  const { timeRange, isCancelled } = useMemo(() => {
    const start = parseISO(reservation.startTime);
    const end = parseISO(reservation.endTime);
    return {
      timeRange: formatTimeRange(start, end, configTimezone),
      isCancelled: reservation.status === 'CANCELLED',
    };
  }, [
    reservation.startTime,
    reservation.endTime,
    reservation.status,
    configTimezone,
  ]);

  // Memoize conflict check - only recalculate when reservation, table, or allReservations change
  const { hasConflict, conflictReason } = useMemo(() => {
    if (!table || allReservations.length === 0) {
      return { hasConflict: false, conflictReason: undefined };
    }
    const conflictCheck = checkAllConflicts(
      reservation,
      allReservations,
      table,
      reservation.id,
    );
    return {
      hasConflict: conflictCheck.hasConflict,
      conflictReason: conflictCheck.reason,
    };
  }, [reservation, table, allReservations]);

  // Generate accessible label for the reservation block
  const ariaLabel = useMemo(() => {
    const statusText =
      reservation.status === 'CANCELLED' ? 'Cancelled' : reservation.status;
    const conflictText = hasConflict
      ? 'Warning: This reservation has a conflict. '
      : '';
    const tableName = table?.name || 'Unknown table';
    return `${conflictText}Reservation for ${reservation.customer.name}, ${reservation.partySize} guests, ${timeRange}, Table ${tableName}, Status: ${statusText}. Use arrow keys to navigate, Enter to edit, Space to select, right-click for menu.`;
  }, [
    reservation.customer.name,
    reservation.partySize,
    timeRange,
    reservation.status,
    hasConflict,
    table?.name,
  ]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (isCancelled) return;

    // Prevent text selection during drag
    e.preventDefault();

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isCancelled) return;

    // Enter to edit
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      // Let the parent handle opening the modal
      return;
    }

    // Space to select
    if (e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (onSelect) {
        // Create a synthetic mouse event for compatibility
        const syntheticEvent = {
          ...e,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
        } as unknown as React.MouseEvent;
        onSelect(syntheticEvent);
      }
      return;
    }

    // Arrow keys are handled by parent navigation hook
    // Just prevent default to avoid scrolling
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
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
        ref={(node) => {
          blockRef.current = node;
          if (focusedReservationRef && node) {
            focusedReservationRef.current = node;
          }
        }}
        data-reservation-block
        role="button"
        tabIndex={isCancelled ? -1 : isFocused ? 0 : -1}
        aria-label={ariaLabel}
        aria-selected={isSelected}
        aria-disabled={isCancelled}
        className={clsx(
          'absolute rounded px-2 py-1 text-white text-xs shadow-lg border',
          !isDraggingProp && 'transition-all',
          isSelected && 'ring-2 ring-blue-500 ring-offset-1',
          isFocused && !isSelected && 'ring-2 ring-yellow-400 ring-offset-1',
          isCancelled && 'opacity-60',
          !isCancelled &&
            'cursor-move focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          isDraggingProp && 'transition-none',
          hasConflict && !isDraggingProp
            ? 'border-red-500 border-2'
            : 'border-white/20',
          hasConflict && !isDraggingProp && 'pl-6',
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
          boxShadow:
            hasConflict && !isDraggingProp
              ? '0 0 8px rgba(239, 68, 68, 0.6), 0 1px 2px rgba(0,0,0,0.3)'
              : undefined,
        }}
        onClick={(e) => {
          if (!isDraggingProp && !hasDragged && onSelect) {
            onSelect(e);
          }
          setHasDragged(false);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          // Ensure focused reservation is visible
          requestAnimationFrame(() => {
            blockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });
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
        onContextMenu={(e) => {
          if (!isDraggingProp && !isCancelled && onContextMenu) {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu(e, reservation);
          }
        }}
      >
        {hasConflict && !isDraggingProp && (
          <div
            className="absolute -left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 bg-red-500 rounded-full z-20 shadow-lg border-2 border-white"
            role="img"
            aria-label="Warning: Reservation conflict"
            title={getConflictMessage(conflictReason, table)}
            onMouseEnter={(e) => {
              if (!isDraggingProp) {
                setTooltipPosition({
                  x: e.clientX + 10,
                  y: e.clientY + 10,
                });
                setShowConflictTooltip(true);
                setShowTooltip(false);
              }
            }}
            onMouseLeave={() => {
              if (!isDraggingProp) {
                setShowConflictTooltip(false);
              }
            }}
          >
            <span
              className="text-white text-xl font-bold leading-none"
              aria-hidden="true"
            >
              ⚠
            </span>
          </div>
        )}
        <div className="font-semibold truncate leading-tight">
          {reservation.customer.name}
        </div>
        <div className="text-xs opacity-95 leading-tight mt-0.5 flex items-center gap-1">
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
              role="button"
              tabIndex={-1}
              aria-label={`Resize reservation start time for ${reservation.customer.name}`}
              className="absolute cursor-ew-resize h-full left-0 top-0 w-2 hover:bg-white/30 transition-colors"
              style={{
                borderLeft: '2px solid rgba(255, 255, 255, 0.5)',
                zIndex: 10,
                pointerEvents: 'auto',
              }}
            />
            <div
              data-resize-handle="right"
              role="button"
              tabIndex={-1}
              aria-label={`Resize reservation end time for ${reservation.customer.name}`}
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
      {showTooltip && !showConflictTooltip && (
        <ReservationTooltip
          initialPosition={tooltipPosition}
          reservation={reservation}
          timeRange={timeRange}
        />
      )}
      {showConflictTooltip && hasConflict && (
        <ConflictTooltip
          initialPosition={tooltipPosition}
          conflictReason={conflictReason}
          table={table}
        />
      )}
    </>
  );
}

// Memoize component to prevent unnecessary re-renders
// Best practice: Use default shallow comparison (React handles it efficiently)
// Custom comparison only needed if reservation objects are recreated with same values
export const ReservationBlock = memo(ReservationBlockComponent);
