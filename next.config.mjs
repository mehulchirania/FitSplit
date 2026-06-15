/** @type {import('next').NextConfig} */
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

// NOTE: Content-Security-Policy is set in `src/middleware.ts`, not here, because it
// needs a fresh per-request nonce ('nonce-…' + 'strict-dynamic' in production). The
// static headers below have no per-request component and are applied to every path.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Cross-origin isolation / XS-Leaks hardening.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" }
];

const nextConfig = {
  output: "standalone",
  // React Compiler (React 19): auto-memoizes components, removing most manual
  // useMemo/useCallback and cutting re-renders. Requires babel-plugin-react-compiler.
  experimental: {
    reactCompiler: true,
  },
  // NOTE: build-time TS/ESLint checks are intentionally ENABLED. `npx tsc --noEmit`
  // and `next lint` are clean (see CLAUDE.md rules #3/#4) — do not re-add
  // ignoreBuildErrors/ignoreDuringBuilds, which silently mask regressions.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  }
};

const sentryOptions = {
  // Only upload source maps when SENTRY_AUTH_TOKEN is set (production CI).
  // Local builds skip the upload silently.
  silent: !process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Disable the Sentry webpack plugin in development to avoid noise.
  disableLogger: true
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), sentryOptions);
