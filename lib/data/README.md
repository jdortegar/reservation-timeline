# Demo Data & Data Generator

This directory contains seed data and data generators for the reservation timeline application.

## Files

- **`seedData.ts`** - Seed file with 50+ realistic reservations
- **`dataGenerator.ts`** - Data generator for stress testing (200+ reservations)

## Usage

### Seed Data (50+ Reservations)

The seed data is automatically loaded when the application starts. It includes:

- 14 tables across 3 sectors (Main Hall, Terrace, Private Room)
- 50+ reservations with realistic distribution:
  - Various statuses (CONFIRMED, PENDING, SEATED, FINISHED, CANCELLED, NO_SHOW)
  - Different priorities (STANDARD, VIP, LARGE_GROUP)
  - Multiple time slots throughout the day
  - Realistic customer data

```typescript
import { SEED_SECTORS, SEED_TABLES, generateSeedReservations } from '@/lib/data/seedData';

// Use pre-generated seed data
const reservations = SEED_RESERVATIONS;

// Or generate for a specific date
const date = new Date('2025-11-20');
const reservations = generateSeedReservations(date);
```

### Data Generator (200+ Reservations)

Use the data generator for stress testing and performance evaluation:

```typescript
import { generateReservations, generateStressTestData } from '@/lib/data/dataGenerator';
import { SEED_TABLES } from '@/lib/data/seedData';

// Quick stress test (250 reservations)
const stressTestReservations = generateStressTestData(SEED_TABLES);

// Custom generation
const customReservations = generateReservations({
  count: 300,
  baseDate: new Date(),
  tables: SEED_TABLES,
  avoidConflicts: true, // Slower but more realistic
  dateRange: 7, // Spread across a week
  minPartySize: 2,
  maxPartySize: 12,
});
```

## Generator Options

- **`count`** - Number of reservations to generate (default: 250)
- **`baseDate`** - Base date for reservations
- **`tables`** - Array of tables to use
- **`avoidConflicts`** - Whether to avoid time conflicts (default: false, faster)
- **`dateRange`** - Number of days to spread reservations across (default: 1)
- **`minPartySize`** - Minimum party size (default: 2)
- **`maxPartySize`** - Maximum party size (default: 12)

## Features

- **Realistic Data**: Uses real names, phone numbers, emails
- **Status Distribution**: Realistic distribution of reservation statuses
- **Priority Distribution**: 70% STANDARD, 20% VIP, 10% LARGE_GROUP
- **Time Distribution**: Spreads reservations across service hours (11:00 - 00:00)
- **Conflict Avoidance**: Optional conflict detection for realistic data
- **Performance**: Fast generation for large datasets

## Example: Loading Stress Test Data

```typescript
import { useStore } from '@/store/store';
import { generateStressTestData } from '@/lib/data/dataGenerator';
import { SEED_TABLES } from '@/lib/data/seedData';

function loadStressTestData() {
  const { setReservations } = useStore.getState();
  const reservations = generateStressTestData(SEED_TABLES, new Date());
  setReservations(reservations);
  console.log(`Loaded ${reservations.length} reservations for stress testing`);
}
```

