/* Jaras Neon Stage 07B: embedded artwork. Asset cache only: never touches localStorage,
 * IndexedDB, Firebase, scores, questions, preferences or saved matches. */
'use strict';
const CACHE = 'jaras-official-neon-audio-20261101';
const ASSETS = ["index.html","trivia.html","feud.html","vault.html","mystery.html","jaras-category-art.js","jaras-category-art.css","jaras-motion.js","jaras-motion.css","jaras-announcer.js","jaras-audio.js","jaras-sound-extras.js","jaras-v53.js","neon-stage.css","neon-view.js","chest-bronze.svg","chest-gold.svg","chest-silver.svg","vault-door.svg","icon-180.png","icon-192.png","icon-512.png","manifest.webmanifest","version.json"];
const scoped = name => new URL(name, self.registration.scope).href;
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Do not activate an incomplete visual package or borrow obsolete artwork.
    await Promise.all(ASSETS.map(async name => {
      const url = scoped(name);
      const response = await fetch(url, {cache:'reload'});
      if (!response.ok) throw new Error('Missing package asset: '+name+' ('+response.status+')');
      await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  // Old caches are retained for rollback. User data is not migrated or cleared.
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  const req=event.request, url=new URL(req.url);
  if (req.method!=='GET' || url.origin!==self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  const key=new URL(url.href); key.hash='';key.search='';
  if (key.pathname.endsWith('/')) key.pathname+='index.html';
  const localPath=key.href.slice(self.registration.scope.length);
  // Only handle files belonging to this package, never other data/APIs on the site.
  if (!ASSETS.includes(localPath)) return;
  const fresh = /\.(html|css|js|json|webmanifest)$/.test(key.pathname);
  event.respondWith((async () => {
    const cache=await caches.open(CACHE);
    if (!fresh) {
      const hit=await cache.match(key.href);
      if (hit) return hit;
    }
    try {
      const response=await fetch(req,{cache:fresh?'no-cache':'default'});
      if (response.ok) {
        const copy=response.clone();
        event.waitUntil(cache.put(key.href,copy).catch(()=>{}));
        return response;
      }
      // A transient server failure must not replace a working cached file.
      const hit=await cache.match(key.href);
      return hit || response;
    } catch (_) {
      const hit=await cache.match(key.href);
      return hit || new Response('Offline asset not available. Reconnect and reopen once.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});
