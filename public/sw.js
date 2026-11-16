/* WeatherWise service worker — push delivery + offline app shell.
 * Plain JS (no build step) so it survives framework upgrades. */

const VERSION = "ww-v1";
const STATIC_CACHE = `${VERSION}-static`;
const API_CACHE = `${VERSION}-api`;
const API_TTL_MS = 30 * 60 * 1000;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.add("/")).catch(() => null));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) {
      const clone = res.clone();
      const stamped = new Response(clone.body, res);
      stamped.headers.set("sw-cached-at", String(Date.now()));
      await cache.put(request, stamped);
    }
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirstPage(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok && request.url.startsWith(self.location.origin)) {
      cache.put(request, res.clone());
      cache.put("/", res.clone());
    }
    return res;
  } catch (err) {
    const cached = (await cache.match(request)) || (await cache.match("/"));
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/weather")) {
    event.respondWith(networkFirstApi(request));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons/") ||
    url.hostname.includes("fonts")
  ) {
    event.respondWith(cacheFirst(request));
  }
});

/** Real Web Push: the server decides *when*; the SW decides *how it looks*. */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = { title: "WeatherWise", body: "", tag: "ww", url: "/" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag, // replace same-tag alerts instead of stacking
      renotify: true,
      icon: "/icons/icon-512.png",
      badge: "/icons/icon-512.png",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          client.navigate(target).catch(() => null);
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })(),
  );
});
