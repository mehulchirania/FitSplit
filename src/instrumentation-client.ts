/**
 * Sentry client-side init — Next.js 15 convention.
 * Replaces the deprecated sentry.client.config.ts file.
 */
import * as Sentry from "@sentry/nextjs";

// Required for Sentry to instrument client-side navigations (Next.js 15+)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",

  // Capture 10% of transactions for performance monitoring.
  tracesSampleRate: 0.1,

  // Capture replays for 1% of all sessions, 100% of error sessions.
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0
});

// Session Replay (~188 kB) is only sampled for 1% of sessions / error sessions, but
// statically importing it forces the cost onto 100% of users in the shared bundle.
// Load it as a separate async chunk after init so it stays off the critical path.
// Same-origin dynamic import (not Sentry's CDN loader) keeps it CSP-nonce compatible.
if (typeof window !== "undefined") {
  void import("@sentry/nextjs").then(({ replayIntegration }) => {
    Sentry.addIntegration(
      replayIntegration({ maskAllText: true, blockAllMedia: true })
    );
  });
}
