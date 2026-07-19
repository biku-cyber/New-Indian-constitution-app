/* ============================================================
   NyaySetu — search.js
   Builds a flat, searchable index from a module's chapter/section
   (or part/article) tree, and matches a query against:
     - entry number (e.g. "103", "14")
     - Assamese title
     - English title
     - keywords[] (curated per entry in the JSON data)
   Each module searches independently (its own index), matching the
   "har module me independent search" requirement. A cross-module
   quick search (used from Home) just runs this over several
   already-loaded indexes and merges the results.
   ============================================================ */

(function () {
  "use strict";

  // moduleData shape (shared by Constitution parts and BNS/BNSS/BSA/IPC/CrPC):
  // { groups: [ { id, number, title, titleEn, entries: [ { id, number, title, titleEn, keywords, text } ] } ] }
  function buildIndex(moduleData, moduleKey, groupLabel) {
    const index = [];
    (moduleData.groups || []).forEach((group) => {
      (group.entries || []).forEach((entry) => {
        index.push({
          moduleKey,
          groupId: group.id,
          groupLabel: groupLabel || group.title,
          id: entry.id,
          number: entry.number,
          title: entry.title,
          titleEn: entry.titleEn || "",
          keywords: entry.keywords || [],
          snippet: (entry.text && entry.text[0]) || ""
        });
      });
    });
    return index;
  }

  function matches(item, query) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    if (String(item.number).toLowerCase() === q) return true;
    if (String(item.number).toLowerCase().includes(q)) return true;
    if (item.title.toLowerCase().includes(q)) return true;
    if (item.titleEn.toLowerCase().includes(q)) return true;
    return item.keywords.some((k) => k.toLowerCase().includes(q));
  }

  function search(index, query) {
    if (!query || !query.trim()) return index;
    return index.filter((item) => matches(item, query));
  }

  function searchMultiple(indexMap, query) {
    const results = [];
    Object.keys(indexMap).forEach((moduleKey) => {
      const hits = search(indexMap[moduleKey], query);
      if (hits.length) results.push({ moduleKey, hits });
    });
    return results;
  }

  window.Search = { buildIndex, search, searchMultiple };
})();
