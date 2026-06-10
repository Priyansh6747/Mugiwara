# Mugiwara — Design Theme

> *"Cut twice, ship once."*  
> A streaming platform steeped in ink, iron, and the sea. Every pixel earns its place.

---

## Overview

Mugiwara is an anime streaming platform with a samurai soul. The visual language draws from Edo-period ink paintings, weathered ship timber, and the dramatic weight of FromSoftware's *Sekiro: Shadows Die Twice* — but recontextualised for a web product. Where Sekiro shows **死 (death)**, Mugiwara shows **錯 (error)**. Where Sekiro has a pause menu on painted wood, Mugiwara has settings panels. Same philosophy; different stage.

The brand sits at the crossroads of **brutalism** (raw, unapologetic hierarchy) and **wabi-sabi** (embracing texture, imperfection, age). Nothing should feel smooth or modern. Everything should feel discovered, not designed.

---

## Color Palette

| Token | Name | Hex | Usage |
|---|---|---|---|
| `--color-void` | Void Black | `#0D0A08` | True background — not pure black, just extinguished ember |
| `--color-ash` | Charcoal Ash | `#1A1410` | Card surfaces, sidebar, secondary panels |
| `--color-bark` | Bark Brown | `#2B211A` | Borders, dividers, menu item backgrounds |
| `--color-blood` | Blood Crimson | `#C0392B` | Primary action, active states, hover glows, "Watch Now" |
| `--color-ember` | Ember Orange | `#D4600A` | Secondary accent — settings highlights, progress bars, sliders |
| `--color-parchment` | Aged Parchment | `#E8D5B0` | Primary body text, readable labels |
| `--color-fog` | Fog White | `#A89880` | Secondary text, metadata, episode numbers |
| `--color-ink` | Sumi Ink | `#4A3728` | Subtle texture overlays, brushstroke dividers |
| `--color-gold` | Tarnished Gold | `#C9A84C` | Display accents, logo kanji |
| `--color-error` | Error Red | `#FF2D20` | Error states (replaces Sekiro's 死 with 錯) |
| `--color-caution` | Caution Amber | `#F0A500` | Warning states (maps to Sekiro's yellow alert indicator) |

### Palette Notes
- **Never use pure white.** Parchment (`#E8D5B0`) is the lightest value.
- **Backgrounds layer like woodblock prints** — void → ash → bark, each ~8% lighter.
- **Blood Crimson is earned.** Use sparingly. It is the katana in the room.
- **Opacity stack:** overlays use `rgba(13, 10, 8, 0.75)` — the void with breath still in it.

---

## Typography

### Type Scale

| Role | Family | Weight | Size | Usage |
|---|---|---|---|---|
| Display | **Cinzel Decorative** | 700 | 64–96px | Hero titles, featured show names (ONE PIECE scale) |
| Heading | **Cinzel** | 600 | 24–48px | Section headers, card titles |
| UI Label | **Noto Serif JP** | 500 | 14–18px | Navigation, menu items, category pills |
| Body | **Crimson Pro** | 400 | 15–17px | Descriptions, tooltips, error messages |
| Kanji Accent | **Noto Serif JP** | 700 | 48–120px | Decorative kanji, state glyphs (錯, 死, 道) |
| Caption / Meta | **Space Grotesk** | 400 | 11–13px | Episode codes (S3 E6), timestamps, progress labels |

### Type Rationale
- **Cinzel** carries Roman-meets-ancient-East gravitas — serif letterforms that echo carved stone, not screen defaults.
- **Noto Serif JP** ensures kanji characters render with the same weight and presence as Latin text — never as fallback boxes.
- **Crimson Pro** keeps body reading warm and organic, not cold-tech.
- **Space Grotesk** for metadata only — the one utilitarian face, kept in its lane.

### Special Treatment: Kanji State Glyphs
Inspired by Sekiro's death screen, key system states use large kanji rendered in `--color-blood` on `--color-void`, with a slow fade-in and subtle red glow (`text-shadow: 0 0 40px rgba(192, 57, 43, 0.6)`).

| State | Kanji | Romaji | English |
|---|---|---|---|
| Error | 錯 | Saku | Error |
| Not Found | 迷 | Mei | Lost |
| Loading | 道 | Michi | Path / Way |
| Success | 勝 | Shō | Victory |
| Forbidden | 禁 | Kin | Forbidden |
| Empty State | 虚 | Kyo | Void |

---

## Iconography

- **Style:** Hand-drawn linework, ~2px stroke, slightly uneven. Not Phosphor. Not Heroicons. Custom or heavily modified.
- **Primary icons:** Skull-and-crossbones (Mugiwara emblem), ship wheel, torii gate, katana crossed, scrolled map, compass rose.
- **Icon treatment:** Slight inner glow on active state using `--color-blood`. Inactive icons use `--color-fog` at 60% opacity.
- **Navigation icons** match the sidebar exactly: Home (wheel), Explore (compass), Fleet (ship), Collections (scroll), Journey (torii), Genres (mask), Watchlist (scroll bookmark), Recently Watched (hourglass).

---

## Texture & Surface System

Mugiwara's surfaces are **never flat**. Every panel, card, and modal carries texture.

### Surface Levels

| Level | CSS Background | Description |
|---|---|---|
| 0 — Void | `#0D0A08` + noise grain at 4% opacity | The deepest layer. Sidebar base, hero bg. |
| 1 — Bark | `#1A1410` + subtle wood grain SVG overlay | Cards, dropdown menus |
| 2 — Parchment Panel | `#2B211A` + aged paper texture | Settings panels (matches Sekiro Options screen) |
| 3 — Active Surface | `--color-bark` + orange brushstroke highlight | Selected menu item, active tab |

### Brushstroke Dividers
Section headers use a horizontal brushstroke SVG after the title text — a ragged, ink-drag line in `--color-blood` at ~40% opacity. No `<hr>` tags. No pixel-perfect rules. The stroke should look *applied*, not drawn by machine.

### Card Texture
Anime cards use a `box-shadow: inset 0 0 60px rgba(13, 10, 8, 0.5)` vignette to make them feel like framed woodblock prints rather than thumbnail images.

---

## Component Patterns

### Navigation Sidebar
- Dark bark (`#1A1410`) background
- Items: 48px tall, 16px horizontal padding
- Active state: red brushstroke highlight behind text (use an SVG or `::before` pseudo with a hand-drawn rectangle mask)
- Hover: text shifts to `--color-parchment`, icon gains blood glow

### Hero Banner
- Full-bleed image with heavy left-side gradient fade to `--color-void`
- Genre tags in small Cinzel caps, separated by `·` (not `/`, not `|`)
- Title in Display Cinzel — colour treatment: multicolour per character or gradient (gold-to-red) for the featured title
- Two CTA buttons: **Watch Now** (solid blood red, play icon) and **+ My Collection** (ghost, parchment border)
- Dot pagination indicators at bottom-right in blood red / fog

### Category Pills
- Background: `--color-bark`
- Border: 1px `--color-ink`
- Text: Noto Serif JP 13px, `--color-fog`
- Active: border becomes `--color-blood`, text becomes `--color-parchment`, slight red glow
- Icon-left treatment with custom icons (skull, sword, shuriken, etc.)
- Slight `border-radius: 4px` — not pill-shaped, not squared. Restrained.

### Anime Cards
- Aspect ratio: 2:3 (portrait)
- Progress bar: thin (3px), `--color-blood`, at card bottom
- Episode label: `S3 E6` in Space Grotesk 11px, `--color-fog`, bottom-left overlay
- Hover state: scale 1.04 with a blood-glow border `box-shadow: 0 0 0 2px --color-blood`
- Three-dot menu: top-right, appears on hover only

### Settings Panel (Sekiro-Inspired)
Directly lifted from the Sekiro Options screen aesthetic:

- Background: aged parchment/wood panel texture (`--color-bark` + texture overlay)
- Tab navigation: brushstroke underline for active tab in `--color-ember`
- Sidebar items: dark brushstroke behind selected item (same `--color-ember`)
- Slider/toggle controls: ember orange fill, no border-radius on sliders (flat, brush-painted feel)
- "Defaults" button: ghost state with brushstroke border
- Footer status text: body copy in `--color-fog`, 14px Crimson Pro
- Corner ornaments: subtle knotwork/seal embellishments (SVG) in `--color-ink`

### Error State (錯 — Saku)
Inspired by Sekiro's death screen — the single most dramatic moment in the UI:

```
Background: --color-void (full bleed, no texture)
Center: 
  - Kanji 錯 at 120px Noto Serif JP 700 in --color-error
  - Text shadow: 0 0 60px rgba(255, 45, 32, 0.5)
  - Below: "E R R O R" in 14px Space Grotesk, letter-spacing: 0.4em, --color-error at 70% opacity
  - Animation: fade in over 0.8s ease-out; kanji scales from 1.1 → 1.0
Below glyph:
  - Error message in Crimson Pro, --color-parchment, centered
  - Action button: "Return to Home" in Cinzel, blood red fill
```

This replaces every standard 404/500/error overlay across the platform.

### Alert / Toast System
Mapped to Sekiro's alert indicator colours:

| Type | Colour | Kanji Prefix | Example |
|---|---|---|---|
| Warning | `--color-caution` (amber) | ⚠ | "Your session expires soon" |
| Error | `--color-error` (red) | 錯 | "Playback failed" |
| Success | `--color-gold` | 勝 | "Added to Collection" |
| Info | `--color-fog` | — | "New episodes available" |

Toasts appear bottom-right, slide in from the right, auto-dismiss at 4s. No border-radius > 4px.

### Loading State
The kanji 道 (Michi — "The Path") pulses gently in the centre of loading overlays, in `--color-blood` at 60% opacity, pulsing via `opacity: 0.4 → 0.8` at 1.5s ease-in-out loop. No spinners. No skeleton screens on first load — a brief void before the world appears.

---

## Motion & Animation

| Moment | Duration | Easing | Notes |
|---|---|---|---|
| Page load fade | 600ms | `ease-out` | Content fades in from void |
| Hero carousel transition | 800ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Cinematic cross-dissolve |
| Card hover scale | 200ms | `ease-out` | 1.0 → 1.04, blood border appears |
| Sidebar item hover | 150ms | `ease` | Text brightens, icon glows |
| Kanji error reveal | 800ms | `ease-out` | Scale + fade |
| Settings panel open | 300ms | `ease-in-out` | Slide in from right |
| Toast appearance | 250ms | `ease-out` | Slide from right edge |
| Progress bar fill | Tied to playback | Linear | Blood red, always |

**Reduced motion:** All animations fall back to instant opacity transitions when `prefers-reduced-motion: reduce` is active.

---

## Spacing & Layout

```
Base unit: 8px

Spacing scale:
  xs:  4px
  sm:  8px
  md:  16px
  lg:  24px
  xl:  32px
  2xl: 48px
  3xl: 64px
  4xl: 96px

Layout:
  Sidebar width:    240px (fixed)
  Content area:     fluid, min 960px
  Card grid gap:    16px
  Section gap:      48px
  Max content width: 1440px

Border radius:
  Pill/Tag: 4px     (restrained, not soft)
  Card:     6px
  Modal:    4px
  Button:   4px
  Input:    2px     (almost square, like a blade's edge)
```

---

## Voice & Copy Conventions

The UI speaks like a sea-weathered captain: direct, unhurried, never customer-service cheerful.

| Context | Do | Don't |
|---|---|---|
| Empty watchlist | "Your voyage has no course yet." | "Nothing here! Start exploring." |
| Error | "The path is blocked. Return and try again." | "Something went wrong. Please refresh." |
| Loading | "Setting sail…" | "Loading, please wait…" |
| Add to collection | "Claimed." | "Added to your list!" |
| 404 | "This sea chart leads nowhere." | "Page not found." |

**Tone rules:**
- No exclamation marks on system messages.
- Sentence case everywhere except Display titles.
- Use `·` as separator (not `/` or `|`).
- Episode metadata: always `S{n} E{n}` format, Space Grotesk, muted.

---

## Brand Signature

**The single element this platform is remembered by:**

> **Kanji State Glyphs** — oversized, glowing, blood-red Japanese characters that replace every generic system state (errors, loading, empty, forbidden). They are borrowed from Sekiro's existential death screen and made into a language: the platform doesn't show you an error modal, it shows you 錯, and the world goes dark around it.

This is the one thing no other streaming service does. It is earned by the rest of the design being quiet and disciplined — the kanji moments land *because* the default UI is restrained.


---

*Theme version 1.0 — Mugiwara Platform*  
