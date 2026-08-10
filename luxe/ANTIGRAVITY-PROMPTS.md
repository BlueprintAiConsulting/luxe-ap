# Antigravity Build Prompts — Phase 1
### Black Car Concierge Platform · 16 sequenced prompts

---

## How to use this

1. Put `BUILD-SPEC.md` in the repo at `docs/BUILD-SPEC.md` and keep it pinned in context for every session.
2. Run prompts **in order**. Each assumes the previous one shipped.
3. **Verify before advancing.** Every prompt has an acceptance block — actually check it. The failure mode of AI-assisted building is a beautiful app with a broken pricing engine you discover in week three.
4. Commit after each prompt. One prompt = one reviewable commit.
5. When a prompt produces something wrong, fix it *before* moving on. Compounding drift is the enemy.

**Order rationale:** types → pricing engine → security rules → then UI. Pricing and rules are the two things that are expensive to retrofit and dangerous to get wrong. Everything visual is cheap to change later. Resist the urge to build the pretty booking screen first.

---

## P0 — Session primer
*Paste at the start of every new session.*

```
You are a senior full-stack engineer building a production black car reservation
platform. Read docs/BUILD-SPEC.md fully before writing any code — it is the source
of truth for architecture, data model, and conventions.

Standing rules for this codebase:
- TypeScript strict. No `any`, no `@ts-ignore` without a comment justifying it.
- All money is integer cents. Never floats.
- The client NEVER computes prices or writes reservation status/driver/vehicle/
  pricing fields. Those go through Cloud Functions only.
- All timestamps stored UTC; every reservation carries an IANA timezone and all
  time-of-day business logic (after-hours, holidays, cancellation windows)
  evaluates in LOCAL time.
- Zod validation at every boundary.
- Firestore converters for every collection — no raw data() casting.
- Types are defined once in src/lib/types and shared with functions/.

Before you write code, state your plan in 3-5 bullets and list any file you intend
to create or modify. Wait for my confirmation on anything that changes the data
model or security rules.
```

---

## P1 — Scaffold and Firebase wiring

```
Scaffold the project per §7 of docs/BUILD-SPEC.md.

- Next.js 15, App Router, TypeScript strict, Tailwind, shadcn/ui initialized
- Route groups: (marketing), (rider), (driver), (admin), plus /login
- functions/ workspace: Firebase Functions v2, TypeScript, its own package.json
- firebase.json wired for Hosting/App Hosting, Firestore, Functions, Storage,
  and the full emulator suite (auth, firestore, functions, storage, ui)
- Empty firestore.rules, storage.rules, firestore.indexes.json
- src/lib/firebase/client.ts — Firebase Web SDK init, singleton, emulator
  connection when NEXT_PUBLIC_USE_EMULATOR=true
- functions/src/lib/admin.ts — Admin SDK singleton
- .env.example with every variable from §9, correctly split public vs secret
- .gitignore covering .env.local, service account JSON, .firebase/

ACCEPTANCE:
- `npm run dev` serves the app
- `firebase emulators:start` boots all emulators with no errors
- App connects to the Firestore emulator (log a confirmation line on boot)
- `tsc --noEmit` clean in both root and functions/

Do NOT build any UI beyond placeholder pages. Do NOT write business logic.
```

---

## P2 — Shared types

```
Create src/lib/types/ implementing EVERY interface in §3 of docs/BUILD-SPEC.md,
exactly as specified — do not simplify, rename, or "improve" fields.

Files:
- user.ts, driver.ts, vehicle.ts, reservation.ts, pricing.ts,
  preferences.ts, address.ts, airport.ts, settings.ts, index.ts

Also:
- ReservationStatus as a union type
- A canTransition(from, to, actorRole) function implementing the §3.4 table
  exactly, with an exhaustive switch
- Zod schemas mirroring each interface, colocated (e.g. reservationSchema)
- Make types importable from functions/ — set up a path alias or a build step
  that copies them. Explain which approach you chose and why.

ACCEPTANCE:
- Every field in §3 exists with the specified type
- canTransition has unit tests covering all legal transitions AND at least 6
  illegal ones (e.g. rider attempting confirmed→completed)
- functions/ can import the types and compile

Do NOT create Firestore collections or UI yet.
```

---

## P3 — Pricing engine ⚠️ highest-risk component

```
Implement the pricing engine per §5 of docs/BUILD-SPEC.md in functions/src/pricing/.

Hard requirement: this directory imports NOTHING from firebase. It is a pure,
deterministic library. Signature:

  calculatePrice(input: QuoteInput, ruleSet: PricingRuleSet, now: Date): PriceBreakdown

Implement the calculation sequence in §5 in EXACTLY the specified order. Order
affects the result — percentage surcharges compound differently if reordered.

Use date-fns-tz (or Luxon) for all timezone math. After-hours and holiday
evaluation must use the reservation's local time, not UTC, not server time.

Then write the test suite. Minimum 25 tests covering everything listed in §5's
test requirements. I specifically want these:
- after-hours window that spans midnight (22:00-06:00)
- the same pickup instant evaluated in America/New_York vs America/Los_Angeles
  producing different after-hours results
- wait time at exactly the grace boundary, one minute under, one minute over
- billing increment rounding UP (16 min at 15-min increments bills 30)
- hourly minimum enforced when requested hours are below it
- each cancellation window at boundary ±1 minute
- airport zone miss falling back to point-to-point

ACCEPTANCE:
- All tests pass
- Branch coverage ≥90% on functions/src/pricing/
- Zero firebase imports in that directory (verify with grep)
- Every returned amount is an integer

This is the component most likely to cost real money if wrong. Take the time.
```

---

## P4 — Firestore security rules

```
Write firestore.rules and storage.rules implementing the §6 permission matrix in
docs/BUILD-SPEC.md exactly.

Key requirements:
- Role from custom claims (request.auth.token.role), NOT a Firestore get()
- reservations, users, pricingRuleSets, statusEvents, driverLocations,
  webhookEvents: NO client writes at all. Functions only.
- reservations readable only when riderId == uid, or driverId == uid, or admin
- drivers/{id}/private/** admin-only
- Storage: vehicle and driver photos readable by signed-in users, writable by
  admin only

Then write rules unit tests using @firebase/rules-unit-testing. Non-negotiable
cases:
- Rider A CANNOT read Rider B's reservation
- Rider A CANNOT read Rider B's user doc or saved places
- A driver CANNOT read a reservation they are not assigned to
- A rider CANNOT write reservations/{id} at all, including their own
- A rider CANNOT write their own users/{uid}.role
- An unauthenticated request is denied everywhere
- An admin can read everything

ACCEPTANCE:
- All rules tests pass against the emulator
- Every denial case above is explicitly asserted, not assumed

Treat this as the security boundary. Assume a hostile client with a valid token
and the web SDK — the UI provides no protection.
```

---

## P5 — Auth and roles

```
Implement phone-OTP authentication per §2 and §6 of docs/BUILD-SPEC.md.

- /login: phone number entry → SMS code → verify. E.164 normalization, reCAPTCHA
  verifier configured, clear error states for invalid/expired codes and rate limits.
- functions: onUserCreated trigger creates users/{uid} with role 'rider' and sets
  the matching custom claim
- setUserRole callable (admin-only) that updates the custom claim AND
  users/{uid}.role in one transaction. Note in code that the client must refresh
  its ID token for the new claim to take effect.
- src/lib/firebase/auth.ts: useAuth() hook exposing { user, role, loading }
- Middleware or layout guards: (rider) requires auth; (driver) requires role
  driver|admin; (admin) requires role admin. Unauthorized → redirect, not a
  blank screen.
- A dev-only seed script to create one admin, two drivers, three riders in the
  emulator.

ACCEPTANCE:
- Full OTP flow works against the Auth emulator
- Custom claims present in the ID token after role assignment
- A rider hitting /admin/dispatch is redirected, and Firestore rules independently
  deny the underlying reads
- Seed script runs idempotently

Do NOT implement email/password. Do NOT implement social login.
```

---

## P6 — Admin: fleet and driver management

```
Build the admin console CRUD for vehicles, vehicleClasses, and drivers per §3.

Routes: /admin/vehicles, /admin/drivers

- Vehicle classes: create/edit name, description, maxPassengers, maxLuggage,
  hero image, sortOrder, active
- Vehicles: full CRUD, assign to a class, multi-photo upload to Cloud Storage
  (exterior + interior), license plate visible to admin only, out-of-service
  date handling
- Drivers: create a driver profile linked to a user, headshot upload, bio,
  languages, years experience, active/bookable toggles. Separate admin-only tab
  for drivers/{id}/private/credentials with license and expiry dates.
- Show a warning badge when licenseExpiry is within 30 days
- Image uploads: client-side resize before upload, max 2MB, jpeg/png/webp only

ACCEPTANCE:
- All CRUD works against emulators
- Photos upload to Storage and render
- A non-admin cannot reach these routes AND cannot write these collections
  directly via the SDK
- License expiry warning appears correctly

These are internal tools. Functional and clear beats beautiful. Spend the design
budget on the rider preference screens instead.
```

---

## P7 — Pricing admin + rule set seeding

```
Build /admin/pricing for managing PricingRuleSets per §5.

Critical behavior: rule sets are VERSIONED and never edited in place. Editing
creates a new document with an incremented version; settings/global.activePricingRuleSetId
points at the live one. Past reservations keep referencing the version they were
priced with.

- Form covering the full PricingRuleSet schema: class rates, gratuity config,
  wait time, all surcharges, holiday list, cancellation windows, tax
- Airport zone editor: airports with zones and per-class arrival/departure flats
- A "test this rule set" panel: enter a sample trip, see the full line-item
  breakdown before publishing. This is how the client validates his own pricing.
- Publish action with a confirmation dialog showing a diff vs. the current version
- Seed script writing one realistic starter rule set

ACCEPTANCE:
- Editing creates a new version, never mutates the old document
- The test panel returns a correct breakdown matching the P3 engine
- A reservation created under v1 still shows v1 pricing after v2 publishes

Note in the UI that these values come from the client's discovery answers and
should not be guessed.
```

---

## P8 — Quote and booking flow (rider)

```
Build the rider booking flow: /book, calling createQuote then createReservation.

Cloud Functions (per §4):
- createQuote: validates input with Zod, resolves distance/duration via Google
  Maps Distance Matrix using the SERVER key, loads the active rule set, calls
  calculatePrice, returns the breakdown. No writes.
- createReservation: RE-PRICES server-side and ignores any client-supplied price.
  Creates a Stripe PaymentIntent with capture_method:'manual'. Writes the
  reservation + first statusEvent in a transaction. Enforces idempotencyKey.
  Generates a human-readable confirmationCode.

UI — multi-step, mobile-first at 375px:
1. Trip type: point-to-point / hourly / airport
2. Pickup, dropoff, stops with Google Places autocomplete; saved places offered
   first. Date and time with lead-time validation from settings.
3. Passengers, luggage, flight number if airport
4. Vehicle class selection — real photos, capacity, live price per class
5. Driver selection — profile cards with photo, bio, rating, languages, plus an
   "Any available driver" option. Respect blockedDriverIds.
6. Inline preferences: beverage, conversation level, greeting style ONLY —
   three questions maximum. Prefill from a saved profile if one exists.
7. Review with full line-item breakdown, then confirm

ACCEPTANCE:
- Quote returns in under 2s warm
- Submitting a tampered price is ignored; server price wins
- Duplicate submit with the same idempotencyKey creates exactly ONE reservation
- Reservation snapshots rider, driver, vehicle, and preference data per rule 4
- Entire flow usable one-handed at 375px

Do NOT ask for the full preference profile here. Three questions maximum —
front-loading a 15-field form kills conversion. The rest comes after ride one.
```

---

## P9 — Stripe payments

```
Implement the payment lifecycle per §4 of docs/BUILD-SPEC.md.

- Stripe Customer created on first booking, stored as users/{uid}.stripeCustomerId
- Payment method collection with Stripe Elements, saved for future use
- PaymentIntent at booking, capture_method:'manual', amount = estimated total
- completeTrip callable: recomputes the final price with actual wait time, tolls,
  parking, and gratuity, then captures. If the final amount EXCEEDS the
  authorization, capture the authorized amount and create a separate PaymentIntent
  for the difference — Stripe cannot capture above the auth.
- stripeWebhook HTTP function: verify signature using req.rawBody. Idempotency
  via webhookEvents/{event.id} written in the same transaction as the effect.
  Handle payment_intent.succeeded, .payment_failed, .canceled,
  charge.dispute.created.
- AUTH EXPIRY: Stripe authorizations expire in 7 days. If pickup is more than 6
  days out, do NOT authorize at booking — save the payment method and authorize
  via a scheduled function 24h before pickup. Implement this now.
- cancelReservation: evaluate the window in LOCAL time, capture the fee or
  release the auth.

ACCEPTANCE (use Stripe test mode + `stripe listen`):
- Auth at booking, capture at completion, correct final amount
- Duplicate webhook delivery processes exactly once
- Final amount above auth handled without losing money
- Long-lead booking defers authorization correctly
- Cancellation inside and outside the fee window both behave correctly
- No Stripe secret key in the client bundle — grep the build output to prove it
```

---

## P10 — Preference profile ⭐ the differentiator

```
Build the full preference profile at /preferences, implementing PreferenceProfile
from §3.2 of docs/BUILD-SPEC.md.

This is the product's reason to exist. Give it the most design attention in the
entire build.

- Grouped sections: Refreshments · Comfort · Music & Atmosphere · Arrival &
  Greeting · Accessibility · Drivers · Notes
- Progressive: show completion percentage, let users save partially, never block
- Written in concierge voice, not form voice. "How do you like your ride?" not
  "Configure preferences." Options read like a good driver asking, e.g.
  "Prefer a quiet ride" / "A hello is plenty" / "Happy to chat."
- Preferred and blocked drivers pick from real driver cards
- Autosave on change with a subtle saved indicator — no Save button
- Post-ride prompt: after a completed trip, ask for 2-3 preferences they haven't
  set yet, one at a time, dismissible
- Preferences write to users/{uid}.preferences and are SNAPSHOTTED onto each new
  reservation at booking

ACCEPTANCE:
- Every field in §3.2 is editable
- Autosave works without data loss on rapid edits
- Snapshot onto reservation is a copy, not a reference — editing preferences later
  does NOT change past reservations
- Completion percentage is accurate
- Excellent at 375px

If any screen in this build gets extra polish, it's this one. It is the entire
competitive argument against Uber Black.
```

---

## P11 — Driver PWA and prep checklist

```
Build the driver app at /driver, mobile-first. Drivers use phones in cars — assume
one hand, sunlight, and gloves.

/driver/today:
- Today's assigned jobs, chronological, with the next one prominent
- Each card: time, rider name, pickup, dropoff, vehicle, status
- Pull to refresh; realtime listener scoped to THIS driver's assignments only

/driver/trip/[id]:
- Full trip detail with tap-to-navigate (Google/Apple Maps deep link)
- Tap-to-call and tap-to-text the rider
- ⭐ PREP CHECKLIST auto-generated from reservation.preferences — a real
  checkable list, e.g. "Fiji water, chilled" / "Quiet ride — greeting only" /
  "Cabin 68°F" / "Name sign: J. HARRIS — meet inside, baggage claim 4".
  Persist check state to the reservation. Only render items that are actually set.
- Large status buttons following the §3.4 state machine: En Route → Arrived →
  Passenger Onboard → Complete. One tap, confirmation on the destructive ones.
- Completion form: wait minutes, tolls, parking, notes, gratuity adjustment if
  policy allows
- Wait-time helper: when status is 'arrived', show a running timer and
  auto-populate wait minutes on completion

ACCEPTANCE:
- All buttons hit 44px minimum touch target
- Status transitions call updateTripStatus and are rejected server-side if illegal
- A driver cannot open or mutate another driver's trip (verify at the rules layer,
  not just the UI)
- Checklist renders only set preferences, and check state persists
- Readable outdoors — high contrast, no thin gray-on-gray

NO GPS. NO background location. Status is driver-reported by button press.
That's Phase 2.
```

---

## P12 — Admin dispatch board

```
Build /admin/dispatch — the screen the client's dispatcher lives in all day.

- Day view, date picker, default today. Query ONE DAY at a time with limit(200).
  Do not attach a listener to the whole reservations collection — Firestore
  bills per document read.
- Timeline or table by pickup time, color-coded by status
- Unassigned reservations pinned at the top with an urgency indicator when pickup
  is within 4 hours
- Assign driver + vehicle inline. assignDriver must reject conflicts: same driver
  or vehicle already assigned to an overlapping window. Show WHY it was rejected.
- When a rider's requested driver is unavailable: flag it, offer alternates with
  equal-or-better rating, set driverSubstituted, and notify the rider
- Manual booking entry for phone reservations — same createReservation path,
  bookedByAdmin true, with an option to skip payment collection and invoice later
- Reservation detail drawer: full history from statusEvents, price breakdown,
  preference snapshot, admin override of status with a required reason note
- /admin/customers: search by name or phone using the searchName field, with
  ride history and lifetime value

ACCEPTANCE:
- Assigning a double-booked driver or vehicle is rejected with a clear reason
- Day view stays under 200 document reads
- Manual booking produces a reservation identical in shape to a rider booking
- Every admin override writes a statusEvent with actor and reason
- Usable on a laptop at 1280px — this is a desk tool
```

---

## P13 — Notifications

```
Implement SMS and email notifications via Twilio and a Firestore trigger.

Trigger: onReservationWritten in functions/src/triggers/. Detect status changes
and dispatch the matching message. Idempotent — never send twice for one transition.

Rider SMS:
- Booking confirmed (confirmation code, pickup time, vehicle, driver)
- Driver assigned
- Driver en route with ETA
- Driver arrived
- Trip complete + receipt link
Driver SMS:
- New assignment
- Reminder 60 minutes before pickup (scheduled function, every 15 min)
Admin SMS/email:
- New booking
- Cancellation
- Any reservation still unassigned 4 hours before pickup

Also:
- Email receipt on completion with the full line-item breakdown
- All templates in one module, easy for the client to edit later
- Quiet hours: suppress non-urgent SMS 21:00-08:00 LOCAL time; urgent
  (driver en route/arrived) always sends
- Log every send to a notifications collection for debugging

ACCEPTANCE:
- Each status transition sends exactly one message
- Re-running a trigger does not duplicate sends
- Quiet hours respect the reservation's local timezone
- Templates render correct money and local times
- Twilio credentials are server-side only

Note for the client: A2P 10DLC registration is required before production SMS
and takes 1-3 weeks. Start it NOW, in parallel with the build — it is the single
most common launch delay.
```

---

## P14 — PWA, polish, error states

```
Make it installable and production-presentable.

- manifest.json, icon set, splash screens, theme color from settings.brandColors
- Service worker: cache the shell, offline fallback page. Do NOT cache
  authenticated Firestore data.
- Install prompt for drivers specifically — they should have an icon on the
  home screen
- Loading skeletons on every async surface. No layout shift.
- Error boundaries with recovery, never a white screen
- Empty states with a next action ("No trips today — book your first ride")
- Money formatting utility used EVERYWHERE. No raw cents rendered anywhere.
- Date/time always displayed in the reservation's local timezone with the zone
  label when it differs from the viewer's
- Full 375px pass on every rider and driver screen
- Basic a11y: focus states, labels, 4.5:1 contrast, keyboard nav on admin

ACCEPTANCE:
- Installs on iOS Safari and Android Chrome
- Lighthouse PWA passes; Performance ≥85 on the rider booking flow
- No unformatted money or UTC timestamps visible anywhere
- Every screen has loading, empty, and error states
```

---

## P15 — Security and payments review ⚠️ do not skip

```
Full review pass before any real money moves. Produce a written findings report
at docs/SECURITY-REVIEW.md, then fix everything found.

Firestore rules:
- Re-run all rules tests; add any missing cross-tenant denial cases
- Attempt every write path from a client SDK as a rider and confirm denial
- Verify no collection is left with a default-allow

Secrets:
- Grep the production build output for Stripe secret, Twilio token, server Maps key
- Confirm the browser Maps key is HTTP-referrer restricted and the server key is
  IP restricted
- Confirm both Firebase projects have distinct credentials

Payments:
- Test: duplicate webhook delivery, out-of-order delivery, final > auth,
  final < auth, full refund, partial refund, dispute, expired authorization,
  card declined at capture
- Verify every amount stored is an integer and no float math exists in the money path

Functions:
- Every callable verifies auth AND role before doing work
- Every callable validates input with Zod
- No callable trusts a client-supplied price, status, or userId
- HttpsError messages leak no internals

Data:
- Confirm reservations are never deleted, only status-changed
- Confirm preference snapshots are copies, not references

ACCEPTANCE:
- docs/SECURITY-REVIEW.md exists with findings and resolutions
- All findings fixed or explicitly accepted with written rationale
- Rules test suite green

This is the milestone that separates a fast build from a fast liability. Do not
skip it because the app "looks done."
```

---

## P16 — Seed, deploy, pilot readiness

```
Prepare for the live pilot.

- Deploy indexes: verify every query has its composite index in
  firestore.indexes.json and deploy them. A missing index fails in prod even
  though it worked in the emulator.
- Set minInstances: 1 on createQuote and createReservation. A 4-second cold start
  during booking reads as a broken app.
- Production seed script: real vehicle classes, real vehicles with real photos,
  real driver profiles, the client's actual pricing rule set, airports and zones,
  settings/global
- Firestore TTL policy on driverLocations.expiresAt (unused now, ready for Phase 2)
- Daily Firestore backup scheduled
- Budget alerts on the Google Cloud project — Maps API and Firestore reads
- docs/RUNBOOK.md: how to add a driver, add a vehicle, change pricing, refund a
  ride, handle a stuck reservation, roll back a deploy, and who to call
- Smoke test checklist for the pilot: 10 real rides end to end, verifying booking,
  assignment, checklist, status flow, final capture, and every SMS

ACCEPTANCE:
- Production deploy succeeds
- All indexes live
- A test booking on prod completes end to end with a real card
- Backups confirmed running
- Budget alerts fire on a test threshold
- RUNBOOK is complete enough that the client's dispatcher can use it unaided

Phase 1 is DONE when 10 consecutive real rides complete without manual
intervention.
```

---

## Sequencing notes

**Parallelizable if you're running multiple agents:** P6 and P7 (admin CRUD) can run alongside P8 (booking flow) once P2–P5 are locked. Everything before P5 is strictly sequential.

**Where builds like this actually go wrong:**

| Trap | Prevention |
|---|---|
| Pricing bugs found in week 3 | P3 before any UI, with real tests |
| Security rules written last | P4 before any data-writing feature |
| Timezone bugs at launch | Test in a non-UTC zone from day one |
| Stripe auth expiry on long-lead bookings | Handled explicitly in P9 |
| A2P 10DLC blocks SMS at launch | Start registration during P1, not P13 |
| Scope creep from client demos | Show work only at P8, P11, P16 |

**Don't demo before P8.** Showing a half-built admin panel invites feature requests you'll absorb for free.
