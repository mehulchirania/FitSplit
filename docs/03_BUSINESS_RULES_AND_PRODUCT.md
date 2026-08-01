# 03 · Business Rules & Product Architecture

`Last Updated: 2026-08-02 · Product & UX System`

---

## 1. Product Philosophy — Gym-Floor Workout Companion

FitSplit prioritizes a **Member-First, Friction-Free Gym Floor Experience**:

1. **Split & Exercise Access First**: Lifters on the gym floor open today's workout split (e.g. *Push Day A*) to instantly see exercise sequences, targeted muscle groups, and volume targets (`4 sets × 8–10 reps`).
2. **1-Tap Inline Video Form Cues**: Every exercise card provides a direct **`📺 Watch Form Video`** button. Lifters tap it on the floor to watch partner YouTube Shorts / coaching videos for proper form and execution cues without leaving the screen.
3. **1-Tap Exercise Swaps & Smart Alternatives**: If equipment is occupied or causes joint discomfort, members open the **Swap Dropdown**:
   * **`⭐ Recommended`**: Auto-suggests the top alternative targeting the same muscle group.
   * **Skipped Exercise Filtering**: Automatically excludes any exercises the member previously skipped.
4. **Decoupled & Optional Set Logging**: Logging sets is never forced or blocking. Members can log sets via 1-tap `[ ✓ Check ]` buttons auto-filled from their previous session.

---

## 2. Gym Business & Revenue Model (B2B + B2C)

* **B2B Tenant Model**: Gym owners purchase FitSplit workspace access for their facility. All members enrolled at the gym receive full member companion access.
* **Trainer PT Management**: Trainers manage assigned member rosters, build custom splits, schedule 1-on-1 PT sessions, and track member adherence.
* **Direct Consumer (B2C)**: Self-coached lifters can subscribe independently to access program splits and macro tracking.

---

## 3. Visual Design System

* **Canvas & Aesthetics**: Obsidian Dark `#0D0D0E` with vibrant Neon Green `#C8F135` accents.
* **Component Styling**: Glassmorphic cards (`rgba(255,255,255,0.03)` with `1px` subtle borders), Bento grid dashboards, and bottom rest timer drawers.
* **Typography**: Clean sans-serif typography (`Inter` / system stack) with high-contrast legibility for bright gym environments.
