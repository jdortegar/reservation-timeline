'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles } from 'lucide-react';
import type { TableSuggestion } from '@/lib/helpers/tableSuggestions';

interface TableSuggestionsProps {
  suggestions: TableSuggestion[];
  onSelectTable: (tableId: string) => void;
  selectedTableId?: string;
}

export function TableSuggestions({
  suggestions,
  onSelectTable,
  selectedTableId,
}: TableSuggestionsProps) {
  if (suggestions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-md">
        No available tables found for this time and party size.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-blue-500" />
        <span>Smart Suggestions</span>
        <Badge variant="secondary" className="ml-auto">
          {suggestions.length > 0 && !isNaN(suggestions.length)
            ? `${suggestions.length} options`
            : '0 options'}
        </Badge>
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {suggestions.map((suggestion, index) => {
          const isSelected = suggestion.table.id === selectedTableId;
          const isBest = index === 0;

          return (
            <button
              key={suggestion.table.id}
              type="button"
              onClick={() => onSelectTable(suggestion.table.id)}
              className={`w-full text-left p-3 rounded-md border transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {suggestion.table.name}
                    </span>
                    {isBest && (
                      <Badge variant="default" className="text-xs">
                        Best Match
                      </Badge>
                    )}
                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-500 shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {suggestion.table.capacity.min}-
                    {suggestion.table.capacity.max} seats
                    {suggestion.sector && (
                      <span className="ml-2">• {suggestion.sector.name}</span>
                    )}
                  </div>
                  {suggestion.reasons.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {suggestion.reasons[0]}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
