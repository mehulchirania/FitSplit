# FitSplit Cookie Policy

**Version {{VERSION}} · Last updated {{LAST_UPDATED}}**

FitSplit uses **only essential cookies and browser storage**. We do not use advertising, analytics or tracking cookies, so we do not show a cookie banner that asks you to accept or reject cookies. This page lists exactly what is set so you can check.

## 1. Cookies

| Name | Purpose | Set when | Lifetime | Flags |
|---|---|---|---|---|
| `fitsplit-session` | Keeps you signed in. Holds a signed Firebase session token | You sign in or create an account | 2 hours, or 14 days if you chose "remember me" | HttpOnly, Secure (in production), SameSite=Lax, path `/` |

During local development only, a `fitsplit-local-user` cookie imitates a signed-in account. It is never used on the live service.

## 2. Browser storage (not cookies)

These stay on your device and are not sent to us as cookies.

| Key or store | Purpose | Kept until |
|---|---|---|
| `fitsplit-theme` | Remembers light or dark theme | You clear site data |
| `fitsplit-weight-unit`, `fitsplit-height-unit` | Remember kg/lbs and cm/ft | You clear site data |
| `fitsplit-remember-me`, `fitsplit-session-start` | Enforce the session length you chose | You sign out |
| `fitsplit.onboarded` | Remembers you have seen the welcome screen | You clear site data |
| Workout swap and session-timer keys | Remember exercise swaps and elapsed time during a workout | The workout ends or you clear site data |
| `fitsplit-diagnostics-consent` | Remembers your optional diagnostics choice (0 or 1) | You change it or clear site data |
| IndexedDB database `FitSplitDB` | Holds workout sets logged offline until they sync | They sync or you clear site data |
| Service worker cache `fitsplit-pwa` | Lets the installed web app load its icons and manifest | A new version replaces it |

## 3. Third-party content

- **YouTube.** Exercise tutorial videos are embedded from youtube.com and load only when you open a tutorial. YouTube then receives your IP address and may set its own cookies under Google's policies. FitSplit does not control those cookies. Do not open tutorials if you do not want this.
- **Sentry.** If, and only if, you opted in to browser diagnostics, the Sentry browser SDK runs and sends error details. It does not run otherwise. See the Privacy Notice, section 6.

Fonts are bundled with the app and are not loaded from Google at runtime.

## 4. Your choices

You can block or delete cookies and site data in your browser settings; signing in will not work without the session cookie. You can change the diagnostics choice any time on the Data Rights page.

If we ever add non-essential cookies, we will ask for your consent first and update this page and its version.

## 5. Contact

Questions: {{CONTACT_NAME}}, {{CONTACT_DESIGNATION}}, {{CONTACT_EMAIL}}.
