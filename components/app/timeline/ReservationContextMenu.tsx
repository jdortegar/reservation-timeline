'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RESERVATION_STATUS_COLORS } from '@/lib/constants/TIMELINE';
import type { Reservation, ReservationStatus } from '@/lib/types/Reservation';
import clsx from 'clsx';

interface ReservationContextMenuProps {
  reservation: Reservation;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: (reservation: Reservation) => void;
  onChangeStatus: (reservationId: string, status: ReservationStatus) => void;
  onMarkNoShow: (reservationId: string) => void;
  onCancel: (reservationId: string) => void;
  onDuplicate: (reservation: Reservation) => void;
  onDelete: (reservationId: string) => void;
}

const STATUS_OPTIONS: Array<{
  value: ReservationStatus;
  label: string;
  color: string;
}> = [
  {
    value: 'PENDING',
    label: 'Pending',
    color: RESERVATION_STATUS_COLORS.PENDING,
  },
  {
    value: 'CONFIRMED',
    label: 'Confirmed',
    color: RESERVATION_STATUS_COLORS.CONFIRMED,
  },
  { value: 'SEATED', label: 'Seated', color: RESERVATION_STATUS_COLORS.SEATED },
  {
    value: 'FINISHED',
    label: 'Finished',
    color: RESERVATION_STATUS_COLORS.FINISHED,
  },
  {
    value: 'NO_SHOW',
    label: 'No Show',
    color: RESERVATION_STATUS_COLORS.NO_SHOW,
  },
  {
    value: 'CANCELLED',
    label: 'Cancelled',
    color: RESERVATION_STATUS_COLORS.CANCELLED,
  },
];

export function ReservationContextMenu({
  reservation,
  position,
  onClose,
  onEdit,
  onChangeStatus,
  onMarkNoShow,
  onCancel,
  onDuplicate,
  onDelete,
}: ReservationContextMenuProps) {
  const [showStatusSubmenu, setShowStatusSubmenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStatusClick = (status: ReservationStatus) => {
    onChangeStatus(reservation.id, status);
    onClose();
  };

  const handleEdit = () => {
    onEdit(reservation);
    onClose();
  };

  const handleMarkNoShow = () => {
    onMarkNoShow(reservation.id);
    onClose();
  };

  const handleCancel = () => {
    onCancel(reservation.id);
    onClose();
  };

  const handleDuplicate = () => {
    onDuplicate(reservation);
    onClose();
  };

  const handleDelete = () => {
    onDelete(reservation.id);
    onClose();
  };

  if (!mounted) return null;

  const menuContent = (
    <>
      {/* Backdrop - only capture clicks, not drag events */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
        onMouseDown={(e) => {
          // Only close on left click, allow drag operations to pass through
          if (e.button === 0) {
            onClose();
          }
        }}
        // Don't capture mouse move/up events - let them pass through for drag operations
        onMouseMove={(e) => {
          // Allow mouse move events to pass through
          e.stopPropagation();
        }}
        onMouseUp={(e) => {
          // Allow mouse up events to pass through
          e.stopPropagation();
        }}
        style={{ pointerEvents: 'auto' }}
      />
      {/* Menu */}
      <div
        className="fixed z-50 min-w-[200px] rounded-sm border bg-white shadow-lg py-1"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          position: 'fixed',
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <button
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100"
          onClick={handleEdit}
        >
          <span>Edit details</span>
        </button>

        <div className="relative">
          <button
            className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100"
            onMouseEnter={() => setShowStatusSubmenu(true)}
            onMouseLeave={() => setShowStatusSubmenu(false)}
          >
            <span>Change status</span>
          </button>
          {showStatusSubmenu && (
            <div
              className="absolute left-full top-0 ml-1 min-w-[180px] rounded-lg border bg-white shadow-lg py-1"
              onMouseEnter={() => setShowStatusSubmenu(true)}
              onMouseLeave={() => setShowStatusSubmenu(false)}
            >
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  className={clsx(
                    'flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100',
                    reservation.status === status.value &&
                      'bg-gray-50 font-semibold',
                  )}
                  onClick={() => handleStatusClick(status.value)}
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span>{status.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {reservation.status !== 'NO_SHOW' && (
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100"
            onClick={handleMarkNoShow}
          >
            <span>Mark as no-show</span>
          </button>
        )}

        {reservation.status !== 'CANCELLED' && (
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100"
            onClick={handleCancel}
          >
            <span>Cancel reservation</span>
          </button>
        )}

        <div className="my-1 border-t border-gray-200" />

        <button
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100"
          onClick={handleDuplicate}
        >
          <span>Duplicate</span>
        </button>

        <button
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          onClick={handleDelete}
        >
          <span>Delete</span>
        </button>
      </div>
    </>
  );

  return createPortal(menuContent, document.body);
}
