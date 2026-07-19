/* ============================================================
   NyaySetu — storage.js
   Single abstraction over local persistence. Backed by localStorage
   today; the read/write surface below is intentionally the only
   place that touches it, so swapping to IndexedDB later (for larger
   bookmark sets or offline content packages) means editing this
   file only — nothing above it needs to change.
   ============================================================ */

(function () {
  "use strict";

  const KEYS = {
    SETTINGS: "nyaysetu:settings",
    BOOKMARKS: "nyaysetu:bookmarks",
    LAST_READ: "nyaysetu:lastRead"
  };

  const DEFAULT_SETTINGS = {
    appTheme: "dark",
    readerTheme: "day",          // day | night | light
    fontFamily: "sans",          // sans | serif
    fontSize: 17,                // px
    lineHeight: 1.85,
    paragraphSpacing: 1,         // multiplier
    boldReading: false,
    keepScreenOnDefault: false,
    speechRate: 1,
    speechPitch: 1,
    speechLang: "as",
    translationLang: "as",
    a11yHighContrast: false,
    a11yLargeText: false
  };

  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  function getSettings() {
    return Object.assign({}, DEFAULT_SETTINGS, safeParse(localStorage.getItem(KEYS.SETTINGS), {}));
  }

  function saveSettings(partial) {
    const merged = Object.assign({}, getSettings(), partial);
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(merged));
    return merged;
  }

  function getBookmarks() {
    return safeParse(localStorage.getItem(KEYS.BOOKMARKS), []);
  }

  function isBookmarked(id) {
    return getBookmarks().some((b) => b.id === id);
  }

  function addBookmark(bookmark) {
    const list = getBookmarks();
    if (list.some((b) => b.id === bookmark.id)) return list;
    list.unshift(Object.assign({ savedAt: Date.now() }, bookmark));
    localStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(list));
    return list;
  }

  function removeBookmark(id) {
    const list = getBookmarks().filter((b) => b.id !== id);
    localStorage.setItem(KEYS.BOOKMARKS, JSON.stringify(list));
    return list;
  }

  function toggleBookmark(bookmark) {
    return isBookmarked(bookmark.id) ? removeBookmark(bookmark.id) : addBookmark(bookmark);
  }

  function getLastRead() {
    return safeParse(localStorage.getItem(KEYS.LAST_READ), null);
  }

  function setLastRead(entry) {
    const record = Object.assign({ timestamp: Date.now() }, entry);
    localStorage.setItem(KEYS.LAST_READ, JSON.stringify(record));
    return record;
  }

  window.Storage = {
    KEYS, DEFAULT_SETTINGS,
    getSettings, saveSettings,
    getBookmarks, isBookmarked, addBookmark, removeBookmark, toggleBookmark,
    getLastRead, setLastRead
  };
})();
