# 19 · Owner Member-Detail + Reports Redesign Plan

`Created: 2026-07-07 · Author: Fable (plan) → Sonnet (implementation) · Status: READY TO IMPLEMENT`

Redesign of two owner-workspace pages:

1. `/owner/members/[memberId]` — member detail (e.g. `/owner/members/member-mehul`)
2. `/owner/reports` — gym reports

Read this whole doc before writing code. Every decision is already made — do not re-litigate layout or naming choices. Where a value is given (px, token, breakpoint), use it exactly.

---

## 1. Root cause — why these pages look broken

### Member detail: the stylesheet never shipped

`src/app/owner/members/[memberId]/page.tsx` and four of its client components were written against a `mpd-*` / `tpp-*` class system **that has no CSS**. Verified 2026-07-07: the only `mpd-` rule in the entire repo is `.mpd-main-schedule .selected-workout-day` in `16-ux-improvements.css:825`. There are **zero** `tpp-` rules.

Result in the browser: the hero renders as raw stacked text, the `<Mail />` / `<Phone />` / `<Dumbbell />` SVGs (which have `viewBox` but no width/height — see `src/components/icons.tsx`) explode to full viewport width, the two-column workspace is a single unstyled stack, and the metrics strip is four unlabeled text fragments.

**Orphaned classes (all must get CSS in this task):**

| File | Classes |
|---|---|
| `app/owner/members/[memberId]/page.tsx` | `mpd-hero`, `mpd-hero-body`, `mpd-hero-identity`, `mpd-avatar`, `mpd-hero-name-block`, `mpd-name-row`, `mpd-name`, `mpd-program-pill`, `mpd-hero-subline`, `mpd-hero-sep`, `mpd-hero-dim`, `mpd-hero-contacts`, `mpd-contact-chip`, `mpd-username-at`, `mpd-username`, `mpd-metrics`, `mpd-metric`, `mpd-workspace-layout`, `mpd-primary-stack`, `mpd-main-schedule`, `mpd-empty-schedule`, `mpd-side-stack`, `mpd-collapsible-panel`, `mpd-collapsible-chevron`, `mpd-danger-panel` |
| `components/member-context-editor.tsx` | `mpd-context-panel`, `mpd-edit-trigger`, `mpd-context-grid`, `mpd-context-card`, `mpd-edit-form`, `mpd-cancel-edit` |
| `components/member-access-actions.tsx` | `mpd-account-panel`, `mpd-login-username`, `mpd-account-section`, `mpd-section-hint`, `mpd-section-label` |
| `components/member-delete-action.tsx` | `mpd-account-section`, `mpd-section-hint` |
| `components/trainer-pt-panel.tsx` | `tpp-panel`, `tpp-trainer-row`, `tpp-trainer-avatar`, `tpp-trainer-info`, `tpp-edit-row`, `tpp-pt-section`, `tpp-pt-empty`, `tpp-notify-note`, `tpp-pt-header` |

The page's information architecture (hero → metrics → two-column workspace) is sound. **This is not a rewrite** — it is: write the missing stylesheet, fix a handful of markup defects (§4.6), and de-inline the styles.

### Reports: functional but flat and dead-ended

`src/app/owner/reports/page.tsx` renders, but ~40 inline `style={{}}` objects define most of its visual layer, cards have no hierarchy or grouping, and every number is a dead end — "5 unassigned" is not clickable, "3 suspended" is not clickable. It reads as a debug dump, not a report.

---

## 2. Shared design direction

Match the visual language of the 2026-07-07 members-list redesign (`src/app/styles/19-members-redesign.css`, `mhv-` prefix). Concretely:

- **Surfaces:** `background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: 0 8px 24px rgba(10, 24, 28, 0.07);`
- **Page shell:** content constrained to `max-width: 1280px; margin: 0 auto; padding: 24px 28px 80px;`
- **Type scale:** page title 26px/700/`-0.02em`; card titles 15–16px/700; body 13.5px; captions/eyebrows 11–12.5px uppercase `var(--text-faint)`.
- **Buttons:** reuse `.mhv-btn`, `.mhv-btn--brand`, `.mhv-btn--ghost`, `.mhv-btn--subtle`, `.mhv-btn--danger` where a button is needed, or `adm-btn`/`adm-btn--ghost` where the page already uses them. Do not invent a third button system.
- **Color tokens only.** Never hardcode hex. Brand fills always pair `background: var(--brand)` with `color: var(--primary-foreground)` (CLAUDE.md critical rule). Note the live light-mode `--brand` is near-black `#171717` (overridden in `05-theme-polish.css`), so anything tinted `var(--brand-soft)` must stay legible in both themes — check both.
- **Breakpoint:** two-column layouts collapse to one column below **1080px** (same as `mhv`). Everything must work at 375px with no horizontal scroll.
- **Motion:** any transition/animation ≤ 160ms, and gate anything that moves with `@media (prefers-reduced-motion: reduce)`.
- **Focus:** every interactive element keeps a visible `:focus-visible` outline (`outline: 2px solid var(--brand); outline-offset: 2px;` is the house pattern).
- **Touch targets ≥ 44×44px** for standalone tap targets (buttons, summary rows, KPI links).

---

## 3. Task 0 — new stylesheet + registration

1. Create `src/app/styles/22-owner-detail-reports.css` with a file header comment matching the style of `19-members-redesign.css`, containing two clearly separated sections:
   - Section 1: member detail (`mpd-`, `tpp-` prefixes)
   - Section 2: reports (`rpt-` prefix)
2. Import it in `src/app/layout.tsx` after the existing `21-member-redesign.css` import (find the import block of numbered stylesheets and append in numeric order).
3. Delete the stray rule `.mpd-main-schedule .selected-workout-day` from `16-ux-improvements.css:825` and move it (verbatim or improved) into the new file, so all `mpd-` CSS lives in one place.
4. Register the file in the README CSS architecture table (`mpd-`/`tpp-`/`rpt-` → `22-owner-detail-reports.css` → "Owner member detail + reports").

---

## 4. Part A — Member detail page

Target anatomy (unchanged from current JSX, now actually styled):

```
breadcrumb row (adm-page-head — already styled, keep)
┌─ mpd-hero ────────────────────────────────────────────────┐
│ avatar · name + pills · goal/joined subline · contact chips│
│ ─────────────── mpd-metrics (4 stats) ─────────────────── │
└───────────────────────────────────────────────────────────┘
┌─ mpd-workspace-layout (grid: 1fr 340px, gap 18px) ────────┐
│ mpd-primary-stack            │ mpd-side-stack             │
│  · weekly schedule panel     │  · Trainer & PT panel      │
│  · member context panel      │  · Assign program panel    │
│  · coach note panel          │  · Account access <details>│
│                              │  · Danger zone <details>   │
└───────────────────────────────────────────────────────────┘
```

### 4.1 Hero (`mpd-hero`)

- `mpd-hero`: card surface (§2), `padding: 22px 24px 0;` (metrics strip supplies the bottom), `margin-bottom: 18px;`
- `mpd-hero-identity`: `display: flex; gap: 16px; align-items: flex-start;`
- `mpd-avatar`: 64×64 circle, `background: var(--brand-soft); color: var(--brand); font-weight: 800; font-size: 22px; display: grid; place-items: center; border-radius: 50%; flex-shrink: 0;` At ≤640px drop to 52×52/18px.
- `mpd-name`: `font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0;` (≤640px: 20px)
- `mpd-name-row`: `display: flex; align-items: center; gap: 10px; flex-wrap: wrap;` Status pills (`status-pill` variants already exist globally) sit beside the name.
- `mpd-program-pill`: inline-flex, gap 5px; size its svg 13×13. It should read as informational, not a button.
- `mpd-hero-subline`: `font-size: 13.5px; color: var(--text-soft); margin: 6px 0 0; display:flex; gap: 8px; flex-wrap: wrap;` `mpd-hero-sep` gets `opacity: .45;` `mpd-hero-dim` gets `color: var(--text-faint);`
- `mpd-hero-contacts`: `display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;`
- `mpd-contact-chip`: pill — `display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-soft); background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 999px; padding: 5px 12px;` **`.mpd-contact-chip svg { width: 13px; height: 13px; flex-shrink: 0; }`** — this is the fix for the full-screen mail icon. `mpd-username-at` gets `color: var(--text-faint);`.

### 4.2 Metrics strip (`mpd-metrics`)

- `mpd-metrics`: `display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-top: 1px solid var(--border); margin-top: 18px;` Inside the hero card, full-bleed to its edges (negative horizontal margin matching hero padding, or restructure padding — pick one, keep it simple).
- `mpd-metric`: `padding: 14px 18px; display: flex; flex-direction: column-reverse; gap: 3px;` + `& + & { border-left: 1px solid var(--border); }`
  - `strong`: `font-size: 16px; font-weight: 700; color: var(--text);`
  - `span`: `font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-faint); font-weight: 600;`
- ≤640px: `grid-template-columns: repeat(2, 1fr);` and give rows a top border instead of doubling left borders (`:nth-child(odd) { border-left: 0; }`, `:nth-child(n+3) { border-top: 1px solid var(--border); }`).

### 4.3 Workspace grid

- `mpd-workspace-layout`: `display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: start;`
- `<1080px`: single column; the sidebar (`mpd-side-stack`) moves **below** the primary stack (source order already does this).
- `mpd-primary-stack`, `mpd-side-stack`: `display: flex; flex-direction: column; gap: 18px; min-width: 0;`

### 4.4 Primary column panels

`list-panel` / `form-panel` / `panel-title` / `eyebrow` already have global styling — the new CSS only layers page-specific rules on top.

- `mpd-main-schedule`: no extra chrome needed beyond the moved `.selected-workout-day` rule; verify `WeeklyProgramSchedule` doesn't overflow at 375px (add `overflow-x: auto` on its wrapper if it does).
- `mpd-empty-schedule` (no-program state): centered empty state — `text-align: center; padding: 40px 24px; display:flex; flex-direction: column; align-items: center; gap: 10px;` with `.mpd-empty-schedule svg { width: 36px; height: 36px; color: var(--text-faint); }` (fixes the second giant SVG), h2 at 17px/700, p at 13.5px `var(--text-soft)` `max-width: 40ch`.
- `mpd-context-panel` / `mpd-context-grid` / `mpd-context-card` (in `member-context-editor.tsx`):
  - `mpd-context-grid`: `display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px;` (1 column ≤640px)
  - `mpd-context-card`: `background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px;` — label (its `span`/small text) 11px uppercase faint; value (`strong`) 13.5px/600, `overflow-wrap: break-word`. Empty values ("No notes added") get `color: var(--text-faint); font-weight: 500;` — read the component to see the exact markup before styling.
  - `mpd-edit-form`: read the component; give the form a sensible 2-col grid of labeled inputs (1 col ≤640px) reusing global input styles, `mpd-cancel-edit` styled as a ghost button.
- **Coach note panel** (`page.tsx:214-255`): replace every inline `style={{}}` in this block with classes in the new file: `mpd-note-head` (flex, baseline, space-between), `mpd-note-hint` (12px, faint, normal case), `mpd-note-meta` (12.5px, `var(--text-soft)`, margin-top 6px). Keep the `ConfirmActionForm` wiring untouched.

### 4.5 Sidebar panels

- `tpp-panel`: standard card; `tpp-trainer-row`: `display:flex; align-items:center; gap:12px;`; `tpp-trainer-avatar`: 40×40 rounded-full, `background: var(--bg-muted); color: var(--text-soft); font-weight: 700; display:grid; place-items:center;`; `tpp-trainer-info` labels like the context cards. `tpp-edit-row`: flex gap 8; `tpp-pt-section`: `border-top: 1px solid var(--border); margin-top: 14px; padding-top: 14px;`; `tpp-pt-empty`: compact empty state (13px soft text + the existing "Book first PT session" link styled as `.mhv-btn .mhv-btn--subtle`-equivalent); `tpp-notify-note`: 12px faint with a subtle info tint. Read `trainer-pt-panel.tsx` fully before writing these — there is also a session list state (`tpp-pt-header`).
- **Assign program panel** (`program-assignment-form.tsx`): keep its logic; de-inline the obvious offenders — the submit button currently has `style={{ width: "100%", padding: "16px", fontSize: "1.15rem", ... }}`; replace with a class (`mpd-assign-submit`) at a sane size: full-width, `padding: 12px`, `font-size: 14px`. The plan list of programs should be a scrollable box (`max-height: 320px; overflow-y: auto;`) if it isn't already — with 13+ programs it currently dominates the column.
- **Collapsible panels** (`mpd-collapsible-panel`): style the `<details>/<summary>`:
  - `summary`: `display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-weight: 700; font-size: 14px; list-style: none; min-height: 44px;` + hide the default marker (`&::-webkit-details-marker { display: none; }`).
  - `mpd-collapsible-chevron`: `transition: transform 140ms;` and `[open] & { transform: rotate(180deg); }` (skip transition under reduced motion).
  - `mpd-danger-panel`: `border-color: color-mix(in srgb, var(--danger) 35%, var(--border));` and summary text `color: var(--danger);`
- `mpd-account-panel`, `mpd-account-section`, `mpd-section-label`, `mpd-section-hint`, `mpd-login-username`: read `member-access-actions.tsx` / `member-delete-action.tsx` and style as stacked sections separated by `border-top: 1px solid var(--border)`, hints at 12px faint, `mpd-login-username` as a monospace chip (`font-family: var(--font-mono, ui-monospace, monospace); background: var(--bg-subtle); padding: 2px 8px; border-radius: 6px;`).

### 4.6 Markup fixes in `page.tsx` (small, surgical)

1. Line 129: `Joined {member.joinedAt}` renders a raw ISO date — wrap it: `Joined {formatShortDate(member.joinedAt)}` (the helper is already defined in the file).
2. Remove `/* eslint-disable @typescript-eslint/no-unused-vars */` (line 1) and delete whatever unused imports/vars it was masking (`totalExercises` at line 80 is computed and never rendered — either surface it as a metric subline or delete it; **delete it**).
3. Coach-note block: replace inline styles with the classes from §4.4.
4. The `<h2>` inside the coach-note `ConfirmActionForm` and metric `strong` elements at lines 168/174 carry inline `style` — move to classes (`mpd-metric--empty` modifier for the faint "None", `mpd-metric--brand` for the PT count highlight).
5. Leave data fetching, guards (`requireRole(["admin","owner"])`), and component composition untouched.

### 4.7 Loading skeleton

Update `src/app/owner/members/[memberId]/loading.tsx` to mirror the final anatomy: hero card skeleton (avatar 64, two text lines, chip row, 4-stat strip) above a `1fr/340px` two-column grid. Reuse the existing `Skeleton*` primitives; replace the hardcoded `gridTemplateColumns: "1fr 300px"` with the new 340px rail and make it collapse below 1080px (simplest: reuse `mpd-workspace-layout` on the skeleton wrapper).

---

## 5. Part B — Reports page

Keep all data fetching and derived stats in `page.tsx` exactly as they are. This is a presentation-layer redesign: class system, hierarchy, and actionability.

Target anatomy:

```
rpt-header      breadcrumb · title · "As of" subtitle
rpt-kpis        4 KPI links (members / suspended / new / live)
rpt-section     "Attendance" — AttendanceTrendChart (full width)
rpt-grid        2-col card grid (1 col <1080px):
                  Workout coverage · PT plans
                  Programs by assignments · Slot distribution
```

### 5.1 Header

Replace the current `adm-page-head` + stray `<p className="adm-page-desc">` with the `mhv` header pattern: `rpt-header` block with crumbs, `rpt-title` (26px), and subtitle line `As of {date} · {members.length} members · {activeSessions.length} training now`. Keep the zero-member empty state branch, but restyle its card with the same designed-empty-state pattern as `mpd-empty-schedule` (icon sized 36px, heading, one line, CTA button).

### 5.2 KPI row — make it navigable

Replace the four `adm-kpi` divs with four **links** (`rpt-kpi`, rendered as `<Link>`), because each stat has an obvious destination:

| KPI | Destination |
|---|---|
| Total members | `/owner/members` |
| Suspended | `/owner/members?tab=all` (suspended have no dedicated bucket — plain members link is fine; do NOT invent a new bucket in this task) |
| New this month | `/owner/members` |
| Live now | `/owner/dashboard` (verify the route for the live-sessions view first — if none exists, leave this one a non-link `div`) |

Styling: card surface; `display:flex; flex-direction: column; gap: 4px; padding: 16px 18px; min-height: 44px;` label 11px uppercase faint, value 26px/800, delta line 12.5px `var(--text-soft)`. Modifiers: `rpt-kpi--warn` tints the border `color-mix(in srgb, var(--warning) 40%, var(--border))` **only when the count > 0** (keep the existing conditional); `rpt-kpi--brand` similarly with `var(--brand)`. Hover (links only): `border-color: var(--border-strong); background: var(--bg-subtle);` `rpt-kpis`: `display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px;` → 2×2 ≤900px → keep 2×2 at 375px (values fit).

### 5.3 Attendance section

Wrap `AttendanceTrendChart` in a `rpt-section` with an `rpt-section-title` eyebrow ("ATTENDANCE — LAST 30 DAYS") only if the chart card doesn't already render its own header — **read `src/components/attendance-trend-chart.tsx` first**; it already has a "LAST 30 DAYS / Training Activity" head and an empty state. If its empty state is plain text (it is, per the 2026-07-05 audit), upgrade it inside that component to the designed empty-state pattern: centered, small icon, 14px heading, 13px explainer — no CTA (nothing to set up).

### 5.4 Insight grid

`rpt-grid`: `display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px;` → 1 column <1080px. Keep the four cards on `adm-card`/`adm-card__head`/`adm-card__body` bones, but move **every inline style** into `rpt-` classes:

**Workout coverage** — `rpt-progress` (track: `height: 8px; border-radius: 999px; background: var(--bg-muted);`) + `rpt-progress-fill` with three state modifiers replacing the hardcoded `#22c55e` ternary: `rpt-progress-fill--ok` (`background: var(--success, #22c55e)` — check `00-base-shell.css` for the real success token and use it; only fall back if none exists), `--mid` (`var(--accent)`), `--low` (`var(--warning)`). Stat row becomes `rpt-statline` with three entries; make "**N unassigned**" a link to `/owner/members?tab=no-plan` (see §5.5) styled `color: var(--warning)` when N>0.

**PT plans** — status quad becomes `rpt-quad` (2×2 grid) of `rpt-quad-cell` with modifiers `--active` (brand-soft bg) and `--cancelled` (danger-soft bg); default cells `var(--bg-subtle)` + border. Footer line ("4 members currently on a PT plan") links to `/owner/pt` if that route exists — verify with a glob on `src/app/owner/**/page.tsx`; if not, plain text.

**Programs by assignments** — keep the bar-list; classes `rpt-bars`, `rpt-bar-row`, `rpt-bar-label` (ellipsis, `flex: 0 0 9rem`), `rpt-bar-track`, `rpt-bar-fill` (`background: var(--brand)`), `rpt-bar-count`. Rows with count 0 get `rpt-bar-row--zero` (`opacity: .55`). Keep the top-8 slice; if `programs.length > 8`, append a `rpt-more-link` → `/owner/programs`.

**Slot distribution** — `rpt-slots` 4-col grid (2×2 ≤640px), `rpt-slot-cell` styled like `rpt-quad-cell`; keep count/label/percent stack. Empty state already exists; keep it but confirm it uses `adm-empty` consistently.

### 5.5 Deep-link support in the members list (small enabler)

`src/components/members-hybrid-view.tsx` keeps its filter bucket in `useState` (`type Bucket = "all" | "active" | "no-plan" | "expiring"`, line ~148) with no URL wiring. Add read-only initialization: the owner members `page.tsx` reads `searchParams` (Next 16: `searchParams` is a Promise — await it) and passes `initialBucket?: Bucket` into `MembersHybridView`; the component uses it as the `useState` initial value after validating it against the four allowed values. Do **not** add URL synchronization on tab click — init-only, one prop, ~10 lines total. This makes the reports links (`?tab=no-plan`) land on the right tab.

---

## 6. Constraints and gotchas (non-negotiable)

1. **No worktrees, no side branches** — edit `main` in place (CLAUDE.md rule 1).
2. `npx tsc --noEmit` clean after every edit; `npm run build` clean before finishing (rules 3–4).
3. Icons from `src/components/icons.tsx` have **no intrinsic size** — every context that renders one MUST size it via CSS. Audit each icon usage you touch.
4. `requireOwnerPage()` on reports and `requireRole(["admin","owner"])` on member detail stay exactly as they are.
5. Server components stay server components — do not add `"use client"` to either page.
6. Both themes: the owner shell theme comes from the `data-theme` attribute (not `prefers-color-scheme`). Verify light and dark.
7. Do not touch read-models, actions, or Firestore paths. Zero data-layer changes in this task.
8. `AttendanceTrendChart` empty-state polish (§5.3) is the only component-internal change on the reports side.
9. Dialog/`<details>` interactions: ESC/keyboard must keep working; `<summary>` is natively keyboard-accessible — don't replace it with a div.

## 7. Verification checklist (run before declaring done)

Dev server via the preview tooling, logged in as a staff login (`admin` / `password` works and passes both guards; gym resolves to `shg`).

1. `/owner/members/member-mehul` (has trainer, no program → exercises the empty-schedule state) — desktop ≥1280px: hero + 4-stat strip + two columns; no giant SVGs anywhere.
2. `/owner/members/shg-m-arjun` (has program `split_02`) — weekly schedule panel renders inside the styled card.
3. Both member pages at 375×812: single column, no horizontal scroll (`document.documentElement.scrollWidth <= 375`), metrics 2×2.
4. `/owner/reports` desktop: KPI links navigate; "N unassigned" lands on the members page with the **Needs plan** tab active; coverage bar and quads use tokens (inspect `background` of `.rpt-progress-fill` and `.rpt-kpi`).
5. Reports at 375px: KPIs 2×2, cards stacked, no overflow.
6. Light mode (`data-theme` toggle): brand-fill elements use `var(--primary-foreground)` text; `--brand-soft` tints legible.
7. Collapsibles: keyboard-open Account access / Danger zone, chevron rotates (and doesn't under forced reduced motion).
8. Console clean of errors on all pages visited.
9. `npx tsc --noEmit` and `npm run build` exit clean.

## 8. Docs to update in the same change

1. `README.md` — CSS architecture table: add `22-owner-detail-reports.css` row (`mpd-`/`tpp-`/`rpt-`).
2. `PROJECT_HANDOFF.md` — prepend dated entry describing the redesign + the root cause (missing stylesheet) so future sessions don't re-diagnose it.
3. `docs/_INDEX.md` — this doc is already registered; no further change needed unless the file directory table is regenerated.

## 9. Acceptance criteria

- Every class in the §1 inventory has at least one rule in `22-owner-detail-reports.css`; `grep -c "mpd-\|tpp-"` on the new file covers them all.
- Zero inline `style={{}}` remaining in `app/owner/reports/page.tsx`; member-detail `page.tsx` retains none except (if truly unavoidable) dynamic width on the progress bar pattern — everything static is a class.
- Both pages pass the §7 checklist with screenshots captured at desktop and 375px.
