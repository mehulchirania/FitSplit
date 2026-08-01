# 21 — Mobile (Expo) Go-Live Checklist

`Created 2026-07-21.` Scope: **member app v1** (owners/trainers continue on the web workspace). Companion to `docs/20_EXPO_MIGRATION_PLAN.md`.

This is the honest state of what it takes to ship the `mobile/` app to the App Store and Play Store. Items are grouped by who can do them. **Claude cannot perform the store-submission, account, or device-testing steps** — those need your developer accounts, physical devices / a Mac, and acceptance of store terms. Everything in "Engineering — done" was built and verified in this repo.

## Engineering — done and verified (local, against production `fitsplit-29215`)

- [x] Expo app scaffolded (SDK 57, RN 0.86, React 19), joined to the npm workspace as `@fitsplit/mobile`.
- [x] Firebase (JS SDK) data layer — same project as web; auth persists via AsyncStorage.
- [x] Auth: username/PIN → `lookupLoginEmail` callable → `signInWithEmailAndPassword`. Verified live.
- [x] Five-tab member workspace (Overview, Workout, Logs, Progress, Macros) + bottom nav, all rendering real Firestore data.
- [x] FitSplit design system applied (dark `#111` + lime `#C8F135`, `mobile/lib/theme.ts` from doc 12).
- [x] Write flows wired via `mobile/lib/mutations.ts` and verified live: **lift set** (`logLiftSetMobile`), **meal** (`logMealMobile`, with macro increment), **bodyweight** (`logBodyWeightMobile`).
- [x] Exercise-name resolution merges the code-bundled default catalog with the gym catalog (matches web).
- [x] Error boundary so a screen error can't blank the whole app.
- [x] One clean import style (`@/` alias), kebab-case lib files, zero `as any` in the data layer.
- [x] Production `app.json`: name **FitSplit**, slug `fitsplit`, bundle id **`in.fitsplit`** (iOS + Android), version 1.0.0, dark UI, EAS `projectId` `4d07e898-6168-4867-923c-ee4a0aa0994c`.
- [x] `eas.json` with development / preview (internal APK) / production build profiles.

## Engineering — remaining (Claude can do these; not built yet)

- [x] **Offline lift sync** (2026-08-01) — `mobile/lib/offline-queue.ts` (AsyncStorage queue) + `mobile/lib/network.ts` (`expo-network`), wired into `WorkoutScreen.submitSet`: queues offline/failed sets, auto-flushes via `syncOfflineLiftsMobile` on reconnect and on mount, visible pending/syncing banner. Verified logging a set live still works; queue/flush logic verified by typecheck + code review (can't force-offline the web preview to exercise the queue path itself).
- [x] **Undo a day-skip** (2026-08-01) — `clearDayLog` wrapper in `mutations.ts`; `WorkoutScreen` shows an "Undo Skip" button (replacing Skip/Finish) when the selected day's log is skipped, confirms, calls `clearDayLogMobile`. Verified live end-to-end against production: skipped a day, confirmed the button appeared, undid it, confirmed it reverted.
- [x] **Push notifications** (2026-08-01) — mobile has no native Firebase messaging module (would need `@react-native-firebase`, which needs a native build we can't run here), so this routes through Expo's own push service instead: `mobile/lib/notifications.ts` requests permission and registers an Expo push token via the new `registerPushTokenMobile` callable; `sendPushToMember` in `functions/src/index.ts` now also POSTs to Expo's push API when a token is present, alongside the existing FCM send. Registration is skipped on web by design and verified not to break login (no console errors). **Actual delivery is unverified** — that needs a real device, same gate as the iOS test below.
- [x] **Loading/empty/error polish** (2026-08-01) — added a shared `mobile/components/ScreenError.tsx` (message + retry) and wired real error states into Logs/Progress/Macros (previously a failed load silently rendered as an empty list) and Overview (previously had an error message but no retry). Verified live: happy path unaffected on all five tabs.
- [ ] Optional: owner/trainer mobile experience (explicitly out of scope for v1 — they use the web workspace).

## Assets — you (or a designer) must provide

- [ ] **Branded app icon** — `mobile/assets/icon.png` and the Android adaptive-icon foreground are still the Expo placeholder. Needs the real FitSplit mark (1024×1024, no transparency for iOS).
- [ ] **Splash screen** — `expo-splash-screen` is not installed; the app shows the default splash. Add the plugin + a branded splash on a `#111111` background.
- [ ] Store screenshots (per device size), app description, keywords, privacy-policy URL (you already host `/privacy` at fitsplit.in), support URL.

## Accounts & credentials — you only (Claude must not do these)

- [ ] **Expo/EAS account** — log in on your machine: `npx eas login`. The `app.json` already points at your EAS project id.
- [ ] **Apple Developer Program** membership (you have the account `mehulchirania@hotmail.com`; confirm the paid membership is active — required to ship to the App Store).
- [ ] **Google Play Console** developer account (one-time fee) — not yet confirmed you have this.
- [ ] App Store Connect app record + Play Console app record (create under bundle id `in.fitsplit`).

## Build & submit — you run these (Claude will not; `--auto-submit` is irreversible)

- [ ] Link the project once: `cd mobile && npx eas init` (uses the existing project id).
- [ ] **Android test build (no Mac needed):** `eas build --profile preview --platform android` → install the APK on your phone → run through all five tabs and the three write flows.
- [ ] **iOS:** no local simulator is possible on your Windows machine. Either use a borrowed iPhone with an `eas build --profile development --platform ios` dev client, or a Mac with Xcode. iOS remains **untested by us** until then — do not submit to the App Store before testing on a real iOS device.
- [ ] Production builds: `eas build --profile production --platform all`.
- [ ] Submit: `eas submit --platform android` / `eas submit --platform ios` — **run intentionally, per store, after review of the build.** Do not use `--auto-submit` from a fresh build.

## Repo / deploy gates

- [x] The 5 Cloud Functions **are already deployed** to `fitsplit-29215` (done earlier with your approval) — that's why the write flows work live.
- [x] The `mobile/` app, the `packages/core` additions, and all the mobile refactors were **committed and pushed to `main`** on 2026-08-01 (see the dated `PROJECT_HANDOFF.md` entry) — the mobile source itself doesn't require a web deploy to "go live" for development purposes, but the push did trigger fitsplit.in's App Hosting rollout as a side effect, verified unaffected.
- [x] The web app itself needs **no** changes to go live — it already is (fitsplit.in).

## Honest bottom line

The member app is **functionally complete for a v1 and proven working against production data** — a real person can sign in, see their program, log workouts/meals/bodyweight, and view history, all in the FitSplit look, and now keeps logging sets while offline, can undo a mis-tapped skip, and registers for push. What stands between here and "in the stores" is **not** more core engineering; it's branded icon/splash assets, the account + store-listing setup, and the human-run build/submit steps above. Two things still need a real device rather than the web preview to call fully done: the iOS test (never run at all) and confirming push notifications actually arrive (the registration write path is verified; delivery isn't).
