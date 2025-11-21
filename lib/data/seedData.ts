import type { Reservation, Table, Sector } from '@/lib/types/Reservation';
import { addMinutes, format } from 'date-fns';

/**
 * Seed Data for Reservation Timeline
 *
 * Contains 50+ realistic reservations for demonstration and testing.
 * Includes various statuses, priorities, party sizes, and time slots.
 */

export const SEED_SECTORS: Sector[] = [
  { id: 'S1', name: 'Main Hall', color: '#3B82F6', sortOrder: 0 },
  { id: 'S2', name: 'Terrace', color: '#10B981', sortOrder: 1 },
  { id: 'S3', name: 'Private Room', color: '#8B5CF6', sortOrder: 2 },
];

export const SEED_TABLES: Table[] = [
  // Main Hall
  {
    id: 'T1',
    sectorId: 'S1',
    name: 'Table 1',
    capacity: { min: 2, max: 2 },
    sortOrder: 0,
  },
  {
    id: 'T2',
    sectorId: 'S1',
    name: 'Table 2',
    capacity: { min: 2, max: 4 },
    sortOrder: 1,
  },
  {
    id: 'T3',
    sectorId: 'S1',
    name: 'Table 3',
    capacity: { min: 4, max: 6 },
    sortOrder: 2,
  },
  {
    id: 'T4',
    sectorId: 'S1',
    name: 'Table 4',
    capacity: { min: 2, max: 4 },
    sortOrder: 3,
  },
  {
    id: 'T5',
    sectorId: 'S1',
    name: 'Table 5',
    capacity: { min: 4, max: 6 },
    sortOrder: 4,
  },
  {
    id: 'T6',
    sectorId: 'S1',
    name: 'Table 6',
    capacity: { min: 2, max: 4 },
    sortOrder: 5,
  },
  {
    id: 'T7',
    sectorId: 'S1',
    name: 'Table 7',
    capacity: { min: 6, max: 8 },
    sortOrder: 6,
  },
  {
    id: 'T8',
    sectorId: 'S1',
    name: 'Table 8',
    capacity: { min: 2, max: 4 },
    sortOrder: 7,
  },
  // Terrace
  {
    id: 'T9',
    sectorId: 'S2',
    name: 'Table 9',
    capacity: { min: 2, max: 4 },
    sortOrder: 0,
  },
  {
    id: 'T10',
    sectorId: 'S2',
    name: 'Table 10',
    capacity: { min: 4, max: 6 },
    sortOrder: 1,
  },
  {
    id: 'T11',
    sectorId: 'S2',
    name: 'Table 11',
    capacity: { min: 2, max: 4 },
    sortOrder: 2,
  },
  {
    id: 'T12',
    sectorId: 'S2',
    name: 'Table 12',
    capacity: { min: 4, max: 8 },
    sortOrder: 3,
  },
  // Private Room
  {
    id: 'T13',
    sectorId: 'S3',
    name: 'Private Room A',
    capacity: { min: 8, max: 12 },
    sortOrder: 0,
  },
  {
    id: 'T14',
    sectorId: 'S3',
    name: 'Private Room B',
    capacity: { min: 6, max: 10 },
    sortOrder: 1,
  },
];

const CUSTOMER_NAMES = [
  'John Doe',
  'Jane Smith',
  'Michael Johnson',
  'Sarah Brown',
  'Robert Taylor',
  'Emily Davis',
  'David Wilson',
  'Lisa Anderson',
  'James Martinez',
  'Patricia Garcia',
  'William Rodriguez',
  'Jennifer Lee',
  'Richard White',
  'Maria Harris',
  'Joseph Clark',
  'Elizabeth Lewis',
  'Thomas Walker',
  'Jessica Hall',
  'Charles Young',
  'Susan King',
  'Daniel Wright',
  'Karen Lopez',
  'Matthew Hill',
  'Nancy Scott',
  'Anthony Green',
  'Betty Adams',
  'Mark Baker',
  'Dorothy Gonzalez',
  'Donald Nelson',
  'Sandra Carter',
  'Steven Mitchell',
  'Ashley Perez',
  'Paul Roberts',
  'Kimberly Turner',
  'Andrew Phillips',
  'Donna Campbell',
  'Joshua Parker',
  'Michelle Evans',
  'Kenneth Edwards',
  'Carol Collins',
  'Kevin Stewart',
  'Amanda Sanchez',
  'Brian Morris',
  'Melissa Rogers',
  'George Reed',
  'Deborah Cook',
  'Edward Morgan',
  'Stephanie Bell',
  'Ronald Murphy',
  'Rebecca Bailey',
];

const PHONE_PREFIXES = ['+1 555', '+54 9 11', '+54 9 15', '+1 212', '+1 310'];
const EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'example.com',
  'company.com',
];

function generatePhone(): string {
  const prefix =
    PHONE_PREFIXES[Math.floor(Math.random() * PHONE_PREFIXES.length)];
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${number}`;
}

function generateEmail(name: string): string {
  const domain =
    EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];
  const cleanName = name.toLowerCase().replace(/\s+/g, '.');
  return `${cleanName}@${domain}`;
}

function createReservation(
  id: string,
  tableId: string,
  customerName: string,
  partySize: number,
  startTime: Date,
  durationMinutes: number,
  status: Reservation['status'],
  priority: Reservation['priority'] = 'STANDARD',
  notes?: string,
): Reservation {
  const endTime = addMinutes(startTime, durationMinutes);
  const now = new Date();
  const createdAt = new Date(
    now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000,
  ); // Random time in last week

  return {
    id,
    tableId,
    customer: {
      name: customerName,
      phone: generatePhone(),
      email: Math.random() > 0.3 ? generateEmail(customerName) : undefined,
      notes: Math.random() > 0.7 ? notes : undefined,
    },
    partySize,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationMinutes,
    status,
    priority,
    notes,
    source: ['web', 'phone', 'app', 'walk-in'][Math.floor(Math.random() * 4)],
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
  };
}

/**
 * Generates seed reservations for a given date
 */
export function generateSeedReservations(date: Date): Reservation[] {
  const reservations: Reservation[] = [];
  let reservationId = 1;
  let customerIndex = 0;

  // Helper to get next customer name
  const getCustomer = () => {
    const name = CUSTOMER_NAMES[customerIndex % CUSTOMER_NAMES.length];
    customerIndex++;
    return name;
  };

  // Helper to create time
  const createTime = (hour: number, minute: number = 0) => {
    const time = new Date(date);
    time.setHours(hour, minute, 0, 0);
    return time;
  };

  // Morning/Afternoon reservations (11:00 - 15:00)
  reservations.push(
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T2',
      getCustomer(),
      2,
      createTime(11, 30),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T4',
      getCustomer(),
      3,
      createTime(12, 0),
      60,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T6',
      getCustomer(),
      2,
      createTime(12, 30),
      90,
      'SEATED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T9',
      getCustomer(),
      4,
      createTime(13, 0),
      120,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T3',
      getCustomer(),
      5,
      createTime(13, 30),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T11',
      getCustomer(),
      2,
      createTime(14, 0),
      60,
      'FINISHED',
    ),
  );

  // Early evening (17:00 - 19:00)
  reservations.push(
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T1',
      getCustomer(),
      2,
      createTime(17, 0),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T5',
      getCustomer(),
      6,
      createTime(17, 30),
      120,
      'CONFIRMED',
      'LARGE_GROUP',
      'Birthday party',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T10',
      getCustomer(),
      4,
      createTime(18, 0),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T2',
      getCustomer(),
      3,
      createTime(18, 0),
      90,
      'PENDING',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T7',
      getCustomer(),
      8,
      createTime(18, 30),
      120,
      'CONFIRMED',
      'LARGE_GROUP',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T12',
      getCustomer(),
      5,
      createTime(18, 30),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T13',
      getCustomer(),
      10,
      createTime(18, 0),
      180,
      'CONFIRMED',
      'LARGE_GROUP',
      'Corporate event',
    ),
  );

  // Prime time (19:00 - 21:00)
  reservations.push(
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T1',
      getCustomer(),
      2,
      createTime(19, 0),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T3',
      getCustomer(),
      6,
      createTime(19, 0),
      90,
      'CONFIRMED',
      'VIP',
      'Anniversary dinner',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T4',
      getCustomer(),
      3,
      createTime(19, 30),
      90,
      'SEATED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T6',
      getCustomer(),
      2,
      createTime(19, 30),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T8',
      getCustomer(),
      4,
      createTime(19, 30),
      90,
      'PENDING',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T9',
      getCustomer(),
      2,
      createTime(20, 0),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T11',
      getCustomer(),
      3,
      createTime(20, 0),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T2',
      getCustomer(),
      4,
      createTime(20, 0),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T5',
      getCustomer(),
      5,
      createTime(20, 30),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T10',
      getCustomer(),
      4,
      createTime(20, 30),
      90,
      'SEATED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T14',
      getCustomer(),
      8,
      createTime(19, 0),
      180,
      'CONFIRMED',
      'VIP',
      'Private celebration',
    ),
  );

  // Late evening (21:00 - 23:00)
  reservations.push(
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T1',
      getCustomer(),
      2,
      createTime(21, 0),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T4',
      getCustomer(),
      3,
      createTime(21, 0),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T6',
      getCustomer(),
      2,
      createTime(21, 30),
      90,
      'PENDING',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T9',
      getCustomer(),
      4,
      createTime(21, 30),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T3',
      getCustomer(),
      5,
      createTime(22, 0),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T11',
      getCustomer(),
      2,
      createTime(22, 0),
      60,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T2',
      getCustomer(),
      3,
      createTime(22, 30),
      90,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T8',
      getCustomer(),
      2,
      createTime(22, 30),
      60,
      'CONFIRMED',
    ),
  );

  // Late night (23:00 - 00:00)
  reservations.push(
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T1',
      getCustomer(),
      2,
      createTime(23, 0),
      60,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T4',
      getCustomer(),
      3,
      createTime(23, 0),
      60,
      'CONFIRMED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T9',
      getCustomer(),
      2,
      createTime(23, 30),
      30,
      'CONFIRMED',
    ),
  );

  // Add some finished/cancelled reservations for variety
  reservations.push(
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T5',
      getCustomer(),
      4,
      createTime(11, 0),
      90,
      'FINISHED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T7',
      getCustomer(),
      6,
      createTime(12, 0),
      120,
      'FINISHED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T12',
      getCustomer(),
      5,
      createTime(13, 0),
      90,
      'FINISHED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T10',
      getCustomer(),
      3,
      createTime(17, 0),
      90,
      'FINISHED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T6',
      getCustomer(),
      2,
      createTime(19, 0),
      90,
      'CANCELLED',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T11',
      getCustomer(),
      4,
      createTime(20, 0),
      90,
      'NO_SHOW',
    ),
  );

  // Add some VIP reservations
  reservations.push(
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T3',
      getCustomer(),
      4,
      createTime(19, 0),
      120,
      'CONFIRMED',
      'VIP',
      'Regular VIP customer',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T5',
      getCustomer(),
      2,
      createTime(20, 0),
      90,
      'CONFIRMED',
      'VIP',
      'Special occasion',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T10',
      getCustomer(),
      6,
      createTime(21, 0),
      120,
      'CONFIRMED',
      'VIP',
    ),
  );

  // Add some large group reservations
  reservations.push(
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T7',
      getCustomer(),
      8,
      createTime(19, 0),
      120,
      'CONFIRMED',
      'LARGE_GROUP',
      'Family reunion',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T12',
      getCustomer(),
      7,
      createTime(20, 0),
      120,
      'CONFIRMED',
      'LARGE_GROUP',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T13',
      getCustomer(),
      12,
      createTime(18, 0),
      180,
      'CONFIRMED',
      'LARGE_GROUP',
      'Company dinner',
    ),
    createReservation(
      `RES_${String(reservationId++).padStart(3, '0')}`,
      'T14',
      getCustomer(),
      10,
      createTime(19, 0),
      150,
      'CONFIRMED',
      'LARGE_GROUP',
      'Wedding party',
    ),
  );

  return reservations;
}

/**
 * Default seed reservations for today's date
 */
export const SEED_RESERVATIONS: Reservation[] = generateSeedReservations(
  new Date(),
);
