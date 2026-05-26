const CACHE_NAME = "fitsplit-pwa-v8";
const APP_SHELL = [
  "/manifest.json",
  "/new_logo.png",
  "/icon-512.png",
  "/android-chrome-192x192.png",
  "/favicon-32x32.png",
  "/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html") ||
    url.searchParams.has("_rsc") ||
    url.pathname.startsWith("/_next/")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response.ok) {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
