# BUILD SPEC — Black Car Concierge Platform (Phase 1)

> **This file is the source of truth.** Keep it open in context for every Antigravity session. If code and this spec disagree, the spec wins — or update the spec first, deliberately, then the code.

**Version:** 1.0
**Stack:** Next.js 15 (App Router) · Firebase Auth · Cloud Firestore · Cloud Functions v2 · Firebase App Hosting · Stripe · Twilio
**Scope:** Phase 1 only — single operator, own fleet, pre-booked reservations.

---

## 0. Product in One Paragraph

A pre-booked black car reservation platform for a single limo operator. Riders book a car hours-to-days in advance, choose their vehicle class, choose a specific driver, and save a **preference profile** (beverage, conversation level, cabin temp, music, greeting style) that persists across every future ride. Drivers get an auto-generated prep checklist before each pickup so those preferences actually get executed. Dispatch runs the day from an admin board. Payment is card-on-file, authorized at booking, captured on completion with gratuity and wait time.

**The differentiator is the preference layer, not dispatch.** Build quality accordingly: the preference profile and the driver prep checklist get the most polish.

---

## 1. Non-Negotiable Engineering Rules

These exist because violating them causes data loss, money loss, or a security incident. No exceptions without an explicit decision recorded in this file.

1. **All money is integer cents.** `priceCents: 34500`. Never floats, never `Number` dollars. Format only at the render layer.
2. **The client never computes or submits a price.** Quotes and final charges are calculated exclusively in Cloud Functions. A client-supplied `priceCents` on any write is a security bug.
3. **The client never writes `status`, `driverId`, `vehicleId`, or any pricing field directly.** All state transitions go through callable functions. Firestore rules must enforce this, not just the UI.
4. **Every reservation snapshots its inputs.** Rider name/phone, driver name/photo, vehicle description, the preference profile, and the full price breakdown are *copied onto the reservation document* at booking time. Firestore has no joins, and history must stay accurate when drivers leave or rates change.
5. **All timestamps stored UTC as Firestore `Timestamp`.** Every reservation carries an IANA `timezone` string (e.g. `America/New_York`). After-hours, holiday, and cancellation-window logic evaluates in **local** time. This is the #1 source of silent bugs in booking systems.
6. **Stripe webhooks must be idempotent.** Persist every processed `event.id` to `webhookEvents/{eventId}` inside the same transaction as the effect. Stripe *will* deliver duplicates.
7. **Firestore Security Rules are the security boundary, not the UI.** Assume a hostile client with the web SDK and a valid auth token. Every collection gets explicit rules and rules unit tests.
8. **No secrets in client code.** Stripe secret key, Twilio auth token, and service account credentials exist only in Cloud Functions config / Secret Manager. `NEXT_PUBLIC_*` is world-readable.
9. **Pricing is a pure function.** No I/O, no `Date.now()` inside. Takes `(input, ruleSet, now)` returns a breakdown. It must be unit-testable without Firebase running.
10. **Never delete a reservation.** Status changes to `cancelled_*`. Financial records are append-only.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 15 App Router  (Firebase App Hosting)          │
│  ├── /(rider)     rider PWA                             │
│  ├── /(driver)    driver PWA                            │
│  └── /(admin)     dispatch console                      │
└───────────────┬─────────────────────────────────────────┘
                │ Firebase Web SDK (reads) + httpsCallable (writes)
┌───────────────▼─────────────────────────────────────────┐
│  Firebase Auth  — phone OTP, custom claims for roles    │
├─────────────────────────────────────────────────────────┤
│  Cloud Firestore — reads direct from client (guarded    │
│                    by Security Rules)                    │
├─────────────────────────────────────────────────────────┤
│  Cloud Functions v2                                      │
│   onCall:     createQuote, createReservation,            │
│               cancelReservation, assignDriver,           │
│               updateTripStatus, completeTrip,            │
│               setUserRole                                │
│   onRequest:  stripeWebhook                              │
│   onDocument: onReservationWritten (notifications)       │
│   onSchedule: sendPickupReminders (every 15 min)         │
├─────────────────────────────────────────────────────────┤
│  Cloud Storage — vehicle photos, driver headshots        │
└─────────────────────────────────────────────────────────┘
        │                    │                  │
    Stripe API          Twilio SMS      Google Maps API
```

**Read/write split:** clients **read** Firestore directly (fast, realtime, cheap to build) and **write** only through callable functions. Rules allow `read` broadly-but-scoped and deny `write` on everything that matters.

### 2.1 Why these choices

| Decision | Rationale |
|---|---|
| Next.js App Router | Best-represented framework in codegen training data; server components keep the admin console fast. |
| Firebase App Hosting | Native Next.js SSR support on Cloud Run. If it fights you, fall back to `output: 'standalone'` on Cloud Run directly — do not waste a day on Hosting rewrites. |
| Firestore over Cloud SQL | Realtime listeners for the dispatch board, zero ops, generous free tier. Accepting the NoSQL modeling cost. |
| Callable functions over REST | Auth context is automatic, typed client, no CORS work. |
| Phone OTP auth | Black car clients will not create passwords. Firebase Auth does this natively. |

### 2.2 Firestore-specific traps to design around

- **No joins.** Denormalize aggressively (see rule 4). Accept duplication.
- **Read cost.** Never attach `onSnapshot` to an unbounded collection. The dispatch board queries **one day at a time**, `limit(200)`. At ~50 reservations/week this is trivial, but the habit matters.
- **Composite indexes must be declared** in `firestore.indexes.json` and deployed. A query that works in the emulator fails in prod without its index. Deploy indexes before the pilot.
- **No case-insensitive search.** For admin customer lookup, store a `searchName` field (lowercased) and query with range operators. Do not reach for Algolia in Phase 1.
- **Cold starts.** Set `minInstances: 1` on `createQuote` and `createReservation` before launch. A 4-second cold start during booking reads as a broken app.

---

## 3. Firestore Data Model

### `users/{uid}`
```ts
{
  uid: string;
  role: 'rider' | 'driver' | 'admin';        // mirrored in custom claims
  phone: string;                              // E.164, from Auth
  email: string | null;
  firstName: string;
  lastName: string;
  searchName: string;                         // lowercased "first last"
  stripeCustomerId: string | null;
  defaultPaymentMethodId: string | null;
  preferences: PreferenceProfile | null;      // embedded, see 3.2
  notes: string;                              // internal, admin-only visibility
  totalRides: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  disabled: boolean;
}
```

### `users/{uid}/savedPlaces/{placeId}`
```ts
{
  label: string;              // "Home", "Office", "JFK T4"
  address: Address;           // see 3.3
  isDefault: boolean;
  createdAt: Timestamp;
}
```

### `drivers/{driverId}`
Separate from `users` because rider-facing driver profiles must be publicly readable to authenticated riders, while user documents must not be. `driverId === uid` of the driver's user doc.
```ts
{
  driverId: string;
  userId: string;
  displayName: string;              // "Marcus T."
  photoUrl: string;
  bio: string;                      // 1-2 sentences, rider-facing
  languages: string[];
  yearsExperience: number;
  rating: number;                   // 0-5, 1 decimal
  ratingCount: number;
  active: boolean;                  // false = not bookable
  bookable: boolean;                // false = works but not rider-selectable
  createdAt: Timestamp;
}
```

### `drivers/{driverId}/private/credentials`
Admin-only. Never readable by riders.
```ts
{
  licenseNumber: string;
  licenseExpiry: Timestamp;
  medicalCertExpiry: Timestamp | null;
  backgroundCheckDate: Timestamp | null;
  employmentType: 'w2' | '1099';
  phone: string;
  emergencyContact: { name: string; phone: string };
}
```

### `vehicleClasses/{classId}`
```ts
{
  classId: string;                  // 'sedan' | 'suv' | 'sprinter' | 'stretch'
  name: string;                     // "Executive Sedan"
  description: string;
  maxPassengers: number;
  maxLuggage: number;
  heroImageUrl: string;
  sortOrder: number;
  active: boolean;
}
```

### `vehicles/{vehicleId}`
```ts
{
  vehicleId: string;
  classId: string;
  year: number;
  make: string;
  model: string;
  color: string;
  licensePlate: string;             // admin-only via rules
  photoUrls: string[];              // exterior + interior, real photos
  maxPassengers: number;
  maxLuggage: number;
  active: boolean;
  outOfServiceUntil: Timestamp | null;
}
```

### `reservations/{reservationId}` — the core document
```ts
{
  reservationId: string;
  confirmationCode: string;         // human-readable, e.g. "BC-7K2M"
  status: ReservationStatus;        // see 3.4

  // --- Rider (snapshotted) ---
  riderId: string;
  riderName: string;
  riderPhone: string;
  riderEmail: string | null;
  bookedByAdmin: boolean;           // true for phone bookings entered by dispatch

  // --- Trip ---
  pickupAt: Timestamp;              // UTC
  timezone: string;                 // IANA, e.g. "America/New_York"
  tripType: 'point_to_point' | 'hourly' | 'airport_arrival' | 'airport_departure';
  pickup: Address;
  dropoff: Address | null;          // null for hourly/as-directed
  stops: Address[];
  hours: number | null;             // hourly only
  passengers: number;
  luggage: number;
  flightNumber: string | null;
  airlineCode: string | null;

  // --- Assignment (snapshotted) ---
  classId: string;
  className: string;
  vehicleId: string | null;
  vehicleDescription: string | null;   // "2023 Cadillac Escalade — Black"
  driverId: string | null;
  driverName: string | null;
  driverPhotoUrl: string | null;
  requestedDriverId: string | null;    // what the rider asked for
  driverSubstituted: boolean;

  // --- Preferences (snapshotted at booking) ---
  preferences: PreferenceProfile | null;
  specialInstructions: string;

  // --- Pricing (server-authored only) ---
  pricing: PriceBreakdown;             // see 3.5
  pricingRuleSetId: string;            // version used
  estimatedDistanceMeters: number | null;
  estimatedDurationSeconds: number | null;

  // --- Actuals, filled during trip ---
  actualStartAt: Timestamp | null;
  actualEndAt: Timestamp | null;
  waitMinutes: number;
  tollsCents: number;
  parkingCents: number;
  driverNotes: string;

  // --- Payment ---
  stripePaymentIntentId: string | null;
  paymentStatus: 'none' | 'authorized' | 'captured' | 'failed' | 'refunded';
  authorizedAmountCents: number;
  capturedAmountCents: number;

  // --- Cancellation ---
  cancelledAt: Timestamp | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  cancellationFeeCents: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  idempotencyKey: string;            // client-generated, unique-indexed
}
```

### `reservations/{id}/statusEvents/{eventId}`
Append-only audit trail. **Phase 2 GPS drops into this cleanly.**
```ts
{
  from: ReservationStatus | null;
  to: ReservationStatus;
  actorId: string;
  actorRole: 'rider' | 'driver' | 'admin' | 'system';
  at: Timestamp;
  note: string | null;
  location: null;                    // Phase 2: { lat, lng }
}
```

### `pricingRuleSets/{ruleSetId}` — versioned, never edited in place
See §5 for the full schema. Creating a new rule set creates a new document; reservations reference the version they were priced with.

### `airports/{airportId}`
```ts
{
  code: string;                      // "JFK"
  name: string;
  timezone: string;
  location: { lat: number; lng: number };
  zones: Array<{
    zoneId: string;
    name: string;
    flatRates: Record<string /*classId*/, {
      arrivalCents: number;
      departureCents: number;
    }>;
  }>;
  meetGreetFeeCents: number;
  freeWaitMinutesArrival: number;    // usually longer than standard
}
```

### `driverLocations/{driverId}` — **Phase 2 stub, create schema now, do not populate**
```ts
{
  driverId: string;
  reservationId: string | null;
  lat: number;
  lng: number;
  headingDegrees: number | null;
  recordedAt: Timestamp;
  expiresAt: Timestamp;              // TTL policy, 90 day purge
}
```

### `webhookEvents/{stripeEventId}`
```ts
{ eventId: string; type: string; processedAt: Timestamp; }
```

### `settings/global`
```ts
{
  businessName: string;
  supportPhone: string;
  supportEmail: string;
  defaultTimezone: string;
  activePricingRuleSetId: string;
  bookingLeadTimeMinutes: number;    // min time before pickup, e.g. 120
  maxAdvanceDays: number;            // e.g. 365
  brandColors: { primary: string; accent: string };
}
```

---

### 3.2 `PreferenceProfile` — the product differentiator

Design rule enforced in code: **never gate first booking on this form.** Capture 2–3 inline at checkout, prompt for the rest after the first completed ride.

```ts
interface PreferenceProfile {
  beverage: {
    preference: 'none' | 'water_still' | 'water_sparkling' | 'soda' | 'coffee' | 'other';
    brand: string | null;                    // "Fiji", "San Pellegrino"
    temperature: 'chilled' | 'room' | null;
    notes: string | null;
  };
  conversation: 'silent' | 'greeting_only' | 'chatty' | 'no_preference';
  cabinTempF: number | null;                 // 60-80
  audio: {
    mode: 'off' | 'genre' | 'station' | 'my_phone' | 'no_preference';
    value: string | null;                    // "Jazz", "SiriusXM 71"
    volume: 'low' | 'medium' | 'off' | null;
  };
  scent: 'none' | 'light' | 'no_preference';
  scentAllergy: boolean;
  chargerType: 'usb_c' | 'lightning' | 'wireless' | 'none';
  reading: string | null;                    // "Wall Street Journal"
  greeting: {
    style: 'curbside' | 'meet_inside' | 'no_preference';
    nameSign: boolean;
    signText: string | null;                 // may differ from legal name
  };
  seating: {
    preferredSeat: 'rear_right' | 'rear_left' | 'rear_center' | 'front' | null;
    partition: 'up' | 'down' | null;
    shades: 'up' | 'down' | null;
  };
  accessibility: {
    mobilityAssist: boolean;
    serviceAnimal: boolean;
    notes: string | null;
  };
  childSeats: Array<{ type: 'infant' | 'convertible' | 'booster'; count: number }>;
  route: {
    avoidHighways: boolean;
    avoidTolls: boolean;
    preference: 'fastest' | 'scenic' | 'no_preference';
  };
  preferredDriverIds: string[];
  blockedDriverIds: string[];
  medicalNotes: string | null;               // treat as sensitive
  freeText: string | null;
  updatedAt: Timestamp;
}
```

**Driver prep checklist** is derived from this at assignment time — a rendered, checkable list on the driver's job screen. Preferences that live in a form nobody reads are worthless; preferences that print as a pre-trip checklist actually happen. This is the whole product. Build it well.

### 3.3 `Address`
```ts
interface Address {
  formatted: string;
  placeId: string | null;            // Google Places
  lat: number;
  lng: number;
  line1: string | null;
  line2: string | null;              // suite, gate, terminal, door
  city: string;
  state: string;
  postalCode: string;
  airportCode: string | null;        // set when this is a known airport
  notes: string | null;              // "gate code 4412", "meet at valet"
}
```

### 3.4 Reservation status state machine

```
draft ──▶ quoted ──▶ confirmed ──▶ assigned ──▶ en_route ──▶ arrived ──▶ onboard ──▶ completed
                          │             │            │            │           │
                          └─────────────┴────────────┴────────────┴───────────┘
                                              │
                                    cancelled_by_rider
                                    cancelled_by_admin
                                    no_show
```

| Transition | Allowed actor | Side effect |
|---|---|---|
| `draft → quoted` | rider, admin | `createQuote` — prices, no persistence beyond draft |
| `quoted → confirmed` | rider, admin | `createReservation` — Stripe auth, confirmation SMS |
| `confirmed → assigned` | admin | driver + vehicle snapshotted, SMS to both parties |
| `assigned → en_route` | driver, admin | SMS to rider with ETA |
| `en_route → arrived` | driver, admin | SMS to rider, wait-time clock starts |
| `arrived → onboard` | driver, admin | wait-time clock stops, `actualStartAt` set |
| `onboard → completed` | driver, admin | `completeTrip` — final price, Stripe capture, receipt |
| `* → cancelled_*` | per policy | cancellation fee evaluated against local-time window |
| `arrived → no_show` | driver, admin | full cancellation fee, capture |

Enforce this table in a single `canTransition(from, to, actorRole)` function used by every callable. Do not scatter the logic.

### 3.5 `PriceBreakdown`
```ts
interface PriceBreakdown {
  currency: 'usd';
  lineItems: Array<{
    code: string;                    // 'base_fare' | 'hourly' | 'airport_flat' | ...
    label: string;                   // rider-facing
    amountCents: number;             // may be negative (discounts)
    detail: string | null;           // "2.5 hrs @ $125/hr"
  }>;
  subtotalCents: number;
  gratuityCents: number;
  gratuityPercent: number;
  gratuityEditable: boolean;
  taxCents: number;
  totalCents: number;
  estimatedTotalCents: number;       // quoted at booking
  isFinal: boolean;                  // false until completeTrip
}
```

---

## 4. Cloud Function Contracts

All callables live in `functions/src/callable/`. Every one: (1) verifies auth, (2) verifies role, (3) validates input with Zod, (4) runs in a Firestore transaction where state changes, (5) writes a `statusEvents` entry, (6) returns a typed result.

```ts
// ── Quoting & booking ──────────────────────────────────
createQuote(input: QuoteInput): Promise<PriceBreakdown>
// Public to authenticated riders. No writes. Pure pricing + Maps distance lookup.

createReservation(input: {
  quote: QuoteInput;
  paymentMethodId: string;
  idempotencyKey: string;
}): Promise<{ reservationId: string; confirmationCode: string }>
// Re-prices server-side (NEVER trusts a client-passed price).
// Creates Stripe PaymentIntent with capture_method:'manual'.
// Transaction: reservation doc + statusEvent + idempotency guard.

cancelReservation(input: {
  reservationId: string; reason: string;
}): Promise<{ feeCents: number }>
// Evaluates cancellation window in LOCAL time. Captures fee or releases auth.

// ── Dispatch (admin) ───────────────────────────────────
assignDriver(input: {
  reservationId: string; driverId: string; vehicleId: string;
}): Promise<void>
// Snapshots driver + vehicle onto the reservation. Checks conflicts:
// same driver or vehicle already assigned in an overlapping window.

// ── Trip lifecycle (driver) ────────────────────────────
updateTripStatus(input: {
  reservationId: string; to: ReservationStatus;
}): Promise<void>
// Guarded by canTransition(). Driver may only touch their own assigned trips.

completeTrip(input: {
  reservationId: string;
  waitMinutes: number; tollsCents: number; parkingCents: number;
  gratuityCents?: number; driverNotes?: string;
}): Promise<PriceBreakdown>
// Recomputes final price, captures the PaymentIntent for the final amount,
// marks isFinal, triggers receipt.

// ── Admin ──────────────────────────────────────────────
setUserRole(input: { uid: string; role: Role }): Promise<void>
// Admin-only. Sets custom claim AND users/{uid}.role in one transaction.

// ── HTTP ───────────────────────────────────────────────
stripeWebhook(req, res)
// Verify signature with req.rawBody. Idempotency via webhookEvents/{event.id}.
// Handles: payment_intent.succeeded, .payment_failed, .canceled, charge.dispute.created
```

**Capture rule:** Stripe authorizations expire after **7 days**. Any reservation booked further out cannot hold an auth that long. Phase 1 policy: authorize at booking only when pickup is ≤6 days out; beyond that, store the payment method and authorize via the scheduled function 24h before pickup. **Implement this or long-lead bookings will silently fail at capture.**

---

## 5. Pricing Engine

The highest-risk component. Build it first, build it pure, test it hard.

**Location:** `functions/src/pricing/` — no Firebase imports in this directory.

```ts
export function calculatePrice(
  input: QuoteInput,
  ruleSet: PricingRuleSet,
  now: Date
): PriceBreakdown
```

### `PricingRuleSet` schema
```ts
interface PricingRuleSet {
  ruleSetId: string;
  version: number;
  effectiveFrom: Timestamp;
  timezone: string;

  classRates: Record<string /*classId*/, {
    baseFareCents: number;
    perMileCents: number;
    perMinuteCents: number;
    minimumFareCents: number;
    hourlyRateCents: number;
    hourlyMinimumHours: number;
  }>;

  gratuity: {
    autoAdd: boolean;
    percent: number;
    editableByRider: boolean;
    appliesTo: 'subtotal' | 'base_only';
  };

  waitTime: {
    freeMinutesStandard: number;
    freeMinutesAirport: number;
    perMinuteCents: number;
    billingIncrementMinutes: number;   // e.g. 15 → round up
  };

  surcharges: {
    fuelPercent: number;
    fuelFlatCents: number;
    extraStopCents: number;
    meetGreetCents: number;
    childSeatCents: number;
    afterHours: {
      enabled: boolean;
      startHourLocal: number;          // e.g. 22
      endHourLocal: number;            // e.g. 6
      percent: number;
      flatCents: number;
    };
    holidays: Array<{
      date: string;                    // 'MM-DD' or ISO for movable
      name: string;
      percent: number;
      flatCents: number;
    }>;
    outOfAreaPerMileCents: number;
    outOfAreaRadiusMiles: number;
  };

  cancellation: Array<{
    hoursBeforePickup: number;         // window boundary
    feePercent: number;
    feeFlatCents: number;
    appliesToClasses: string[] | 'all';
  }>;

  taxPercent: number;
}
```

### Calculation order — implement exactly this sequence
1. Determine `tripType` → select base calculation
   - `point_to_point`: `max(baseFare + (miles × perMile) + (minutes × perMinute), minimumFare)`
   - `hourly`: `max(hours, hourlyMinimumHours) × hourlyRate`
   - `airport_*`: flat rate from `airports/{code}.zones[].flatRates[classId]`, falling back to point-to-point if no zone matches
2. Add extra stops × `extraStopCents`
3. Add meet & greet if `greeting.style === 'meet_inside'`
4. Add child seats × count
5. Add wait time: `ceil(max(0, waitMinutes − freeMinutes) / increment) × increment × perMinuteCents`
6. Add tolls + parking (actuals, pass-through, no markup)
7. Apply after-hours surcharge **evaluated in local time at pickup**
8. Apply holiday surcharge **evaluated in local date at pickup**
9. Apply out-of-area if pickup or dropoff exceeds radius
10. Apply fuel surcharge (percent of running subtotal, then flat)
11. → `subtotalCents`
12. Gratuity on `subtotal` or `base_only` per config
13. Tax on `subtotal` (not on gratuity — verify with client)
14. → `totalCents`

**Rounding:** compute in cents throughout; `Math.round()` only at each line item, never at the end. Percent math: `Math.round(base * percent / 100)`.

### Test requirements — write these before the UI
Minimum 25 unit tests covering: each trip type · hourly minimum enforcement · point-to-point minimum fare · airport zone hit and miss · wait time under/over/at grace boundary · billing increment rounding up · after-hours across midnight · after-hours in a non-UTC timezone (the bug that will happen) · holiday on the exact date · each cancellation window boundary ±1 minute · gratuity on subtotal vs base · zero-and-negative guards.

---

## 6. Security Rules

Full file lives at `firestore.rules`. Governing model:

| Collection | read | write |
|---|---|---|
| `users/{uid}` | owner or admin | **never from client** (functions only) |
| `users/{uid}/savedPlaces` | owner or admin | owner (this one is safe) |
| `drivers/{id}` | any signed-in user | admin only |
| `drivers/{id}/private/**` | admin only | admin only |
| `vehicles`, `vehicleClasses` | any signed-in user | admin only |
| `reservations/{id}` | `riderId == uid` OR `driverId == uid` OR admin | **never from client** |
| `reservations/{id}/statusEvents` | same as parent | **never from client** |
| `pricingRuleSets` | admin only | **never from client** |
| `airports` | any signed-in user | admin only |
| `settings/global` | any signed-in user | admin only |
| `webhookEvents` | **nobody** | **nobody** |
| `driverLocations` | assigned rider or admin | **never from client** |

Role comes from **custom claims** (`request.auth.token.role`), not from a Firestore lookup — a `get()` in rules costs a read on every request and is slower.

**Mandatory:** rules unit tests with `@firebase/rules-unit-testing`. At minimum, assert that Rider A **cannot** read Rider B's reservation, user doc, or saved places, and that a driver cannot read a reservation they are not assigned to. This test file is not optional — misconfigured rules are the single most common way an app like this leaks its entire customer list.

---

## 7. Application Structure

```
/
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── apphosting.yaml
├── package.json
├── src/
│   ├── app/
│   │   ├── (marketing)/page.tsx
│   │   ├── (rider)/
│   │   │   ├── book/            # quote flow
│   │   │   ├── trips/           # upcoming + history
│   │   │   ├── preferences/     # THE differentiator — polish this
│   │   │   └── account/
│   │   ├── (driver)/
│   │   │   ├── today/           # job list
│   │   │   └── trip/[id]/       # checklist + status buttons
│   │   ├── (admin)/
│   │   │   ├── dispatch/        # day board
│   │   │   ├── reservations/
│   │   │   ├── drivers/
│   │   │   ├── vehicles/
│   │   │   ├── pricing/
│   │   │   └── customers/
│   │   ├── login/
│   │   └── api/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── booking/
│   │   ├── preferences/
│   │   └── dispatch/
│   ├── lib/
│   │   ├── firebase/            # client init, auth hooks, converters
│   │   ├── types/               # SHARED with functions — single source
│   │   ├── format/              # money, dates, phone
│   │   └── hooks/
│   └── styles/
├── functions/
│   ├── src/
│   │   ├── index.ts
│   │   ├── callable/
│   │   ├── triggers/
│   │   ├── http/stripeWebhook.ts
│   │   ├── pricing/             # PURE — no firebase imports
│   │   ├── lib/                 # stripe, twilio, maps clients
│   │   ├── types/               # symlink or copy of src/lib/types
│   │   └── __tests__/
│   └── package.json
└── docs/
    ├── BUILD-SPEC.md            # this file
    └── RUNBOOK.md
```

**Types are shared.** `ReservationStatus`, `PriceBreakdown`, `PreferenceProfile` etc. must be defined once and imported by both the app and functions. Duplicated drifting types will cause a production bug.

---

## 8. Conventions

- **TypeScript strict mode on.** `noUncheckedIndexedAccess: true`.
- **Zod at every boundary** — callable inputs, webhook payloads, form submissions.
- **Firestore converters** (`withConverter`) for every collection. No raw `data()` casting.
- **Tailwind + shadcn/ui.** Do not hand-roll form controls or dialogs.
- **Server components by default**; `'use client'` only where interaction requires it.
- **No `any`.** No `@ts-ignore` without an adjacent comment explaining why.
- **Error handling:** callables throw `HttpsError` with a stable `code` and a rider-safe message. Never leak stack traces to the client.
- **Naming:** `camelCase` fields, `PascalCase` types, collections plural lowercase.
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`).

---

## 9. Environment & Secrets

```bash
# .env.local — CLIENT (public, safe)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=      # HTTP-referrer restricted!

# Secret Manager — SERVER ONLY, never in the client bundle
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_MESSAGING_SERVICE_SID=
GOOGLE_MAPS_SERVER_KEY=                   # IP restricted, separate from browser key
```

**Two separate Maps keys.** The browser key is referrer-restricted and rate-limited; the server key is IP-restricted and used for Distance Matrix in pricing. Shipping one unrestricted key is a five-figure billing incident waiting to happen.

Environments: `blackcar-dev` and `blackcar-prod` as **separate Firebase projects**. Never point dev at prod Firestore.

---

## 10. Definition of Done — Phase 1

A milestone is complete only when all of these are true:

- [ ] TypeScript compiles with zero errors, strict mode
- [ ] Unit tests pass; pricing engine at ≥90% branch coverage
- [ ] Firestore rules unit tests pass, including cross-tenant denial cases
- [ ] Works against the Firebase emulator suite end to end
- [ ] No secret appears in the client bundle (`grep` the build output)
- [ ] Composite indexes declared in `firestore.indexes.json`
- [ ] Mobile viewport verified at 375px — drivers use phones, not laptops
- [ ] Loading and error states exist for every async surface
- [ ] Money renders correctly (no float artifacts, no `$34.500000001`)

**Phase 1 ships when:** a rider books through the PWA, dispatch assigns a driver, the driver sees the prep checklist and runs the status flow, the card captures the correct final amount including wait time and gratuity, and both parties get accurate SMS at each step — on 10 consecutive real rides without manual intervention.

---

## 11. Explicitly Out of Scope — Phase 1

Do not build these. If asked mid-build, quote it as a change order.

Live GPS tracking / map of car location *(→ Phase 2)* · on-demand or ASAP dispatch · third-party operator onboarding · split payouts / Stripe Connect · native iOS or Android · corporate accounts and invoicing / AR · loyalty or membership tiers · surge pricing · in-app chat · multi-market configuration · driver payroll · automated flight tracking *(store `flightNumber`, do not integrate yet)* · rider-to-rider referrals · marketing automation

---

## 12. Phase 2 Hooks Already Built Into This Spec

Design decisions made now so Phase 2 is additive, not a refactor:

1. `statusEvents` subcollection with a `location: null` field → GPS points drop in
2. `driverLocations` collection schema defined, unused
3. Reservation state machine is data-driven → on-demand statuses append cleanly
4. `pricingRuleSets` versioned → affiliate rate sheets become another rule set
5. `drivers` decoupled from `users` → external operator drivers slot in without schema change
6. Price breakdown is line-item based → payout splits become negative line items
