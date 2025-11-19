'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Check } from 'lucide-react';
import { format } from 'date-fns';
import type { NextAvailableSlot } from '@/lib/helpers/tableSuggestions';

interface NextAvailableSlotsProps {
  slots: NextAvailableSlot[];
  onSelectSlot: (slot: NextAvailableSlot) => void;
  selectedStartTime?: string;
}

export function NextAvailableSlots({
  slots,
  onSelectSlot,
  selectedStartTime,
}: NextAvailableSlotsProps) {
  if (slots.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-md">
        No available time slots found in the search windows.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Clock className="h-4 w-4 text-green-500" />
        <span>Available Time Slots</span>
        <Badge variant="secondary" className="ml-auto">
          {slots.length > 0 && !isNaN(slots.length)
            ? `${slots.length} options`
            : '0 options'}
        </Badge>
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {slots.map((slot, index) => {
          const startTime = new Date(slot.startTime);
          const endTime = new Date(slot.endTime);
          const isSelected = slot.startTime === selectedStartTime;

          return (
            <button
              key={`${slot.table.id}-${slot.startTime}`}
              type="button"
              onClick={() => onSelectSlot(slot)}
              className={`w-full text-left p-3 rounded-md border transition-colors ${
                isSelected
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {slot.table.name} ({slot.table.capacity.min}-
                    {slot.table.capacity.max} seats)
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <Badge variant="outline" className="text-xs">
                      {slot.window}
                    </Badge>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
