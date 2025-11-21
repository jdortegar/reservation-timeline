import { useEffect, useRef, useState, useCallback } from 'react';
import type { Reservation, Table } from '@/lib/types/Reservation';
import { timeToSlotIndex, slotIndexToTime } from '@/lib/helpers/time';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';

interface UseKeyboardNavigationProps {
  reservations: Reservation[];
  tables: Table[];
  selectedReservationIds: string[];
  onSelectReservation: (id: string, addToSelection?: boolean) => void;
  onOpenModal?: (
    tableId?: string,
    startTime?: string,
    duration?: number,
    reservationId?: string,
  ) => void;
  configDate: string;
  configTimezone?: string;
  enabled?: boolean;
}

interface GridPosition {
  reservationId: string;
  tableIndex: number;
  startSlot: number;
}

export function useKeyboardNavigation({
  reservations,
  tables,
  selectedReservationIds,
  onSelectReservation,
  onOpenModal,
  configDate,
  configTimezone,
  enabled = true,
}: UseKeyboardNavigationProps) {
  const [focusedReservationId, setFocusedReservationId] = useState<string | null>(
    null,
  );
  const focusedReservationRef = useRef<HTMLDivElement | null>(null);

  // Build grid positions for all reservations
  const gridPositions = useRef<Map<string, GridPosition>>(new Map());

  useEffect(() => {
    if (!enabled || reservations.length === 0) return;

    const positions = new Map<string, GridPosition>();

    reservations.forEach((reservation) => {
      const table = tables.find((t) => t.id === reservation.tableId);
      if (!table) return;

      const tableIndex = tables.findIndex((t) => t.id === table.id);
      const startTime = new Date(reservation.startTime);
      const startSlot = timeToSlotIndex(startTime, configDate, configTimezone);

      positions.set(reservation.id, {
        reservationId: reservation.id,
        tableIndex,
        startSlot,
      });
    });

    gridPositions.current = positions;

    // Set initial focus if none is set and there are selected reservations
    if (!focusedReservationId && selectedReservationIds.length > 0) {
      setFocusedReservationId(selectedReservationIds[0]);
    }
  }, [
    reservations,
    tables,
    configDate,
    configTimezone,
    enabled,
    selectedReservationIds,
    focusedReservationId,
  ]);

  // Find nearest reservation in a direction
  const findNearestReservation = useCallback(
    (
      currentId: string,
      direction: 'up' | 'down' | 'left' | 'right',
    ): string | null => {
      const current = gridPositions.current.get(currentId);
      if (!current) return null;

      const currentReservation = reservations.find((r) => r.id === currentId);
      if (!currentReservation) return null;

      const startTime = new Date(currentReservation.startTime);
      const endTime = new Date(currentReservation.endTime);
      const startSlot = timeToSlotIndex(startTime, configDate, configTimezone);
      const endSlot = timeToSlotIndex(endTime, configDate, configTimezone);
      const centerSlot = Math.floor((startSlot + endSlot) / 2);

      let candidates: Array<{ id: string; distance: number }> = [];

      gridPositions.current.forEach((pos, id) => {
        if (id === currentId) return;

        const candidateReservation = reservations.find((r) => r.id === id);
        if (!candidateReservation) return;

        const candidateStartTime = new Date(candidateReservation.startTime);
        const candidateEndTime = new Date(candidateReservation.endTime);
        const candidateStartSlot = timeToSlotIndex(
          candidateStartTime,
          configDate,
          configTimezone,
        );
        const candidateEndSlot = timeToSlotIndex(
          candidateEndTime,
          configDate,
          configTimezone,
        );
        const candidateCenterSlot = Math.floor(
          (candidateStartSlot + candidateEndSlot) / 2,
        );

        let distance = Infinity;

        switch (direction) {
          case 'up':
            if (pos.tableIndex < current.tableIndex) {
              // Prefer reservations that overlap horizontally
              const horizontalOverlap =
                candidateStartSlot < endSlot && candidateEndSlot > startSlot;
              if (horizontalOverlap) {
                distance = current.tableIndex - pos.tableIndex;
              } else {
                // If no overlap, use Manhattan distance
                const slotDiff = Math.abs(candidateCenterSlot - centerSlot);
                distance = (current.tableIndex - pos.tableIndex) * 1000 + slotDiff;
              }
            }
            break;
          case 'down':
            if (pos.tableIndex > current.tableIndex) {
              const horizontalOverlap =
                candidateStartSlot < endSlot && candidateEndSlot > startSlot;
              if (horizontalOverlap) {
                distance = pos.tableIndex - current.tableIndex;
              } else {
                const slotDiff = Math.abs(candidateCenterSlot - centerSlot);
                distance = (pos.tableIndex - current.tableIndex) * 1000 + slotDiff;
              }
            }
            break;
          case 'left':
            if (candidateEndSlot <= startSlot) {
              // Must be to the left (before current)
              distance = startSlot - candidateEndSlot;
              // Prefer same table
              if (pos.tableIndex === current.tableIndex) {
                distance -= 10000;
              }
            }
            break;
          case 'right':
            if (candidateStartSlot >= endSlot) {
              // Must be to the right (after current)
              distance = candidateStartSlot - endSlot;
              // Prefer same table
              if (pos.tableIndex === current.tableIndex) {
                distance -= 10000;
              }
            }
            break;
        }

        if (distance !== Infinity && distance >= 0) {
          candidates.push({ id, distance });
        }
      });

      if (candidates.length === 0) return null;

      // Sort by distance and return closest
      candidates.sort((a, b) => a.distance - b.distance);
      return candidates[0].id;
    },
    [reservations, configDate, configTimezone],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't handle if typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      // Handle arrow keys for navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();

        // If no focused reservation, focus first selected or first reservation
        let currentFocusId = focusedReservationId;
        if (!currentFocusId) {
          if (selectedReservationIds.length > 0) {
            currentFocusId = selectedReservationIds[0];
          } else if (reservations.length > 0) {
            currentFocusId = reservations[0].id;
          } else {
            return;
          }
        }

        const direction =
          e.key === 'ArrowUp'
            ? 'up'
            : e.key === 'ArrowDown'
              ? 'down'
              : e.key === 'ArrowLeft'
                ? 'left'
                : 'right';

        const nextId = findNearestReservation(currentFocusId, direction);

        if (nextId) {
          setFocusedReservationId(nextId);
          onSelectReservation(nextId, e.shiftKey);
          // Scroll focused element into view
          requestAnimationFrame(() => {
            focusedReservationRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
            });
          });
        }
        return;
      }

      // Handle Enter to edit
      if (e.key === 'Enter' && focusedReservationId) {
        e.preventDefault();
        const reservation = reservations.find((r) => r.id === focusedReservationId);
        if (reservation && onOpenModal) {
          const table = tables.find((t) => t.id === reservation.tableId);
          onOpenModal(
            reservation.tableId,
            reservation.startTime,
            reservation.durationMinutes,
            reservation.id,
          );
        }
        return;
      }
    },
    [
      enabled,
      focusedReservationId,
      selectedReservationIds,
      reservations,
      tables,
      findNearestReservation,
      onSelectReservation,
      onOpenModal,
    ],
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  const setFocusedReservation = useCallback((id: string | null) => {
    setFocusedReservationId(id);
  }, []);

  return {
    focusedReservationId,
    setFocusedReservation,
    focusedReservationRef,
  };
}

