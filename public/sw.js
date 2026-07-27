const CACHE_NAME = "lp-cache-v1";
const PRECACHE_URLS = [
  "/",
  "/tournaments",
  "/news",
  "/about",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/_next/webpack-hmr")) return;

  event.respondWith(
    (async () => {
      // A network blip during a fetch inside a Service Worker doesn't
      // always reject — a silently dropped/filtered connection can leave
      // this pending forever, and a pending promise never reaches the
      // catch block below, so the page just hangs with no fallback ever
      // kicking in. Abort and fall back to cache if it takes too long.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(request, { signal: controller.signal });
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await caches.match(request);
        return cached || caches.match("/");
      } finally {
        clearTimeout(timeoutId);
      }
    })(),
  );
});
