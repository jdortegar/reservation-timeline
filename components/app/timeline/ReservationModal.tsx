'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStore } from '@/store/store';
import { addMinutes } from 'date-fns';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import { checkAllConflicts } from '@/lib/helpers/conflicts';
import { createReservationSchema } from '@/lib/validation/reservation';
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
import type { Reservation } from '@/lib/types/Reservation';
import type { ReservationFormData } from '@/lib/validation/reservation';

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
  const { tables, reservations, addReservation, updateReservation } = useStore();
  const reservation = reservationId ? reservations.find((r) => r.id === reservationId) : null;

  const schema = createReservationSchema(tables);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    setError,
    watch,
    reset,
  } = useForm<ReservationFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: '',
      phone: '',
      email: '',
      partySize: 2,
      tableId: initialTableId || '',
      startTime: initialStartTime || '',
      duration: initialDuration || TIMELINE_CONFIG.DEFAULT_DURATION_MINUTES,
      status: 'CONFIRMED',
      priority: 'STANDARD',
      notes: '',
    },
  });

  const tableId = watch('tableId');
  const selectedTable = tables.find((t) => t.id === tableId);

  useEffect(() => {
    if (reservation) {
      const startDate = new Date(reservation.startTime);
      const localDateTime = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      
      reset({
        customerName: reservation.customer.name,
        phone: reservation.customer.phone,
        email: reservation.customer.email || '',
        partySize: reservation.partySize,
        tableId: reservation.tableId,
        startTime: localDateTime,
        duration: reservation.durationMinutes,
        status: reservation.status,
        priority: reservation.priority,
        notes: reservation.notes || '',
      });
    } else if (initialTableId && initialStartTime) {
      const startDate = new Date(initialStartTime);
      const localDateTime = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      
      reset({
        customerName: '',
        phone: '',
        email: '',
        partySize: 2,
        tableId: initialTableId,
        startTime: localDateTime,
        duration: initialDuration || TIMELINE_CONFIG.DEFAULT_DURATION_MINUTES,
        status: 'CONFIRMED',
        priority: 'STANDARD',
        notes: '',
      });
    }
  }, [reservation, initialTableId, initialStartTime, initialDuration, reset]);

  const onSubmit = (data: ReservationFormData) => {
    if (!selectedTable) return;

    const start = new Date(data.startTime);
    const end = addMinutes(start, data.duration);

    const reservationData: Reservation = {
      id: reservationId || `RES_${Date.now()}`,
      tableId: data.tableId,
      customer: {
        name: data.customerName,
        phone: data.phone,
        email: data.email || undefined,
        notes: data.notes || undefined,
      },
      partySize: data.partySize,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationMinutes: data.duration,
      status: data.status,
      priority: data.priority,
      notes: data.notes || undefined,
      createdAt: reservation?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const conflict = checkAllConflicts(
      reservationData,
      reservations.filter((r) => r.id !== reservationId),
      selectedTable,
      reservationId,
    );

    if (conflict.hasConflict) {
      if (conflict.reason === 'overlap') {
        setError('startTime', {
          type: 'manual',
          message: 'This reservation overlaps with an existing reservation',
        });
        return;
      } else if (conflict.reason === 'capacity_exceeded') {
        setError('partySize', {
          type: 'manual',
          message: `Party size must be between ${selectedTable.capacity.min} and ${selectedTable.capacity.max}`,
        });
        return;
      } else if (conflict.reason === 'outside_service_hours') {
        setError('startTime', {
          type: 'manual',
          message: `Reservation must be between ${TIMELINE_CONFIG.START_HOUR}:00 and ${TIMELINE_CONFIG.END_HOUR}:00`,
        });
        return;
      }
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {reservationId ? 'Edit Reservation' : 'Create Reservation'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">
                Customer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerName"
                {...register('customerName')}
              />
              {errors.customerName && (
                <p className="text-sm text-destructive">{errors.customerName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
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
                {...register('partySize', { valueAsNumber: true })}
              />
              {errors.partySize && (
                <p className="text-sm text-destructive">{errors.partySize.message}</p>
              )}
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
              <Select
                value={watch('tableId')}
                onValueChange={(value) => setValue('tableId', value)}
              >
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
              {errors.tableId && (
                <p className="text-sm text-destructive">{errors.tableId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">
                Start Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="startTime"
                type="datetime-local"
                {...register('startTime')}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime.message}</p>
              )}
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
                {...register('duration', { valueAsNumber: true })}
              />
              {errors.duration && (
                <p className="text-sm text-destructive">{errors.duration.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as ReservationFormData['status'])}
              >
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
              {errors.status && (
                <p className="text-sm text-destructive">{errors.status.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={watch('priority')}
                onValueChange={(value) => setValue('priority', value as ReservationFormData['priority'])}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">STANDARD</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="LARGE_GROUP">LARGE_GROUP</SelectItem>
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-sm text-destructive">{errors.priority.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              rows={3}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

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
