'use client';

import { useMemo } from 'react';
import { Crown, Sparkles, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getVIPSuggestions } from '@/lib/helpers/vipDetection';
import type { Reservation, Table } from '@/lib/types/Reservation';
import { cn } from '@/lib/utils';

interface VIPSuggestionProps {
  phone: string;
  partySize: number;
  reservations: Reservation[];
  tables: Table[];
  currentReservation?: Partial<Reservation>;
  onApplyPriority?: (priority: 'STANDARD' | 'VIP' | 'LARGE_GROUP') => void;
}

export function VIPSuggestion({
  phone,
  partySize,
  reservations,
  tables,
  currentReservation,
  onApplyPriority,
}: VIPSuggestionProps) {
  const suggestion = useMemo(() => {
    if (!phone || phone.trim().length === 0) {
      return null;
    }
    return getVIPSuggestions(
      phone,
      partySize,
      reservations,
      tables,
      currentReservation,
    );
  }, [phone, partySize, reservations, tables, currentReservation]);

  if (!suggestion || !suggestion.isVIP) {
    return null;
  }

  const confidenceColor =
    suggestion.confidence >= 70
      ? 'text-green-600'
      : suggestion.confidence >= 50
      ? 'text-yellow-600'
      : 'text-blue-600';

  const confidenceBadgeColor =
    suggestion.confidence >= 70
      ? 'bg-green-100 text-green-800 border-green-300'
      : suggestion.confidence >= 50
      ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
      : 'bg-blue-100 text-blue-800 border-blue-300';

  return (
    <Alert className="border-amber-200 bg-amber-50">
      <div className="flex items-start gap-3">
        <Crown className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-900">
                VIP Suggestion
              </span>
              <Badge
                variant="outline"
                className={cn('text-xs font-semibold', confidenceBadgeColor)}
              >
                {suggestion.confidence}% confidence
              </Badge>
            </div>
            {onApplyPriority && (
              <button
                type="button"
                onClick={() => onApplyPriority(suggestion.recommendedPriority)}
                className="text-xs text-amber-700 hover:text-amber-900 underline font-medium"
              >
                Apply {suggestion.recommendedPriority}
              </button>
            )}
          </div>
          <AlertDescription className="text-sm text-amber-800">
            <div className="space-y-1">
              <p className="font-medium">
                This customer might be a VIP based on their reservation history.
              </p>
              <div className="space-y-1">
                <p className="text-xs font-semibold mt-2">Reasons:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  {suggestion.reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-2 pt-2 border-t border-amber-200">
                <p className="text-xs">
                  <strong>Recommended Priority:</strong>{' '}
                  <span className="uppercase font-semibold">
                    {suggestion.recommendedPriority}
                  </span>
                </p>
              </div>
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
