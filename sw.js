/* Service worker: приложение открывается офлайн.
   Меняйте CACHE при выкладке новой версии — старый кэш будет удалён. */
"use strict";

const CACHE = "budget-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-maskable.svg"
];

self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=> c.addAll(ASSETS))
      .then(()=> self.skipWaiting())
  );
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=> Promise.all(ks.filter(k=>k!==CACHE).map(k=> caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});

self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  // запросы к Google (вход и Диск) через кэш не пропускаем никогда
  if(url.origin !== self.location.origin) return;

  // страницу берём из сети, если она есть, иначе из кэша — так обновления доезжают сразу
  if(req.mode === "navigate"){
    e.respondWith(
      fetch(req)
        .then(r=>{
          // кэшируем только удачный ответ — иначе страница ошибки затрёт рабочую копию
          if(r && r.ok && r.type === "basic"){
            const copy = r.clone();
            caches.open(CACHE).then(c=> c.put("./index.html", copy));
          }
          return r;
        })
        .catch(()=> caches.match("./index.html").then(r=> r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit=> hit || fetch(req).then(r=>{
      if(r && r.status === 200 && r.type === "basic"){
        const copy = r.clone();
        caches.open(CACHE).then(c=> c.put(req, copy));
      }
      return r;
    }))
  );
});
