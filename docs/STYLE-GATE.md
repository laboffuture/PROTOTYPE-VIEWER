# PROTOVIEW — Complete Style Gate

This project uses **plain CSS variables + inline styles** (no Tailwind). All tokens live in
`client/src/styles/lof-design-system.css` and are consumed via `var(--token)`.

---

## 1. The fonts (3 fonts, each with one job)

Loaded once via Google Fonts `@import` in the design-system CSS, exposed as CSS variables.

| Font | CSS variable | Where it's used | Weights |
|---|---|---|---|
| Orbitron | `--font-heading` | Every heading, title, label, breadcrumb, button text — the "techy" display text. Almost always UPPERCASE + letter-spacing | 400–900 |
| Rajdhani | `--font-body` | Body text & descriptions — paragraphs, captions, nav items. This is the page default (set on `body`) | 300–700 |
| Fira Code | `--font-mono` | Code, IDs, links, counts, numbers — anything monospace (share links, model order numbers, brand subtitle) | 400–600 |

**The recipes per level:**
- Page title: `font-heading, 26px, weight 900, uppercase, letter-spacing 0.08em, --text-primary`
- Panel/card title (`.card-title`): `font-heading, 1rem, weight 700, uppercase, letter-spacing 0.05em`
- Section label (`.label`): `font-heading, 10px, weight 700, uppercase, letter-spacing 0.2em, --text-muted`
- Eyebrow (`.eyebrow`): `font-heading, 0.625rem, letter-spacing 0.3em, uppercase, --text-muted`
- Description (`.body-text`): `font-body, 0.875rem, --text-secondary`
- Code/data: `font-mono, 11–12px`

**The voice of the app**: Orbitron heading (dark, uppercase) → Rajdhani gray description under it.

---

## 2. The colors

### Brand accent — LOF blue `#1C4D8C`

| Token | Value | Use |
|---|---|---|
| `--brand` | `#1C4D8C` | Primary buttons, active states, leading bars, titles |
| `--brand-hover` | `#294973` | Button hover |
| `--brand-bg` | `rgba(28,77,140,0.10)` | 10% fill — chips, active nav, ghost buttons |
| `--brand-border` | `rgba(28,77,140,0.20)` | 20% ring — chip borders, ghost button borders |
| `--brand-border-hover` | `rgba(28,77,140,0.40)` | Card hover border |
| `--brand-glow` | `0 0 20px rgba(28,77,140,0.30)` | Card hover / input focus glow |

**The chip rule** (most recognizable motif): 10% brand fill + 20% brand ring + brand-colored icon.

### Destructive / error — `#D93A2B`

| Token | Value |
|---|---|
| `--accent` | `#D93A2B` |
| `--accent-hover` | `#BF463B` |
| `--accent-bg` | `rgba(217,58,43,0.10)` |
| `--accent-border` | `rgba(217,58,43,0.30)` |

Used only for error banners and destructive hover (logout = `#dc2626` on `#fef2f2`).

### Surfaces & text

| Token | Value | Use |
|---|---|---|
| `--bg-primary` | `#F2F2F2` | Page background — always |
| `--bg-white` | `#ffffff` | Cards, sidebar, topbar |
| `--text-primary` | `#111827` | Headings, primary text |
| `--text-secondary` | `#4b5563` | Body / descriptions |
| `--text-muted` | `#9ca3af` | Labels, captions, faint text |
| `--border` | `#e5e7eb` | ALL borders — always 2px on structural elements |

### Status colors (badges only)

| Badge | Fill / Border / Text |
|---|---|
| `.badge-live` (green) | `#ecfdf5` / `#a7f3d0` / `#059669` |
| `.badge-soon` (gray) | `#f3f4f6` / `#e5e7eb` / `#9ca3af` |
| `.badge-warn` (amber) | `#fef3c7` / `#fcd34d` / `#92400e` |

Pulse dot (topbar "LIVE"): `#059669`, 8px circle, 2s opacity pulse.

### Radii & shadows

| Token | Value | Use |
|---|---|---|
| `--radius-md` | 8px | Chips, error banners |
| `--radius-lg` | 12px | Buttons, inputs, nav items, viewer frame |
| `--radius-xl` | 16px | Cards |
| `--shadow-sm` | subtle | Cards at rest |
| `--shadow-lg` | deeper | 3D viewer frame |

---

## 3. The sidebar (`AdminLayout.jsx`)

Fixed **256px** white rail, full height, **2px** gray right border. Three stacked zones:

**① Brand (top)** — a Link with `border-bottom: 2px solid var(--border)`, padding 16:
- Blue chip: `36×36px, radius-md, background var(--brand-bg), border 1px var(--brand-border)`, 20px stroke icon inside in `var(--brand)`
- Title: Orbitron `13px / 900 / letter-spacing 0.1em / --text-primary` → "PROTOVIEW"
- Subtitle: Fira Code `11px / --text-muted` → "model review"

**② Grouped nav (middle, scrollable)** — `padding 16px 12px`, group label = `.label` class, then items (`.nav-item`):
- Base: `flex, gap 10px, padding 8px 12px, radius-lg, font-body 15px/600, --text-secondary`
- Hover: `background #f3f4f6`
- Active: `background var(--brand-bg), color var(--brand)` **plus** accent bar pinned to sidebar's left edge: `::before — 4px × 20px, border-radius 0 4px 4px 0, background var(--brand), left: -12px`
- Icons: 16px bare stroke SVG, `--text-muted` idle → `--brand` when active

**③ Logout (bottom)** — pinned with `border-top: 2px solid var(--border)`, padding 12. The only red element: hover = `background #fef2f2, color #dc2626` (`.nav-logout`).

**Topbar** — slim sticky `56px`, `rgba(255,255,255,0.9)` + `backdrop-filter: blur(8px)`, `border-bottom 2px`:
- Left: Orbitron breadcrumb `11px / 700 / tracking 0.15em` — `PROTOVIEW › PAGE` (muted › primary)
- Right: pulsing green dot + Orbitron `10px / tracking 0.2em / muted` "LIVE"

**Main content**: `margin-left: 256px`, `padding: 32px`, inner `max-width: 860–900px` centered.

---

## 4. The icons (two treatments)

| | Sidebar nav icons | Brand/panel chip |
|---|---|---|
| Size | 16×16 bare icon | 20×20 icon inside 36×36 square |
| Wrapper | none | `.brand-chip` — radius-md, brand-bg fill, brand-border ring |
| Color | `--text-muted` idle → `--brand` active | always `--brand` |

All icons are **inline stroke SVGs** (lucide style: `stroke-width 2, round caps/joins, fill none`). No icon library dependency.

---

## 5. Cards, buttons, inputs & components

- **Card** (`.card`): `bg-white, 2px solid var(--border), radius-xl, shadow-sm, padding 24–28`. Hover: `border-color var(--brand-border-hover) + var(--brand-glow)`.
- **Buttons** (`.btn` + variant) — all Orbitron `13px/600, uppercase, tracking 0.1em, radius-lg, padding 10px 20px`:
  - `.btn-primary` — solid brand, white text
  - `.btn-ghost` — brand-bg fill + 2px brand-border, brand text
  - `.btn-neutral` — transparent + 2px gray border, secondary text
- **Input** (`.input`): Rajdhani 16px, `2px solid var(--border), radius-lg, padding 12px 16px`. Focus: `border var(--brand) + brand-glow`.
- **Badge** (`.badge`): Orbitron `0.6rem/700, uppercase, pill (9999px), padding 4px 12px, 1px border`.
- **Stat card**: card with `.label` on top + Orbitron `1.35rem/900` value (brand color if highlighted).
- **Result bar** (live results): name row → horizontal track `10px, brand-bg, radius 5` with fill `var(--brand)` (leader) / `--text-muted` (others), width = avg/5; beside it a 5-column mini histogram (14px columns, brand with opacity ramp `0.35→1.0` from 1★ to 5★).
- **Error banner**: `accent-bg + 1px accent-border + radius-md + accent text`, Rajdhani 14px.

---

## 6. Page-specific patterns

- **Vote page (student)**: centered header (eyebrow → Orbitron title → Rajdhani sub), one big card holding a two-column split — viewer left `68%` (black bg, radius-lg, shadow-lg, height `clamp(520px, 72vh, 850px)`), controls right `32%` (name, description, animation pills, star rating pinned to bottom with top divider).
- **Login page**: centered 400px column — eyebrow, 40×2px brand divider bar, Orbitron title, card form.
- **Hard rules**: page background is always `--bg-primary`; structural borders are always **2px**; brand color is **never hard-coded** in components — always `var(--brand*)` tokens; "admin" wording never shown in UI.

---

**One-line summary**: *White surface + gray-200 2px borders + LOF blue `#1C4D8C` accent (chip = 10% fill / 20% ring) + Orbitron-uppercase headings over Rajdhani-gray body, with Fira Code for data — fixed white 256px sidebar, blue active states, sticky blurred topbar.*
