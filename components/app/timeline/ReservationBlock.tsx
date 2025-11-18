'use client';

import { useState, useEffect } from 'react';
import { RESERVATION_STATUS_COLORS } from '@/lib/constants/TIMELINE';
import { formatTimeRange } from '@/lib/helpers/time';
import { parseISO } from 'date-fns';
import type { Reservation } from '@/lib/types/Reservation';
import clsx from 'clsx';

interface ReservationBlockProps {
  reservation: Reservation;
  style?: React.CSSProperties;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
}

export function ReservationBlock({
  reservation,
  style,
  isSelected,
  onSelect,
}: ReservationBlockProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const backgroundColor =
    RESERVATION_STATUS_COLORS[reservation.status] || '#9CA3AF';
  const startTime = parseISO(reservation.startTime);
  const endTime = parseISO(reservation.endTime);
  const timeRange = formatTimeRange(startTime, endTime);
  const isCancelled = reservation.status === 'CANCELLED';

  return (
    <>
      <div
        className={clsx(
          'absolute cursor-pointer rounded px-2 py-1 text-white text-xs shadow-lg border border-white/20 transition-all',
          isSelected && 'ring-2 ring-blue-500 ring-offset-1',
          isCancelled && 'opacity-60',
        )}
        style={{
          ...style,
          backgroundColor: isCancelled ? '#9CA3AF' : backgroundColor,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          backgroundImage: isCancelled
            ? 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 10px)'
            : undefined,
        }}
        onClick={onSelect}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="font-semibold truncate leading-tight">
          {reservation.customer.name}
        </div>
        <div className="text-xs opacity-95 leading-tight mt-0.5 flex items-center gap-1">
          <span>👥</span>
          <span>{reservation.partySize} guests</span>
          <span>•</span>
          <span>{timeRange}</span>
        </div>
        {reservation.priority !== 'STANDARD' && (
          <div className="text-xs font-bold mt-0.5 leading-tight">
            {reservation.priority}
          </div>
        )}
      </div>
      {showTooltip && (
        <Tooltip reservation={reservation} timeRange={timeRange} />
      )}
    </>
  );
}

function Tooltip({
  reservation,
  timeRange,
}: {
  reservation: Reservation;
  timeRange: string;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX + 10, y: e.clientY + 10 });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
          <span className="opacity-70">Phone:</span>{' '}
          {reservation.customer.phone}
        </div>
        {reservation.customer.email && (
          <div>
            <span className="opacity-70">Email:</span>{' '}
            {reservation.customer.email}
          </div>
        )}
        <div>
          <span className="opacity-70">Party Size:</span>{' '}
          {reservation.partySize} guests
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
