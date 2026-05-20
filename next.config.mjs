/** @type {import('next').NextConfig} */

// CSP sources that the app actually needs:
// - Firebase Auth / Firestore / Hosting → *.googleapis.com, *.gstatic.com, *.firebaseio.com,
//   apis.google.com, identitytoolkit.googleapis.com, *.firebaseapp.com,
//   firestore.googleapis.com, *.cloudfunctions.net
// - Gemini API → generativelanguage.googleapis.com
// - YouTube embeds (exercise videos) → www.youtube.com, i.ytimg.com
// - Unsplash placeholder images → images.unsplash.com
//
// 'unsafe-inline' is required for the inline styles used heavily across the app.
// 'unsafe-eval' is required by Next.js dev mode for hot reload. We allow it in
// development only via the NODE_ENV check below.
const isDev = process.env.NODE_ENV !== "production";

const cspDirectives = [
  "default-src 'self'",
  // Scripts: self, eval only in dev, inline only because of Next.js bootstrapping
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://apis.google.com https://*.firebaseapp.com`,
  // Styles: unsafe-inline needed for the inline style={{...}} pattern used throughout
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https: http:",
  // Firebase + Gemini + Auth REST
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.cloudfunctions.net wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://generativelanguage.googleapis.com",
  // YouTube iframe embeds for exercise videos
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  // Lock everything else down
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }
];

const nextConfig = {
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

export default nextConfig;
