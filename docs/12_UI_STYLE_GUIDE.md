# 12 · UI STYLE GUIDE & DESIGN SYSTEM (Tier 2)

`Generated: 2026-06-05 · Last updated: 2026-06-06`

> **Purpose.** This document contains the complete FitSplit design system, design tokens, CSS architecture, and reusable UI paradigms.

## Design Tokens (`src/app/styles/00-base-shell.css`)

The app ships in **dark mode by default** (`data-theme="dark"` on `<html>`), with light mode available via a toggle.

### Color Palette

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--brand` | `#4f46e5` (indigo) | `#C8F135` (lime) | Primary action fills |
| `--brand-strong` | `#4338ca` | `#b8e028` | Hover state of brand fills |
| `--brand-soft` | `#e0e7ff` | `rgba(200,241,53,.12)` | Tinted backgrounds, badges |
| `--primary-foreground` | `#ffffff` | `#0A0A0A` | **Text on brand-filled elements** |
| `--bg` | `#ffffff` | `#111111` | Page background |
| `--bg-card` | `#f9f9f9` | `#1a1a1a` | Card/panel backgrounds |
| `--bg-hover` | `#f2f2f2` | `#222222` | Hover state backgrounds |
| `--text` | `#0a0a0a` | `#f5f5f5` | Primary body text |
| `--text-soft` | `#737373` | `#a3a3a3` | Secondary/muted text |
| `--border` | `rgba(0,0,0,.09)` | `rgba(255,255,255,.09)` | Dividers, card borders |
| `--accent` | `#737373` | `#a3a3a3` | Icon tints, subtle labels |
| `--accent-soft` | `#f1f1f1` | `#1f1f1f` | Soft background fills |
| `--danger` | `#dc2626` | `#ef4444` | Error states, destructive actions |
| `--danger-soft` | `#fee2e2` | `rgba(239,68,68,.12)` | Error backgrounds |
| `--warning` | `#d97706` | `#f59e0b` | Warning states |

### Critical Button Contrast Rule

> ⚠️ `--brand` is **lime (#C8F135)** in dark mode — NEVER pair it with `color: white`. Always use `color: var(--primary-foreground)`.

```css
/* ✅ Correct — works in both themes */
.my-button {
  background: var(--brand);
  color: var(--primary-foreground);
}

/* ❌ Wrong — unreadable on lime in dark mode */
.my-button {
  background: var(--brand);
  color: white;
}
```

### Button Variants

| Variant | Class | Background | Text | Use for |
|---|---|---|---|---|
| Primary | `.lpd-btn--brand` / `.lpd-btn--primary` | `var(--brand)` | `var(--primary-foreground)` | Main CTAs |
| Ghost | `.lpd-btn--ghost` | transparent | `var(--text)` | Secondary actions |
| Danger | — | `var(--danger)` | `#ffffff` | Destructive actions |
| Subtle | — | `var(--accent-soft)` | `var(--text-soft)` | Tertiary/icon-only |

Always reset `<button>` default UA styles for custom-styled buttons:
```css
.my-button {
  background: transparent;
  border: none;
  font: inherit;
  cursor: pointer;
}
```

## CSS Architecture

CSS is modularized under `src/app/styles/`, loaded in numeric order via `src/app/layout.tsx`.

| Prefix/File | Scope |
|---|---|
| `00-base-shell.css` | Design tokens, base reset, app-shell layout |
| `02-shared-components.css` | Shared components (cards, badges, buttons, inputs, modals) |
| `03` through `05` | Visual refresh tokens, loader animations, theme polish |
| `odp2-` | Owner dashboard workspace (`20-owner-dashboard.css`) |
| `adm-` | Admin/owner shared UI (`08-admin-catalog-media.css`) |
| `mhv-` | Members hybrid view (`19-members-redesign.css`) |
| `m3d-` | Member sub-pages shell (`21-member-redesign.css`) |
| `app-status-` | Shared not-found/error status screens (`09-profile-history-notices-loader.css`) |

### App Router Status Screens

Use `src/components/app-status-screen.tsx` for app-level 404 and error boundary states. It is already
wired into `src/app/not-found.tsx` and the root/admin/owner/member `error.tsx` files. Keep status
screens unframed and centered; use the existing `.button` variants for actions instead of inline styles.
| `pt-` | Personal training booking, cards, calendar (`10-pt-training.css`) |
| `nlist-`, `ntf-` | Notification list and bell dropdown |
| `lp-`, `lpd-` | Landing page components (`landing.css`) |

## Layout Paradigms

### Owner Dashboard Workspace (`.odp2-workspace`)
Uses a fixed full-viewport workspace pattern. The app topbar (`AppTopbar`) is actively suppressed on `/owner/*` routes to avoid flashing before the layout fully renders.
```css
.odp2-workspace {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  overflow: hidden;
}

body:has(.odp2-workspace) .topbar {
  display: none !important;
}
```

### Priority Row Color Coding (Owner Tables)
Used in member lists and activity feeds:
| Status | Token | Meaning |
|---|---|---|
| 🔴 Urgent / Expired | `var(--danger)` / `var(--danger-soft)` | Membership expired, overdue |
| 🟡 Warning | `var(--warning)` | Expiring soon (≤7 days) |
| 🟢 Active / Normal | `var(--brand-soft)` | Current, healthy |
| ⚪ Neutral | `var(--bg-card)` | No action needed |

### Components & UI Patterns
- **Members Hybrid View (D4)**: Combines a horizontal Action Queue (snooze/view CTAs), KPI strip (filters the directory), refined Directory Table (checkboxes, avatar status dots), and a Dark Bulk Action Dock.
- **`<details>` Auto-Open Navigation**: Use `src/components/open-details-button.tsx` instead of native `<a href="#id">` anchor links to ensure `<details>` elements expand before the browser scrolls to them.
- **Member Sub-Pages Shell**: Uses `m3d-*` prefix. Ensures consistent height chain (`body → .app-shell → .m3d-root → .m3d-main → .m3d-content`).

## Admin Design System (`adm-*`) — Updated 2026-06-06

All admin components live in `src/app/styles/08-admin-catalog-media.css`.

### Buttons — `adm-btn`
| Class | Use |
|---|---|
| `adm-btn` | Solid brand fill (primary action) |
| `adm-btn adm-btn--ghost` | Outline/ghost (secondary action) |
| `adm-btn adm-btn--sm` | Smaller padding variant |

States: `:hover` (brand-strong fill), `:focus-visible` (2px brand outline, offset 2px), `:disabled`/`[disabled]` (opacity 0.45, pointer-events none, cursor not-allowed).

**Rule:** `adm-btn` always uses `color: var(--primary-foreground)`. In dark mode `--primary-foreground: #0A0A0A` (dark text on lime). Never hardcode `color: white`.

### Form Fields — `adm-input` / `adm-label`
```html
<label class="adm-label">Field name *</label>
<input class="adm-input" name="field" />
```
States: `:focus` (brand border), `:focus-visible` (2px brand outline), `::placeholder` (text-faint), `:disabled` (opacity 0.5, bg-subtle, cursor not-allowed). Transitions: `border-color var(--fast)`.

### KPI Strip — `adm-kpis`
```html
<div class="adm-kpis adm-kpis--4">   <!-- or adm-kpis--3 -->
  <div class="adm-kpi adm-kpi--brand">
    <small>LABEL</small>
    <strong>Value</strong>
    <em>sub-label</em>
  </div>
</div>
```
Variants: `adm-kpis--3` (3-col), `adm-kpis--4` (4-col). Both collapse to 2-col at 900px, 1-col at 500px. Color modifiers: `adm-kpi--brand`, `adm-kpi--accent`, `adm-kpi--warn`, `adm-kpi--danger`.

### Collapsible Panel — `adm-details-panel`
```html
<details class="adm-details-panel">
  <summary class="adm-details-panel__summary">Title</summary>
  <div class="adm-details-panel__body">…</div>
</details>
```
Danger variant: add `adm-details-panel--danger` + `adm-details-panel__summary--danger`. Summary has `:focus-visible` ring (2px brand, inset offset).

### CSS Prefix Reference
| Prefix | Scope | File |
|---|---|---|
| `adm-*` | All admin pages | `08-admin-catalog-media.css` |
| `odp2-*` | Workspace shell (scroll container, sidebar) | `20-owner-dashboard.css` |
| `mpd-*` | Member profile detail (owner view) | `09-profile-history-notices-loader.css` |
| `m3d-*` / `mset-*` | Member dashboard / settings | `21-member-redesign.css` |
| `sk-*` | Skeleton loaders | `13-skeletons.css` |
| `ptx-*` | Trainer pages | `10-pt-training.css` |
| `status-pill` | Status badges (shared) | `03-visual-refresh.css` |
