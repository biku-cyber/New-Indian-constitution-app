/* ============================================================
   NyaySetu — bookmark.js
   Thin layer over Storage's bookmark functions: groups bookmarks
   by law/module for the Bookmarks view, and builds the bookmark
   record shape used everywhere else in the app.
   ============================================================ */

(function () {
  "use strict";

  // Builds the canonical bookmark record for a reader entry.
  function makeRecord(ctx) {
    // ctx: { moduleKey, moduleLabel, groupLabel, groupId, id, number, title, titleEn }
    return {
      id: ctx.id,
      moduleKey: ctx.moduleKey,
      moduleLabel: ctx.moduleLabel,
      groupLabel: ctx.groupLabel,
      groupId: ctx.groupId,
      number: ctx.number,
      title: ctx.title,
      titleEn: ctx.titleEn || ""
    };
  }

  function grouped() {
    const list = Storage.getBookmarks();
    const byModule = {};
    list.forEach((b) => {
      if (!byModule[b.moduleKey]) byModule[b.moduleKey] = { label: b.moduleLabel, items: [] };
      byModule[b.moduleKey].items.push(b);
    });
    return byModule;
  }

  window.Bookmark = { makeRecord, grouped };
})();
