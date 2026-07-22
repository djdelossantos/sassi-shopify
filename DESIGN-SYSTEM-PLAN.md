# SASSi Design System — Build Plan

Status: **analysis complete, build not started.** Waiting on Figma write access
(`use_figma` from the **remote** Figma MCP server).

## Context for a fresh session

- Figma file is open in the desktop app; `figma-desktop` MCP server is wired via `.mcp.json`
  (read-only: `get_metadata`, `get_screenshot`, `get_variable_defs`, `get_design_context`,
  `get_figjam`). Tool list verified directly against the server on 2026-07-18.
- **The desktop server is read-only by design and always will be.** Write-to-canvas is not
  a toggle or a plan gate on it — the tools do not exist there. Do not re-investigate this.
- Write access requires the **remote** server at `https://mcp.figma.com/mcp` (added to
  `.mcp.json` as `figma-remote` on 2026-07-18). First use needs an OAuth flow, which only
  runs in an interactive terminal. MCP tools load at session start, so authorize, then
  restart the session.
- Write-to-canvas requires a **Full or Dev seat on a paid plan**. If `use_figma` still does
  not appear after authorizing, check the seat type before debugging anything else.
- Also install Figma's own MCP skills — Figma's docs say they make the write tools behave
  reliably and follow the correct create/update workflow.

## Write access — RESOLVED 2026-07-18

Write access works. Verified end-to-end: test frame `379:260` created on the Shopify page
at x=3426, y=1354, with its fill bound to `color/Sassi red/100` (`VariableID:191:281`).
Binding confirmed programmatically, not just visually. Safe to delete that frame.

- File key: `Z2VJB0nDHWWDAYAp3GqTlx` (file name "E-Commerce Shop").
- Authorized Figma account is **skulltentacles@gmail.com**, not djdelossantos@gmail.com.
- Only one plan is paid: **8180 Designer Pro** (Full seat, pro tier). The other ten teams are
  starter tier. This file is in 8180 Designer Pro — that is why the write succeeded.
- Variables live in local collection `SASSi Shopify Website`
  (`VariableCollectionId:191:257`), 48 vars, single mode "Mode 1". The earlier note that
  tokens live on node `0:2` was about where they are *used*, not where they are defined.

### BLOCKER for Wave 1: Open Sauce Two is unavailable to the remote server

`listAvailableFontsAsync()` returns **no** "Open Sauce Two" family. The test frame silently
fell back to Inter. Open Sauce Two is presumably installed locally for the desktop app, but
the remote MCP server executes in Figma's cloud context and cannot see local fonts.

Consequence: any component built via `use_figma` will render in the wrong typeface unless
this is fixed first. **Resolve before Wave 1** — do not build the type-dependent components
(`Button`, `Link`, headings) until then.

**Tested and ruled out 2026-07-18:** binding to the existing `font family/Primary Font`
variable does NOT work. That variable (STRING, `FONT_FAMILY` scope, value `"Open Sauce Two"`)
stores the font's *name*, not the font. `loadFontAsync({family:"Open Sauce Two"})` fails with
`The font family "Open Sauce Two" does not exist.` — even though Figma's own error lists the
family under "Fonts from text styles". Applying an existing text style cannot sidestep this.
Do not retry this approach.

The token setup itself is fine: 34 text styles, all correctly bound to the font-family,
font-size, font-weight and letter-spacing variables. The only missing piece is the font file.

Remaining options:
1. Get Open Sauce Two into Figma's cloud context — upload to the org
   (https://help.figma.com/hc/articles/360039956894-Add-a-font-to-Figma). Note: shared font
   upload is an Organization/Enterprise feature; the 8180 Designer Pro plan is **pro** tier,
   so confirm this is even available before planning around it.
2. Substitute a cloud-available typeface for component work and swap later via the
   `font family/Primary Font` variable — a one-value change that propagates to all 34 styles.
   This is what the variable is genuinely good for.
3. Build non-text primitives first (`Color Swatch`, layout scaffolding) and defer text components.

**Wider risk, independent of automation:** if the font is only installed locally on the
designer's machine, the file already renders in a fallback for every collaborator without it
and in all browser sessions. Worth confirming how it was installed.

## BUILD COMPLETE — v1, 2026-07-18

All six v1 components built on the Shopify page inside section `SASSi Design System`
(`387:260`, at canvas x=3426, y=1354). Zero unbound solid fills. All components verified
inside their sections via `absoluteBoundingBox` checks.

| Component | Node ID | Type | Variants |
|---|---|---|---|
| Color Swatch | `388:265` | COMPONENT_SET | 5 (Sassi Red, Bronze, Black, Grey, White) |
| Button | `391:266` | COMPONENT_SET | 3 (Dark, Light, Outline) |
| Link | `393:264` | COMPONENT_SET | 2 (16, 14) |
| Accordion Row | `394:260` | COMPONENT | — |
| Product Card | `395:261` | COMPONENT | — composes 4 Color Swatch instances |
| Category Card | `395:273` | COMPONENT | — |

### Where the evidence contradicted this plan

The plan's predictions were wrong three times. Read the design, don't trust the audit table:

1. **Button widths are contextual, not variants.** Plan said "widths 166/340/400/459 →
   fill-width variants". Eight real buttons showed five distinct widths with no pattern, but
   three consistent *fill* styles (dark ×4, white ×2, outline ×3). Variant axis is Style.
2. **The `plus`/`minus` row is a quantity stepper, not an accordion.** `Container` 507×26
   with minus+"1"+plus is the PDP qty selector. The real accordion is named `Specs`
   (543×56, padding 8/8/16/16, 14px label, single `plus`).
3. **Icons are Lucide library instances, not local components.** The page contains zero
   local components. `Accordion Row` clones the real instance, preserving the library link.

Also: the layer name `Link` is overloaded across four different things — 14 styled text
links @16, 1 @14 (social), 2 unstyled ExtraBold nav headings, 3 icon-only 20×20 frames.
Only the styled text links were built as `Link`.

### RESTYLE PASS — do this in Figma desktop

Ten text nodes use Inter placeholders and must be re-styled to Open Sauce Two. Each carries
`setSharedPluginData('dsb','target_text_style', <name>)` so this is machine-verifiable.

| Component | Node | Label | Placeholder | Apply this style |
|---|---|---|---|---|
| Button | `391:261` | Learn More | Inter Bold 16 | `Text Styles/Semantic/Button/16` |
| Button | `391:263` | Learn More | Inter Bold 16 | `Text Styles/Semantic/Button/16` |
| Button | `391:265` | Learn More | Inter Bold 16 | `Text Styles/Semantic/Button/16` |
| Link | `393:261` | Shop All | Inter Regular 16 | `Text Styles/Semantic/Link/16` |
| Link | `393:263` | Facebook | Inter Regular 14 | `Text Styles/Semantic/Link/14/Regular` |
| Accordion Row | `394:261` | Details & Specifications | Inter Regular 14 | `Text Styles/Open Sauce Two/Regular/14` |
| Product Card | `395:265` | Atreus Black Backpack | Inter Regular 18 | `Text Styles/Open Sauce Two/Regular/18/lh-120` |
| Product Card | `395:267` | ₱3,990 | Inter Regular 14 | `Text Styles/Open Sauce Two/Regular/14` |
| Category Card | `395:276` | Handbags | Inter Black 24 | **none — unstyled in source** |
| Category Card | `395:277` | Designed for you to carry on. | Inter Regular 14 | `Text Styles/Open Sauce Two/Regular/14` |

Note `395:276`: the source heading ("Handbags", Black 24) has **no text style applied** in
the design. Worth creating one rather than leaving it ad hoc.

### Open questions from the build

- **Button padding is asymmetric: left 16, right 8**, consistent across all 8 instances.
  Pushes the label 4px off-centre. Built faithfully; confirm whether intentional.
- `letter spacing/-634%` and `/-233%` still look like unit errors.
- `--color-text-onBrand` / `onInverse` code syntax is camelCase; should be `on-brand`.
- No hover/focus/disabled/error states exist in the design — none were invented.

## STYLE GUIDE — `398:261`, built 2026-07-18

A documentation artefact (not components) on the Shopify page at canvas x=5226, y=1354.
1440 × 9617px, 10 sections, generated by reading the live file rather than hand-authored.

Sections: Header · Colour Primitives (8) · Colour Semantic (12) · Legacy Paint Styles (12) ·
Type Scale Variables · Spacing & Radius · Typography Style Ramp (34 specimens) ·
Components (18 live instances) · Audit · Footer.

### Typography section — filtered to actual usage 2026-07-18

Rebuilt as `Typography — In Use` (`404:284`) after scanning all 118 text nodes in
Landing (`191:258`) and PDP (`351:610`).

**Only 9 of 34 text styles are actually used.** The other 25 are dead weight.

Used, by frequency: `Open Sauce Two/Regular/14` (30×), `Semantic/Link/16` (21×),
`Regular/18/lh-120` (8×), `Semantic/Button/16` (8×), `Regular/16` (7×),
`Regular/18/lh-160` (3×), `Extra Bold/56` (2×), `Bold/18` (2×),
`Semantic/Link/14/Regular` (2×).

**35 of 118 text nodes (30%) have NO style applied** — including the largest type in the
design. Eight unstyled treatments:

| Treatment | Count | Note |
|---|---|---|
| Black 163.5px — hero headline | 2 | off-scale; `Semantic/Heading 1 upper` (160px) exists but is **never used** |
| ExtraBold 48px — "Carry On." | 1 | `Semantic/Heading 2 upper/48` exists and **matches exactly** — just not applied |
| Black 32px — "Join SASSi" | 2 | no 32px Black style exists |
| Black 24px — category headings | 18 | most-repeated unstyled treatment |
| ExtraBold 24px — product title | 1 | PDP |
| Regular 18px — "Shop now →" | 1 | could use `Regular/18/lh-120` |
| Black 16px — footer headings | 6 | |
| ExtraBold 16px — nav headings | 4 | the ones also mis-named `Link` |

Two of these are near-misses against styles that already exist — the hero is 163.5px against
a 160px style, and "Carry On." matches `Heading 2 upper/48` exactly. Applying the existing
styles would fix those two immediately; the other six need styles created.

### SHOP PAGE RECONCILED TO FIGMA 2026-07-22 (uncommitted)

Compared built `shop.liquid` against Figma `Shop - 1440px` (node `507:355`, file
`Z2VJB0nDHWWDAYAp3GqTlx`) via get_design_context on toolbar `507:746`. Only a
DESKTOP shop design exists (no mobile frame). Adjusted to match: title row =
"Shop All" (24px Bold/700) + right-aligned "N products" count (14px, secondary);
type tabs are PLAIN TEXT 16px, active = brand red #FF4000 (not pills); Filters =
text + sliders "adjust" icon (added to icon snippet), borderless, 10px gap;
Load More = DARK button; grid full-bleed 4-col, 24px row / 16px col gap, toolbar
inset 16px, `.shop__label` desktop padding-top 120px to clear overlay header.
Deviations kept on purpose: count shows real placeholder count (16=4×4) not
Figma's mock "19"; secondary stays #4A4A4A per the sitewide override (Figma uses
#6B6B6B). Verified desktop matches; mobile is a sensible 2-col fallback until a
mobile Shop is designed.

Uncommitted files: shop.liquid (new), icon.liquid (adjust icon), theme.css
(shop block rewrite), theme.js (shop logic — from prior turn), DESIGN-SYSTEM-PLAN.md.

### SHOP PAGE + PAGES DEPLOY 2026-07-22 (earlier; deploy committed 080ae6a)

**Shop page** `site/pages/shop.liquid` → `/shop/`. Based on PDP patterns, reuses
`snippets/product-card` and `snippets/button`. "Shop All" heading, type tabs
(All Bags / Backpacks / Totes / Handbags), a placeholder Filters toggle+panel
(contents TBD from user), and a Load More button. 16 placeholder cards = the 4
`products.json` items repeated ×4, with types assigned round-robin
(`modulo` — note: Liquid can't filter inside an array subscript, must assign the
index to a var first). JS in `theme.js` (search "Shop page:") handles tab filter,
filters toggle, and Load More (page size 8; button auto-hides when exhausted via
`[data-exhausted]`; paging resets on tab change). CSS at end of `theme.css`
("Shop All page"). Verified: tabs filter correctly, Load More reveals+exhausts,
mobile 2-col / desktop 4-col. NOT yet reconciled against the Figma Shop design
(Figma MCP was disconnected) — do that when reconnected.

**GitHub Pages deploy is LIVE via Actions** (committed `080ae6a`, pushed):
`.github/workflows/deploy.yml` builds `site/` with
`npx @11ty/eleventy --pathprefix=/sassi-shopify/` and deploys `_site` to Pages on
every push to master. `eleventy.config.js` uses `EleventyHtmlBasePlugin` +
`pathPrefix: "/"` (default) so absolute `/assets` paths work at root locally and
under `/sassi-shopify/` on Pages. **User must set repo Settings → Pages → Source →
"GitHub Actions" once** for it to publish (was "Deploy from a branch"). URL:
https://djdelossantos.github.io/sassi-shopify/ . Local Git-Bash mangles
`--pathprefix=/...` (MSYS pathconv) — use `MSYS_NO_PATHCONV=1` locally; Linux CI is fine.

Known: favicon 404 on all pages (no favicon added yet). Video/PNGs committed
directly (~48MB) — consider Git LFS or WebP before scaling.

### INTERMEDIATE WEBSITE BUILT 2026-07-20 — `site/`

Eleventy 3 + Liquid static site in `site/`, Shopify-shaped for cheap conversion:
`_includes/layout.liquid` → `layout/theme.liquid`; `_includes/sections/*` → `sections/*`
(+ schema); `_includes/snippets/*` → `snippets/*`; `_data/products.json` → product objects;
`assets/` copies verbatim. Run: `cd site && npm run dev` → http://localhost:8080
(or the `sassi-site` entry in `.claude/launch.json`). Pages: `/` and `/products/atreus-backpack/`.

- **Fonts**: real Open Sauce Two self-hosted (Fontsource WOFF2, 400/600/700/800/900) —
  the font blocker does not exist in code.
- **Tokens**: `assets/css/tokens.css` generated from the Figma variables, same custom
  property names as the variables' code syntax.
- **Imagery**: 23 assets exported from Figma (`assets/images/`), incl. clean logo SVG
  (extracted via `exportAsync` — the download_assets SVG export is polluted with page
  background artifacts; don't use it for vectors).
- **Animations**: Lenis 1.1 + GSAP 3.12 ScrollTrigger (jsDelivr CDN), hero reveal, scroll
  reveals, night-banner parallax, footer closer rise; `prefers-reduced-motion` respected.
  Verified working in real Chrome (23 ScrollTriggers, reveals fire).
- **QA harness**: `site/scripts/shot.mjs` (playwright-core + installed Chrome) captures
  landing+PDP at 390 and 1440 into `site/qa/`; Figma reference exports in `site/qa/ref/`.
  Use `waitUntil:"load"` — networkidle never settles under 11ty live-reload.
  **This session's Browser-pane screenshot/RAF pipeline is broken** (renderer produces no
  frames — screenshots time out, GSAP never advances). Playwright is the workaround.

**QA round 1 done (agent a710a4ca6f9828def, report: `site/qa/QA-REPORT.md`), fixes applied.**
The QA revealed the **Figma design evolved (v2)** after my scans; verified against fresh
exports and applied: PDP has NO categories/lifestyle sections (those Figma layers are
hidden alternates — my earlier scans picked up invisible nodes); PDP heading is "You might
also like" (no Shop-now link); full 4-clause product blurb; 3 right-aligned swatches;
full-width stepper above Add to bag; desktop gallery = one large contained image, no thumbs
(thumbs remain on mobile); hero "Carry On" has a RED period; mobile header drops the
account icon (desktop keeps 3); lifestyle tiles = title top-left + full 2-sentence copy
bottom; Black Series = full-bleed image with overlaid heading + button; product cards carry
colour swatch dots (in `products.json`); categories captions centered on desktop; footer
copyright centered. Agent findings NOT applied (verified wrong): brand-intro is dark in
both mockups (not inverted). Deviation accepted for now: the light topographic background
texture on PDP/product areas is not implemented.

**Header rebuilt 2026-07-20 (user fix round 1, from their desktop screenshot):**
Desktop is now a transparent sticky overlay — no solid bar. Background is a
`#12100E 50% → 0%` top-down scrim; padding 24px vertical / 32px horizontal; full-bleed
(no max-width), nav far left, logo on true centre (side groups `flex: 1 1 0`), icons far
right. `main` loses its top padding on desktop so the hero runs under the header.
Mobile is unchanged: solid obsidian 60px bar, white content.

Header content colour flips per section: sections carry `data-section-theme="dark|light"`,
JS probes the header's midline and toggles `.site-header--on-light`. **Last match wins**, so
a tagged element nested in a section overrides it — needed because `categories` is a white
section whose top edge is full-bleed dark photography (`.category-card__image` is tagged
dark). Without that override the nav rendered dark-on-dark and was unreadable. Runs
regardless of reduced-motion (legibility, not decoration) and is also driven from Lenis's
scroll callback. On light sections the scrim goes fully transparent — a dark scrim over a
white section reads as a grey smudge.

Note: the footer's theme tag never actually fires on desktop — the footer is shorter than
the viewport, so it can never sit under the header. Not a defect.

**Fix round 2 (2026-07-20) — hero + brand intro, and per-group header theming.**
User-supplied 2x assets (from `~/Downloads/Sassi Shopify Website Assets/`) installed as
`hero@2x.png` (2880×1800, grain baked in — the `.hero__noise` overlay element was removed)
and `brand-intro@2x.png` (1424×1800 = a 712px column at 1x).
Brand intro corrected to **white copy column with dark text** — the QA agent flagged this
in round 1 and **I wrongly dismissed it**; the user confirmed the agent was right. Section is
now full viewport (`height: 100vh` desktop / `100svh` mobile), true 50/50 columns, copy
capped at 800px, button capped at 166px, button style dark.

Header theming upgraded from per-section to **per-group**, because brand-intro is split-tone
(dark image left, white copy right) and one colour cannot serve both. Each of the three
header groups probes what is under it via `document.elementsFromPoint` (skipping the header
itself, then `closest("[data-section-theme]")`). Scrim now shows only when the *whole* bar is
over dark — over white or mixed it read as a grey wash.

The centred logo sits exactly on brand-intro's 50/50 seam, so neither colour worked — half
the mark vanished. Solved by masking the mark (`mask: url(sassi-logo.svg)`) and painting it
with a hard-stop gradient whose split point `--logo-split` is computed by binary search
(~7 samples) for where dark content ends across the mark. Verified: 100% on hero, 49.2% on
brand-intro, 0% over white sections. All probing is rAF-throttled.
`snippets/logo.liquid` is now unused by the header (kept for other placements).

User instruction 2026-07-20: stop the QA loop after round 1 — further iterations are theirs.
Working together on fixes from here (no autonomous QA loop), user supplies images as needed.
Ripple/topographic texture: NOT to be implemented — user will supply product photos with it baked in.
Remaining known gaps for their manual pass: topo texture; PDP mobile carousel dots;
minor crop differences.

### Mobile PDP built 2026-07-20 — `448:297`

`PDP - Mobile 390` at x=6866, built against the **user-polished** mobile landing (`428:296`,
now 6935 tall — treat as finalized reference; DO NOT EDIT). 390×4835, 191 nodes, 26 image
fills, 58 tagged placeholders, 4 component instances (Color Swatch dots), 0 text overflows.

Sections: Header 60 (landing structure: Left 108 / logo / icons) · Product 916 (gallery
460 + 3 thumbs, title/price, Color: Black + 4 swatch instances, qty stepper 132×48,
Add to bag, blurb) · Accordions 144 (2 rows, tagged swap→394:260) · Categories 1477
(landing cards + PDP's per-card Learn More outline buttons) · Lifestyle Grid 780
(**exactly matches landing height**; full-bleed 195×260 tiles, 12px copy) · Suggested For
You 699 (landing product-card geometry: 214 img, name 14, price 12, pad-bottom 32) ·
Footer 759 (vs landing 757; same structure: About→Shop→Support, 2-col link grids,
44px closer with red range).

Conventions extracted from the polished landing and applied: `Mobile/Semantic/*` styles
exist (Hero Headline Black 44, Heading 2 ExtraBold 40/110%, Body Text Regular 14/160%/2%);
footer links are Regular/14 (not 16); tile copy is Regular/12/ls-0.72; product names
Regular/14 + price Regular/12; buttons remain manual frames pad 16/8/14/14 tagged
`swap_to_component`. Placeholders tagged with Mobile styles where the landing used them.

Known-good quirk: the qty stepper's minus icon reports 12×0 geometry (stroke-only path) —
renders fine, not a defect.

### Mobile Landing built 2026-07-19 — `428:296`

`Landing - Mobile 390` on the Shopify page at x=6866. Optimised 2026-07-19 for the
iPhone 14 viewport (390×844): header+hero fill the first screen exactly (60+784);
Brand Intro, Lifestyle Grid, Black Series, Night Banner and New Arrivals are each exactly
844 tall (flexible image children absorb the space); Categories (1397) and Footer (985)
intentionally exceed a viewport as content-driven sections. Total 390×7446 ≈ 8.8 viewports.
Originally 390×5806, 9 sections, 135 nodes,
22 image fills (all real hashes reused from the desktop frame), 49 tagged Inter
placeholders, 0 zero-sized nodes, 0 text overflows.

Sections: Sticky Header (hamburger + cloned logo + cloned icons) · Hero 600 · Brand Intro ·
Categories (3 stacked cards) · Lifestyle Grid (2-col × 3) · Black Series Banner ·
Night Banner · New Arrivals (2×2 product grid) · Footer.

**THE RED MYSTERY IS SOLVED.** The brand red IS used in the desktop design — as
**mixed-colour ranges inside single text nodes** ("we rely on.", "Carry On." in the footer
closer). `node.fills` returns `figma.mixed` for such nodes, which `Array.isArray()` rejects,
so every previous colour scan silently skipped exactly those nodes. Any future fill scan
must handle `figma.mixed` via `getStyledTextSegments(["fills"])`. The mobile build
reproduces both red ranges, bound to `color/Sassi red/100`.

**Buttons are manual frames, not instances.** The desktop restyle pass applied Open Sauce
Two styles to the Button component labels — so `appendChild` of an instance now throws
`unloaded font "Open Sauce Two Bold"` in the cloud context. The three mobile buttons are
hand-built to the component's exact geometry and tagged
`setSharedPluginData('dsb','swap_to_component','391:266')` for later swapping in desktop.

Other gotchas hit: the cloned desktop logo carried `layoutPositioning:"ABSOLUTE"` (landed at
x=681, invisible); the logotype is a **mask** — its colour comes from the Background rect
behind it, not the vector. Hero noise at TILE opacity 0.4 was far too strong; 0.1 matches.

### Typography cleanup reviewed 2026-07-19 (designer-side work)

Text styles: 34 → **36**. Off-scale sizes cut from 10 to 1 (only 163.5 remains, deliberately,
as `Semantic/Hero Headline`). Nine new styles created, and **every one is an exact-metric
match for a remaining unstyled treatment**:

| Unstyled treatment | Uses | Exact-match style now in file |
|---|---|---|
| Black 163.5 / −2.33px / 100% | 2 | `Semantic/Hero Headline` |
| ExtraBold 48 / 0% / auto | 1 | `Semantic Heading 2` |
| Black 32 / −0.98px / 100% / title | 2 | `Semantic/Title Heading` |
| Black 24 / 0% / auto | 18 | `Open Sauce Two/Black/24` |
| ExtraBold 24 / 0% / auto | 1 | `Product Title` |
| Regular 18 / 0% / 140% | 1 | `Open Sauce Two/Regular/18/lh-140` |
| Black 16 / 0% / auto / upper | 6 | `Semantic/Footer Heading upper` |
| ExtraBold 16 / 0% / auto | 4 | `Open Sauce Two/Extra Bold/16` |
| Regular 14 / 0% / auto | 2 | `Open Sauce Two/Regular/14` or `Semantic/Input` |

**The styles exist but are NOT applied.** All 37 nodes are still ad hoc formatting. Applying
them needs Figma desktop (font blocker). Highest-leverage single action: `Black/24` covers
18 category headings at once.

**Two regressions the cleanup introduced:**
1. **Duplicate style names are back.** `Open Sauce Two/Regular/16` now names two different
   styles (lh auto/ls 0, and lh 160%/ls 0.26px); `Open Sauce Two/Regular/14` likewise
   (lh auto/ls 0, and lh 140%/ls 2%). This is the exact problem the 2026-07-18 rename pass
   fixed — indistinguishable entries in the style picker.
2. **Two nodes were unbound.** `Semantic/Link/14/Regular` no longer exists, so both
   "Facebook" links reverted to unstyled. `Semantic/Link/16` survived as a *rename* (now
   `Open Sauce Two/Regular/16`) and its 21 nodes are intact — so that one was handled
   differently from this one.

Guide sections rebuilt: `Typography` (17 rows, APPLIED/READY badges) and `Audit — Status`
(7 FIXED · 1 READY · 2 NEW · 5 DECISION · 1 BLOCKED).

### Button corrected 2026-07-19 — was missing its icon

The original Button build was **wrong**. My evidence scan used `findAll(TEXT)[0]` and never
looked at the label's siblings, so I never saw that every design button contains an
`arrow-up-right` icon instance. The component shipped with no icon and a centred label.

Real structure (verified against `310:324`, `191:629`, `351:695`, `351:1041`):

```
Button  (VERTICAL, primary CENTER, counter MIN, padding 16/8/14/14, radius 0, h48)
└── Container  (HORIZONTAL, counter CENTER, itemSpacing 24, FILL width)
    ├── TEXT   label — Semantic/Button/16, Bold 16, letter-spacing 2%
    └── INSTANCE arrow-up-right — 24×24, stroke-painted (Lucide)
```

Fixed in place (not recreated, so style guide instances survived): outer layout switched to
VERTICAL with 14px top/bottom padding, Container wrapper added, label moved inside and given
2% letter-spacing, `arrow-up-right` cloned in, icon **stroke** bound per variant —
`color/text/onInverse` on Dark, `color/text/primary` on Light and Outline. The icon is
stroke-painted, not filled; recolouring fills alone does nothing.

**Two remaining differences, both deliberate:**
1. `containerAlign` — component uses `SPACE_BETWEEN`; the 166px source uses `MIN`. The three
   wider sources (400/459/543) all use `SPACE_BETWEEN`, and it is the only value that holds
   the icon right-aligned as the button resizes. `MIN` only looks correct at 166px by
   coincidence (94 + 24 gap + 24 icon = 142 exactly).
2. `labelFont` — Inter, not Open Sauce Two. The standing font blocker.

**Lesson for remaining components:** the Product Card and Category Card evidence scans used
the same text-first approach and may have missed sibling nodes too. Re-verify before trusting.

### Typography tokenised & reordered 2026-07-19

Measured all 35 unstyled text nodes for size / weight / letter-spacing / line-height, then
compared against existing variables.

**Only ONE value was missing: `font size/163_5` (163.5px).** Created, scoped `FONT_SIZE`,
code syntax `var(--font-size-163-5)`. Every weight the unstyled type uses (Black 900,
ExtraBold 800, Regular 400) and every letter-spacing (−2.33, −0.98, 0) **already existed**.

This is unlike the colour work, where 9 of 17 colours had no token at all. Typography's
*primitive values* were already fully tokenised — the gap is at the **composite** layer:
there is no text style tying size + weight + spacing + case together for these 8 treatments.

**Creating those text styles remains blocked by the font.** `createTextStyle` requires
`loadFontAsync("Open Sauce Two")`, which this environment cannot do. Must be done in Figma
desktop. The 8 treatments needing styles:

| Size | Weight | ls | lh | Case | Uses | Note |
|---|---|---|---|---|---|---|
| 163.5 | Black | −2.33px | 100% | — | 2 | hero; off-scale |
| 48 | ExtraBold | 0% | auto | — | 1 | `Heading 2 upper/48` already matches |
| 32 | Black | −0.98px | 100% | title | 2 | "Join SASSi" |
| 24 | Black | 0% | auto | — | 18 | category headings |
| 24 | ExtraBold | 0% | auto | — | 1 | product title |
| 18 | Regular | 0% | 140% | — | 1 | "Shop now →" |
| 16 | Black | 0% | auto | upper | 6 | footer headings |
| 16 | ExtraBold | 0% | auto | — | 4 | nav headings |

Guide section rebuilt as `Typography`, **ordered largest to smallest** (163.5 → 14), with
STYLE / UNSTYLED badges. 17 treatments: 9 styled, 8 unstyled.

### Hardcoded colours tokenised 2026-07-19

Nine new COLOR variables added to `SASSi Shopify Website`, all scoped and with WEB code
syntax. Colour variables: 20 → 29. Total variables: 61 → 70.

| Variable | Hex | Was used |
|---|---|---|
| `color/Neutral grey/20` | `#F3F3F3` | 161× — near-identical to grey/25 |
| `color/Neutral grey/35` | `#CECECE` | 156× |
| `color/Neutral grey/85` | `#666666` | 37× |
| `color/Bronze/75` | `#8B7153` | 9× |
| `color/Bronze/60` | `#907C66` | 3× |
| `color/Crimson/100` | `#B41532` | 6× |
| `color/Olive/100` | `#59603E` | 4× |
| `color/True black/100` | `#000000` | 2× |
| `color/White/85` | `#FFFFFF` @85% | 1× |

**Deliberately skipped:** hardcoded `#757575` — exactly equals the existing
`color/Neutral grey/50`. A second variable for the same colour would make the system worse.
Bind those 3 nodes to the existing token instead.

**IMPORTANT — creating the variables does not tokenise the design.** All 382 previously
hardcoded paints are still hardcoded; the variables now exist but nothing points at them.
Binding those nodes is a separate, unfinished step.

Colour section of the guide rebuilt as `Colour` (`415:284`): Brand (4) · Neutrals (7) ·
Accents & extras (8) · Gradients (2). The brand red is included without any usage claim,
per request.

### Colour section — earlier usage-only scan 2026-07-18

Rebuilt as `Colour — In Use` (`412:284`). 687 nodes scanned across Landing (`191:258`) and
PDP (`351:610`), covering fills, strokes and gradient stops. The three previous colour
sections (Primitives / Semantic / Legacy Paint Styles) were replaced by this one.

**17 distinct colours are used. Only 7 come from a token.**

**THE BRAND RED IS NEVER USED.** `color/Sassi red/100` (#FF4000) — also the paint style
"Vermilion" — appears in **zero** fills, strokes and gradient stops across both mockups.
Verified twice: once on solid paints, then again on all 14 gradient fills' stops. The only
red actually used is **#B41532** (6 uses), a darker crimson that is not a token.

**10 of 17 colours are hardcoded — 382 uses.** The two most-used colours in the entire
design have no token at all:

| Colour | Uses | Note |
|---|---|---|
| `#F3F3F3` | 161 | 144 strokes + 17 fills — most-used colour in the design |
| `#CECECE` | 156 | all fills — 2nd most-used |
| `#666666` | 37 | |
| `#8B7153` | 9 | close to Bronze #A97541 but not it |
| `#B41532` | 6 | the only red actually used |
| `#59603E` | 4 | |
| `#757575` | 3 | **identical to `color/Neutral grey/50`** — same colour, both tokenised and hardcoded |
| `#907C66` | 3 | |
| `#000000` | 2 | strokes; pure black, not brand black |
| `#FFFFFF` 85% | 1 | |

**`color/Vivid Red/83` is beige.** It resolves to `#D9D6CE` (11 uses) — a warm grey with no
red cast whatsoever. It lives in a remote/library collection, not the local ones, which is
why earlier local-variable scans missed it. `color/Obsidian black/25%` is in the same place.

All 12 semantic variables created on 2026-07-18 are currently unused — nothing in the
mockups binds to them yet. That is expected, not a defect.

### Audit findings surfaced by the style guide

1. **Letter-spacing variables are misnamed.** All nine are named as percentages but hold
   pixel values — `letter spacing/96%` is 0.96px; `-634%` is −6.336px. Rename them.
2. **Ten of 34 text styles use off-scale sizes** — 12.1, 12.3, 12.4, 12.6, 13.3, 13.9,
   57.6, 77.8. These look like frame-resize artefacts, not deliberate steps.
3. **Two parallel colour systems.** 12 legacy paint styles duplicate the variables; 8 are
   exact matches and can be retired. `Timberwolf #D9D6CE` exists ONLY as a paint style.
4. **Two different blacks.** Brand black is `#12100E`, but `Black 25%/4%/55%` use pure
   `#000000`.
5. Button padding asymmetric (left 16 / right 8) across all 8 instances.
6. Layer name `Link` covers four unrelated things.
7. Category Card heading (`Handbags`, Black 24) has no text style applied.
8. No hover/focus/disabled/error/sold-out states exist anywhere in the design.

## Figma node reference

| Node | ID |
|---|---|
| Page: Shopify | `190:251` |
| Wrapper frame: SASSi Shopify Website | `191:700` |
| Landing - 1440px | `191:258` |
| PDP - 1440px | `351:610` |
| Internal Only Canvas (tokens/styles) | `0:2` |
| Page: `/// Design System` | `195:255` — **ignore, different purpose** |

Other pages: Revisions `39:251`, Products - August 2026 `254:251`,
About Us `87:251`, Benchmark `1:65`, `// Ref` `0:1`.

## Decisions already made

1. Components go **on the "Shopify" page** (`190:251`), not the `/// Design System` page.
2. **Evidence-first**: build only what the two frames actually show. Hover/focus/disabled/
   error/sold-out states are NOT in the design — add them deliberately later, don't invent.
3. All components bind to existing variables on `0:2`. No hardcoded hex or px.
4. Mobile layout to be designed **in Figma first**, not invented in code.

## Existing tokens (on `0:2`)

- **Color**: `Sassi red/100`, `Vivid Red/6·7·9·83`, `Neutral grey/25·50·75·100`,
  `Obsidian black/4%·25%·55%·100`, `Bronze/100`, `White/100`.
  Named styles: Vermilion, Cod Gray, Armadillo, Spring Wood, Timberwolf, Boulder, Flint.
- **Type**: Open Sauce Two, weights 300–900, sizes 10/12/14/16/18/24/32/48/56/64/72/80.
  Semantic styles: `Heading 1 upper`, `Heading 2 upper`, `Button`, `Link`, `Input`.
- **Spacing/Radius**: 0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80.
- **Icon symbols (already components)**: `arrow-up-right` (310:320), `plus` (351:1052),
  `minus` (351:1048).

## Repeated-pattern audit

Counts are occurrences of a layer name across both frames.

| Pattern | Count | Note |
|---|---|---|
| `Link` | 33 | Highest-value reuse |
| `Button` | 11 | Height locked 48; widths 166/340/400/459 → fill-width variants |
| `arrow-up-right` | 11 | Already an instance |
| `Ellipse 3–6` | 9 each | 16x16 color swatch dots, 4-dot row |
| `Colors` | 9 | Swatch row container |
| `Info` | 8 | Product card meta block, 316x20 |
| `Brand Showcase Section` | 6 | Maps to a Shopify section |
| `New Arrivals / Special Showcase` | 4 | Maps to a Shopify section |
| `Noise` | 40 | Texture overlay → make a **style/effect**, not a component |
| `Backpacks`/`Totes`/`Handbags` | 4 each | Two sizes: 124x30 heading vs 251x20 nav link — treat as **two different** things |

## Build waves

**Wave 1 — primitives**
- `Button` — 48px height, fill-width variants
- `Link`
- `Color Swatch` — 16px dot + 4-dot row

**Wave 2 — composites**
- `Product Card` — image, title, price, swatch row
- `Category Card` — image, heading, subcopy
- `Accordion Row` — label + existing `plus`/`minus` symbols

**Wave 3 — shared blocks**
- `Header` — nav, logo, search/account/bag icons
- `Footer` — Join SASSI signup + "Designed for You to Carry On." closer
  (identical on Landing and PDP → one component, later a Shopify snippet)

## Open questions

- Mobile frames do not exist yet (only 1440px). Plan is to design mobile in Figma
  before writing any code.
- PDP shows only the pre-add-to-cart state. Cart drawer, added-to-bag confirmation,
  and variant-selected states are not designed.

## Repo state

Working files were cleared on 2026-07-18 (staged deletion, not committed).
Old build recoverable at commit `c85c118`, pushed to
`https://github.com/djdelossantos/sassi-shopify.git`.
Shopify theme scaffolding (`layout/`, `sections/`, `templates/`, `config/`, `snippets/`)
does **not** exist yet — to be built after the design is finalized.
