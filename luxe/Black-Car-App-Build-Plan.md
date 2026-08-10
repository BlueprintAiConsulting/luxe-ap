# Black Car Concierge App — Build Plan
**Prepared by Blueprint AI Consulting Co.**
Internal strategy + client-ready components

---

## 1. Executive Summary

**Build speed is not the constraint. Scope discipline, compliance calendar, and how you price are the constraints.**

Building with Claude Code + Antigravity compresses the code-writing portion of this project by roughly 5–10x. That is real and it changes the plan materially: Phase 1 goes from a 6–10 week build to a 2–3 week build, and the full three-phase vision drops from a $150k–$400k agency quote to roughly **$40k–$70k of your actual billable effort**. Phase 2 stops being a fantasy and becomes a normal quarter of work.

**What AI-assisted build does not compress:**

| Bottleneck | Why speed doesn't help |
|---|---|
| Pricing-rule extraction from the client | Client-speed bound. He'll take three conversations to remember his own wait-time policy. |
| Payment edge cases + reconciliation | You need real cards, real refunds, real disputes, real chargebacks. Calendar time, not code time. |
| Livery/broker licensing + insurance (Phase 2) | Attorney and underwriter speed. Weeks regardless. |
| Stripe Connect KYC for affiliate operators | Each operator onboards on their own schedule. |
| Driver adoption / change management | Human problem. Zero code content. |
| Field QA | Does the driver app work on a 4-year-old Android in an airport parking garage with one bar? |
| Security review of AI-generated code | See §4, risks 10–11. This is the one that bites fast builders. |

**The strategic implication is the opposite of what most people assume.** Your speed is not a reason to quote less — it's an arbitrage. Your marginal cost to build Phase 2 is now low while the upside is uncapped. So take **less cash and more rev-share**, not the other way around. Details in §6.

The product thesis is unchanged. His differentiator is **not** dispatch — Uber Black, Blacklane, and Carey already solved dispatch and he cannot outspend them. It's **the concierge preference layer**: the ride remembers you. Your driver. Your water, cold. No talking. Cabin at 68. Name sign inside baggage claim. That's a data model plus a driver prep checklist — cheap to build, nearly impossible for a volume platform to replicate, and it justifies a premium per-ride price.

**Recommendation: build a working demo with his actual vehicles in it *before* the next sales meeting, use it to close a paid discovery sprint, then ship Phase 1 in 3–4 weeks on a cash-light / rev-share-heavy deal.**

Two material unknowns remain (his current software stack, and how money moves). Neither can be guessed, and neither is a coding problem.

---

## 2. Recommended Approach

### 2.1 The strategic reframe

| What he thinks he's buying | What he should actually buy |
|---|---|
| Uber for limos | A concierge booking platform his existing clients love |
| Public app, hundreds of drivers, day one | His fleet first, network second, public third |
| Real-time hailing | Pre-booked reservations (85–90% of black car revenue) |
| One big build | Three funded phases, each paying for the next |

**Why "choose your driver" and "on-demand" fight each other:** you cannot promise a specific named driver *and* a 5-minute ETA. Named-driver selection only works on pre-booked reservations. This is a feature-level argument for reservations-first, not just a budget argument. Use it in the client conversation — it makes the phasing his idea.

### 2.2 Recommended tech stack

*Note: with GPS tracking out of Phase 1, Maps is only used for address autocomplete and distance/duration pricing — no realtime location channel needed until Phase 2+.*

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (React) — installable PWA | One codebase covers rider, driver, and admin. No app store gate. Ships fastest. |
| Backend / DB | Supabase (Postgres + Auth + Realtime + Storage) | Auth, row-level security, realtime driver location, and file storage out of the box. Removes weeks of plumbing. |
| Payments | Stripe (Payment Intents; Stripe Connect later in Phase 2) | Auth-at-booking / capture-on-completion is native. Connect handles affiliate payouts when you get there. |
| Maps / routing | Google Maps Platform or Mapbox | Address autocomplete, distance/duration for pricing, airport polygons. Budget the API cost — it's a real line item. |
| Notifications | Twilio SMS + web push | SMS is non-negotiable for drivers and for "your driver is 5 minutes out." |
| Flights | FlightAware or AviationStack (Phase 1.5) | Auto-adjust airport pickups for delays. Small effort, disproportionate perceived value. |
| Hosting | Vercel + Supabase managed | Near-zero devops. Keeps your retainer margin. |

**Ownership note:** because there's a rev-share on the back end, build on a stack you own outright. Avoid closed no-code platforms that hold the app hostage or take a cut. If speed matters more than ownership for a throwaway prototype, a rapid builder is fine for the *demo* — but the production build should be Next.js + Supabase.

**Native iOS (Phase 3):** wrap the PWA with Capacitor rather than rebuilding native. Gets you App Store presence, push, and background location for a fraction of a ground-up native build.

---

## 3. Implementation Plan

### Phase −1 — The Demo Close (new — this is your unfair advantage)
**2–3 days · unbilled · pure sales weapon**

Because you can build fast, do not sell this project on a slide deck. Build a working clickable prototype with **his actual vehicles, his actual driver photos, his actual city** in it, and open your laptop in the meeting.

Scope it to exactly three screens: book a ride → pick vehicle and driver → set preferences. Fake data behind it, no backend. Two days of work.

Effect: you stop competing on price against the shop that quoted "tens of thousands," because you're the only one who showed up with the thing already partially existing. It also flushes out his real requirements faster than any discovery call — people react to pixels, not questions.

---

### Phase 0 — Paid Discovery Sprint
**1 week · $1,500–$2,500 · billed separately**

Do not quote Phase 1 until this is done. You have two unknowns that can swing the build by 40%.

Deliverables:
1. Current-state audit (software, data, workflow, who touches what)
2. Documented pricing rules — this is the #1 thing that blows up limo app builds
3. Payment and money-flow decision
4. Driver network structure map (employees vs 1099 vs affiliate companies)
5. Clickable wireframes of the 6 core screens
6. **Fixed, defensible Phase 1 quote**

Why this wins the deal: he was quoted "tens of thousands" by someone who never asked these questions. You're the one who says *"nobody should quote you until we define it — here's a small paid engagement to do that, and it credits toward the build."*

---

### Phase 1 — Concierge Booking Platform (his fleet)
**2–3 weeks build · 3–4 weeks to production launch · $8,000–$10,000 cash + rev-share (see §6)**

*Calendar is longer than build because of payment testing with real cards, client feedback cycles, driver training, and one week of live pilot on a handful of real rides before full cutover. Do not compress the pilot — that's where you find out the wait-time math is wrong.*

Scope is deliberately ruthless. Everything here exists to get to one outcome: **a client books a ride in the app, the right driver shows up with the right water, and the card gets charged.**

**Rider PWA**
- Sign up / login (SMS OTP — no passwords, black car clients won't tolerate friction)
- Book a reservation: pickup, stops, dropoff, date/time, passengers, luggage
- Vehicle class selection with real photos of *his actual cars* (sedan, SUV, Sprinter, stretch)
- Driver selection — browse driver profiles (photo, bio, years driving, languages, rating), pick preferred or "any available"
- **Preference profile** (the differentiator — see 3.1)
- Live quote before booking
- Trip status: confirmed → driver assigned → en route → arrived → in progress → complete
- Ride history + rebook-in-two-taps
- Receipt via email/SMS

**Driver PWA**
- Today's assigned jobs
- **Auto-generated prep checklist per ride** pulled from the rider's preference profile — this is the operational magic. Preferences that live in a form nobody reads are worthless; preferences that print as a pre-trip checklist actually happen.
- Status buttons: en route / arrived / passenger onboard / complete
- Log wait time, tolls, parking
- **No GPS tracking in Phase 1** — status is driver-reported via button press, not location-derived

> **Why cutting GPS is the right call.** Pre-booked black car doesn't need it: the car is scheduled and usually early. It removes background location permissions, battery drain, driver privacy objections ("is he watching me all day?"), and a genuinely fiddly piece of engineering. Driver-pressed status covers 95% of the rider's real question.
>
> **The one gap to cover:** riders will still ask "where's my car?" Handle it with automated status texts — *"Marcus is en route, arriving approximately 7:45"* — driven off the driver's button press plus the scheduled pickup time. **Live GPS lands in Phase 2.**
>
> **Design for it now, don't build it now.** Two cheap decisions in Phase 1 make Phase 2 GPS a drop-in instead of a refactor:
> 1. Give every trip a proper **status state machine** (`scheduled → assigned → en_route → arrived → onboard → complete`) with timestamps on each transition. GPS later just becomes another way to trigger the same transitions.
> 2. Stub a `driver_locations` table (`driver_id`, `trip_id`, `lat`, `lng`, `recorded_at`) in the schema now, unused. Costs nothing, saves a migration on a live system later.
>
> Everything else — background location permissions, battery management, map UI, geofenced arrival detection — stays out until Phase 2.

**Admin / Dispatch console**
- Reservation board (day/week view)
- Assign or reassign driver + vehicle
- Manual booking entry (phone bookings still exist — do not skip this)
- Vehicle and driver management
- Pricing rules configuration
- Basic revenue reporting

**Payments**
- Card on file, auth at booking
- Capture on completion with gratuity, wait time, tolls
- Cancellation windows and fees

**Notifications**
- Rider: booking confirmed, driver assigned, driver en route, driver arrived, receipt
- Driver: new assignment, reminder 60 min before pickup
- Admin: new booking, cancellation, unassigned ride within X hours of pickup

**Explicitly OUT of Phase 1** (say this out loud to the client, in writing):
**live GPS tracking / map-based car location → Phase 2** · on-demand hailing · third-party operator onboarding · split payouts · native apps · corporate invoicing/AR · loyalty program · surge pricing · in-app chat · multi-market config

---

#### 3.1 The Preference Profile — spec it properly, it's the whole product

| Category | Fields |
|---|---|
| Beverage | Brand + type (still/sparkling/soda/none), served cold or room temp |
| Conversation | Silent ride / light greeting only / happy to chat |
| Climate | Target cabin temp, front vs rear vents |
| Audio | Off / genre / satellite station / connect my phone, target volume |
| Scent | None (allergy flag) / preferred |
| Charging | USB-C / Lightning / wireless pad |
| Reading | Newspaper title, magazines, none |
| Greeting | Curbside / meet inside with name sign / specific terminal door |
| Seating | Preferred seat, partition up/down, privacy shades |
| Accessibility | Mobility assist, service animal, hearing accommodations |
| Child seats | Type + count (also a liability + revenue item) |
| Route | Avoid highways, avoid tolls, scenic OK, fastest only |
| Drivers | Preferred list, blocked list |
| Saved places | Home, office, usual airport + terminal |
| Notes | Free text for the things no form anticipates |

**Design rule:** never make a rider fill this out before their first booking. Capture 2–3 preferences inline during checkout, then prompt to complete the profile *after* a great first ride. Front-loading a 15-field form kills conversion.

---

### Phase 2 — The Network Layer (rev-share funded)
**4–5 weeks build · 8–10 weeks calendar · scoped after Phase 1 ships**

*Calendar nearly doubles the build here and that gap is not code. It's attorney review, insurance verification, and Stripe Connect KYC onboarding for each affiliate operator — all of which run on someone else's clock. Plan for it; don't promise around it.*

This is where the "hundreds of drivers in his network" becomes the asset. It is also where the legal and financial complexity lives — which is exactly why it must not be in Phase 1.

- Partner operator / affiliate onboarding portal
- Credential vault: insurance certs, TCP/PUC/livery licenses, vehicle registration, driver background checks — **with expiry alerts**
- Job farm-out flow: offer a ride to the network, first-accept or dispatcher-approved
- Affiliate rate sheets and margin control (what he charges vs what he pays out)
- Stripe Connect split payouts + 1099 handling
- Quality control: ratings, incident reports, auto-suspension thresholds
- Preference profile propagation to affiliate drivers (the brand promise has to survive the handoff — this is the hardest product problem in Phase 2)

**Live GPS tracking (moved up from Phase 3):**
- Driver location streaming during active trips only — never always-on
- Rider-facing map: "your car is 6 minutes away"
- Geofenced arrival auto-detection (driver no longer has to press "arrived")
- Dispatcher fleet map for live oversight
- Automatic wait-time start on geofence entry — *this one pays for itself; wait time is revenue that currently gets forgotten and never billed*

> **Why GPS belongs in Phase 2, not Phase 1:** it stops being a nice-to-have the moment third-party operators enter the picture. With his own drivers, he can call them. With affiliate drivers he's never met, running someone else's brand promise, location is how he verifies the job actually happened the way it was billed. It's a trust-and-verify tool, not a rider feature.
>
> **Driver privacy — get ahead of this.** Independent operators will push back on tracking harder than employees will. Policy to write into the affiliate agreement: location captured only between "en route" and "trip complete," never between jobs, visible only to dispatch and the assigned rider, retained 90 days then purged. Say it plainly in the driver onboarding. Attempting to track affiliates between jobs will cost him the network.

### Phase 3 — Public Launch + Scale
**Scoped separately**

- On-demand / ASAP dispatch with live matching *(now unblocked — the GPS layer from Phase 2 is the prerequisite)*
- Native iOS (Capacitor wrap) and Android
- Corporate accounts: multiple riders under one billing entity, cost centers, monthly invoicing, net terms — *this is usually where the real revenue is in black car; consider pulling it forward if his book is corporate-heavy*
- Loyalty / membership tier
- Multi-market configuration
- Hotel and travel-agent booking portal

---

## 4. Risks and Blockers

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | **Underpricing your own speed.** You can build Phase 1 in ~3 weeks, so the temptation is to quote cheap. He already anchored at "tens of thousands." | Critical | Price the outcome, not the hours. Never disclose build time. See §6. |
| 2 | **Regulatory exposure when he brokers rides to third-party operators.** Livery/TCP licensing, commercial insurance, broker status vary by state. | Critical | Phase 2 gate. He needs his own attorney and insurance broker before a single affiliate ride is dispatched. *I'm not a lawyer — this is a flag, not legal advice.* |
| 3 | **Pricing rules are more complex than anyone expects.** Hourly/as-directed, minimum hours, airport flat rates, meet-and-greet fees, wait time, deadhead, after-hours, holiday, tolls, fuel surcharge, gratuity policy. | High | Document exhaustively in Phase 0. Build a configurable rules engine, not hardcoded math. This single item sinks most limo app builds. |
| 4 | **Driver adoption.** Drivers ignore new apps that don't put money in their pocket. | High | Make the driver app *reduce* their work (prep checklist, no phone tag, auto-logged wait time). Have the owner mandate it for his own fleet. |
| 5 | **"Choose your driver" vs. utilization.** Popular drivers get overbooked; riders get disappointed. | Medium | Build substitution policy up front: preferred driver unavailable → notify + offer alternate with equal-or-better rating, rider one-tap approves. |
| 6 | **Airport permitting.** Many airports require separate permits/geofenced staging for app-dispatched pickups. | Medium | Verify per market in Phase 0. Likely already handled if he's an established operator. |
| 7 | **Scope creep — and it's worse when you build fast.** Once he sees you turn a request around in a day, requests become constant. Fast builders lose money on unbounded revisions, never on build time. | Critical | Written change-order process from day one. Batch feedback into scheduled review cycles instead of taking requests ad hoc. Never say "yeah that's easy" out loud. |
| 10 | **Supabase row-level security misconfiguration.** The single most common way an AI-assisted Postgres app leaks every customer record. Rider A can query Rider B's addresses, phone, and card metadata. | Critical | RLS policies written deliberately per table, not generated and trusted. Write explicit negative tests: log in as Rider A, attempt to read Rider B's rows, assert failure. Do this before the pilot, not after. |
| 11 | **AI-generated payment code that looks right and isn't.** Missing Stripe webhook idempotency (double charges), auth/capture amount mismatches, secrets bundled client-side, no replay protection. | Critical | Dedicated security + payments review pass as a named milestone, not a vibe check. Test refunds, partial captures, disputes, and duplicate webhook delivery explicitly. |
| 12 | **No one else can maintain it.** Fast solo builds concentrate all knowledge in you — which is a risk to the client and a ceiling on you. | Medium | Generate schema docs and a runbook as you go. Matters more given the rev-share: this thing has to outlive your attention. |
| 8 | **Rev-share defined on the wrong number.** "Net revenue," app-originated-only, or no reporting rights turns your percentage into a percentage of nothing. | Critical | Gross bookings, all company rides, minimum monthly floor, quarterly reporting + audit right, acceleration on sale. Signed before Phase 1 starts, not after. See §6.1. |
| 13 | **"Where's my car?" complaints** in the Phase 1 gap before GPS ships. | Low–Medium | Automated status texts with ETA off driver button press. Set expectations at booking. GPS lands in Phase 2 — design the schema for it now (state machine + stubbed location table) so it's a drop-in, not a refactor. |
| 14 | **Affiliate drivers reject GPS tracking in Phase 2** and you lose network supply. | High | Location captured only between "en route" and "complete," never between jobs. 90-day retention. Stated plainly in the affiliate agreement, not buried. Tracking them between jobs will cost him the network. |
| 9 | **Payment/chargeback exposure.** No-shows and disputes are common in black car. | Medium | Clear cancellation windows, signed T&Cs at booking, capture proof-of-service (driver timestamps + optional arrival photo). |

---

## 5. Success Metrics

**Phase 1, measured at day 90 post-launch:**

| Metric | Target |
|---|---|
| Bookings placed in-app vs. phone/text | ≥ 40% |
| Repeat booking rate (riders with 2+ rides) | ≥ 50% |
| Preference profile completion (riders with 2+ rides) | ≥ 60% |
| Dispatcher hours saved per week | ≥ 8 |
| Avg. ticket, app booking vs. phone booking | ≥ parity, target +5% |
| On-time arrival (driver arrived by scheduled time) | ≥ 95% |
| Preference fulfillment (driver checked off all items) | ≥ 90% |
| Payment capture success rate | ≥ 98% |
| Rider rating average | ≥ 4.8 |

**Business metric that matters to Drew:** Phase 1 must produce enough operational proof that Phase 2 gets funded — either from his cash or from rev-share he's now motivated to protect.

---

## 6. Commercial Strategy — How to Price Your Speed

### 6.1 The three rules

**Rule 1: Never sell hours. Sell the outcome.**
The moment he knows Phase 1 is three weeks of work, $12k becomes "$4k a week" in his head and you're in a rate negotiation you can't win. He is buying a booking system that captures his clients' preferences and stops his dispatcher from playing phone tag. That's the unit. Quote deliverables and dates, never effort.

**Rule 2: The rev-share is the deal. The cash just has to cover your risk.**
Rev-share is confirmed at launch, so structure accordingly. Your marginal cost to build Phase 2 is low and the upside if his network of hundreds of drivers turns on is uncapped — that asymmetry says take less cash up front and more back-end.

| Structure | Phase 1 cash | Rev-share | When to use |
|---|---|---|---|
| A — Floor | $10k | 5% of gross bookings, 3 yr | He balks at anything higher on the back end |
| **B — Recommended** | **$8k** | **8–10% of gross bookings, 5 yr** | Default. Cash covers your build risk, back end is where you actually get paid |
| C — Aggressive | $5k | 12–15%, 5 yr, Phase 2 built at no charge | Only after discovery confirms his book of business and that the driver network is real |

**Non-negotiables regardless of which you pick:**
- **Gross bookings, not net.** Never let "revenue" get defined after his costs. This is the single clause that decides whether the rev-share is worth anything.
- **Minimum monthly floor** (e.g. $500/mo) once live. Protects you if he under-markets the app and volume never materializes — which is the most likely failure mode, and it wouldn't be your fault.
- **Term starts at launch, not at signature.** Don't burn months of your term during the build.
- **Quarterly reporting + audit right.** You need visibility into the number your check is calculated from.
- **Acceleration on sale.** If he sells the business, you get a defined buyout multiple, not a handshake.
- **Code ownership stays with you**, perpetual license to him, license terminates with the rev-share or he buys out at a defined number.

Do not take equity in the limo company. Operator-built apps rarely scale past the founder's own client list, and that equity is illiquid.

> **The one thing that kills rev-share deals:** he stops pushing clients to the app and reverts to phone bookings, so gross bookings through the platform stay tiny while his business does fine. Write in that the rev-share applies to **all rides his company books**, not just app-originated ones — or at minimum, all rides from clients who have ever used the app. Otherwise you've built him a tool and given yourself a percentage of nothing.

**Rule 3: Charge for Phase 0 even though it's "just questions."**
Especially because you build fast. The discovery sprint is what makes the fixed price defensible and what separates you from the shop that quoted off a phone call. It also protects you: pricing rules you didn't document become change orders you eat.

### 6.2 Guardrails to write into the SOW

- Out-of-scope list attached and initialed (copy from §3, Phase 1)
- Feedback batched into **two** scheduled review cycles, not continuous
- Change orders quoted in writing before any work starts
- Rev-share terms defined *before* Phase 1 kickoff: % of what exactly (gross bookings, not net), term length, what happens if he sells the business, what happens if he stops paying hosting
- You own the code; he gets a perpetual license. If the rev-share ends, so does his license — or he buys it out at a defined number.
- Hosting/maintenance retainer starts at launch, separate line item

### 6.3 The client conversation script

> "What you described — real-time matching, hundreds of operators, automatic payouts, App Store — is a real platform, and the shop that quoted you tens of thousands was quoting a slice of it and hoping you wouldn't ask which slice.
>
> But I don't think you should build that first, and it's not about money. Uber Black exists. Blacklane exists. You will never out-dispatch them and you don't need to. What they can't do is remember that Mr. Harris wants Fiji water cold, no conversation, cabin at 68, and Marcus driving. That's your business. That's why people pay you three times a rideshare.
>
> So here's what I want to build first — actually, let me just show you."
>
> *[open the laptop, walk the prototype]*
>
> "Your fleet, your clients. They pick the car, pick the driver, set their preferences once — and every ride after that just knows. Your drivers get a prep checklist before every pickup so it actually happens instead of living in somebody's head. Your dispatcher stops playing phone tag.
>
> One thing before I put a number on it: I need a week to document how you actually price. Every one of these builds that fails, fails on pricing — hourly minimums, airport flats, wait time, gratuity. I charge for that week, it credits toward the build, and you get a fixed price you can hold me to. Nobody should be quoting you before that's done, including me.
>
> And I'll tell you where my head's at on the deal. I'd rather take less cash and a piece of what this does, because I think the network piece — your hundreds of drivers — is the real business. I want to be motivated to build that with you, not sell you a thing and disappear."

**Why this works:** the demo removes price as the frame of comparison, the phasing becomes his strategic decision rather than your limitation, the paid discovery sprint kills the lowball competitor on process, and the rev-share ask lands as alignment instead of a grab.

---

## 7. Discovery Questionnaire — run this on the client

### Current operations
1. What software do you use today for reservations, dispatch, and driver assignment? (Limo Anywhere, Moovs, Book Rides Online, spreadsheets, paper, other?)
2. If you're on a platform — are we replacing it, or does it stay for accounting/back office?
3. How many reservations per week right now? Peak vs. slow season?
4. How do bookings come in today — phone, text, email, website form, repeat clients direct to drivers?
5. Who does dispatch, and how many hours a week does it eat?
6. Do you have exportable customer history? How many years, how many records?

### Fleet and drivers
7. How many vehicles do you own outright, by class?
8. How many drivers are W2 vs 1099 vs their own LLC with their own car?
9. Of the "hundreds in your network" — are those individual drivers or partner limo companies? Do you have any agreement with them today?
10. How do you currently farm out a job you can't cover? What do you pay them?
11. Do you verify their insurance and licensing today? How?

### Pricing (most important section — do not rush this)
12. Walk me through pricing a point-to-point ride. Exact formula.
13. Hourly / as-directed rate by vehicle class. Minimum hours?
14. Airport flat rates — which airports, which zones, both directions?
15. Gratuity: included automatically? What percent? Can the rider change it?
16. Wait time — free grace period, then what rate, billed in what increments?
17. Fuel surcharge, tolls, parking, airport fees — passed through or built in?
18. After-hours, holiday, or peak surcharges?
19. Meet-and-greet fee? Child seat fee? Extra stop fee?
20. Cancellation policy — free until when, then what penalty?
21. Deadhead / out-of-area charges?

### Money
22. Who processes cards today, and what are you paying in fees?
23. Do you charge at booking, after the ride, or invoice?
24. Do you have corporate accounts on net terms? What % of revenue? *(If this is over 30%, we may need to pull invoicing into Phase 1.)*
25. How do drivers get paid — payroll, per-ride, weekly settlement?
26. Do you want the app to handle driver payouts, or does that stay in your existing process?

### Clients and market
27. Rough split: corporate, personal/VIP, weddings/events, airport transfer?
28. Top 10 clients by revenue — do they book through an assistant or directly?
29. What metro(s) do you operate in? Any airport permits or restrictions?
30. Who do you lose business to, and why?

### The vision
31. When you say "Uber for black car" — what's the single moment you picture?
32. If the app only did one thing perfectly, what would it be?
33. What does success look like 12 months from now, in dollars?

---

## 8. What I Need From You (Drew)

1. **Run the questionnaire** — sections 3 (pricing) and 4 (money) are the ones that unblock a real quote
2. **Decide the rev-share terms before Phase 1 starts** — percentage, revenue base, term length, what happens on sale of the business
3. **Confirm his metro(s)** so I can check state livery/broker regulations and airport rules
4. **Photos** of his actual vehicles and drivers — real photos are the entire premium feel of the rider app, stock images will destroy it
5. **His top 3 competitors** by name, so we position the app against something specific

---

## 9. Recommended Next Actions

| # | Action | Owner | Timing |
|---|---|---|---|
| 1 | Get his vehicle + driver photos and his city | Drew | Now — blocks the demo |
| 2 | **Build the 3-screen demo prototype** (Phase −1) | Blueprint | 2–3 days |
| 3 | Run the demo meeting + close the discovery sprint (§6.3) | Drew | This week |
| 4 | Send the questionnaire ahead of the discovery session | Drew | With the meeting invite |
| 5 | Lock rev-share + IP ownership terms with an attorney | Drew | Before Phase 1 signature |
| 6 | Fixed Phase 1 quote + SOW with out-of-scope list attached | Blueprint | End of discovery week |
| 7 | Build Phase 1 | Blueprint | Weeks 2–4 |
| 8 | Live pilot on 5–10 real rides before full cutover | Both | Week 4 |

---

*Legal, insurance, and tax structuring items flagged in this document are identified as risks, not advised on. Have the client engage his own attorney and insurance broker before Phase 2.*
