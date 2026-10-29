const CACHE_NAME = "jaras-shell-v4.8.1";
const SHELL = [
  "./", "./index.html", "./trivia.html", "./feud.html", "./vault.html", "./mystery.html",
  "./manifest.webmanifest", "./apple-touch-icon.png", "./favicon.png", "./icon-180.png",
  "./icon-192.png", "./icon-512.png", "./logo-main.png", "./logo-banner.png",
  "./jaras-audio.js", "./jaras-v53.js", "./vault-door.svg", "./version.json"
];
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(SHELL.map(async path => {
      try { const response = await fetch(path, { cache: "no-store" }); if (response.ok) await cache.put(path, response); } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("jaras-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("message", event => { if (event.data === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/version.json") || url.pathname === "/version.json") {
    event.respondWith(fetch(request, { cache: "no-store" })); return;
  }
  if (request.mode === "navigate" || /\.(html|webmanifest|png|js|svg|json)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const key = url.origin + url.pathname;
      try {
        const fresh = await fetch(request, { cache: "no-store" });
        if (fresh && fresh.ok) await cache.put(key, fresh.clone());
        return fresh;
      } catch (_) {
        return (await cache.match(key)) || (await cache.match("./index.html")) || Response.error();
      }
    })());
  }
});
