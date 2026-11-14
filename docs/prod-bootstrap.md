# Bootstrapping a production user

**Needs admin credentials for project `fitsplit-29215`. Never run automatically, never from CI, never from the seed script (emulator only).** Prefer the in-app sign-up page; use this only if sign-up is unavailable. Review every value before running.

A FitSplit account is two things (see `signUpWithPhone` in `src/lib/auth.ts`):

1. A Firebase Auth email/password user. Email = `phoneToEmail(e164)` = `<digits>@phone.fitsplit.app`; password = `pinToPassword(pin)` = `fs-pin-<PIN>` (`src/lib/phone-identity.ts`).
2. A Firestore doc `users/{uid}` written with the same uid.

## Procedure

```bash
# 1. Authenticate as an admin (ADC). Do NOT export emulator host vars in this shell.
unset FIRESTORE_EMULATOR_HOST FIREBASE_AUTH_EMULATOR_HOST
gcloud auth application-default login    # or set GOOGLE_APPLICATION_CREDENTIALS to a service account
```

Save as a scratch file outside the repo (e.g. `bootstrap-user.mjs`) and run from the repo root:

```js
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { normalizePhone, phoneToEmail, pinToPassword, isValidPin } from "./src/lib/phone-identity.ts"; // run with: node --experimental-strip-types

const [rawPhone, pin, fullName] = process.argv.slice(2);
const phone = normalizePhone(rawPhone);
if (!phone || !isValidPin(pin) || !fullName) throw new Error("usage: <phone> <4-digit pin> <full name>");
if (process.env.FIRESTORE_EMULATOR_HOST) throw new Error("emulator env set; refusing");

initializeApp({ credential: applicationDefault(), projectId: "fitsplit-29215" });
const { uid } = await getAuth().createUser({ email: phoneToEmail(phone), password: pinToPassword(pin), displayName: fullName });
const now = new Date().toISOString();
await getFirestore().collection("users").doc(uid).set({
  id: uid, fullName, phone,
  avatarInitials: fullName.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase(),
  goal: "General fitness", isActive: true, termsAcceptedAt: now,
  consent: { termsVersion: "<LEGAL_VERSIONS.terms>", privacyVersion: "<LEGAL_VERSIONS.privacy>", acceptedAt: now, ageGroup: "adult",
             diagnostics: { granted: false, updatedAt: now } },
  isMinor: false, joinedAt: now.slice(0, 10), createdAt: now, updatedAt: now
});
console.log("created", uid);
```

Replace the two version placeholders with `LEGAL_VERSIONS` from `src/lib/legal-config.ts`. Prefer the real `buildConsentRecord` if you can import it. Only create accounts for people who have accepted the terms and privacy policy.

## Verify
- `npm run smoke -- https://<prod-url>`, then sign in with phone + PIN.
- Auth console shows `<digits>@phone.fitsplit.app`; Firestore `users/{uid}` exists with matching `id`.

## Rollback
Delete the Auth user and `users/{uid}` (and `loginAttempts/*` if any) in the console.
