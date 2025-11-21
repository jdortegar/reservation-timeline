'use client';

import { useMemo } from 'react';
import { useStore } from '@/store/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { calculateStatistics, calculateShiftStatistics } from '@/lib/helpers/reports/calculateStatistics';
import { format, parseISO } from 'date-fns';

interface StatisticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StatisticsPanel({ isOpen, onClose }: StatisticsPanelProps) {
  const { reservations, tables, config } = useStore();

  const stats = useMemo(
    () => calculateStatistics(reservations, tables, config.date),
    [reservations, tables, config.date],
  );

  const lunchStats = useMemo(
    () => calculateShiftStatistics(reservations, tables, 'lunch'),
    [reservations, tables],
  );

  const dinnerStats = useMemo(
    () => calculateShiftStatistics(reservations, tables, 'dinner'),
    [reservations, tables],
  );

  const formattedDate = format(parseISO(`${config.date}T12:00:00`), 'EEEE, MMMM d, yyyy');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Statistics Report</DialogTitle>
          <DialogDescription>{formattedDate}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Summary Statistics */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Total Reservations</div>
                <div className="text-2xl font-bold mt-1">{stats.totalReservations}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Total Covers</div>
                <div className="text-2xl font-bold mt-1">{stats.totalCovers}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Average Party Size</div>
                <div className="text-2xl font-bold mt-1">{stats.averagePartySize}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Table Utilization</div>
                <div className="text-2xl font-bold mt-1">{stats.tableUtilization}%</div>
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Status Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="capitalize">{status.replace('_', ' ')}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Shift Breakdown */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Shift Breakdown</h3>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">Lunch (11:00 - 15:00)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Reservations</div>
                    <div className="text-xl font-bold">{lunchStats.reservations.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Covers</div>
                    <div className="text-xl font-bold">{lunchStats.totalCovers}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Avg Party Size</div>
                    <div className="text-xl font-bold">{lunchStats.averagePartySize}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Utilization</div>
                    <div className="text-xl font-bold">{lunchStats.tableUtilization}%</div>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">Dinner (18:00 - 23:00)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Reservations</div>
                    <div className="text-xl font-bold">{dinnerStats.reservations.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Covers</div>
                    <div className="text-xl font-bold">{dinnerStats.totalCovers}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Avg Party Size</div>
                    <div className="text-xl font-bold">{dinnerStats.averagePartySize}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Utilization</div>
                    <div className="text-xl font-bold">{dinnerStats.tableUtilization}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Peak Hours */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Reservations by Hour</h3>
            <div className="space-y-2">
              {Object.entries(stats.reservationsByHour)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([hour, count]) => (
                  <div key={hour} className="flex items-center gap-2">
                    <div className="w-16 text-sm text-muted-foreground">
                      {String(hour).padStart(2, '0')}:00
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-6 relative">
                      <div
                        className="bg-primary h-6 rounded-full flex items-center justify-end pr-2"
                        style={{
                          width: `${(count / Math.max(...Object.values(stats.reservationsByHour))) * 100}%`,
                        }}
                      >
                        <span className="text-xs text-primary-foreground font-semibold">
                          {count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

