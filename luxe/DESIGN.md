---
name: Luxe
description: Exclusive, premium, professional ride booking.
colors:
  brand: "oklch(20% 0.01 260)"
  accent: "oklch(85% 0.04 80)"
  neutral-50: "oklch(98% 0.005 260)"
  neutral-100: "oklch(95% 0.005 260)"
  neutral-200: "oklch(90% 0.005 260)"
  neutral-300: "oklch(80% 0.005 260)"
  neutral-400: "oklch(70% 0.005 260)"
  neutral-500: "oklch(60% 0.005 260)"
  neutral-600: "oklch(50% 0.005 260)"
  neutral-700: "oklch(40% 0.005 260)"
  neutral-800: "oklch(30% 0.005 260)"
  neutral-900: "oklch(20% 0.01 260)"
  neutral-950: "oklch(15% 0.01 260)"
typography:
  body:
    fontFamily: "var(--font-geist-sans)"
rounded:
  xl: "0.75rem"
  2xl: "1rem"
components:
  card:
    backgroundColor: "{colors.neutral-50}"
    rounded: "{rounded.2xl}"
---

# Design System: Luxe

## 1. Overview

**Creative North Star: "The Modern Concierge"**

Luxe is an exclusive, premium ride-booking application. The interface feels like a high-end black car service: confident, quiet, and perfectly tailored. We prioritize clarity, refined hierarchy, and subtle luxury over flashy ornamentation. We explicitly reject cheap, cartoonish UI or loud generic color schemes.

**Key Characteristics:**
- Muted, sophisticated neutrals anchored by a deep charcoal.
- Warm champagne accents for interactive elements.
- Confident, mid-weight typography without cliché tracking or uppercase styles.
- Generous, breathable spacing that conveys a premium feel.

## 2. Colors

The palette is restrained and highly disciplined.

### Primary
- **Deep Charcoal** (oklch(20% 0.01 260)): Our brand anchor. Used for primary text, deep backgrounds, and high-emphasis interactive elements.

### Secondary
- **Warm Champagne** (oklch(85% 0.04 80)): The luxury accent. Used sparingly for highlights, primary call-to-action buttons, or subtle indicators of state.

### Neutral
- **Cool Neutral Scale**: A full scale of neutrals subtly tinted toward our charcoal hue (hue 260) to prevent the "dead gray" feeling of uncalibrated web colors. Used for borders, dividers, secondary text, and surface layering.

**The One Voice Rule.** The champagne accent is used on ≤10% of any given screen. Its rarity is the point.

## 3. Typography

**Body Font:** Geist Sans (with sans-serif fallback)
**Mono Font:** Geist Mono (with monospace fallback)

**Character:** Clean, highly legible, and confident. We rely on font-weight and size contrasts rather than letter-spacing tricks to build hierarchy.

### Hierarchy
- **Headline**: Used for page titles and major structural divisions.
- **Title**: Used for card headers and form section titles.
- **Body**: The workhorse for all interface copy.
- **Label**: Used for form labels. We use mid-weights (e.g. font-semibold) in standard casing, explicitly avoiding the "uppercase tracking-wide" AI cliché.

**The Quiet Confidence Rule.** No excessive tracking (letter-spacing) or forced uppercase on labels. Let the font's natural geometry speak.

## 4. Elevation

The system is primarily flat and relies on tonal layering (e.g., placing a `neutral-50` card on a `white` background) to build structure, rather than aggressive drop shadows.

**The Flat-By-Default Rule.** Surfaces are flat at rest. Subtle borders and tonal shifts define boundaries.

## 5. Components

### Cards / Containers
- **Corner Style:** Soft but structural (16px / rounded-2xl for major containers, 12px / rounded-xl for internal fields).
- **Background:** Typically pure white or neutral-50.
- **Border:** Subtle neutral-200 boundaries.

### Inputs / Fields
- **Style:** Clear borders with comfortable internal padding to ensure easy tap targets (at least 44px height).
- **Focus:** Strong, unambiguous focus rings using the brand charcoal.

### Buttons
- **Primary:** Filled with brand or accent color. Ample hit area.

## 6. Do's and Don'ts

### Do:
- **Do** use the tinted neutral scale instead of hard-coded gray hexes.
- **Do** ensure 44px minimum tap targets for all interactive elements.
- **Do** pair `htmlFor` with `id` on all form inputs.

### Don't:
- **Don't** use cheap, cartoonish colors (e.g., pure blue, pure red).
- **Don't** rely on uppercase + tracking for hierarchy.
- **Don't** stack multiple thin borders to create depth.
