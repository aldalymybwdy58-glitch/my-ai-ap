const CACHE_NAME = "chat-ai-v2";
const APP_FILES = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];
self.addEventListener("install", (e) =>
  e.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((c) => c.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  )
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
);
self.addEventListener("fetch", (e) => {
  const r = e.request,
    u = new URL(r.url);
  if (u.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(r)
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const c = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(r, c));
        }
        return res;
      })
      .catch(() =>
        caches.match(r).then((x) => x || caches.match("/index.html"))
      )
  );
});
