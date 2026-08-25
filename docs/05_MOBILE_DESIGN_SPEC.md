# 05 · Mobile Design Spec

`Status: authoritative for the 2026-08-04 mobile redesign · Web PWA first, Expo mirror after`

This is the coordination contract for the mobile redesign. Every agent working on
mobile reads this first and does not deviate from it. It exists so that four
people working in parallel produce **one** interface instead of four.

---

## 0. The problem being solved

FitSplit's CSS is desktop-first. Mobile is a set of `@media (max-width: 768px)`
patches bolted onto files written for a 1280px sidebar layout — most of them
inside `21-member-redesign.css`, which is 3,605 lines long. The result reads as
a shrunk desktop app, not as a phone app.

Two specific failures:

1. **A phone user's first screen is the marketing landing page.** They must
   scroll a B2B pitch deck to find a way in. Standard consumer apps open with a
   short feature preview (swipe / Next / Skip) that ends at sign-in.
2. **Logged-in member screens are dense desktop layouts.** Touch targets are
   small, primary actions sit at the top out of thumb reach, and several screens
   scroll horizontally.

---

## 1. Design language — extend, do not reinvent

`src/app/styles/00-base-shell.css` already defines a deliberate concept:

> "The marked-up training log." Paper and graphite ink carry the interface; the
> lime (`#C8F135`) behaves like a highlighter — it marks what happened today,
> never what you have to read.

**This concept is not up for renegotiation.** The mobile work is the same idea
at arm's length instead of at a desk.

### Hard constraints

- **Never re-declare palette tokens outside `00-base-shell.css`.** Four
  competing palettes previously overwrote each other and greyscale won, which is
  why light mode was disabled. Do not restart that.
- **Lime is a fill, never a foreground on light surfaces.** `#C8F135` on white
  is ~1.4:1. For brand-coloured text/icons/links use `var(--brand)` (lime in
  dark, deep olive `#4C6B14` in light) — it resolves per theme, so you almost
  never need a theme-conditional rule.
- **Use the existing scales only.** Spacing (`--space-*`), type (`--text-*`),
  radius (`--radius-*`), motion (`--fast`/`--medium`/`--slow`/`--spring`) are
  fixed. If a value is missing, extend the scale in `00-base-shell.css` — do not
  hardcode a one-off px value in a screen file.
- **Body text holds 4.5:1 in both themes.** Check both, not just dark.

### The quality bar (read this twice)

The owner rejects UI that reads as generic "vibe-coded" AI output *even when it
functions correctly*. Elements already removed on this rationale: a pulsing-dot
"Now onboarding gyms across India" status pill, three tinted radial-gradient
background blobs, a fixed graph-paper grid overlay, and a full-bleed photo under
an 82% flat overlay.

Practical rules:

- Before adding a decorative element, ask whether it **encodes real
  information**. If it does not, delete it.
- Banned by default: glowing/pulsing dots, gradient headline text, floating
  decorative orbs, `01 / 02 / 03` markers on lists that are not sequences,
  faux-glassmorphism, and drop shadows used to fake depth that a single step of
  surface contrast already provides.
- **Name your signature.** Each screen gets *one* deliberate element that carries
  the personality. Everything else stays quiet. State in your report which
  element you chose and why.
- You have latitude to improve beyond the literal instruction. Take it, then say
  what you changed and why.

---

## 2. Mobile layout law

Applies to every screen at ≤768px.

| Rule | Value |
| --- | --- |
| Design viewport | 390 × 844 (iPhone 14/15). Also verify 360 × 800 (Android) |
| Minimum touch target | 44 × 44 CSS px, including invisible padding |
| Minimum gap between targets | 8px |
| Horizontal page scroll | **Never.** Wide content scrolls inside its own `overflow-x: auto` container |
| Safe areas | Respect `env(safe-area-inset-*)` — notch top, home indicator bottom |
| Primary action position | Thumb zone: bottom third of screen, or a fixed bottom bar |
| Body text floor | 15px (`--text-base`). Never ship 11–12px as body copy |
| Tap feedback | Every interactive element has a visible `:active` state |

### Safe-area pattern

Bottom-fixed elements must clear the home indicator:

```css
padding-bottom: calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
```

### Scroll containment

Screens must not double-scroll. One scroll container per screen. Fixed chrome
(top bar, tab bar) sits outside it.

---

## 3. Entry flow — the onboarding carousel

### Behaviour

| Condition | Result |
| --- | --- |
| Authenticated (any viewport) | Redirect to role home — unchanged from today |
| Unauthenticated, viewport > 768px | Existing marketing landing page — **unchanged** |
| Unauthenticated, ≤768px, no `fitsplit.onboarded` flag | Onboarding carousel |
| Unauthenticated, ≤768px, flag present | Straight to sign-in |

The desktop landing page keeps its current behaviour for SEO and for gym-owner
B2B traffic. Do not delete or gut it.

### Hydration safety — non-negotiable

This repo has already shipped fixes for hydration mismatches (`fe7e37a`,
`0f449c7`, `638d3a6`). Do not reintroduce one.

- **Never** branch on `typeof window`, `window.innerWidth`, `navigator`, or
  `localStorage` during the first render pass.
- Server and first client render **must produce identical markup.**
- Decide viewport with **CSS** where possible. Where JS is required, gate it
  behind a mounted flag (`useEffect` → `setMounted(true)`) and render the
  server-safe branch until mounted.
- The `fitsplit.onboarded` localStorage read happens **after** mount, never
  during render.

### Carousel content

3–4 slides. Each slide states one concrete capability in the member's words —
not marketing copy, and not a feature list with icons pulled from a generic set.
Source the real capabilities from `docs/03_BUSINESS_RULES_AND_PRODUCT.md`
(gym-floor workout companion, 1-tap form-video cues, same-muscle exercise swaps,
macro and body-weight logging, coach messaging).

Requirements:

- Horizontally swipeable (touch), with the slide changing on swipe.
- Progress indicator showing position. It must be legible and must not be a row
  of pulsing dots.
- **Skip** always visible and always reachable — it is not a hidden affordance.
- Final slide's primary action goes to sign-in.
- Sets `fitsplit.onboarded` on both completion **and** skip.
- Respects `prefers-reduced-motion: reduce` — no slide animation when set.
- Fully keyboard and screen-reader operable: slides in a labelled region, arrow
  keys move between them, offscreen slides are `aria-hidden` and not tabbable.

### Sign-in

Sign-in on mobile is a full screen, not the current desktop modal squeezed into
a phone. Reuse the existing auth logic in `src/components/landing/login-modal.tsx`
and `src/lib/auth.ts` — **change presentation only, never the auth logic.**

---

## 4. Navigation

Members already have a mobile tab bar (`.mcr-tabbar`, defined around line 1513
of `21-member-redesign.css`) and a desktop sidebar (`.m3d-side`). Other roles use
`MobileBottomNav` (`src/components/mobile-bottom-nav.tsx`), which deliberately
returns `null` for members and inside `/owner` and `/member` trees.

- Keep that separation. Do not merge the two nav systems in this pass.
- The member tab bar is the primary mobile nav: fixed bottom, safe-area padded,
  44px targets, active state legible in both themes.
- Do not add a hamburger drawer as primary navigation.

---

## 5. File ownership — do not edit outside your lane

CSS is append-only by file. **Do not add mobile rules to
`21-member-redesign.css`** — it is already 3,605 lines and is the reason mobile
rules are unfindable today. Each agent creates its own numbered file and imports
it in order.

| Agent | Owns (exclusive write access) |
| --- | --- |
| **A — Foundation & entry** | `src/app/styles/28-mobile-foundation.css`, `src/components/onboarding/**`, `src/app/page.tsx`, `src/app/layout.tsx`, mobile sign-in presentation |
| **B — Shell, nav, Overview, Progress** | `src/app/styles/29-mobile-member-shell.css`, `member-coach-shell.tsx`, `member-overview-screen.tsx`, `member-progress-screen.tsx` |
| **C — Workout & Logs** | `src/app/styles/30-mobile-workout-logs.css`, `member-workout-screen.tsx`, `member-logs-screen.tsx` |
| **D — Macros, Coach, account** | `src/app/styles/31-mobile-macros-coach.css`, `member-macros-screen.tsx`, `member-coach-view.tsx`, member settings/membership pages |

Agent A adds **all four** `@import` lines to `src/app/layout.tsx` in its own pass,
so B, C and D never touch that file.

Shared read-only for everyone: `00-base-shell.css` (read tokens, never write),
`packages/core` domain types, read-models, server actions.

**Nobody changes data flow.** No new server actions, no read-model signature
changes, no Firestore query changes. This is a presentation-layer redesign. If a
screen needs data it does not currently receive, report it instead of wiring it.

---

## 6. Verification — required before reporting done

Screenshots of a design you did not run are not evidence. Use the in-app browser
tools (`preview_start`, `resize_window`, `read_page`, `computer`,
`read_console_messages`).

1. `preview_start` the dev server from `.claude/launch.json`.
2. `resize_window` to 390 × 844.
3. Exercise the real flow with `computer` clicks/typing, not just a page load.
4. `read_console_messages` — **zero** errors, and specifically zero hydration
   warnings ("Text content did not match", "Hydration failed").
5. Verify **both** themes. Light mode is the one that breaks.
6. Confirm no horizontal scroll:
   `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.
7. Screenshot the result and include it in your report.

Test logins are in `docs/04_TESTING_AND_LOGINS.md`.

Also run, and report the output of:

```bash
npm run typecheck
```

---

## 7. Reporting

End your report with:

- **Signature element** — the one deliberate thing on each screen you touched.
- **What you changed beyond the literal ask**, and why.
- **What you deliberately did not do** — anything you judged out of lane or a bad
  idea, so it is a decision on record rather than a silent omission.
- **Anything blocked** on data that is not currently passed to the component.
