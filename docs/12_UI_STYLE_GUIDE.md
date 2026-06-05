# 12 · UI STYLE GUIDE & DESIGN SYSTEM (Tier 2)

`Generated: 2026-06-05`

> **Purpose.** This document contains the complete FitSplit design system, design tokens, CSS architecture, and reusable UI paradigms.

## Design Tokens (`app/styles/00-base-shell.css`)

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

CSS is modularized under `app/styles/`, loaded in numeric order via `app/layout.tsx`.

| Prefix/File | Scope |
|---|---|
| `00-base-shell.css` | Design tokens, base reset, app-shell layout |
| `02-shared-components.css` | Shared components (cards, badges, buttons, inputs, modals) |
| `03` through `05` | Visual refresh tokens, loader animations, theme polish |
| `odp2-` | Owner dashboard workspace (`20-owner-dashboard.css`) |
| `adm-` | Admin/owner shared UI (`08-admin-catalog-media.css`) |
| `mhv-` | Members hybrid view (`19-members-redesign.css`) |
| `m3d-` | Member sub-pages shell (`21-member-redesign.css`) |
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
- **`<details>` Auto-Open Navigation**: Use `components/open-details-button.tsx` instead of native `<a href="#id">` anchor links to ensure `<details>` elements expand before the browser scrolls to them.
- **Member Sub-Pages Shell**: Uses `m3d-*` prefix. Ensures consistent height chain (`body → .app-shell → .m3d-root → .m3d-main → .m3d-content`).
