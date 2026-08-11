import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { PricingRuleSet } from '../src/lib/types/pricing';
import { Airport } from '../src/lib/types/airport';
import { GlobalSettings } from '../src/lib/types/settings';

const projectId = 'demo-luxe';
process.env.GCLOUD_PROJECT = projectId;
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

initializeApp({ projectId });
const db = getFirestore();

async function seed() {
  console.log('Seeding pricing configuration...');

  // 1. Create a starter pricing rule set
  const ruleSet: PricingRuleSet = {
    ruleSetId: 'rule_set_v1',
    version: 1,
    effectiveFrom: Timestamp.now() as any, // Admin Timestamp vs Client Timestamp typing difference
    timezone: 'America/Los_Angeles',
    classRates: {
      sedan: {
        name: 'Luxury Sedan',
        baseFareCents: 5000,
        perMileCents: 350,
        perMinuteCents: 100,
        minimumFareCents: 7500,
        hourlyRateCents: 8500,
        hourlyMinimumHours: 2,
      },
      suv: {
        name: 'Luxury SUV',
        baseFareCents: 7500,
        perMileCents: 450,
        perMinuteCents: 125,
        minimumFareCents: 9500,
        hourlyRateCents: 11000,
        hourlyMinimumHours: 2,
      },
      sprinter: {
        name: 'Executive Sprinter',
        baseFareCents: 15000,
        perMileCents: 650,
        perMinuteCents: 200,
        minimumFareCents: 25000,
        hourlyRateCents: 18000,
        hourlyMinimumHours: 3,
      }
    },
    gratuity: {
      autoAdd: true,
      percent: 20,
      editableByRider: false,
      appliesTo: 'subtotal'
    },
    waitTime: {
      freeMinutesStandard: 15,
      freeMinutesAirport: 45,
      perMinuteCents: 150,
      billingIncrementMinutes: 15
    },
    surcharges: {
      fuelPercent: 5,
      fuelFlatCents: 0,
      extraStopCents: 2500,
      meetGreetCents: 3500,
      childSeatCents: 2000,
      afterHours: {
        enabled: true,
        startHourLocal: 23, // 11 PM
        endHourLocal: 5,    // 5 AM
        percent: 0,
        flatCents: 3000
      },
      holidays: [
        { date: '12-25', name: 'Christmas Day', percent: 25, flatCents: 0 },
        { date: '01-01', name: 'New Years Day', percent: 25, flatCents: 0 },
      ],
      outOfAreaPerMileCents: 500,
      outOfAreaRadiusMiles: 50
    },
    cancellation: [
      { hoursBeforePickup: 2, feePercent: 100, feeFlatCents: 0, appliesToClasses: 'all' },
      { hoursBeforePickup: 24, feePercent: 50, feeFlatCents: 0, appliesToClasses: ['sprinter'] }
    ],
    taxPercent: 8.5
  };

  await db.collection('pricingRuleSets').doc(ruleSet.ruleSetId).set(ruleSet);
  console.log('✅ Created pricingRuleSets/rule_set_v1');

  // 2. Create Global Settings pointing to the rule set
  const settings: GlobalSettings = {
    businessName: 'Luxe Black Car',
    supportPhone: '+1-555-0199',
    supportEmail: 'support@luxeblackcar.example.com',
    defaultTimezone: 'America/Los_Angeles',
    activePricingRuleSetId: 'rule_set_v1',
    bookingLeadTimeMinutes: 120, // 2 hours advance minimum
    maxAdvanceDays: 60,
    brandColors: {
      primary: '#000000',
      accent: '#D4AF37'
    }
  };

  await db.collection('settings').doc('global').set(settings);
  console.log('✅ Created settings/global');

  // 3. Create a sample airport with zones
  const airport: Airport = {
    code: 'LAX',
    name: 'Los Angeles International Airport',
    timezone: 'America/Los_Angeles',
    location: {
      lat: 33.9416,
      lng: -118.4085
    },
    zones: [
      {
        zoneId: 'downtown_la',
        name: 'Downtown LA',
        flatRates: {
          sedan: { arrivalCents: 12500, departureCents: 11000 },
          suv: { arrivalCents: 15500, departureCents: 13000 },
          sprinter: { arrivalCents: 35000, departureCents: 35000 }
        }
      },
      {
        zoneId: 'beverly_hills',
        name: 'Beverly Hills / West Hollywood',
        flatRates: {
          sedan: { arrivalCents: 14000, departureCents: 12500 },
          suv: { arrivalCents: 17500, departureCents: 15500 },
          sprinter: { arrivalCents: 38000, departureCents: 38000 }
        }
      }
    ],
    meetGreetFeeCents: 3500,
    freeWaitMinutesArrival: 45
  };

  await db.collection('airports').doc(airport.code).set(airport);
  console.log(`✅ Created airports/${airport.code}`);

  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch(console.error);
