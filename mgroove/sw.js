const CACHE_NAME = "mgroove-v3";
const urlsToCache = [
  "/mgroove/",
  "/mgroove/index.html",
  "/mgroove/finance.html",
  "/mgroove/shared.css",
  "/mgroove/shared.js",
  "/mgroove/icon-192.png",
  "/mgroove/icon-512.png",
  "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((err) => console.log("Cache install error:", err)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.map((name) =>
            name !== CACHE_NAME ? caches.delete(name) : undefined,
          ),
        ),
      ),
  );
  return self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith("http")) return;
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request.clone())
        .then((res) => {
          if (!res || res.status !== 200 || res.type !== "basic") return res;
          const clone = res.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => {});
    }),
  );
});
