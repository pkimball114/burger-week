const cacheName = "burger-week-v58";
const assets = [
  "./",
  "./index.html",
  "./styles.css?v=58",
  "./app.js?v=58",
  "./manifest.webmanifest",
  "./config/supabase.js",
  "./assets/icon.svg",
  "./assets/burger-counter-hero.png",
  "./assets/vendor/leaflet/leaflet.css",
  "./assets/vendor/leaflet/leaflet.js",
  "./assets/vendor/leaflet/images/layers.png",
  "./assets/vendor/leaflet/images/layers-2x.png",
  "./assets/vendor/leaflet/images/marker-icon.png",
  "./assets/vendor/leaflet/images/marker-icon-2x.png",
  "./assets/vendor/leaflet/images/marker-shadow.png",
  "./data/burger-week-2026.csv",
  "./data/photos/restaurant-placeholder.svg"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        const oldBurgerWeekCaches = keys.filter((key) => key.startsWith("burger-week-") && key !== cacheName);
        return Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)))
          .then(() => self.clients.claim())
          .then(() => {
            if (!oldBurgerWeekCaches.length) return null;
            return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) =>
              Promise.all(clients.map((client) => client.navigate(client.url)))
            );
          });
      })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isNavigationRequest(request) {
  return request.mode === "navigate" || (request.method === "GET" && request.headers.get("accept")?.includes("text/html"));
}

self.addEventListener("fetch", (event) => {
  if (isNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(cacheName).then((cache) => cache.put("./index.html", copy));
          }
          return response;
        })
        .catch(() => caches.match("./index.html").then((cached) => cached || caches.match("./")))
    );
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
