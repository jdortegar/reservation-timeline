'use client';

import { useState, useEffect } from 'react';
import type { Reservation, Table } from '@/lib/types/Reservation';
import { getConflictMessage } from '@/lib/helpers/conflicts';

interface TooltipProps {
  initialPosition: { x: number; y: number };
  reservation: Reservation;
  timeRange: string;
}

export function ReservationTooltip({
  initialPosition,
  reservation,
  timeRange,
}: TooltipProps) {
  const [position, setPosition] = useState(initialPosition);

  useEffect(() => {
    setPosition(initialPosition);
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX + 10, y: e.clientY + 10 });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [initialPosition]);

  return (
    <div
      className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl pointer-events-none"
      style={{
        maxWidth: 250,
        left: position.x,
        top: position.y,
      }}
    >
      <div className="font-bold mb-2">{reservation.customer.name}</div>
      <div className="space-y-1">
        <div>
          <span className="opacity-70">Phone:</span> {reservation.customer.phone}
        </div>
        {reservation.customer.email && (
          <div>
            <span className="opacity-70">Email:</span> {reservation.customer.email}
          </div>
        )}
        <div>
          <span className="opacity-70">Party Size:</span> {reservation.partySize}{' '}
          guests
        </div>
        <div>
          <span className="opacity-70">Time:</span> {timeRange}
        </div>
        <div>
          <span className="opacity-70">Status:</span> {reservation.status}
        </div>
        <div>
          <span className="opacity-70">Priority:</span> {reservation.priority}
        </div>
        {reservation.notes && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <span className="opacity-70">Notes:</span> {reservation.notes}
          </div>
        )}
      </div>
    </div>
  );
}

interface ConflictTooltipProps {
  initialPosition: { x: number; y: number };
  conflictReason:
    | 'overlap'
    | 'capacity_exceeded'
    | 'outside_service_hours'
    | undefined;
  table?: Table;
}

export function ConflictTooltip({
  initialPosition,
  conflictReason,
  table,
}: ConflictTooltipProps) {
  const [position, setPosition] = useState(initialPosition);

  useEffect(() => {
    setPosition(initialPosition);
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX + 10, y: e.clientY + 10 });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [initialPosition]);

  return (
    <div
      className="fixed z-50 bg-red-600 text-white text-xs rounded-lg p-3 shadow-xl pointer-events-none border border-red-400"
      style={{
        maxWidth: 280,
        left: position.x,
        top: position.y,
      }}
    >
      <div className="font-bold mb-1 flex items-center gap-2">
        <span className="text-base">⚠</span>
        <span>Conflict Detected</span>
      </div>
      <div className="mt-2">
        {conflictReason === 'overlap' && (
          <p>
            This reservation overlaps with another reservation on the same table.
          </p>
        )}
        {conflictReason === 'capacity_exceeded' && table && (
          <p>
            Party size must be between {table.capacity.min} and{' '}
            {table.capacity.max} guests for this table.
          </p>
        )}
        {conflictReason === 'outside_service_hours' && (
          <p>This reservation is outside service hours.</p>
        )}
      </div>
    </div>
  );
}

