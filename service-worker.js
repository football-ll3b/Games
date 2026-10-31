/* Jaras V5.8: embedded 90-scene Hawk Eye bank. Never touches game saves. */
'use strict';
const CACHE = 'jaras-v58-hawk90-20261029-1';
const ASSETS = ['index.html','trivia.html','feud.html','vault.html','mystery.html','jaras-audio.js','jaras-v53.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png','vault-door.svg'];
const scoped = name => new URL(name, self.registration.scope).href;
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async name => {
      const url = scoped(name);
      try {
        const response = await fetch(url, {cache:'reload'});
        if (!response.ok) throw new Error('HTTP '+response.status);
        await cache.put(url, response);
      } catch (error) {
        const previous = await caches.match(url, {ignoreSearch:true});
        if (previous && name !== 'mystery.html') await cache.put(url, previous);
        if (name === 'mystery.html') throw error;
      }
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  // Keep previous caches as a safety fallback for existing games and optional artwork.
  // localStorage / IndexedDB / Firebase are never cleared or migrated by this worker.
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  const isDocument = req.mode === 'navigate' || /\.html$/.test(url.pathname) || url.pathname.endsWith('/');
  const key = new URL(url.href); key.hash = '';
  if (isDocument) { key.search=''; if (key.pathname.endsWith('/')) key.pathname += 'index.html'; }
  event.respondWith((async () => {
    try {
      const response = await fetch(req, {cache:isDocument?'no-cache':'default'});
      if (response.ok && response.type !== 'opaque') {
        const copy=response.clone();
        event.waitUntil(caches.open(CACHE).then(c=>c.put(key.href,copy)).catch(()=>{}));
      }
      return response;
    } catch (_) {
      const own=await caches.open(CACHE);
      const cached=await own.match(key.href) || await caches.match(key.href,{ignoreSearch:true});
      if (cached) return cached;
      return new Response(isDocument?'<!doctype html><meta charset="utf-8"><title>Offline</title><p>This page has not been saved offline yet. Reconnect once and reopen it.</p>':'Offline asset unavailable', {status:503,headers:{'Content-Type':isDocument?'text/html; charset=utf-8':'text/plain'}});
    }
  })());
});
