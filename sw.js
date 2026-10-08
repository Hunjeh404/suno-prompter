/* 오프라인 캐시. 버전을 올리면 캐시가 갱신된다. */
const VER = "suno-gen-v12";
const FILES = ["./","./index.html","./css/app.css","./js/data.js","./js/instruments.js","./js/rules.js","./js/storage.js","./js/llm.js","./js/ui.js","./manifest.json","./icon.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VER).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;            // 폰트·API는 그대로 네트워크
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VER).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
