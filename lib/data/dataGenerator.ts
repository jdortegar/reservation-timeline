import type { Reservation, Table } from '@/lib/types/Reservation';
import { addMinutes, subDays, addDays } from 'date-fns';
import { checkAllConflicts } from '@/lib/helpers/conflicts';

/**
 * Data Generator for Stress Testing
 *
 * Generates large numbers of reservations for performance testing.
 * Can generate 200+ reservations with realistic distribution.
 */

interface GeneratorOptions {
  /** Number of reservations to generate */
  count: number;
  /** Base date for reservations */
  baseDate: Date;
  /** Tables to use for reservations */
  tables: Table[];
  /** Whether to avoid conflicts (slower but more realistic) */
  avoidConflicts?: boolean;
  /** Date range in days (reservations spread across this range) */
  dateRange?: number;
  /** Minimum party size */
  minPartySize?: number;
  /** Maximum party size */
  maxPartySize?: number;
}

const FIRST_NAMES = [
  'James',
  'Mary',
  'John',
  'Patricia',
  'Robert',
  'Jennifer',
  'Michael',
  'Linda',
  'William',
  'Elizabeth',
  'David',
  'Barbara',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Charles',
  'Karen',
  'Christopher',
  'Nancy',
  'Daniel',
  'Lisa',
  'Matthew',
  'Betty',
  'Anthony',
  'Margaret',
  'Mark',
  'Sandra',
  'Donald',
  'Ashley',
  'Steven',
  'Kimberly',
  'Paul',
  'Emily',
  'Andrew',
  'Donna',
  'Joshua',
  'Michelle',
  'Kenneth',
  'Carol',
  'Kevin',
  'Amanda',
  'Brian',
  'Melissa',
  'George',
  'Deborah',
  'Edward',
  'Stephanie',
  'Ronald',
  'Rebecca',
  'Timothy',
  'Sharon',
  'Jason',
  'Laura',
  'Jeffrey',
  'Cynthia',
  'Ryan',
  'Kathleen',
  'Jacob',
  'Amy',
  'Gary',
  'Angela',
  'Nicholas',
  'Shirley',
  'Eric',
  'Anna',
  'Jonathan',
  'Brenda',
  'Stephen',
  'Pamela',
  'Larry',
  'Emma',
  'Justin',
  'Nicole',
  'Scott',
  'Helen',
  'Brandon',
  'Samantha',
  'Benjamin',
  'Katherine',
  'Samuel',
  'Christine',
  'Frank',
  'Debra',
  'Gregory',
  'Rachel',
  'Raymond',
  'Carolyn',
  'Alexander',
  'Janet',
  'Patrick',
  'Virginia',
  'Jack',
  'Maria',
  'Dennis',
  'Heather',
  'Jerry',
  'Diane',
  'Tyler',
  'Julie',
  'Aaron',
  'Joyce',
  'Jose',
  'Victoria',
  'Adam',
  'Kelly',
  'Henry',
  'Christina',
  'Nathan',
  'Joan',
  'Douglas',
  'Evelyn',
  'Zachary',
  'Lauren',
  'Peter',
  'Judith',
  'Kyle',
  'Megan',
  'Noah',
  'Cheryl',
  'Ethan',
  'Andrea',
  'Jeremy',
  'Hannah',
  'Walter',
  'Jacqueline',
  'Christian',
  'Martha',
  'Keith',
  'Gloria',
  'Roger',
  'Teresa',
  'Terry',
  'Sara',
  'Gerald',
  'Janice',
  'Harold',
  'Marie',
  'Sean',
  'Julia',
  'Austin',
  'Grace',
  'Carl',
  'Judy',
  'Arthur',
  'Theresa',
  'Lawrence',
  'Madison',
  'Dylan',
  'Beverly',
  'Jesse',
  'Denise',
  'Jordan',
  'Marilyn',
  'Bryan',
  'Amber',
  'Billy',
  'Danielle',
  'Joe',
  'Rose',
  'Bruce',
  'Brittany',
  'Gabriel',
  'Diana',
  'Logan',
  'Abigail',
  'Albert',
  'Jane',
  'Willie',
  'Lori',
  'Alan',
  'Alexis',
  'Juan',
  'Marie',
  'Wayne',
  'Olivia',
  'Roy',
  'Catherine',
  'Ralph',
  'Samantha',
  'Randy',
  'Deborah',
  'Eugene',
  'Rachel',
  'Louis',
  'Carolyn',
  'Philip',
  'Janet',
  'Johnny',
  'Virginia',
  'Bobby',
  'Maria',
  'Howard',
  'Heather',
  'Earl',
  'Diane',
  'Carlos',
  'Julie',
  'Lawrence',
  'Victoria',
  'Victor',
  'Kelly',
  'Martin',
  'Christina',
  'Ernest',
  'Joan',
];

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
  'Ramirez',
  'Lewis',
  'Robinson',
  'Walker',
  'Young',
  'Allen',
  'King',
  'Wright',
  'Scott',
  'Torres',
  'Nguyen',
  'Hill',
  'Flores',
  'Green',
  'Adams',
  'Nelson',
  'Baker',
  'Hall',
  'Rivera',
  'Campbell',
  'Mitchell',
  'Carter',
  'Roberts',
  'Gomez',
  'Phillips',
  'Evans',
  'Turner',
  'Diaz',
  'Parker',
  'Cruz',
  'Edwards',
  'Collins',
  'Reyes',
  'Stewart',
  'Morris',
  'Morales',
  'Murphy',
  'Cook',
  'Rogers',
  'Gutierrez',
  'Ortiz',
  'Morgan',
  'Cooper',
  'Peterson',
  'Bailey',
  'Reed',
  'Kelly',
  'Howard',
  'Ramos',
  'Kim',
  'Cox',
  'Ward',
  'Richardson',
  'Watson',
  'Brooks',
  'Chavez',
  'Wood',
  'James',
  'Bennett',
  'Gray',
  'Mendoza',
  'Ruiz',
  'Hughes',
  'Price',
  'Alvarez',
  'Castillo',
  'Sanders',
  'Patel',
  'Myers',
  'Long',
  'Ross',
  'Foster',
  'Jimenez',
  'Powell',
  'Jenkins',
  'Perry',
  'Russell',
  'Sullivan',
  'Bell',
  'Coleman',
  'Butler',
  'Henderson',
  'Barnes',
  'Gonzales',
  'Fisher',
  'Vasquez',
  'Simmons',
  'Romero',
  'Jordan',
  'Patterson',
  'Alexander',
  'Hamilton',
  'Graham',
  'Reynolds',
  'Griffin',
  'Wallace',
  'Moreno',
  'West',
  'Cole',
  'Hayes',
  'Bryant',
  'Herrera',
  'Gibson',
  'Ellis',
  'Tran',
  'Medina',
  'Aguilar',
  'Stevens',
  'Murray',
  'Ford',
  'Castro',
  'Marshall',
  'Owens',
  'Harrison',
  'Fernandez',
  'Mcdonald',
  'Woods',
  'Washington',
  'Kennedy',
];

const PHONE_PREFIXES = [
  '+1 555',
  '+1 212',
  '+1 310',
  '+1 415',
  '+1 617',
  '+1 646',
  '+54 9 11',
  '+54 9 15',
  '+54 9 351',
  '+54 9 341',
  '+44 20',
  '+44 7',
  '+33 1',
  '+49 30',
  '+39 02',
];

const EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'company.com',
  'business.com',
  'corp.com',
  'enterprise.com',
];

const STATUSES: Reservation['status'][] = [
  'PENDING',
  'CONFIRMED',
  'SEATED',
  'FINISHED',
  'NO_SHOW',
  'CANCELLED',
];

const PRIORITIES: Reservation['priority'][] = [
  'STANDARD',
  'VIP',
  'LARGE_GROUP',
];

const SOURCES = ['web', 'phone', 'app', 'walk-in', 'email'];

const DURATIONS = [30, 45, 60, 90, 120, 150, 180]; // minutes

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateName(): string {
  return `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}`;
}

function generatePhone(): string {
  const prefix = randomElement(PHONE_PREFIXES);
  const number = randomInt(1000, 9999);
  return `${prefix}-${number}`;
}

function generateEmail(name: string): string {
  const domain = randomElement(EMAIL_DOMAINS);
  const cleanName = name.toLowerCase().replace(/\s+/g, '.');
  const randomNum = Math.random() > 0.5 ? randomInt(1, 999) : '';
  return `${cleanName}${randomNum}@${domain}`;
}

function generateTimeSlot(
  baseDate: Date,
  dateRange: number,
): { start: Date; duration: number } {
  // Random date within range
  const daysOffset = randomInt(0, dateRange - 1);
  const date = addDays(baseDate, daysOffset - Math.floor(dateRange / 2));

  // Random hour between 11:00 and 23:30
  const hour = randomInt(11, 23);
  const minute = randomElement([0, 15, 30, 45]);
  const start = new Date(date);
  start.setHours(hour, minute, 0, 0);

  // Random duration
  const duration = randomElement(DURATIONS);

  // Ensure end time doesn't go past midnight
  const end = addMinutes(start, duration);
  if (end.getHours() === 0 && end.getMinutes() > 0) {
    // Adjust duration to end at midnight
    const maxDuration = (24 - hour) * 60 - minute;
    return { start, duration: Math.min(duration, maxDuration) };
  }

  return { start, duration };
}

function selectTable(
  tables: Table[],
  partySize: number,
  avoidConflicts: boolean,
  existingReservations: Reservation[],
  startTime: Date,
  duration: number,
): Table | null {
  // Filter tables that can accommodate party size
  const suitableTables = tables.filter(
    (table) =>
      partySize >= table.capacity.min && partySize <= table.capacity.max,
  );

  if (suitableTables.length === 0) {
    return null;
  }

  if (!avoidConflicts) {
    // Just return a random suitable table
    return randomElement(suitableTables);
  }

  // Try to find a table without conflicts
  const shuffled = [...suitableTables].sort(() => Math.random() - 0.5);

  for (const table of shuffled) {
    const testReservation: Reservation = {
      id: 'temp',
      tableId: table.id,
      customer: { name: 'Test', phone: '123' },
      partySize,
      startTime: startTime.toISOString(),
      endTime: addMinutes(startTime, duration).toISOString(),
      durationMinutes: duration,
      status: 'CONFIRMED',
      priority: 'STANDARD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const conflict = checkAllConflicts(
      testReservation,
      existingReservations,
      table,
    );

    if (!conflict.hasConflict) {
      return table;
    }
  }

  // If all tables have conflicts, return a random one anyway
  return randomElement(suitableTables);
}

/**
 * Generates a large number of reservations for stress testing
 *
 * @param options - Generator configuration options
 * @returns Array of generated reservations
 */
export function generateReservations(options: GeneratorOptions): Reservation[] {
  const {
    count,
    baseDate,
    tables,
    avoidConflicts = false,
    dateRange = 1,
    minPartySize = 2,
    maxPartySize = 12,
  } = options;

  if (tables.length === 0) {
    throw new Error('At least one table is required');
  }

  const reservations: Reservation[] = [];
  const statusDistribution = [0.1, 0.5, 0.15, 0.1, 0.05, 0.1]; // PENDING, CONFIRMED, SEATED, FINISHED, NO_SHOW, CANCELLED
  const priorityDistribution = [0.7, 0.2, 0.1]; // STANDARD, VIP, LARGE_GROUP

  for (let i = 0; i < count; i++) {
    const customerName = generateName();
    const partySize = randomInt(minPartySize, maxPartySize);
    const { start, duration } = generateTimeSlot(baseDate, dateRange);

    const table = selectTable(
      tables,
      partySize,
      avoidConflicts,
      reservations,
      start,
      duration,
    );

    if (!table) {
      // Skip if no suitable table found
      continue;
    }

    // Select status based on distribution
    const statusRand = Math.random();
    let statusIndex = 0;
    let cumulative = 0;
    for (let j = 0; j < statusDistribution.length; j++) {
      cumulative += statusDistribution[j];
      if (statusRand <= cumulative) {
        statusIndex = j;
        break;
      }
    }

    // Select priority based on distribution
    const priorityRand = Math.random();
    let priorityIndex = 0;
    cumulative = 0;
    for (let j = 0; j < priorityDistribution.length; j++) {
      cumulative += priorityDistribution[j];
      if (priorityRand <= cumulative) {
        priorityIndex = j;
        break;
      }
    }

    // Adjust party size for LARGE_GROUP
    let finalPartySize = partySize;
    if (PRIORITIES[priorityIndex] === 'LARGE_GROUP') {
      finalPartySize = randomInt(6, maxPartySize);
    }

    const endTime = addMinutes(start, duration);
    const createdAt = subDays(start, randomInt(1, 30));
    const updatedAt =
      Math.random() > 0.5 ? createdAt : addDays(createdAt, randomInt(0, 7));

    const reservation: Reservation = {
      id: `GEN_${String(i + 1).padStart(6, '0')}`,
      tableId: table.id,
      customer: {
        name: customerName,
        phone: generatePhone(),
        email: Math.random() > 0.2 ? generateEmail(customerName) : undefined,
        notes:
          Math.random() > 0.8
            ? randomElement([
                'Window seat preferred',
                'Birthday celebration',
                'Anniversary dinner',
                'Business meeting',
                'Dietary restrictions',
                'Late arrival expected',
              ])
            : undefined,
      },
      partySize: finalPartySize,
      startTime: start.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes: duration,
      status: STATUSES[statusIndex],
      priority: PRIORITIES[priorityIndex],
      notes:
        Math.random() > 0.7
          ? randomElement([
              'Special occasion',
              'Regular customer',
              'First time visitor',
              'Group celebration',
            ])
          : undefined,
      source: randomElement(SOURCES),
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };

    reservations.push(reservation);
  }

  return reservations;
}

/**
 * Quick generator for 200+ reservations
 */
export function generateStressTestData(
  tables: Table[],
  date: Date = new Date(),
): Reservation[] {
  return generateReservations({
    count: 250,
    baseDate: date,
    tables,
    avoidConflicts: false, // Faster generation, some conflicts are OK for stress testing
    dateRange: 7, // Spread across a week
    minPartySize: 2,
    maxPartySize: 12,
  });
}
