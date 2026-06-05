/**
 * Next.js instrumentation file — required by @sentry/nextjs v8+.
 * The register() function is called once per server/edge runtime startup.
 * Replaces the deprecated sentry.server.config.ts and sentry.edge.config.ts files.
 */
import * as Sentry from "@sentry/nextjs";

// Required for Sentry to capture errors from nested React Server Components
export const onRequestError = Sentry.captureRequestError;

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { init } = await import("@sentry/nextjs");
    init({
      dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled: process.env.NODE_ENV === "production",
      tracesSampleRate: 0.1
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const { init } = await import("@sentry/nextjs");
    init({
      dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled: process.env.NODE_ENV === "production",
      tracesSampleRate: 0.1
    });
  }
}
