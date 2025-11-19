'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { useStore } from '@/store/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { RESERVATION_STATUS_COLORS } from '@/lib/constants/TIMELINE';
import type { ReservationStatus } from '@/lib/types/Reservation';

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5];
const ZOOM_LABELS: Record<number, string> = {
  0.5: '50%',
  0.75: '75%',
  1: '100%',
  1.25: '125%',
  1.5: '150%',
};

export function TimelineToolbar() {
  const {
    config,
    sectors,
    zoom,
    selectedSectors,
    selectedStatuses,
    searchQuery,
    setConfig,
    setZoom,
    setSelectedSectors,
    setSelectedStatuses,
    setSearchQuery,
  } = useStore();

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  // Initialize with placeholder to match server render
  const [mountedDate, setMountedDate] = useState('2000-01-01');

  // Only render formatted date on client to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
    // Update mounted date after hydration to match current config
    // This ensures server and client render the same initial value
    setMountedDate(config.date);
  }, [config.date]);

  // Sync mountedDate when config.date changes (but only after mount)
  useEffect(() => {
    if (isClient) {
      setMountedDate(config.date);
    }
  }, [config.date, isClient]);

  // Parse date string to Date object, handling timezone correctly
  const currentDate = useMemo(() => {
    const [year, month, day] = mountedDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, [mountedDate]);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setConfig({ date: format(date, 'yyyy-MM-dd') });
      setIsDatePickerOpen(false);
    }
  };

  const handlePreviousDay = () => {
    const newDate = subDays(currentDate, 1);
    setConfig({ date: format(newDate, 'yyyy-MM-dd') });
  };

  const handleNextDay = () => {
    const newDate = addDays(currentDate, 1);
    setConfig({ date: format(newDate, 'yyyy-MM-dd') });
  };

  const handleToday = () => {
    setConfig({ date: format(new Date(), 'yyyy-MM-dd') });
  };

  const toggleSector = (sectorId: string) => {
    if (selectedSectors.includes(sectorId)) {
      setSelectedSectors(selectedSectors.filter((id) => id !== sectorId));
    } else {
      setSelectedSectors([...selectedSectors, sectorId]);
    }
  };

  const toggleStatus = (status: ReservationStatus) => {
    if (selectedStatuses.includes(status)) {
      setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  const clearFilters = () => {
    setSelectedSectors([]);
    setSelectedStatuses([]);
    setSearchQuery('');
  };

  const activeFilterCount =
    selectedSectors.length + selectedStatuses.length + (searchQuery ? 1 : 0);

  const allStatuses: ReservationStatus[] = [
    'PENDING',
    'CONFIRMED',
    'SEATED',
    'FINISHED',
    'NO_SHOW',
    'CANCELLED',
  ];

  return (
    <div className="border-b bg-white sticky top-0 z-30 shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePreviousDay}
              size="sm"
              variant="outline"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-[200px] justify-start text-left font-normal"
                >
                  {isClient ? format(currentDate, 'PPP') : mountedDate}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={handleDateChange}
                  initialFocus
                />
                <div className="p-3 border-t">
                  <Button
                    onClick={handleToday}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Today
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              onClick={handleNextDay}
              size="sm"
              variant="outline"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleToday}
              size="sm"
              variant="outline"
              aria-label="Today"
            >
              Today
            </Button>
          </div>

          {/* Sector Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Sectors
                {selectedSectors.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedSectors.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <div className="space-y-2">
                <div className="font-semibold text-sm mb-2">
                  Filter by Sector
                </div>
                {sectors.map((sector) => (
                  <label
                    key={sector.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSectors.includes(sector.id)}
                      onChange={() => toggleSector(sector.id)}
                      className="rounded border-gray-300"
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: sector.color }}
                    />
                    <span className="text-sm">{sector.name}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Status
                {selectedStatuses.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedStatuses.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <div className="space-y-2">
                <div className="font-semibold text-sm mb-2">
                  Filter by Status
                </div>
                {allStatuses.map((status) => (
                  <label
                    key={status}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status)}
                      onChange={() => toggleStatus(status)}
                      className="rounded border-gray-300"
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          RESERVATION_STATUS_COLORS[status] || '#9CA3AF',
                      }}
                    />
                    <span className="text-sm">{status}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button
              onClick={() => {
                const currentIndex = ZOOM_LEVELS.indexOf(zoom);
                if (currentIndex > 0) {
                  setZoom(ZOOM_LEVELS[currentIndex - 1]);
                }
              }}
              size="sm"
              variant="outline"
              disabled={zoom === ZOOM_LEVELS[0]}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Select
              value={zoom.toString()}
              onValueChange={(value) => setZoom(parseFloat(value))}
            >
              <SelectTrigger className="w-[80px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZOOM_LEVELS.map((level) => (
                  <SelectItem key={level} value={level.toString()}>
                    {ZOOM_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                const currentIndex = ZOOM_LEVELS.indexOf(zoom);
                if (currentIndex < ZOOM_LEVELS.length - 1) {
                  setZoom(ZOOM_LEVELS[currentIndex + 1]);
                }
              }}
              size="sm"
              variant="outline"
              disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Active Filters Indicator */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
              </Badge>
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                className="h-7"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
