/* Service worker：快取核心靜態檔案，讓PWA離線也能開(計算邏輯全在前端，不需要網路)。
   鏡頭/羅盤/GPS這些瀏覽器API還是要真的裝置支援，跟離線與否無關。
   CACHE_NAME版號要在更新這些檔案時手動改，否則使用者裝置會一直吃到舊快取。*/
const CACHE_NAME = "portraitguide-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./sun.js",
  "./calc.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
