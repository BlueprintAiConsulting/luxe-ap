# Luxe — Project Memory (Blueprint AI Consulting Co.)

_Persistent context for this project. Read at the start of any session._

## The Consultant
- **Drew Hufnagle** — Blueprint AI Consulting Co.
- Builds online presence, custom apps + AI business systems, and marketing assets.
- Target market historically: local service / blue-collar businesses. THIS client is a major exception (see below).

## The Client (ride company owner)
- Owns/operates a **nationwide black-car / chauffeur network** — **2,500+ drivers across the USA**.
- **High-end clientele**, including **NBA players** and similar VIP / celebrity-tier clients.
- This is NOT a small local limo shop. It is a national, premium, high-volume operation.
- Status: owner does **NOT yet know the app is already built.** Plan: run front of meeting as normal discovery, then **reveal the built app at the END as the closer** (Drew's call — hold the demo till last, not first). Bigger punch after he's assumed it's hypothetical all meeting.
- He completed the initial discovery worksheet. More operational data still needed to seed/configure the app (pricing, fleet, drivers, service area, airports, branding).

## The Product — "Luxe"
- Single unified app (Next.js App Router) with three role-based sections: **rider**, **driver**, **admin/dispatch**.
- Firebase (Auth, Firestore, Cloud Functions v2), Stripe (manual-capture holds, SetupIntent for long-lead), Twilio SMS, Google Maps, PWA.
- Firebase project ID: `luxe-app-1786335311`.
- Local path: `/Users/drewsmacbookpro/Documents/antigravity/goofy-meitner/luxe`
- Built in Antigravity IDE + Claude Code from a BUILD-SPEC.md and sequenced prompts.
- **Differentiator:** rider **PreferenceProfile** (beverage, temp, music, conversation, greeting, seating, accessibility, etc.) that auto-generates a **driver prep checklist** per trip.
- Key backend: pure deterministic pricing engine (money as integer cents), reservation state machine, webhook idempotency, role-based security (writes only via Cloud Functions).

## Build Status (as of Aug 2026)
- Phase 1 is **code-complete**. All P0/P1 review bugs from two audit rounds fixed. `functions` build + frontend `tsc --noEmit` both pass clean, no `@ts-nocheck` remaining.
- **Remaining before live pilot:** seed real data (pricing, vehicle classes, drivers, airports), wire real keys (Stripe, Twilio, Google Maps, admin phone), end-to-end emulator test, deploy to live URL.
- "Luxe" is a **placeholder brand name** — hardcoded in app branding, SMS sender name, and confirmation code prefix (`BCC-`). Needs the client's real business name.

## Pricing / Commercial (LOCKED STRATEGY — low upfront, win on rev-share)
- **CRITICAL CONSTRAINT:** owner already REJECTED another vendor who quoted "tens of thousands" upfront. A big build fee is dead on arrival. Do NOT lead with a large flat fee.
- **Winning structure:**
  - Setup/onboarding fee: **target $7k–$10k** (Drew wants above $7k). Keep it under $10k so it reads as "single-digit thousands," NOT the "tens of thousands" the other vendor got rejected for. Frame as "getting your national network live," not "building software."
  - **Per-completed-ride fee: $1–$3 OR 2–5% of each booking.** The real long-term money. Across 2,500 drivers, a fraction of volume out-earns any flat fee.
  - Optional SaaS floor: **$300–$500/mo** to cover slow months.
  - **Budget discovery:** feel out his ceiling in the meeting before finalizing the number. Ask what he expected to invest to get something like this live. Anchor against the rejected "tens of thousands" — "this is done, and it's a fraction of that."
- **The unfair advantage:** the app is ALREADY BUILT. Drew can say "pay almost nothing to start, I only make money when you make money." The rejected vendor was quoting to BUILD; Drew is quoting to LAUNCH something that exists. Removes owner's risk entirely.
- **Guardrail:** per-ride fee MUST be tracked automatically via platform booking data (completed-trip count). Never rely on owner self-reporting.
- Do NOT quote a number in the meeting. Demo first, gather data, then send a proposal.
- Earlier deliverables: phased build plan, discovery questionnaires, budget-reframe script, rev-share term sheet (offered), BUILD-SPEC.md, Antigravity prompt list.

## Open Threads / Next Steps
- Next meeting: soft demo reveal + capture launch-critical data (business name, pricing basics, vehicle classes, service area/airports, launch drivers, dispatch/alert phone, Stripe status, amenities).
- After data: write seed script, load real config, test end-to-end, connect keys, deploy pilot.
- Then: formal Phase 1 proposal + pricing sheet (re-scoped for enterprise/national scale), Phase 2 roadmap.
