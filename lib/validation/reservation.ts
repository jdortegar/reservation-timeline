import { z } from 'zod';
import { TIMELINE_CONFIG } from '@/lib/constants/TIMELINE';
import type { Table } from '@/lib/types/Reservation';

export const createReservationSchema = (tables: Table[]) => {
  return z.object({
    customerName: z.string().min(1, 'Customer name is required'),
    phone: z.string().min(1, 'Phone is required'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    partySize: z.number().min(1, 'Party size must be at least 1').max(20, 'Party size cannot exceed 20'),
    tableId: z.string().min(1, 'Table selection is required'),
    startTime: z.string().min(1, 'Start time is required'),
    duration: z.number()
      .min(TIMELINE_CONFIG.MIN_DURATION_MINUTES, `Duration must be at least ${TIMELINE_CONFIG.MIN_DURATION_MINUTES} minutes`)
      .max(360, 'Duration cannot exceed 360 minutes (6 hours)'),
    status: z.enum(['PENDING', 'CONFIRMED', 'SEATED', 'FINISHED', 'NO_SHOW', 'CANCELLED']),
    priority: z.enum(['STANDARD', 'VIP', 'LARGE_GROUP']),
    notes: z.string().optional(),
  }).refine(
    (data) => {
      const table = tables.find((t) => t.id === data.tableId);
      if (!table) return true;
      return data.partySize >= table.capacity.min && data.partySize <= table.capacity.max;
    },
    {
      message: 'Party size must be within table capacity',
      path: ['partySize'],
    }
  );
};

export type ReservationFormData = z.infer<ReturnType<typeof createReservationSchema>>;

