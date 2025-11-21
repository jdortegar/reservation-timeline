'use client';

import { useEffect, useState, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useStore } from '@/store/store';
import { TimelineGrid } from './TimelineGrid';
import { TimelineToolbar } from './TimelineToolbar';
import { ReservationModal } from './ReservationModal';
import { CSVImportModal } from './CSVImportModal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { LiveRegion } from './LiveRegion';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import type { Sector, Table, Reservation } from '@/lib/types/Reservation';
import {
  SEED_SECTORS,
  SEED_TABLES,
  generateSeedReservations,
} from '@/lib/data/seedData';

export function TimelineView() {
  const { config, setSectors, setTables, setReservations, setConfig } =
    useStore();
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    tableId?: string;
    startTime?: string;
    duration?: number;
    reservationId?: string;
  }>({ isOpen: false });
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Keyboard shortcut to open shortcuts modal
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      if (e.key === '?') {
        setIsShortcutsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    // Only run on client to avoid hydration mismatch
    if (typeof window === 'undefined') return;

    setSectors(SEED_SECTORS);
    setTables(SEED_TABLES);

    // Initialize config with current date/timezone on client mount
    // Use a small delay to ensure hydration completes first
    const initConfig = () => {
      const today = new Date().toISOString().split('T')[0];
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Update config if it's still using placeholder values
      if (config.date === '2000-01-01' || config.timezone === 'UTC') {
        setConfig({ date: today, timezone });
      }
    };

    // Use requestAnimationFrame to ensure this runs after initial render
    requestAnimationFrame(initConfig);

    // Use seed data, adjusting dates to match current config date
    const today =
      config.date === '2000-01-01'
        ? new Date().toISOString().split('T')[0]
        : config.date;
    const seedDate = new Date(today);
    const reservations = generateSeedReservations(seedDate).map((r) => {
      // Ensure dates match the config date
      const startDate = new Date(r.startTime);
      const endDate = new Date(r.endTime);
      const dateStr = today;
      startDate.setFullYear(
        parseInt(dateStr.split('-')[0]),
        parseInt(dateStr.split('-')[1]) - 1,
        parseInt(dateStr.split('-')[2]),
      );
      endDate.setFullYear(
        parseInt(dateStr.split('-')[0]),
        parseInt(dateStr.split('-')[1]) - 1,
        parseInt(dateStr.split('-')[2]),
      );
      return {
        ...r,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };
    });
    setReservations(reservations);
  }, [setSectors, setTables, setReservations, setConfig]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="flex flex-col h-full"
        data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
      >
        <TimelineToolbar
          gridContainerRef={gridContainerRef}
          onImportCSV={() => setIsCSVImportOpen(true)}
        />
        <div className="flex-1 overflow-hidden">
          <TimelineGrid
            gridContainerRef={gridContainerRef}
            onOpenModal={(tableId, startTime, duration, reservationId) => {
              setModalState({
                isOpen: true,
                tableId,
                startTime,
                duration,
                reservationId,
              });
            }}
          />
        </div>
      </div>
      <ReservationModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false })}
        initialTableId={modalState.tableId}
        initialStartTime={modalState.startTime}
        initialDuration={modalState.duration}
        reservationId={modalState.reservationId}
      />
      <CSVImportModal
        isOpen={isCSVImportOpen}
        onClose={() => setIsCSVImportOpen(false)}
      />
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </DndProvider>
  );
}
