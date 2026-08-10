# P15 Security and Payments Review Findings

## 1. Firestore Rules

**Findings:**
1. **Default-Allow Check:** Passed. The global rule `match /{document=**} { allow read, write: if false; }` ensures no collection has default-allow permissions.
2. **Client SDK Write Paths:**
   - Client writes to `users/{uid}`, `reservations`, and `driverLocations` are strictly denied by rules (`allow write: if false;` or limited to `isOwner`/`isAdmin`).
   - *Issue*: The query in `src/app/(rider)/dashboard/page.tsx` uses `where("userId", "==", user.uid)` instead of `where("riderId", "==", user.uid)`. Because the schema and the Firestore rules use `riderId`, this will result in failed queries/permission errors for legitimate riders trying to see their dashboard.
3. **Cross-Tenant Denial Cases:** 
   - Rule tests exist for `users`, `savedPlaces`, and `reservations` checking that Rider A cannot read Rider B's data, and Driver B cannot read Driver A's data. 
   - *Issue*: The test suite is currently failing to run because the Firebase Emulators aren't automatically started in the Vitest environment, and some tests are missing for cross-tenant checks on `driverLocations`.
   - *Fix Needed*: We need to add tests for `driverLocations` to ensure cross-tenant denial (i.e. Rider A cannot read a driver location assigned to Rider B).

## 2. Secrets Leakage

**Findings:**
1. **Stripe Secret:** No leaks found in the frontend (`src/` directory). The Stripe secret (`STRIPE_SECRET_KEY`) is only used in backend cloud functions where it is correctly loaded via `process.env`. The frontend properly uses `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
2. **Twilio Token:** No leaks found. Handled exclusively in `functions/src/lib/notifications/sender.ts` using `process.env`.
3. **Maps Key:**
   - **Browser Key:** The frontend does not use a browser-side Google Maps API key (we are natively linking out via Apple Maps links, e.g. `https://maps.apple.com/?daddr=...`). No browser-side key is leaked or needed at present. 
   - **Server Key:** Only utilized within Cloud Functions. 
   - *Action Item*: In the Google Cloud Console, ensure the Maps API key is strictly IP-restricted to the Cloud Functions outbound IPs.
4. **Distinct Firebase Projects:** Verified. The previous deployment successfully configured the new, distinct project (`luxe-app-1786335311`).

## 3. Payments Logic

**Findings:**
The current Stripe Webhook handler (`functions/src/api/webhook.ts`) has several shortcomings regarding idempotency and edge cases:
1. **Duplicate Webhook Delivery:** *Handled.* The handler uses a Firestore transaction to write to `webhookEvents/{eventId}` which properly prevents duplicate processing.
2. **Out-of-Order Delivery:** *Vulnerable.* The code currently blindly updates the payment status based on whatever event arrives last. If `payment_intent.amount_capturable_updated` (authorized) arrives *after* `payment_intent.succeeded` (captured), it could downgrade a captured reservation back to authorized. 
3. **Final > Auth & Final < Auth:** *Handled for capture*, but the webhook strictly relies on `paymentIntent.amount_received`. 
4. **Full/Partial Refunds:** *Vulnerable.* The webhook does not listen for `charge.refunded` events. If a partial or full refund is issued in Stripe, it is never reflected in the database. 
5. **Disputes:** *Vulnerable.* The webhook does not handle `charge.dispute.created` or `charge.dispute.funds_withdrawn`. 
6. **Card Declined at Capture:** *Handled.* Handled via `payment_intent.payment_failed` which updates the status to `failed`.
7. **Expired Authorization:** *Handled.* Handled via `payment_intent.canceled` which sets status to `refunded`. (Though a dedicated `expired` state could be clearer, `refunded` is functional).

---

## Remediation Plan

1. **Dashboard Query:** Update `dashboard/page.tsx` to query `riderId` instead of `userId`.
2. **Rules Tests:** Add missing `driverLocations` cross-tenant test and ensure tests run properly in the emulator.
3. **Payments Logic:** Refactor `webhook.ts` to strictly handle out-of-order events (e.g. tracking state machines properly so a captured payment cannot go back to authorized) and add handlers for `charge.refunded` and `charge.dispute.created`.
