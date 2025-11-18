'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/store';
import { addMinutes } from 'date-fns';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import { checkAllConflicts } from '@/lib/helpers/conflicts';
import type { Reservation, ReservationStatus, Priority } from '@/lib/types/Reservation';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTableId?: string;
  initialStartTime?: string;
  initialDuration?: number;
  reservationId?: string;
}

export function ReservationModal({
  isOpen,
  onClose,
  initialTableId,
  initialStartTime,
  initialDuration,
  reservationId,
}: ReservationModalProps) {
  const { tables, reservations, addReservation, updateReservation, config } = useStore();
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [tableId, setTableId] = useState(initialTableId || '');
  const [startTime, setStartTime] = useState(initialStartTime || '');
  const [duration, setDuration] = useState(initialDuration || TIMELINE_CONFIG.DEFAULT_DURATION_MINUTES);
  const [status, setStatus] = useState<ReservationStatus>('CONFIRMED');
  const [priority, setPriority] = useState<Priority>('STANDARD');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const reservation = reservationId ? reservations.find((r) => r.id === reservationId) : null;

  useEffect(() => {
    if (reservation) {
      setCustomerName(reservation.customer.name);
      setPhone(reservation.customer.phone);
      setEmail(reservation.customer.email || '');
      setPartySize(reservation.partySize);
      setTableId(reservation.tableId);
      setStartTime(reservation.startTime);
      setDuration(reservation.durationMinutes);
      setStatus(reservation.status);
      setPriority(reservation.priority);
      setNotes(reservation.notes || '');
    } else if (initialTableId && initialStartTime) {
      setTableId(initialTableId);
      setStartTime(initialStartTime);
      setDuration(initialDuration || TIMELINE_CONFIG.DEFAULT_DURATION_MINUTES);
    }
  }, [reservation, initialTableId, initialStartTime, initialDuration]);

  const selectedTable = tables.find((t) => t.id === tableId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerName || !phone || !tableId || !startTime) {
      setError('Please fill in all required fields');
      return;
    }

    const start = new Date(startTime);
    const end = addMinutes(start, duration);

    const reservationData: Reservation = {
      id: reservationId || `RES_${Date.now()}`,
      tableId,
      customer: {
        name: customerName,
        phone,
        email: email || undefined,
        notes: notes || undefined,
      },
      partySize,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationMinutes: duration,
      status,
      priority,
      notes: notes || undefined,
      createdAt: reservation?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!selectedTable) {
      setError('Please select a table');
      return;
    }

    if (partySize < selectedTable.capacity.min || partySize > selectedTable.capacity.max) {
      setError(`Party size must be between ${selectedTable.capacity.min} and ${selectedTable.capacity.max}`);
      return;
    }

    if (duration < TIMELINE_CONFIG.MIN_DURATION_MINUTES || duration > 360) {
      setError(`Duration must be between ${TIMELINE_CONFIG.MIN_DURATION_MINUTES} and 360 minutes (6 hours)`);
      return;
    }

    const conflict = checkAllConflicts(
      reservationData,
      reservations.filter((r) => r.id !== reservationId),
      selectedTable,
      reservationId,
    );

    if (conflict.hasConflict) {
      if (conflict.reason === 'overlap') {
        setError('This reservation overlaps with an existing reservation');
      } else if (conflict.reason === 'capacity_exceeded') {
        setError(`Party size must be between ${selectedTable.capacity.min} and ${selectedTable.capacity.max}`);
      } else if (conflict.reason === 'outside_service_hours') {
        setError(`Reservation must be between ${TIMELINE_CONFIG.START_HOUR}:00 and ${TIMELINE_CONFIG.END_HOUR}:00`);
      } else {
        setError('Conflict detected');
      }
      return;
    }

    if (reservationId) {
      updateReservation(reservationId, reservationData);
    } else {
      addReservation(reservationData);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {reservationId ? 'Edit Reservation' : 'Create Reservation'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Party Size <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={partySize}
              onChange={(e) => setPartySize(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border rounded"
              required
            />
            {selectedTable && (
              <p className="text-xs text-gray-500 mt-1">
                Table capacity: {selectedTable.capacity.min}-{selectedTable.capacity.max} seats
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Table <span className="text-red-500">*</span>
            </label>
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">Select a table</option>
              {tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name} ({table.capacity.min}-{table.capacity.max} seats)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={startTime ? new Date(startTime).toISOString().slice(0, 16) : ''}
              onChange={(e) => setStartTime(new Date(e.target.value).toISOString())}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Duration (minutes) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={TIMELINE_CONFIG.MIN_DURATION_MINUTES}
              max={360}
              step={15}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ReservationStatus)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="SEATED">SEATED</option>
              <option value="FINISHED">FINISHED</option>
              <option value="NO_SHOW">NO_SHOW</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="STANDARD">STANDARD</option>
              <option value="VIP">VIP</option>
              <option value="LARGE_GROUP">LARGE_GROUP</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={3}
            />
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {reservationId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

