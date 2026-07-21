/* ============================================================
   NyaySetu — datasource.js
   Single place that decides where module content comes from:

     Case Study (ONLINE_ONLY_MODULES):
       Firestore only. No local cache, no bundled fallback — if
       there's no connection or Firebase isn't configured yet,
       the view shows an "needs internet" state instead of content.

     Everything else (Constitution, BNS, BNSS, BSA, IPC, CrPC, ...):
       1. Firestore (if configured) — fetched fresh when online.
       2. On success, cached to localStorage for offline reuse.
       3. On failure/offline, falls back to that cache.
       4. If there's never been a successful fetch (fresh install,
          Firebase not configured yet), falls back to the JSON file
          bundled in /data — so the app is never empty.

   This file is the ONLY place that talks to Firebase. app.js just
   calls DataSource.fetchModule(key, staticPath) and gets back the
   same shaped JSON it always has, regardless of where it came from.
   ============================================================ */

(function () {
  "use strict";

  const CACHE_PREFIX = "nyaysetu:content-cache:";
  let firestoreDb = null;
  let firestoreReady = null; // Promise<boolean> — resolves once we know if Firestore is usable

  function isConfigured() {
    return !!(window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey);
  }

  // Lazily loads the Firebase SDK only if a real config was supplied —
  // an unfilled config never triggers a network request for the SDK.
  function initFirestore() {
    if (firestoreReady) return firestoreReady;
    firestoreReady = (async () => {
      if (!isConfigured()) return false;
      try {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
        const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const app = initializeApp(window.FIREBASE_CONFIG);
        firestoreDb = { db: getFirestore(app), doc, getDoc };
        return true;
      } catch (e) {
        console.warn("Firebase unavailable, using local content only.", e);
        return false;
      }
    })();
    return firestoreReady;
  }

  async function fetchFromFirestore(moduleKey) {
    const ok = await initFirestore();
    if (!ok || !firestoreDb) throw new Error("Firestore not available");
    const ref = firestoreDb.doc(firestoreDb.db, window.FIRESTORE_COLLECTION, moduleKey);
    const snap = await firestoreDb.getDoc(ref);
    if (!snap.exists()) throw new Error(`No Firestore document for "${moduleKey}"`);
    const data = snap.data();
    // Documents store the module JSON under a "payload" field (see
    // FIREBASE_DATA_STRUCTURE.md) so Firestore's map/array typing
    // doesn't force any reshaping of what app.js already expects.
    return data.payload !== undefined ? data.payload : data;
  }

  function readCache(moduleKey) {
    const raw = localStorage.getItem(CACHE_PREFIX + moduleKey);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function writeCache(moduleKey, payload) {
    try { localStorage.setItem(CACHE_PREFIX + moduleKey, JSON.stringify(payload)); } catch (e) { /* storage full/unavailable — skip */ }
  }

  function isOnlineOnly(moduleKey) {
    return (window.ONLINE_ONLY_MODULES || []).includes(moduleKey);
  }

  /**
   * Fetch a module's content JSON.
   * @param {string} moduleKey - matches MODULES key / Firestore doc ID
   * @param {string} staticPath - bundled JSON fallback path (unused for online-only modules)
   * @returns {Promise<object>}
   * @throws {Error} with .code === "OFFLINE_ONLY_MODULE" when an online-only
   *         module has no connection — app.js shows a dedicated empty state for this.
   */
  async function fetchModule(moduleKey, staticPath) {
    if (isOnlineOnly(moduleKey)) {
      if (!navigator.onLine) {
        const err = new Error("This section needs an internet connection.");
        err.code = "OFFLINE_ONLY_MODULE";
        throw err;
      }
      try {
        return await fetchFromFirestore(moduleKey);
      } catch (e) {
        const err = new Error("Could not reach the server for this section.");
        err.code = "OFFLINE_ONLY_MODULE";
        throw err;
      }
    }

    // Regular module: Firestore-first with layered fallback.
    try {
      const payload = await fetchFromFirestore(moduleKey);
      writeCache(moduleKey, payload);
      return payload;
    } catch (e) {
      const cached = readCache(moduleKey);
      if (cached) return cached;
      // No cache yet (first run / Firebase not configured) — use the
      // bundled JSON that ships with the app so it's never empty.
      return Utils.fetchJSON(staticPath);
    }
  }

  window.DataSource = { fetchModule, isConfigured, isOnlineOnly };
})();
