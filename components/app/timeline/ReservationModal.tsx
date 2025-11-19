'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStore } from '@/store/store';
import { addMinutes } from 'date-fns';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import { checkAllConflicts } from '@/lib/helpers/conflicts';
import { createReservationSchema } from '@/lib/validation/reservation';
import {
  suggestTables,
  findNextAvailableAcrossAllTables,
  type TableSuggestion,
  type NextAvailableSlot,
} from '@/lib/helpers/tableSuggestions';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { TableSuggestions } from './TableSuggestions';
import { NextAvailableSlots } from './NextAvailableSlots';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const { tables, reservations, sectors, addReservation, updateReservation } =
    useStore();
  const reservation = reservationId
    ? reservations.find((r) => r.id === reservationId)
    : null;
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictReservation, setConflictReservation] =
    useState<Reservation | null>(null);
  const [conflictTable, setConflictTable] = useState<typeof tables[0] | null>(
    null,
  );
  const [conflictReason, setConflictReason] = useState<
    'overlap' | 'capacity_exceeded' | 'outside_service_hours' | undefined
  >(undefined);
  const [showTableSuggestions, setShowTableSuggestions] = useState(false);
  const [showNextAvailable, setShowNextAvailable] = useState(false);
  const [nextAvailableSlots, setNextAvailableSlots] = useState<
    NextAvailableSlot[]
  >([]);

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
  const partySizeRaw = watch('partySize');
  const startTime = watch('startTime');
  const durationRaw = watch('duration');

  // Convert to numbers and handle NaN/empty values
  const partySize =
    typeof partySizeRaw === 'number' && !isNaN(partySizeRaw) && partySizeRaw > 0
      ? partySizeRaw
      : undefined;
  const duration =
    typeof durationRaw === 'number' && !isNaN(durationRaw) && durationRaw > 0
      ? durationRaw
      : undefined;

  const selectedTable = tables.find((t) => t.id === tableId);

  // Calculate table suggestions when party size, start time, or duration changes
  const tableSuggestions = useMemo(() => {
    // Only show suggestions when creating new reservations (not editing)
    if (reservationId) {
      return [];
    }

    // Check if all required fields are filled and valid
    if (!startTime || !partySize || !duration) {
      return [];
    }

    // Validate party size is a valid number
    if (typeof partySize !== 'number' || isNaN(partySize) || partySize <= 0) {
      return [];
    }

    // Validate duration is a valid number
    if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
      return [];
    }

    // Validate startTime format (should be YYYY-MM-DDTHH:mm)
    if (!startTime.includes('T')) {
      return [];
    }

    try {
      // Parse datetime-local string to ISO string
      const [datePart, timePart] = startTime.split('T');
      if (!datePart || !timePart) return [];

      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);

      // Validate parsed values
      if (
        isNaN(year) ||
        isNaN(month) ||
        isNaN(day) ||
        isNaN(hours) ||
        isNaN(minutes)
      ) {
        return [];
      }

      const startDate = new Date(year, month - 1, day, hours, minutes);

      // Validate date object
      if (isNaN(startDate.getTime())) {
        return [];
      }

      const startTimeISO = startDate.toISOString();

      // Ensure we have tables and sectors
      if (!tables.length) {
        console.warn('No tables available for suggestions');
        return [];
      }
      if (!sectors.length) {
        console.warn('No sectors available for suggestions');
        return [];
      }

      const suggestions = suggestTables({
        partySize,
        startTime: startTimeISO,
        durationMinutes: duration,
        reservations: reservations.filter((r) => r.id !== reservationId),
        tables,
        sectors,
      });

      console.log('Calculated table suggestions:', {
        count: suggestions.length,
        partySize,
        startTime: startTimeISO,
        duration,
        tablesCount: tables.length,
        reservationsCount: reservations.length,
      });

      return suggestions;
    } catch (error) {
      console.error('Error calculating table suggestions:', error);
      return [];
    }
  }, [
    partySize,
    startTime,
    duration,
    tables,
    sectors,
    reservations,
    reservationId,
  ]);

  // Handle "Find next available" button
  const handleFindNextAvailable = () => {
    if (!startTime || !partySize || !duration) {
      console.warn('Missing required fields for Find Next Available:', {
        startTime,
        partySize,
        duration,
      });
      return;
    }

    // Validate party size is a valid number
    if (typeof partySize !== 'number' || isNaN(partySize) || partySize <= 0) {
      console.warn('Invalid party size:', partySize);
      return;
    }

    // Validate duration is a valid number
    if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
      console.warn('Invalid duration:', duration);
      return;
    }

    // Validate startTime format
    if (!startTime.includes('T')) {
      console.warn('Invalid startTime format:', startTime);
      return;
    }

    try {
      // Parse datetime-local string to ISO string
      const [datePart, timePart] = startTime.split('T');
      if (!datePart || !timePart) {
        console.warn('Invalid date/time format:', startTime);
        return;
      }

      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);

      // Validate parsed values
      if (
        isNaN(year) ||
        isNaN(month) ||
        isNaN(day) ||
        isNaN(hours) ||
        isNaN(minutes)
      ) {
        console.warn('Invalid date/time values:', {
          year,
          month,
          day,
          hours,
          minutes,
        });
        return;
      }

      const startDate = new Date(year, month - 1, day, hours, minutes);

      // Validate date object
      if (isNaN(startDate.getTime())) {
        console.warn('Invalid date object created');
        return;
      }

      const startTimeISO = startDate.toISOString();

      // Ensure we have tables
      if (!tables.length) {
        console.warn('No tables available');
        return;
      }

      const slots = findNextAvailableAcrossAllTables(
        startTimeISO,
        duration,
        partySize,
        reservations.filter((r) => r.id !== reservationId),
        tables,
        [15, 30, 60], // Search windows: ±15, ±30, ±60 minutes
      );

      console.log('Found next available slots:', slots.length, slots);

      setNextAvailableSlots(slots);
      setShowNextAvailable(true);
      setShowTableSuggestions(false);
    } catch (error) {
      console.error('Error finding next available slots:', error);
    }
  };

  // Handle selecting a suggested table
  const handleSelectSuggestedTable = (suggestedTableId: string) => {
    const selectedTable = tables.find((t) => t.id === suggestedTableId);

    // Update table
    setValue('tableId', suggestedTableId, { shouldValidate: true });

    // Update party size if current value is outside table capacity
    if (selectedTable) {
      const currentPartySize = watch('partySize');
      if (
        currentPartySize &&
        (currentPartySize < selectedTable.capacity.min ||
          currentPartySize > selectedTable.capacity.max)
      ) {
        // Adjust to fit within table capacity
        const adjustedPartySize = Math.max(
          selectedTable.capacity.min,
          Math.min(currentPartySize, selectedTable.capacity.max),
        );
        setValue('partySize', adjustedPartySize, { shouldValidate: true });
      }
    }

    setShowTableSuggestions(false);
  };

  // Handle selecting a next available slot
  const handleSelectNextAvailableSlot = (slot: NextAvailableSlot) => {
    // Update table
    setValue('tableId', slot.table.id, { shouldValidate: true });

    // Update start time - format for datetime-local input
    const startDate = new Date(slot.startTime);
    const year = startDate.getFullYear();
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    const day = String(startDate.getDate()).padStart(2, '0');
    const hours = String(startDate.getHours()).padStart(2, '0');
    const minutes = String(startDate.getMinutes()).padStart(2, '0');
    const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    setValue('startTime', localDateTime, { shouldValidate: true });

    // Update duration if it differs from current value
    const currentDuration = watch('duration');
    if (slot.durationMinutes !== currentDuration) {
      setValue('duration', slot.durationMinutes, { shouldValidate: true });
    }

    // Update party size if table capacity requires it
    const selectedTable = tables.find((t) => t.id === slot.table.id);
    if (selectedTable) {
      const currentPartySize = watch('partySize');
      // If current party size is invalid for the new table, adjust it
      if (
        currentPartySize &&
        (currentPartySize < selectedTable.capacity.min ||
          currentPartySize > selectedTable.capacity.max)
      ) {
        // Set to the minimum capacity that fits, or keep current if it fits
        const adjustedPartySize = Math.max(
          selectedTable.capacity.min,
          Math.min(currentPartySize, selectedTable.capacity.max),
        );
        setValue('partySize', adjustedPartySize, { shouldValidate: true });
      }
    }

    setShowNextAvailable(false);
  };

  useEffect(() => {
    if (reservation) {
      const startDate = new Date(reservation.startTime);
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      // Preserve the date and time from the ISO string
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(startDate.getDate()).padStart(2, '0');
      const hours = String(startDate.getHours()).padStart(2, '0');
      const minutes = String(startDate.getMinutes()).padStart(2, '0');
      const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

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
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      // Preserve the date and time from the ISO string
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(startDate.getDate()).padStart(2, '0');
      const hours = String(startDate.getHours()).padStart(2, '0');
      const minutes = String(startDate.getMinutes()).padStart(2, '0');
      const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

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
    } else if (initialTableId) {
      // If table is provided but no startTime, set default to today at 12:00 PM
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const defaultTime = `${year}-${month}-${day}T12:00`;

      reset({
        customerName: '',
        phone: '',
        email: '',
        partySize: 2,
        tableId: initialTableId,
        startTime: defaultTime,
        duration: initialDuration || TIMELINE_CONFIG.DEFAULT_DURATION_MINUTES,
        status: 'CONFIRMED',
        priority: 'STANDARD',
        notes: '',
      });
    }
  }, [reservation, initialTableId, initialStartTime, initialDuration, reset]);

  const onSubmit = (data: ReservationFormData) => {
    if (!selectedTable) {
      setError('tableId', {
        type: 'manual',
        message: 'Please select a table',
      });
      return;
    }

    // Validate startTime format
    if (!data.startTime || !data.startTime.includes('T')) {
      setError('startTime', {
        type: 'manual',
        message: 'Please enter a valid start time',
      });
      return;
    }

    // Parse the local datetime string (YYYY-MM-DDTHH:mm format)
    // This is in local time, so we need to create a Date object that preserves the date
    // The datetime-local input provides the date/time in local timezone
    const [datePart, timePart] = data.startTime.split('T');
    if (!datePart || !timePart) {
      setError('startTime', {
        type: 'manual',
        message: 'Invalid date/time format',
      });
      return;
    }

    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);

    // Validate parsed values
    if (
      isNaN(year) ||
      isNaN(month) ||
      isNaN(day) ||
      isNaN(hours) ||
      isNaN(minutes)
    ) {
      setError('startTime', {
        type: 'manual',
        message: 'Invalid date/time values',
      });
      return;
    }

    // Create a Date object in local timezone
    // This ensures the date is preserved correctly
    const start = new Date(year, month - 1, day, hours, minutes);

    // Validate the date object
    if (isNaN(start.getTime())) {
      setError('startTime', {
        type: 'manual',
        message: 'Invalid date/time',
      });
      return;
    }

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
      // Show conflict resolution dialog instead of just an error
      setConflictReservation(reservationData);
      setConflictTable(selectedTable);
      setConflictReason(conflict.reason);
      setShowConflictDialog(true);
      return;
    }

    if (reservationId) {
      updateReservation(reservationId, reservationData);
    } else {
      addReservation(reservationData);
    }

    onClose();
  };

  const handleConflictResolve = (resolvedReservation: Reservation) => {
    if (reservationId) {
      updateReservation(reservationId, resolvedReservation);
    } else {
      addReservation(resolvedReservation);
    }
    setShowConflictDialog(false);
    setConflictReservation(null);
    setConflictTable(null);
    setConflictReason(undefined);
    onClose();
  };

  const handleConflictOverride = () => {
    if (!conflictReservation) return;

    // Prevent override for service hours conflicts
    if (conflictReason === 'outside_service_hours') {
      return;
    }

    if (reservationId) {
      updateReservation(reservationId, conflictReservation);
    } else {
      addReservation(conflictReservation);
    }
    setShowConflictDialog(false);
    setConflictReservation(null);
    setConflictTable(null);
    setConflictReason(undefined);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {reservationId ? 'Edit Reservation' : 'Create Reservation'}
            </DialogTitle>
            <DialogDescription>
              {reservationId
                ? 'Update the reservation details below.'
                : 'Fill in the details to create a new reservation.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">
                  Customer Name <span className="text-red-500">*</span>
                </Label>
                <Input id="customerName" {...register('customerName')} />
                {errors.customerName && (
                  <p className="text-sm text-destructive">
                    {errors.customerName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input id="phone" type="tel" {...register('phone')} />
                {errors.phone && (
                  <p className="text-sm text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
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
                  <p className="text-sm text-destructive">
                    {errors.partySize.message}
                  </p>
                )}
                {selectedTable && (
                  <p className="text-xs text-muted-foreground">
                    Table capacity: {selectedTable.capacity.min}-
                    {selectedTable.capacity.max} seats
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="table">
                    Table <span className="text-red-500">*</span>
                  </Label>
                  {!reservationId && startTime && partySize && duration && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log('Table suggestions:', {
                          count: tableSuggestions.length,
                          suggestions: tableSuggestions,
                          partySize,
                          startTime,
                          duration,
                          tablesCount: tables.length,
                          sectorsCount: sectors.length,
                        });
                        setShowTableSuggestions(!showTableSuggestions);
                        setShowNextAvailable(false);
                      }}
                      className="text-xs"
                    >
                      {showTableSuggestions ? 'Hide' : 'Show'} Suggestions
                      {tableSuggestions.length > 0 &&
                        ` (${tableSuggestions.length})`}
                    </Button>
                  )}
                </div>
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
                        {table.name} ({table.capacity.min}-{table.capacity.max}{' '}
                        seats)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tableId && (
                  <p className="text-sm text-destructive">
                    {errors.tableId.message}
                  </p>
                )}
                {showTableSuggestions && !reservationId && (
                  <div className="mt-2">
                    <TableSuggestions
                      suggestions={tableSuggestions}
                      onSelectTable={handleSelectSuggestedTable}
                      selectedTableId={tableId}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="startTime">
                    Start Time <span className="text-red-500">*</span>
                  </Label>
                  {!reservationId && startTime && partySize && duration && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleFindNextAvailable}
                      className="text-xs"
                    >
                      Find Next Available
                    </Button>
                  )}
                </div>
                <Input
                  id="startTime"
                  type="datetime-local"
                  min={(() => {
                    // Set minimum to today at 00:00
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}T00:00`;
                  })()}
                  {...register('startTime', {
                    onChange: (e) => {
                      // Close the calendar popup by blurring the input after a short delay
                      // This allows the value to be set first
                      setTimeout(() => {
                        const input = document.getElementById('startTime') as HTMLInputElement;
                        if (input) {
                          input.blur();
                        }
                      }, 100);
                    },
                  })}
                  onBlur={() => {
                    // Ensure calendar closes on blur
                    const input = document.getElementById('startTime') as HTMLInputElement;
                    if (input) {
                      input.blur();
                    }
                  }}
                />
                {errors.startTime && (
                  <p className="text-sm text-destructive">
                    {errors.startTime.message}
                  </p>
                )}
                {showNextAvailable && !reservationId && (
                  <div className="mt-2">
                    <NextAvailableSlots
                      slots={nextAvailableSlots}
                      onSelectSlot={handleSelectNextAvailableSlot}
                      selectedStartTime={startTime}
                    />
                  </div>
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
                  {...register('duration', {
                    valueAsNumber: true,
                    setValueAs: (value) => {
                      if (
                        value === '' ||
                        value === null ||
                        value === undefined
                      ) {
                        return undefined;
                      }
                      const num = Number(value);
                      return isNaN(num) || num <= 0 ? undefined : num;
                    },
                  })}
                  value={
                    typeof durationRaw === 'number' && !isNaN(durationRaw)
                      ? durationRaw
                      : ''
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setValue('duration', undefined as any);
                    } else {
                      const num = Number(value);
                      if (!isNaN(num) && num > 0) {
                        setValue('duration', num);
                      }
                    }
                  }}
                />
                {errors.duration && (
                  <p className="text-sm text-destructive">
                    {errors.duration.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value) =>
                    setValue('status', value as ReservationFormData['status'])
                  }
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
                  <p className="text-sm text-destructive">
                    {errors.status.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={watch('priority')}
                  onValueChange={(value) =>
                    setValue(
                      'priority',
                      value as ReservationFormData['priority'],
                    )
                  }
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
                  <p className="text-sm text-destructive">
                    {errors.priority.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register('notes')} rows={3} />
              {errors.notes && (
                <p className="text-sm text-destructive">
                  {errors.notes.message}
                </p>
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

      {showConflictDialog && conflictReservation && conflictTable && (
        <ConflictResolutionDialog
          allReservations={reservations.filter((r) => r.id !== reservationId)}
          allTables={tables}
          conflictReason={conflictReason}
          currentTable={conflictTable}
          isOpen={showConflictDialog}
          onClose={() => {
            setShowConflictDialog(false);
            setConflictReservation(null);
            setConflictTable(null);
            setConflictReason(undefined);
          }}
          onOverride={handleConflictOverride}
          onResolve={handleConflictResolve}
          reservation={conflictReservation}
        />
      )}
    </>
  );
}
