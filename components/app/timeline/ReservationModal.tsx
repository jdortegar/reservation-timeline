'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/store';
import { addMinutes } from 'date-fns';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import { checkAllConflicts } from '@/lib/helpers/conflicts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {reservationId ? 'Edit Reservation' : 'Create Reservation'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">
              Customer Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="partySize">
              Party Size <span className="text-red-500">*</span>
            </Label>
            <Input
              id="partySize"
              type="number"
              min={1}
              max={20}
              value={partySize}
              onChange={(e) => setPartySize(parseInt(e.target.value, 10))}
              required
            />
            {selectedTable && (
              <p className="text-xs text-muted-foreground">
                Table capacity: {selectedTable.capacity.min}-{selectedTable.capacity.max} seats
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="table">
              Table <span className="text-red-500">*</span>
            </Label>
            <Select value={tableId} onValueChange={setTableId}>
              <SelectTrigger id="table">
                <SelectValue placeholder="Select a table" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    {table.name} ({table.capacity.min}-{table.capacity.max} seats)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">
              Start Time <span className="text-red-500">*</span>
            </Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime ? new Date(startTime).toISOString().slice(0, 16) : ''}
              onChange={(e) => setStartTime(new Date(e.target.value).toISOString())}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">
              Duration (minutes) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="duration"
              type="number"
              min={TIMELINE_CONFIG.MIN_DURATION_MINUTES}
              max={360}
              step={15}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as ReservationStatus)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">PENDING</SelectItem>
                <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
                <SelectItem value="SEATED">SEATED</SelectItem>
                <SelectItem value="FINISHED">FINISHED</SelectItem>
                <SelectItem value="NO_SHOW">NO_SHOW</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STANDARD">STANDARD</SelectItem>
                <SelectItem value="VIP">VIP</SelectItem>
                <SelectItem value="LARGE_GROUP">LARGE_GROUP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {reservationId ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

