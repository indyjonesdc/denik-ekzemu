const CACHE_NAME = 'ekzem-v2';
const URLS = ['/index.html','/app.js','/manifest.json','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS)).catch(()=>{})); });
self.addEventListener('activate', e => { self.clients.claim(); e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || e.request.url.includes('anthropic.com')) return;
  e.respondWith(caches.match(e.request).then(cached => {
    const net = fetch(e.request).then(r => { if(r&&r.status===200){const c=r.clone();caches.open(CACHE_NAME).then(ca=>ca.put(e.request,c));} return r; }).catch(()=>null);
    return cached || net;
  }));
});
