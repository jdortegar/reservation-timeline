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
  setConfig: (config: Partial<TimelineConfig>) => void;
  setSectors: (sectors: Sector[]) => void;
  setTables: (tables: Table[]) => void;
  setReservations: (reservations: Reservation[]) => void;
  addReservation: (reservation: Reservation) => void;
  updateReservation: (id: UUID, updates: Partial<Reservation>) => void;
  deleteReservation: (id: UUID) => void;
  selectReservation: (id: UUID, multi?: boolean) => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setSelectedSectors: (sectorIds: UUID[]) => void;
  setSelectedStatuses: (statuses: string[]) => void;
  setSearchQuery: (query: string) => void;
  toggleSectorCollapse: (sectorId: UUID) => void;
}

export const createTimelineSlice: StateCreator<TimelineState> = (set) => ({
  config: {
    date: new Date().toISOString().split('T')[0],
    startHour: 11,
    endHour: 24,
    slotMinutes: 15,
    viewMode: 'day',
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
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      ),
    })),
  deleteReservation: (id) =>
    set((state) => ({
      reservations: state.reservations.filter((r) => r.id !== id),
      selectedReservationIds: state.selectedReservationIds.filter((sid) => sid !== id),
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
});

