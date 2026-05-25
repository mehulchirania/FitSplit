import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",

  // Capture 10% of transactions for performance monitoring.
  // Raise to 1.0 (100%) for debugging, lower for high-traffic production.
  tracesSampleRate: 0.1,

  // Capture replays for 1% of all sessions, 100% of error sessions.
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true
    })
  ]
});
