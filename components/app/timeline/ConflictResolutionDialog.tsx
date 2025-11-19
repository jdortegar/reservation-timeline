'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  findAlternativeTables,
  findAlternativeTimes,
  type AlternativeTable,
  type AlternativeTime,
} from '@/lib/helpers/conflictResolution';
import type { Reservation, Table } from '@/lib/types/Reservation';
import { formatTimeRange } from '@/lib/helpers/time';

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation;
  currentTable: Table;
  allTables: Table[];
  allReservations: Reservation[];
  onResolve: (resolvedReservation: Reservation) => void;
  onOverride: () => void;
  conflictReason?: 'overlap' | 'capacity_exceeded' | 'outside_service_hours';
}

export function ConflictResolutionDialog({
  isOpen,
  onClose,
  reservation,
  currentTable,
  allTables,
  allReservations,
  onResolve,
  onOverride,
  conflictReason,
}: ConflictResolutionDialogProps) {
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);

  // Only show alternatives for overlap conflicts
  const showAlternatives = conflictReason === 'overlap';

  const alternativeTables = showAlternatives
    ? findAlternativeTables(
        reservation,
        allTables,
        allReservations,
        currentTable.id,
      )
    : [];

  const alternativeTimes = showAlternatives
    ? findAlternativeTimes(reservation, allReservations, currentTable)
    : [];

  const handleSelectTable = (table: Table) => {
    const resolvedReservation: Reservation = {
      ...reservation,
      tableId: table.id,
    };
    onResolve(resolvedReservation);
    onClose();
  };

  const handleSelectTime = (alternative: AlternativeTime) => {
    const resolvedReservation: Reservation = {
      ...reservation,
      startTime: alternative.startTime,
      endTime: alternative.endTime,
    };
    onResolve(resolvedReservation);
    onClose();
  };

  const handleOverride = () => {
    if (!showOverrideConfirm) {
      setShowOverrideConfirm(true);
      return;
    }
    onOverride();
    onClose();
  };

  const getConflictMessage = () => {
    switch (conflictReason) {
      case 'overlap':
        return 'This reservation overlaps with another reservation on the same table.';
      case 'capacity_exceeded':
        return `Party size (${reservation.partySize}) must be between ${currentTable.capacity.min} and ${currentTable.capacity.max} guests for this table.`;
      case 'outside_service_hours':
        return 'This reservation is outside service hours.';
      default:
        return 'A conflict has been detected.';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conflict Detected</DialogTitle>
          <DialogDescription>{getConflictMessage()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Alternative Tables */}
          {showAlternatives && alternativeTables.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Alternative Tables ({alternativeTables.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alternativeTables.map((alt) => (
                  <div
                    key={alt.table.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{alt.table.name}</span>
                        {!alt.hasConflict && (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            Available
                          </Badge>
                        )}
                        {alt.hasConflict && (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200"
                          >
                            Has Conflict
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Capacity: {alt.table.capacity.min} -{' '}
                        {alt.table.capacity.max} guests
                      </div>
                    </div>
                    {!alt.hasConflict && (
                      <Button
                        onClick={() => handleSelectTable(alt.table)}
                        size="sm"
                        variant="outline"
                      >
                        Use This Table
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alternative Times */}
          {showAlternatives && alternativeTimes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Alternative Times ({alternativeTimes.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {alternativeTimes.map((alt, index) => {
                  const startTime = parseISO(alt.startTime);
                  const endTime = parseISO(alt.endTime);
                  const timeRange = formatTimeRange(startTime, endTime);
                  const offsetLabel =
                    alt.offsetMinutes > 0
                      ? `+${alt.offsetMinutes} min`
                      : `${alt.offsetMinutes} min`;

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{timeRange}</span>
                          <span className="text-xs text-gray-500">
                            ({offsetLabel})
                          </span>
                          {!alt.hasConflict && (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              Available
                            </Badge>
                          )}
                          {alt.hasConflict && (
                            <Badge
                              variant="outline"
                              className="bg-red-50 text-red-700 border-red-200"
                            >
                              Has Conflict
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!alt.hasConflict && (
                        <Button
                          onClick={() => handleSelectTime(alt)}
                          size="sm"
                          variant="outline"
                        >
                          Use This Time
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No alternatives message */}
          {showAlternatives &&
            alternativeTables.length === 0 &&
            alternativeTimes.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p>No alternative tables or times found.</p>
              </div>
            )}

          {/* Manual Override - Disabled for service hours conflicts */}
          {conflictReason !== 'outside_service_hours' && (
            <div className="border-t pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold mb-1">
                    Manual Override
                  </h3>
                  <p className="text-xs text-gray-500">
                    {showOverrideConfirm
                      ? 'Are you sure you want to proceed with this reservation despite the conflict?'
                      : 'Proceed with the reservation despite the conflict.'}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  {showOverrideConfirm && (
                    <Button
                      onClick={() => setShowOverrideConfirm(false)}
                      size="sm"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    onClick={handleOverride}
                    size="sm"
                    variant={showOverrideConfirm ? 'destructive' : 'outline'}
                  >
                    {showOverrideConfirm ? 'Confirm Override' : 'Override'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Service hours conflict - no override allowed */}
          {conflictReason === 'outside_service_hours' && (
            <div className="border-t pt-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium">
                  Reservations cannot be created outside service hours (11:00 -
                  00:00).
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Please select a time within the restaurant's operating hours.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
