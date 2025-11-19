import { useMemo, useCallback } from 'react';
import type { Sector, Table } from '@/lib/types/Reservation';

export type VirtualItem =
  | { type: 'sector'; sector: Sector; groupIndex: number }
  | {
      type: 'table';
      table: Table;
      groupIndex: number;
      tableIndex: number;
      absoluteIndex: number;
    };

interface GroupedTable {
  sector: Sector | null;
  tables: Table[];
}

interface UseVirtualItemsProps {
  groupedTables: GroupedTable[];
  collapsedSectors: string[];
  selectedSectors: string[];
}

export function useVirtualItems({
  groupedTables,
  collapsedSectors,
  selectedSectors,
}: UseVirtualItemsProps) {
  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = [];
    let absoluteTableIndex = 0;

    groupedTables.forEach((group, groupIndex) => {
      const isCollapsed =
        group.sector && collapsedSectors.includes(group.sector.id);

      // Add sector header if it exists
      if (group.sector) {
        items.push({
          type: 'sector',
          sector: group.sector,
          groupIndex,
        });
      }

      // Add table rows if not collapsed
      if (!isCollapsed) {
        group.tables.forEach((table, tableIndex) => {
          // Filter by selected sectors
          if (
            selectedSectors.length === 0 ||
            selectedSectors.includes(table.sectorId)
          ) {
            items.push({
              type: 'table',
              table,
              groupIndex,
              tableIndex,
              absoluteIndex: absoluteTableIndex++,
            });
          }
        });
      }
    });

    return items;
  }, [groupedTables, collapsedSectors, selectedSectors]);

  // Calculate row height function for virtual list
  const getRowHeight = useCallback(
    (index: number) => {
      const item = virtualItems[index];
      if (!item) return 60;
      return item.type === 'sector' ? 40 : 60; // Sector header: 40px, Table row: 60px
    },
    [virtualItems],
  );

  // Calculate total height for virtual list
  const totalHeight = useMemo(() => {
    return virtualItems.reduce((sum, item) => {
      return sum + (item.type === 'sector' ? 40 : 60);
    }, 0);
  }, [virtualItems]);

  return {
    virtualItems,
    getRowHeight,
    totalHeight,
  };
}

