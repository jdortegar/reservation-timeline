import { StateCreator } from 'zustand';
import type {
  Reservation,
  Table,
  Sector,
  TimelineConfig,
  UUID,
} from '@/lib/types/Reservation';

export interface TimelineState {
  config: TimelineConfig;
  sectors: Sector[];
  tables: Table[];
  reservations: Reservation[];
  selectedReservationIds: UUID[];
  zoom: number;
  selectedSectors: UUID[];
  selectedStatuses: string[];
  searchQuery: string;
  collapsedSectors: UUID[];
  clipboard: Reservation[]; // For copy/paste
  history: Reservation[][]; // For undo/redo
  historyIndex: number;
  setConfig: (config: Partial<TimelineConfig>) => void;
  setSectors: (sectors: Sector[]) => void;
  setTables: (tables: Table[]) => void;
  setReservations: (reservations: Reservation[]) => void;
  addReservation: (reservation: Reservation) => void;
  updateReservation: (id: UUID, updates: Partial<Reservation>) => void;
  deleteReservation: (id: UUID) => void;
  deleteReservations: (ids: UUID[]) => void;
  selectReservation: (id: UUID, multi?: boolean) => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setSelectedSectors: (sectorIds: UUID[]) => void;
  setSelectedStatuses: (statuses: string[]) => void;
  setSearchQuery: (query: string) => void;
  toggleSectorCollapse: (sectorId: UUID) => void;
  copyReservations: (reservations: Reservation[]) => void;
  pasteReservations: (targetTableId?: string, targetStartTime?: string) => void;
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export const createTimelineSlice: StateCreator<TimelineState> = (set) => ({
  config: {
    date: new Date().toISOString().split('T')[0],
    startHour: 11,
    endHour: 24,
    slotMinutes: 15,
    viewMode: 'day',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Default to browser's timezone
  },
  sectors: [],
  tables: [],
  reservations: [],
  selectedReservationIds: [],
  zoom: 1,
  selectedSectors: [],
  selectedStatuses: [],
  searchQuery: '',
  collapsedSectors: [],
  clipboard: [],
  history: [],
  historyIndex: -1,
  setConfig: (config) =>
    set((state) => ({
      config: { ...state.config, ...config },
    })),
  setSectors: (sectors) => set({ sectors }),
  setTables: (tables) => set({ tables }),
  setReservations: (reservations) => set({ reservations }),
  addReservation: (reservation) =>
    set((state) => ({
      reservations: [...state.reservations, reservation],
    })),
  updateReservation: (id, updates) =>
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id
          ? { ...r, ...updates, updatedAt: new Date().toISOString() }
          : r,
      ),
    })),
  deleteReservation: (id) =>
    set((state) => ({
      reservations: state.reservations.filter((r) => r.id !== id),
      selectedReservationIds: state.selectedReservationIds.filter(
        (sid) => sid !== id,
      ),
    })),
  deleteReservations: (ids) =>
    set((state) => ({
      reservations: state.reservations.filter((r) => !ids.includes(r.id)),
      selectedReservationIds: state.selectedReservationIds.filter(
        (sid) => !ids.includes(sid),
      ),
    })),
  selectReservation: (id, multi = false) =>
    set((state) => {
      if (multi) {
        const isSelected = state.selectedReservationIds.includes(id);
        return {
          selectedReservationIds: isSelected
            ? state.selectedReservationIds.filter((sid) => sid !== id)
            : [...state.selectedReservationIds, id],
        };
      }
      return {
        selectedReservationIds: [id],
      };
    }),
  clearSelection: () => set({ selectedReservationIds: [] }),
  setZoom: (zoom) => set({ zoom }),
  setSelectedSectors: (sectorIds) => set({ selectedSectors: sectorIds }),
  setSelectedStatuses: (statuses) => set({ selectedStatuses: statuses }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleSectorCollapse: (sectorId) =>
    set((state) => ({
      collapsedSectors: state.collapsedSectors.includes(sectorId)
        ? state.collapsedSectors.filter((id) => id !== sectorId)
        : [...state.collapsedSectors, sectorId],
    })),
  copyReservations: (reservations) => set({ clipboard: reservations }),
  pasteReservations: (targetTableId, targetStartTime) =>
    set((state) => {
      if (state.clipboard.length === 0) return state;

      const now = new Date();
      const newReservations = state.clipboard.map((reservation, index) => {
        const baseTime = targetStartTime
          ? new Date(targetStartTime)
          : new Date(reservation.startTime);
        const offsetMinutes = index * 60; // Stagger pasted reservations by 1 hour
        const newStartTime = new Date(
          baseTime.getTime() + offsetMinutes * 60 * 1000,
        );
        const newEndTime = new Date(
          newStartTime.getTime() + reservation.durationMinutes * 60 * 1000,
        );

        return {
          ...reservation,
          id: `RES_${Date.now()}_${index}`,
          tableId: targetTableId || reservation.tableId,
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
      });

      return {
        reservations: [...state.reservations, ...newReservations],
        selectedReservationIds: newReservations.map((r) => r.id),
      };
    }),
  saveToHistory: () =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push([...state.reservations]);
      // Keep only last 50 history entries
      const trimmedHistory = newHistory.slice(-50);
      return {
        history: trimmedHistory,
        historyIndex: trimmedHistory.length - 1,
      };
    }),
  undo: () =>
    set((state) => {
      if (state.historyIndex > 0) {
        return {
          reservations: [...state.history[state.historyIndex - 1]],
          historyIndex: state.historyIndex - 1,
        };
      }
      return state;
    }),
  redo: () =>
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        return {
          reservations: [...state.history[state.historyIndex + 1]],
          historyIndex: state.historyIndex + 1,
        };
      }
      return state;
    }),
});
