# Environment parity

Compared `.env.example` (template), `.env.emulator` (local), `apphosting.yaml` (prod) and `process.env.*` usage in `src/`.

| Variable | Prod | Emulator | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | apphosting.yaml | `demo-api-key` | Also used server-side for PIN sign-in (Identity Toolkit REST). |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | apphosting.yaml | `demo-fitsplit` | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | apphosting.yaml | demo bucket | |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `_MESSAGING_SENDER_ID`, `_APP_ID` | apphosting.yaml | unset | Not read via `process.env` in `src/` today; keep in sync anyway. |
| `FIREBASE_PROJECT_ID` | apphosting.yaml | `demo-fitsplit` | Admin SDK project. |
| `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` / `GOOGLE_APPLICATION_CREDENTIALS` | secret / ADC | unset | Admin credentials. App Hosting supplies ADC; use Secret Manager, never commit. |
| `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, `FIREBASE_STORAGE_EMULATOR_HOST` | MUST be unset | set | If set in prod, the server talks to a non-existent emulator. |
| `FITSPLIT_LOCAL_MODE` | MUST be unset | optional | Fake accounts, no persistence; ignored in production builds. |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | optional | unset | Build-time upload needs the token. |
| `NEXT_DIST_DIR`, `ANALYZE` | unset | tooling only | |

Runtime-provided (do not set): `NODE_ENV`, `NEXT_RUNTIME`, `K_SERVICE`, `FUNCTION_TARGET`, `FIREBASE_CONFIG`.

## Keeping them in sync
- Add any new `process.env.X` to `.env.example` and the table above in the same change.
- After each deploy run `npm run smoke -- https://<prod-url>`.
