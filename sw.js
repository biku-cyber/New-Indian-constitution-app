/* NyaySetu Service Worker
 * Strategy:
 *  - App shell (html/css/js/icons/fonts): cache-first, versioned cache name.
 *  - Data (json under /data): stale-while-revalidate so offline reads always work,
 *    and online users still pick up "Content Update" changes silently.
 */

const CACHE_VERSION = "nyaysetu-v3";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/base.css",
  "./css/theme.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/reader.css",
  "./css/utilities.css",
  "./js/utils.js",
  "./js/storage.js",
  "./js/theme.js",
  "./js/speech.js",
  "./js/search.js",
  "./js/bookmark.js",
  "./js/reader.js",
  "./js/settings.js",
  "./js/router.js",
  "./js/app.js",
  "./assets/icons/app_icon.svg",
  "./assets/icons/ashoka.svg",
  "./assets/icons/preamble.svg",
  "./assets/icons/parts.svg",
  "./assets/icons/amendments.svg",
  "./assets/icons/case_study.svg",
  "./assets/icons/law.svg",
  "./assets/icons/bookmark.svg",
  "./assets/icons/bookmarks.svg",
  "./assets/icons/bookmark_checked.svg",
  "./assets/icons/add_bookmark.svg",
  "./assets/icons/translate.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("nyaysetu-") && key !== SHELL_CACHE && key !== DATA_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  const isData = url.pathname.includes("/data/");

  if (isData) {
    event.respondWith(staleWhileRevalidate(event.request));
  } else {
    event.respondWith(cacheFirst(event.request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await networkFetch) || Response.error();
}

/* ---- Future: Content Update hook ----
 * When Firebase (or any remote content source) is wired up later, a message
 * handler here can accept { type: "CONTENT_UPDATE", files: [...] } and
 * selectively refresh DATA_CACHE entries without touching the app shell.
 */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
