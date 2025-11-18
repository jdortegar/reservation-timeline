import { useEffect } from 'react';
import type { Reservation } from '@/lib/types/Reservation';

interface UseKeyboardShortcutsProps {
  selectedReservationIds: string[];
  reservations: Reservation[];
  onDelete: (reservationIds: string[]) => void;
  onCopy: (reservations: Reservation[]) => void;
  onPaste: () => void;
  onDuplicate: (reservationIds: string[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  selectedReservationIds,
  reservations,
  onDelete,
  onCopy,
  onPaste,
  onDuplicate,
  onUndo,
  onRedo,
  enabled = true,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedReservationIds.length > 0) {
          e.preventDefault();
          onDelete(selectedReservationIds);
        }
        return;
      }

      // Copy (Ctrl/Cmd + C)
      if (ctrlOrCmd && e.key === 'c' && !e.shiftKey) {
        if (selectedReservationIds.length > 0) {
          e.preventDefault();
          const selectedReservations = reservations.filter((r) =>
            selectedReservationIds.includes(r.id),
          );
          onCopy(selectedReservations);
        }
        return;
      }

      // Paste (Ctrl/Cmd + V)
      if (ctrlOrCmd && e.key === 'v' && !e.shiftKey) {
        e.preventDefault();
        onPaste();
        return;
      }

      // Duplicate (Ctrl/Cmd + D)
      if (ctrlOrCmd && e.key === 'd' && !e.shiftKey) {
        if (selectedReservationIds.length > 0) {
          e.preventDefault();
          onDuplicate(selectedReservationIds);
        }
        return;
      }

      // Undo (Ctrl/Cmd + Z)
      if (ctrlOrCmd && e.key === 'z' && !e.shiftKey && onUndo) {
        e.preventDefault();
        onUndo();
        return;
      }

      // Redo (Ctrl/Cmd + Shift + Z)
      if (ctrlOrCmd && e.key === 'z' && e.shiftKey && onRedo) {
        e.preventDefault();
        onRedo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    selectedReservationIds,
    reservations,
    onDelete,
    onCopy,
    onPaste,
    onDuplicate,
    onUndo,
    onRedo,
  ]);
}
