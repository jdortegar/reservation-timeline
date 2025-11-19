import { useCallback } from 'react';
import { parseISO, addMinutes } from 'date-fns';
import { useStore } from '@/store/store';
import type { Reservation, ReservationStatus } from '@/lib/types/Reservation';

interface UseReservationActionsProps {
  onOpenModal?: (
    tableId?: string,
    startTime?: string,
    duration?: number,
    reservationId?: string,
  ) => void;
}

export function useReservationActions({
  onOpenModal,
}: UseReservationActionsProps) {
  const {
    updateReservation,
    deleteReservation,
    deleteReservations,
    addReservation,
    selectReservation,
    copyReservations,
    pasteReservations,
    saveToHistory,
    reservations,
    selectedReservationIds,
  } = useStore();

  const handleEdit = useCallback(
    (reservation: Reservation) => {
      if (onOpenModal) {
        onOpenModal(
          reservation.tableId,
          reservation.startTime,
          reservation.durationMinutes,
          reservation.id,
        );
      }
    },
    [onOpenModal],
  );

  const handleChangeStatus = useCallback(
    (reservationId: string, status: ReservationStatus) => {
      saveToHistory();
      updateReservation(reservationId, { status });
    },
    [saveToHistory, updateReservation],
  );

  const handleMarkNoShow = useCallback(
    (reservationId: string) => {
      saveToHistory();
      updateReservation(reservationId, { status: 'NO_SHOW' });
    },
    [saveToHistory, updateReservation],
  );

  const handleCancel = useCallback(
    (reservationId: string) => {
      saveToHistory();
      updateReservation(reservationId, { status: 'CANCELLED' });
    },
    [saveToHistory, updateReservation],
  );

  const handleDuplicate = useCallback(
    (reservation: Reservation) => {
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
    },
    [saveToHistory, addReservation, selectReservation],
  );

  const handleDelete = useCallback(
    (reservationId: string) => {
      saveToHistory();
      deleteReservation(reservationId);
    },
    [saveToHistory, deleteReservation],
  );

  const handleDeleteMultiple = useCallback(
    (reservationIds: string[]) => {
      saveToHistory();
      deleteReservations(reservationIds);
    },
    [saveToHistory, deleteReservations],
  );

  const handleCopy = useCallback(
    (reservationsToCopy: Reservation[]) => {
      copyReservations(reservationsToCopy);
    },
    [copyReservations],
  );

  const handlePaste = useCallback(() => {
    // Paste at current time or first selected reservation's time
    const targetStartTime =
      selectedReservationIds.length > 0
        ? reservations.find((r) => r.id === selectedReservationIds[0])
            ?.startTime
        : undefined;
    saveToHistory();
    pasteReservations(undefined, targetStartTime);
  }, [selectedReservationIds, reservations, saveToHistory, pasteReservations]);

  const handleDuplicateMultiple = useCallback(
    (reservationIds: string[]) => {
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
    },
    [reservations, saveToHistory, addReservation],
  );

  return {
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
  };
}

