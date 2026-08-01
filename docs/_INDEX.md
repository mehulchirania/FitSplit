# FitSplit Core Documentation Index

`Last Updated: 2026-08-02 · Streamlined Core Specs`

The FitSplit documentation system is organized into 4 essential core specifications:

1. 🏛️ **[01 · System Architecture](01_ARCHITECTURE.md)**
   - Technology stack (Next.js 16, Expo Mobile, `@fitsplit/core`, Firebase Cloud Functions v2).
   - Server-Actions-First architecture and request lifecycle.
   - User role authorization matrix (`admin`, `owner`, `trainer`, `member`).

2. 🗄️ **[02 · Data Model & Firestore ERD](02_DATA_MODEL_AND_ERD.md)**
   - Multi-tenant Firestore schema for `gyms/{gymId}` tenant subcollections.
   - Global identity lookup collections (`usernames`, `phones`, `authProfiles`).
   - Member activity logging collections (`dayLogs`, `liftLogs`, `ptBookings`).

3. 🏋️ **[03 · Business Rules & Product Architecture](03_BUSINESS_RULES_AND_PRODUCT.md)**
   - Gym-Floor Workout Companion (split access, 1-tap form video cues, recommended exercise swaps, skipped exercise filtering, decoupled logging).
   - B2B gym business model vs B2C self-coached model.
   - Obsidian Dark (`#0D0D0E`) & Neon Green (`#C8F135`) design system.

4. 🧪 **[04 · Testing & Credentials Runbook](04_TESTING_AND_LOGINS.md)**
   - Multi-tenant test logins table (4 Owners, 12 Trainers, 40 Members).
   - Seed automation script (`node scripts/seed-clean-gyms.mjs`) & live inspection tools.
   - Automated testing runbook (Vitest & TypeScript typechecking).
