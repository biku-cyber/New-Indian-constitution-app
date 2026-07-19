/* ============================================================
   NyaySetu — router.js
   Minimal hash router. Routes:
     #/                                  → Home
     #/preamble                          → Preamble reader
     #/list/:moduleKey                   → Chapter/Part list (or flat entries)
     #/group/:moduleKey/:groupId         → Section/Article list within a chapter/part
     #/reader/:moduleKey/:groupId/:entryId → Reader
     #/casestudy                         → Case study list
     #/casestudy/:id                     → Case study reader
     #/bookmarks                         → Bookmarks
     #/settings                          → Settings
   ============================================================ */

(function () {
  "use strict";

  function parse(hash) {
    const clean = (hash || "#/").replace(/^#/, "");
    const segments = clean.split("/").filter(Boolean);
    return segments;
  }

  function navigate(path) {
    window.location.hash = path;
  }

  async function handle() {
    Reader.closeSheet();
    Reader.releaseWakeLockOnLeave();
    Speech.stop();

    const segments = parse(window.location.hash);
    const root = Utils.qs("#app");
    window.scrollTo(0, 0);

    try {
      if (segments.length === 0) {
        await App.renderHome(root);
      } else if (segments[0] === "preamble") {
        await App.renderPreamble(root);
      } else if (segments[0] === "list" && segments[1]) {
        await App.renderList(root, segments[1]);
      } else if (segments[0] === "group" && segments[1] && segments[2]) {
        await App.renderGroup(root, segments[1], segments[2]);
      } else if (segments[0] === "reader" && segments[1] && segments[2] && segments[3]) {
        await App.renderReader(root, segments[1], segments[2], segments[3]);
      } else if (segments[0] === "casestudy" && segments[1]) {
        await App.renderCaseStudyDetail(root, segments[1]);
      } else if (segments[0] === "casestudy") {
        await App.renderCaseStudyList(root);
      } else if (segments[0] === "bookmarks") {
        await App.renderBookmarks(root);
      } else if (segments[0] === "settings") {
        await App.renderSettings(root);
      } else {
        await App.renderHome(root);
      }
    } catch (err) {
      console.error(err);
      App.renderError(root, err);
    }
  }

  window.Router = { navigate, handle, parse };
  window.addEventListener("hashchange", handle);
})();
