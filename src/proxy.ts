import { NextRequest, NextResponse } from "next/server";

// Signed-in-only areas. Everything else (landing, legal pages, /signup) is public.
const protectedPrefixes = ["/member", "/profile"] as const;

const isProd = process.env.NODE_ENV === "production";

/**
 * Build the Content-Security-Policy.
 *
 * Production uses a strict, per-request nonce CSP: scripts are allowed only if they
 * carry the request's nonce, and 'strict-dynamic' extends that trust to scripts those
 * nonced scripts load (the Next.js/Firebase bundle). 'self'/https:/'unsafe-inline' are
 * kept only as ignored fallbacks for browsers without nonce/'strict-dynamic' support.
 *
 * Development keeps 'unsafe-inline' + 'unsafe-eval' (no nonce) so HMR/fast-refresh work.
 */
function buildCsp(nonce: string): string {
  const scriptSrc = isProd
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'`
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com";

  return [
    "default-src 'self'",
    scriptSrc,
    // Inline style attributes (React style={{…}}) require 'unsafe-inline' here.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    // No http: — avoid mixed content. https: covers YouTube thumbnails, Unsplash, avatars.
    "img-src 'self' data: blob: https:",
    // Firebase Firestore/RTDB/Functions + Identity Toolkit (Auth REST).
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.cloudfunctions.net wss://*.firebaseio.com https://identitytoolkit.googleapis.com",
    // YouTube iframe embeds for exercise videos.
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Fresh nonce per request (production only — dev CSP doesn't use it).
  const nonce = isProd ? btoa(crypto.randomUUID()) : "";
  const csp = buildCsp(nonce);

  // Forward pathname + nonce + CSP on the request so Server Components can read the
  // nonce (via headers()) and Next.js can apply it to the scripts it renders.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  if (isProd) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
  }

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected) {
    // Cheap presence check only; the pages verify the session cookie for real
    // (getCurrentUser / requireAuth) and redirect if it is invalid or revoked.
    const hasSession =
      request.cookies.has("fitsplit-session") || request.cookies.has("fitsplit-local-user");

    if (!hasSession) {
      const redirect = NextResponse.redirect(new URL("/", request.url));
      redirect.headers.set("Content-Security-Policy", csp);
      return redirect;
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Run on every route EXCEPT Next internals and static asset files, so the CSP
    // (and the per-request nonce) is attached to every HTML document response.
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|js|css|json|txt|xml|map)).*)"
    }
  ]
};
