# Handoff: SASSi Landing Page

## Overview
Shopify-bound landing page for SASSi, a bag brand ("Carry On."). Single-page site: fixed header, full-screen video hero, marquee ticker, manifesto section, product category grids (Backpacks, Totes), editorial/video row, New Arrivals grid, outro statement, footer with newsletter signup.

## About the Design Files
The files in this bundle (`SASSi Landing Page v2.dc.html`, `SASSi Landing Page.dc.html`, `SASSi Design Spec.dc.html`) are **design references built in HTML** — prototypes showing intended look, copy, and interaction, not production code to copy verbatim. The task is to **recreate this design inside the target environment** — a Shopify theme (Liquid templates/sections + theme CSS/JS, using Online Store 2.0 sections/blocks conventions) — following Shopify's existing patterns rather than porting the HTML/React-ish component structure directly. `SASSi Landing Page v2.dc.html` is the current/latest version; `SASSi Landing Page.dc.html` is an earlier iteration kept for reference only.

## Fidelity
**High-fidelity.** Colors, type, spacing, and copy are final as shown. Treat exact hex values, font, spacing, and radii as production-ready; motion/interaction specs below should be reproduced as closely as the Shopify theme stack allows (CSS + vanilla JS, or the theme's existing animation utilities).

## Screens / Sections (in page order)

1. **Fixed header** — transparent, sits over hero. 3-column grid: nav left (Shop, The Brand), logo centered, icons right (search, account, bag). Color flips white ↔ obsidian (#12100E) depending on whether the section scrolled under the header is marked "dark" (see Interactions).
2. **Video hero** — full-viewport (100vh, min-height 580px). Looping muted autoplay video background (placeholder only — needs real footage: "candid street footage"). Dark gradient overlay bottom-to-top. Headline "Carry On." (last period in accent red) bottom-left, huge (clamp 56–150px, weight 800, line-height 0.88). "Shop the drop →" link bottom-right. Both fade/slide up on load (staggered).
3. **Marquee ticker** — dark bar (#12100E), white text, infinite horizontal scroll of "carry on · built for the people we rely on · premium and accessible", separated by small red dots. Speed increases with scroll velocity.
4. **Manifesto** — 5/7 column split. Left: portrait image slot (4:5 aspect). Right: headline "A reliable product for the people we rely on." (last 3 words in red) + one paragraph of body copy. Reveals on scroll (fade + slide up).
5. **Backpacks row** — 12-col grid: 2 product cards (Atlas Backpack, Atreus Backpack, each 3 cols, 5:6 image + name + price below) + 1 category card (6 cols, square-ish, image with dark gradient overlay, "BACKPACKS" title + description + "Shop Backpacks" pill button).
6. **Totes row** — same pattern, category card first (Totes) then 2 product cards (Apollo Tote XL, Artemis Tote L).
7. **Editorial + video row** — 2 equal columns, ~1:1.1 aspect. Left: static editorial photo placeholder. Right: looping b-roll video placeholder with a blinking "● REC" red label top-left.
8. **New Arrivals** — centered heading + "Shop now →" link, then a 4-up grid of product cards (Athena Handbag, Artemis Tote L, Apollo Tote XL, Aries Backpack).
9. **Outro statement** — large headline "Designed for You to Carry On." (last 2 words red) left, "©26" mark right, bottom-aligned.
10. **Footer** — solid vivid red (#FF4000) background, white text. 4-col grid: logo + email signup form (rounded white pill, "Notify Me" → "Noted." on submit) | About links | Shop links | Support links. Copyright line below.

## Copy (exact text used)
- Nav: Shop, The Brand
- Hero: "Carry On." / "Shop the drop →"
- Ticker: "carry on" / "built for the people we rely on" / "premium and accessible"
- Manifesto: "A reliable product for the people we rely on." / "Bags for the shift, the commute, and everything you haul in between. No fuss, no flex — gear that shows up every day, the way you do."
- Backpacks category copy: "Made for the long haul, with organized pockets that keep everything in its place so you can grab what you need and go."
- Totes category copy: "Simple, roomy, and ready for anything. One clean space for the run from home to shift and back."
- Products + prices: Atlas Backpack ₱4,290 · Atreus Backpack ₱4,290 · Apollo Tote XL ₱3,290 · Artemis Tote L ₱3,290 · Athena Handbag ₱3,290 · Aries Backpack ₱3,290
- Outro: "Designed for You to Carry On." / "©26"
- Footer columns: About (The Brands, Contact) · Shop (Shop All, Backpacks, Totes, Handbags) · Support (Shipping & Returns, Warranty, Privacy, Terms of Service)
- Footer form placeholder: "Email for the next drop"; button label toggles "Notify Me" → "Noted."
- Footer copyright: "© 2026 SASSi. All rights reserved."

## Interactions & Behavior
- **Smooth scroll**: whole-page inertia scrolling (prototype uses Lenis; in Shopify, a lightweight smooth-scroll lib or native `scroll-behavior` fallback is acceptable).
- **Header theme flip**: header text/logo switch between white and obsidian (#12100E) depending on whether the section currently under the header (a ~32px band from top) is flagged as a dark-background section (hero and footer are the dark sections). Transition: color 0.35s ease.
- **Hero intro**: headline and CTA fade in + translateY(28px→0), staggered ~160ms apart, cubic-bezier(.22,1,.36,1), 0.8s, on load.
- **Scroll reveals**: manifesto, product cards, category cards, editorial row, outro fade in (opacity 0→1) + translateY(24px→0) via IntersectionObserver at 12% visibility threshold, 0.7s ease, one-shot.
- **Marquee**: 4 duplicated strips scroll left continuously at a 28px/s base speed; speed increases with scroll velocity (base + |velocity| × 22). Must be seamless/looping.
- **REC blinker**: red "●" dot blinks (1.2s step interval) next to "REC" label on the b-roll video placeholder.
- **Anchor nav**: "Shop" scrolls to `#shop` (Backpacks row), "The Brand" scrolls to `#story` (Manifesto), with a -70px offset for the fixed header.
- **Newsletter form**: on submit, prevent default, swap button label to "Noted." (no real submission logic — needs backend/Shopify customer signup wiring).
- **Film grain overlay**: full-viewport fixed noise texture, multiply blend, ~14% opacity (tweakable 0–0.35), sits above all content, pointer-events none.
- **Hover states**: nav links, icons, footer links → red (#FF4000) or obsidian, depending on background. Pill buttons ("Shop Backpacks", "Shop Totes") invert from white-bg/black-text to red-bg/white-text on hover.

## Design Tokens

### Colors
- Obsidian (ink/text/footer text on white): `#12100E`
- Vivid Red (sole accent — use sparingly): `#FF4000`
- White: `#FFFFFF`
- Placeholder gray (empty image slots): `#D9D6CE`
- Body text: `#4A463E`
- Footer foreground tint: `#F2EFE7`
- Footer muted: `#6B6459`
- Muted label (spec doc, ticker dot etc.): `#8A8378`
- Page background (spec doc only): `#EDEBE6`
- Retired: Light Bronze `#A97541` — do not use; red is the only accent going forward.

### Typography
- Typeface: **Open Sauce Sans** (Google/Fontsource family), weights 400 / 600 / 700 / 800. Fallback: Helvetica, sans-serif.
- Hero headline: weight 800, uppercase-style (as typed, not text-transform), `clamp(56px, 9.5vw, 150px)`, line-height 0.88, letter-spacing -0.03em.
- Section H2 (manifesto/outro): weight 800, `clamp(34px, 5.6vw, 76px)` (manifesto) or `clamp(38px, 4.8vw, 72px)` (outro), line-height ~1.0–1.08, letter-spacing -0.02em to -0.03em.
- Category card title ("BACKPACKS"/"TOTES"): weight 700, 19px, letter-spacing 0.04em, uppercase.
- Product name: weight 600, 13px.
- Product price: weight 400, 12px, color #4A463E.
- Body copy: weight 400, 14–16px, line-height 1.7, color #4A463E.
- Nav/labels: weight 600, 13px, letter-spacing 0.02em.
- New Arrivals heading: weight 700, 20px, letter-spacing 0.06em, uppercase.
- Footer column labels: weight 700, 12px, letter-spacing 0.08em, uppercase.

### Spacing / Layout
- 12-column grid for product/category rows, 16px gaps.
- Section side padding: 16–24px.
- Manifesto split: 5fr / 7fr columns, 48px gap.

### Radius
- Image/video frames: 8px (spec doc reference; landing page slots are currently square-cornered rects — confirm before implementing, spec doc calls for 8px).
- Buttons & pills: 40px (fully rounded).
- No hard section borders — rely on whitespace only.

### Shadows
- Card shadow (spec-doc UI only, not on live page): `0 1px 3px rgba(0,0,0,0.08)`.

## Assets
- `sassi-logo.svg` — brand logotype, used as a CSS mask (recolored via `background` + `mask`) in header (84×35, obsidian/white depending on theme) and footer (120×51, white).
- All product/category/editorial imagery is **placeholder** (`<image-slot>` gray boxes with labels like "Atlas Backpack", "Backpacks category — on-body, candid", etc.) — real photography/video must be sourced and dropped in per the labeled placeholder captions.
- Two video placeholders (hero background, b-roll strip) — need real muted/autoplay/loop video assets ("candid street footage" and generic b-roll respectively).
- Film grain texture is a generated inline SVG noise data-URI — can be reused as-is or replaced with a static noise PNG tile.

## State Management
- `headerLight` (boolean) — whether header renders light-on-dark or dark-on-light; derived from scroll position vs. dark sections.
- `subscribed` (boolean) — toggles newsletter button label.
- `grain` (number 0–0.35) and `showTicker` (boolean) — design-time tweaks, not end-user state; in production these are just fixed values (grain ≈0.14, ticker on) or a theme setting if you want merchants to toggle them.

## Files
- `SASSi Landing Page v2.dc.html` — current build, full page.
- `SASSi Landing Page.dc.html` — earlier iteration, kept for reference.
- `SASSi Design Spec.dc.html` — one-page visual spec sheet (colors, type scale, tokens, section order) — use as the quick-reference alongside this README.
- `sassi-logo.svg` — logo asset.
