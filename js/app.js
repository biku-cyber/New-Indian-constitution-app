/* ============================================================
   NyaySetu — app.js
   Module registry + view renderers. This is the file you extend
   when adding a new law: add one entry to MODULES and drop a
   matching JSON file in /data — no other file needs to change.
   ============================================================ */

(function () {
  "use strict";

  const { el, qs, attachRipple, toast, fetchJSON, highlight, formatCount, debounce } = Utils;

  // ---------------------------------------------------------
  // Module registry
  // ---------------------------------------------------------
  const MODULES = {
    "constitution-parts": {
      key: "constitution-parts", kind: "grouped",
      label: "পাৰ্টছ", fullLabel: "ভাৰতীয় সংবিধান — পাৰ্টছ",
      dataUrl: "data/constitution/parts/parts.json",
      groupWord: "Part", entryWord: "Article"
    },
    "constitution-schedules": {
      key: "constitution-schedules", kind: "flat",
      label: "অনুসূচী", fullLabel: "ভাৰতীয় সংবিধান — অনুসূচী",
      dataUrl: "data/constitution/schedules/schedules.json",
      groupWord: "Schedule", entryWord: "Schedule"
    },
    "constitution-amendments": {
      key: "constitution-amendments", kind: "flat",
      label: "সংশোধনী", fullLabel: "ভাৰতীয় সংবিধান — সংশোধনী",
      dataUrl: "data/constitution/amendments/amendments.json",
      groupWord: "Amendment", entryWord: "Amendment"
    },
    "bns": {
      key: "bns", kind: "grouped", historical: false,
      label: "ভাৰতীয় ন্যায় সংহিতা", shortLabel: "BNS", fullLabel: "ভাৰতীয় ন্যায় সংহিতা (BNS)",
      dataUrl: "data/laws/bns/bns.json", groupWord: "Chapter", entryWord: "Section"
    },
    "bnss": {
      key: "bnss", kind: "grouped", historical: false,
      label: "ভাৰতীয় নাগৰিক সুৰক্ষা সংহিতা", shortLabel: "BNSS", fullLabel: "ভাৰতীয় নাগৰিক সুৰক্ষা সংহিতা (BNSS)",
      dataUrl: "data/laws/bnss/bnss.json", groupWord: "Chapter", entryWord: "Section"
    },
    "bsa": {
      key: "bsa", kind: "grouped", historical: false,
      label: "ভাৰতীয় সাক্ষ্য অধিনিয়ম", shortLabel: "BSA", fullLabel: "ভাৰতীয় সাক্ষ্য অধিনিয়ম (BSA)",
      dataUrl: "data/laws/bsa/bsa.json", groupWord: "Chapter", entryWord: "Section"
    },
    "ipc": {
      key: "ipc", kind: "grouped", historical: true,
      label: "Indian Penal Code", shortLabel: "IPC", fullLabel: "Indian Penal Code (IPC)",
      dataUrl: "data/laws/ipc/ipc.json", groupWord: "Chapter", entryWord: "Section"
    },
    "crpc": {
      key: "crpc", kind: "grouped", historical: true,
      label: "Code of Criminal Procedure", shortLabel: "CrPC", fullLabel: "Code of Criminal Procedure (CrPC)",
      dataUrl: "data/laws/crpc/crpc.json", groupWord: "Chapter", entryWord: "Section"
    }
  };

  const ACTIVE_LAW_ORDER = ["bns", "bnss", "bsa"];
  const HISTORICAL_LAW_ORDER = ["ipc", "crpc"];

  // ---------------------------------------------------------
  // Icons (inline SVG — one per module, no icon library)
  // ---------------------------------------------------------
  // Uploaded artwork (recolored to currentColor, precision-reduced) for the
  // icons that have a matching provided asset. Anything not in this map
  // keeps its hand-drawn fallback from ICONS above — e.g. schedules, search,
  // chevron, settings, trash have no supplied asset yet.
  const ICON_ASSET_PATHS = {
    preamble: "assets/icons/preamble.svg",
    parts: "assets/icons/parts.svg",
    amendments: "assets/icons/amendments.svg",
    gavel: "assets/icons/case_study.svg",       // Case Study card + list rows
    scale: "assets/icons/law.svg",               // BNS/BNSS/BSA/IPC/CrPC row icon
    bookmark: "assets/icons/bookmarks.svg",      // Bookmark card + Bookmarks page
    bookmarkChecked: "assets/icons/bookmark_checked.svg", // reader toolbar: already bookmarked
    bookmarkAdd: "assets/icons/add_bookmark.svg",         // reader toolbar: not yet bookmarked
    translate: "assets/icons/translate.svg"                // reader toolbar: Translate
  };
  let ASHOKA_SVG = null;

  async function preloadIcons() {
    const entries = Object.entries(ICON_ASSET_PATHS);
    await Promise.all(entries.map(async ([key, path]) => {
      try {
        const svgText = await fetchSVG(path);
        ICONS[key] = buildIconSVG(svgText);
      } catch (e) { /* keep hand-drawn fallback */ }
    }));
    try { ASHOKA_SVG = buildIconSVG(await fetchSVG("assets/icons/ashoka.svg")); } catch (e) { ASHOKA_SVG = null; }
    window.AppIcons = ICONS;
  }

  // Uploaded SVGs are full <svg viewBox="..." ...>...</svg> documents; pull
  // out the viewBox + inner markup and re-wrap in the same shape as our
  // hand-drawn ICONS strings, so every existing call site keeps working.
  function buildIconSVG(svgText) {
    const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/);
    const bodyMatch = svgText.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24";
    const body = bodyMatch ? bodyMatch[1] : "";
    return `<svg viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  }

  function svg(inner) { return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`; }
  const ICONS = {
    preamble: svg('<path d="M6 3h9l3 3v15H6V3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 9h6M9 12.5h6M9 16h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'),
    parts: svg('<rect x="5" y="7" width="12" height="14" rx="1.4" stroke="currentColor" stroke-width="1.6"/><rect x="8" y="4" width="12" height="14" rx="1.4" stroke="currentColor" stroke-width="1.6" fill="var(--color-bg,#100D16)"/>'),
    schedules: `<img src="assets/images/schedules.png" alt="" style="width:100%;height:100%;object-fit:contain;"/>`,
    amendments: svg('<path d="M5 20h14M6 20V9l6-5 6 5v11" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14.5 8l3.2 3.2-6.4 6.4H8v-3.2z" fill="currentColor"/>'),
    casestudy: svg('<path d="M12 3l2.2 4.6 5 .7-3.6 3.6.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.6 5-.7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'),
    gavel: svg('<path d="M14 4l6 6-2.5 2.5-6-6L14 4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M11.5 8.5L4 16v3h3l7.5-7.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 21h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
    bookmark: svg('<path d="M6 3h12v18l-6-4-6 4V3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>'),
    scale: svg('<path d="M12 3v18M8 21h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M5 7h14M5 7l-3 6a3 3 0 006 0L5 7zM19 7l-3 6a3 3 0 006 0l-3-6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'),
    search: svg('<circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="M20 20l-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
    chevron: svg('<path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
    settings: svg('<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M19.4 13.5a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V20a2 2 0 11-4 0v-.2a1.7 1.7 0 00-1.1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H4a2 2 0 110-4h.2a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3H10.4a1.7 1.7 0 001-1.6V4a2 2 0 114 0v.2a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9V10.4a1.7 1.7 0 001.6 1H20a2 2 0 110 4h-.2a1.7 1.7 0 00-1.6 1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>'),
    trash: svg('<path d="M5 7h14M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-9 0l1 12a2 2 0 002 2h4a2 2 0 002-2l1-12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>')
  };

  const FALLBACK_EMBLEM_SVG = '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 4 L42 12 V22 C42 33 34.5 40.5 24 44 C13.5 40.5 6 33 6 22 V12 Z" stroke="currentColor" stroke-width="2"/><path d="M24 14 V32 M17 21 L24 14 L31 21 M15 32 H33" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ---------------------------------------------------------
  // Shared pieces
  // ---------------------------------------------------------
  function iconNode(name) { return el("span", { class: "icon-wrap", html: ICONS[name] || "" }); }

  function topBar(title, onBack, right) {
    const backBtn = el("button", { class: "icon-btn", "aria-label": "Back" }, [el("span", { html: '<svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' })]);
    attachRipple(backBtn);
    backBtn.addEventListener("click", onBack);
    const bar = el("div", { class: "top-bar" }, [
      backBtn,
      el("div", { class: "top-bar-title" }, [el("span", { class: "text-title" }, [title])]),
      right || null
    ]);
    const onScroll = () => {
      if (!bar.isConnected) { window.removeEventListener("scroll", onScroll); return; }
      bar.classList.toggle("scrolled", window.scrollY > 4);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return bar;
  }

  function searchBox(placeholder, onInput) {
    const input = el("input", { type: "search", placeholder: placeholder || "Search here...", "aria-label": "Search" });
    input.addEventListener("input", debounce((e) => onInput(e.target.value), 150));
    return el("div", { class: "search-box" }, [el("span", { html: ICONS.search }), input]);
  }

  function skeletonRows(n) {
    return Array.from({ length: n }, () => el("div", { class: "skeleton-row" }));
  }

  function mount(root, node) {
    root.replaceChildren(node);
  }

  function normalizeModuleData(data) {
    // Ensures every module has a `groups` array, even flat ones,
    // so search.js and shared list logic can treat them uniformly.
    if (data.groups) return data;
    return { groups: [{ id: "all", title: "", entries: data.entries || [] }] };
  }

  // ===========================================================
  // HOME
  // ===========================================================
  async function renderHome(root) {
    const lastRead = Storage.getLastRead();

    const hero = el("div", { class: "home-hero" }, [
      el("div", { class: "hero-row" }, [
        el("div", {}, [
          el("h1", {}, ["ন্যায়সেতু"]),
          el("div", { class: "hero-sub text-label" }, ["NyaySetu"])
        ]),
        settingsButton()
      ])
    ]);

    const page = el("div", { class: "page" });

    if (lastRead) {
      const card = el("button", { class: "card-continue w-full", "aria-label": "Continue reading" }, [
        el("span", { class: "icon-wrap", html: ICONS.bookmark }),
        el("div", { class: "titles" }, [
          el("span", { class: "eyebrow text-label" }, ["Continue Reading"]),
          el("span", { class: "main" }, [`${lastRead.moduleLabel} · ${lastRead.entryWord} ${lastRead.number} — ${lastRead.title}`])
        ]),
        el("span", { class: "chevron", html: ICONS.chevron })
      ]);
      card.addEventListener("click", () => Router.navigate(`reader/${lastRead.moduleKey}/${lastRead.groupId}/${lastRead.entryId}`));
      page.appendChild(card);
    }

    const features = [
      { icon: "preamble", label: "প্ৰস্তাৱনা", go: "preamble" },
      { icon: "parts", label: "পাৰ্টছ", go: "list/constitution-parts" },
      { icon: "schedules", label: "অনুসূচী", go: "list/constitution-schedules" },
      { icon: "amendments", label: "সংশোধনী", go: "list/constitution-amendments" },
      { icon: "gavel", label: "Case Study", go: "casestudy" },
      { icon: "bookmark", label: "Bookmark", go: "bookmarks" }
    ];
    const grid = el("div", { class: "feature-grid" });
    features.forEach((f) => {
      const card = el("button", { class: "card-feature" }, [iconNode(f.icon), el("span", { class: "label" }, [f.label])]);
      attachRipple(card);
      card.addEventListener("click", () => Router.navigate(f.go));
      grid.appendChild(card);
    });
    page.appendChild(grid);

    page.appendChild(el("div", { class: "section-divider text-label" }, ["আইনসমূহ"]));
    page.appendChild(lawList(ACTIVE_LAW_ORDER, false));

    page.appendChild(el("div", { class: "section-divider text-label" }, ["ঐতিহাসিক আইন"]));
    page.appendChild(lawList(HISTORICAL_LAW_ORDER, true));

    const view = el("div", { class: "view" }, [hero, page]);
    mount(root, view);
  }

  function settingsButton() {
    const btn = el("button", { class: "icon-btn", "aria-label": "Settings" }, [el("span", { html: ICONS.settings })]);
    attachRipple(btn);
    btn.addEventListener("click", () => Router.navigate("settings"));
    return btn;
  }

  function lawList(keys, historical) {
    const wrap = el("div", { class: "law-list" });
    keys.forEach((key) => {
      const m = MODULES[key];
      const row = el("button", { class: "card-law" + (historical ? " historical" : "") }, [
        el("span", { class: "icon-wrap", html: ICONS.scale }),
        el("div", { class: "titles" }, [
          el("span", { class: "text-subtitle" }, [m.label]),
          el("span", { class: "full text-caption" }, [m.shortLabel])
        ]),
        historical ? el("span", { class: "badge" }, ["সলনি হৈছে"]) : null,
        el("span", { class: "chevron", html: ICONS.chevron })
      ]);
      attachRipple(row);
      row.addEventListener("click", () => Router.navigate(`list/${key}`));
      wrap.appendChild(row);
    });
    return wrap;
  }

  // ===========================================================
  // PREAMBLE (single-entry reader, Ashoka emblem)
  // ===========================================================
  async function renderPreamble(root) {
    const entry = await DataSource.fetchModule("constitution-preamble", "data/constitution/preamble.json");
    const ctx = {
      moduleKey: "constitution-preamble", moduleLabel: "ভাৰতীয় সংবিধান",
      groupLabel: "", groupId: "preamble", entryWord: "", entry
    };

    const emblem = el("div", { style: "display:flex;justify-content:center;padding:20px 0 8px;" }, [
      el("span", { style: "color:var(--read-accent);width:72px;height:72px;display:block;", html: ASHOKA_SVG || FALLBACK_EMBLEM_SVG })
    ]);

    const toolbar = Reader.renderToolbar(ctx, () => Router.navigate(""), (c) => Reader.openMoreMenu(c));
    const body = el("div", { class: "reader-body" }, [emblem, ...Reader.renderContent(entry)]);
    const readerView = el("div", { class: "reader-view" }, [toolbar, body]);
    Theme.applyReaderTheme(readerView);
    mount(root, el("div", { class: "view" }, [readerView]));
  }

  // ===========================================================
  // LIST (chapters/parts, or flat entries for schedules/amendments)
  // ===========================================================
  async function renderList(root, moduleKey) {
    const mod = MODULES[moduleKey];
    if (!mod) return renderHome(root);

    const page = el("div", { class: "page" });
    const resultCount = el("div", { class: "result-count text-caption" });
    const listWrap = el("div", { class: "entry-list" }, skeletonRows(6));
    page.appendChild(searchBox("Search here...", () => {}));
    page.appendChild(resultCount);
    page.appendChild(listWrap);
    mount(root, el("div", { class: "view" }, [topBar(mod.fullLabel, () => Router.navigate("")), page]));

    const raw = await DataSource.fetchModule(moduleKey, mod.dataUrl);
    const data = normalizeModuleData(raw);
    const index = Search.buildIndex(data, moduleKey, mod.fullLabel);

    function draw(query) {
      if (query && query.trim()) {
        const hits = Search.search(index, query);
        resultCount.innerHTML = `Result Found : <strong>${hits.length}</strong>`;
        listWrap.replaceChildren(...hits.map((hit) => searchHitRow(hit, query, moduleKey)));
        return;
      }
      resultCount.textContent = "";
      if (mod.kind === "flat") {
        listWrap.replaceChildren(...data.groups[0].entries.map((entry) => entryRow(entry, moduleKey, "all", mod.entryWord)));
      } else {
        listWrap.replaceChildren(
          groupRow({ id: "__all__", title: "All " + mod.groupWord + "s" }, moduleKey, true),
          ...data.groups.map((g) => groupRow(g, moduleKey, false))
        );
      }
    }

    // Re-attach the real search box now that the index exists.
    const realSearch = searchBox("Search here...", draw);
    page.replaceChild(realSearch, page.firstChild);
    draw("");
  }

  function groupRow(group, moduleKey, isAllLink) {
    const row = el("button", { class: "entry-row w-full" }, [
      el("div", { class: "titles" }, [el("span", { class: "text-body" }, [group.title || group.id])]),
      el("span", { class: "chevron faint", html: ICONS.chevron })
    ]);
    attachRipple(row);
    row.addEventListener("click", () => {
      if (isAllLink) { toast("Chapter এটা বাছনি কৰক।"); return; }
      Router.navigate(`group/${moduleKey}/${group.id}`);
    });
    return row;
  }

  function entryRow(entry, moduleKey, groupId, entryWord, query) {
    const bookmarked = Storage.isBookmarked(entry.id);
    const row = el("button", { class: "entry-row w-full" }, [
      el("span", { class: "num" }, [String(entry.number)]),
      el("div", { class: "titles" }, [
        el("span", { class: "text-body", html: highlight(entry.title, query) }),
        entry.titleEn ? el("span", { class: "en text-caption", html: highlight(entry.titleEn, query) }) : null
      ]),
      bookmarked ? el("span", { class: "bookmark-dot", "aria-label": "Bookmarked" }) : null
    ]);
    attachRipple(row);
    row.addEventListener("click", () => Router.navigate(`reader/${moduleKey}/${groupId}/${entry.id}`));
    return row;
  }

  function searchHitRow(hit, query, moduleKey) {
    const row = el("button", { class: "entry-row w-full" }, [
      el("span", { class: "num" }, [String(hit.number)]),
      el("div", { class: "titles" }, [
        el("span", { class: "text-body", html: highlight(hit.title, query) }),
        el("span", { class: "en text-caption" }, [hit.groupLabel])
      ])
    ]);
    attachRipple(row);
    row.addEventListener("click", () => Router.navigate(`reader/${moduleKey}/${hit.groupId}/${hit.id}`));
    return row;
  }

  // ===========================================================
  // GROUP (entries within one chapter/part)
  // ===========================================================
  async function renderGroup(root, moduleKey, groupId) {
    const mod = MODULES[moduleKey];

    const page = el("div", { class: "page" });
    const resultCount = el("div", { class: "result-count text-caption" });
    const listWrap = el("div", { class: "entry-list" }, skeletonRows(5));
    page.appendChild(searchBox("Search here...", () => {}));
    page.appendChild(resultCount);
    page.appendChild(listWrap);
    mount(root, el("div", { class: "view" }, [topBar(mod.groupWord, () => Router.navigate(`list/${moduleKey}`)), page]));

    const raw = await DataSource.fetchModule(moduleKey, mod.dataUrl);
    const data = normalizeModuleData(raw);
    const group = data.groups.find((g) => g.id === groupId);
    if (!group) return renderList(root, moduleKey);

    const index = Search.buildIndex({ groups: [group] }, moduleKey, mod.fullLabel);

    function draw(query) {
      const hits = query && query.trim() ? Search.search(index, query) : group.entries;
      if (query && query.trim()) resultCount.innerHTML = `Result Found : <strong>${hits.length}</strong>`;
      else resultCount.textContent = "";
      listWrap.replaceChildren(...(query && query.trim()
        ? hits.map((h) => searchHitRow(h, query, moduleKey))
        : hits.map((entry) => entryRow(entry, moduleKey, groupId, mod.entryWord))));
    }

    const realSearch = searchBox("Search here...", draw);
    page.replaceChild(realSearch, page.firstChild);
    draw("");

    const topBarTitle = Utils.qs(".top-bar-title .text-title", root);
    if (topBarTitle) topBarTitle.textContent = group.title;
  }

  // ===========================================================
  // READER
  // ===========================================================
  async function renderReader(root, moduleKey, groupId, entryId) {
    if (moduleKey === "constitution-preamble") return renderPreamble(root);
    if (moduleKey === "casestudy") return renderCaseStudyDetail(root, entryId);
    const mod = MODULES[moduleKey];
    if (!mod) return renderHome(root);
    const raw = await DataSource.fetchModule(moduleKey, mod.dataUrl);
    const data = normalizeModuleData(raw);
    const group = data.groups.find((g) => g.id === groupId);
    if (!group) return renderList(root, moduleKey);
    const idx = group.entries.findIndex((e) => e.id === entryId);
    if (idx === -1) return renderGroup(root, moduleKey, groupId);
    const entry = group.entries[idx];

    const ctx = {
      moduleKey, moduleLabel: mod.fullLabel, groupLabel: group.title,
      groupId, entryWord: mod.entryWord, entry
    };

    // Persist last-read for the Home "Continue Reading" card.
    Storage.setLastRead({
      moduleKey, moduleLabel: mod.shortLabel || mod.fullLabel, groupId, entryId,
      entryWord: mod.entryWord, number: entry.number, title: entry.title
    });

    const hasPrev = idx > 0;
    const hasNext = idx < group.entries.length - 1;

    const toolbar = Reader.renderToolbar(ctx,
      () => Router.navigate(`group/${moduleKey}/${groupId}`),
      (c) => Reader.openMoreMenu(c));

    const warnBanner = el("div", { class: "hidden" });

    const body = el("div", { class: "reader-body" }, [
      Reader.renderProgress(idx, group.entries.length),
      warnBanner,
      ...Reader.renderContent(entry, `${mod.shortLabel || mod.fullLabel} · ${group.title}`)
    ]);

    const nav = Reader.renderNav(hasPrev, hasNext,
      () => { if (hasPrev) Router.navigate(`reader/${moduleKey}/${groupId}/${group.entries[idx - 1].id}`); },
      () => { if (hasNext) Router.navigate(`reader/${moduleKey}/${groupId}/${group.entries[idx + 1].id}`); }
    );

    if (!hasPrev || !hasNext) {
      warnBanner.className = "warn-banner";
      warnBanner.innerHTML = "";
      warnBanner.appendChild(Reader.warnIcon());
      warnBanner.appendChild(document.createTextNode(
        !hasPrev && !hasNext
          ? `একমাত্ৰ ${mod.entryWord} ইয়াতেই আছে।`
          : !hasPrev
            ? "আপুনি ইতিমধ্যে প্ৰথম " + mod.entryWord + "-ত আছে।"
            : "এইটো শেষ " + mod.entryWord + "।"
      ));
    }

    const readerView = el("div", { class: "reader-view" }, [toolbar, body, nav]);
    Theme.applyReaderTheme(readerView);

    if (Storage.getSettings().keepScreenOnDefault) {
      // best-effort: user can still toggle off via toolbar
    }

    mount(root, el("div", { class: "view" }, [readerView]));
  }

  // ===========================================================
  // CASE STUDY
  // ===========================================================
  async function renderCaseStudyList(root) {
    let data;
    try {
      data = await DataSource.fetchModule("casestudy", null);
    } catch (e) {
      return renderOfflineOnlyState(root, "Case Study", () => Router.navigate(""));
    }
    const page = el("div", { class: "page" });
    const resultCount = el("div", { class: "result-count text-caption" });
    const listWrap = el("div", { class: "entry-list" });

    function draw(query) {
      const q = (query || "").trim().toLowerCase();
      const items = !q ? data.entries : data.entries.filter((c) =>
        c.title.toLowerCase().includes(q) || (c.keywords || []).some((k) => k.toLowerCase().includes(q)));
      if (q) resultCount.innerHTML = `Result Found : <strong>${items.length}</strong>`;
      else resultCount.textContent = "";
      listWrap.replaceChildren(...items.map((c) => {
        const row = el("button", { class: "entry-row w-full" }, [
          el("span", { class: "icon-wrap", html: ICONS.gavel }),
          el("div", { class: "titles" }, [
            el("span", { class: "text-body", html: highlight(c.title, q) }),
            el("span", { class: "en text-caption" }, [c.relatedLaw])
          ])
        ]);
        attachRipple(row);
        row.addEventListener("click", () => Router.navigate(`casestudy/${c.id}`));
        return row;
      }));
    }

    page.appendChild(searchBox("Search case studies...", draw));
    page.appendChild(resultCount);
    page.appendChild(listWrap);
    draw("");

    const view = el("div", { class: "view" }, [topBar("Case Study", () => Router.navigate("")), page]);
    mount(root, view);
  }

  async function renderCaseStudyDetail(root, id) {
    let data;
    try {
      data = await DataSource.fetchModule("casestudy", null);
    } catch (e) {
      return renderOfflineOnlyState(root, "Case Study", () => Router.navigate("casestudy"));
    }
    const entry = data.entries.find((c) => c.id === id);
    if (!entry) return renderCaseStudyList(root);
    const ctx = { moduleKey: "casestudy", moduleLabel: "Case Study", groupLabel: "", entryWord: "Case", entry };
    const toolbar = Reader.renderToolbar(ctx, () => Router.navigate("casestudy"), (c) => Reader.openMoreMenu(c));
    const body = el("div", { class: "reader-body" }, Reader.renderContent(entry, "Case Study"));
    const readerView = el("div", { class: "reader-view" }, [toolbar, body]);
    Theme.applyReaderTheme(readerView);
    mount(root, el("div", { class: "view" }, [readerView]));
  }

  // ===========================================================
  // BOOKMARKS
  // ===========================================================
  async function renderBookmarks(root) {
    const groups = Bookmark.grouped();
    const page = el("div", { class: "page" });
    const keys = Object.keys(groups);

    if (!keys.length) {
      page.appendChild(el("div", { class: "empty-state" }, [
        el("span", { html: ICONS.bookmark }),
        el("div", { class: "text-body" }, ["কোনো বুকমাৰ্ক নাই।"]),
        el("div", { class: "text-caption faint mt-8" }, ["যিকোনো Article বা Section পঢ়ি থাকোঁতে 🔖 টিপি বুকমাৰ্ক কৰক।"])
      ]));
    } else {
      keys.forEach((moduleKey) => {
        const g = groups[moduleKey];
        page.appendChild(el("div", { class: "group-label text-label" }, [g.label]));
        const list = el("div", { class: "entry-list mb-16" });
        g.items.forEach((b) => {
          const row = el("div", { class: "entry-row" }, [
            el("span", { class: "num" }, [String(b.number)]),
            el("div", { class: "titles", style: "cursor:pointer;" }, [
              el("span", { class: "text-body" }, [b.title])
            ]),
            removeBtn(b)
          ]);
          row.querySelector(".titles").addEventListener("click", () => {
            Router.navigate(`reader/${b.moduleKey}/${b.groupId || "all"}/${b.id}`);
          });
          list.appendChild(row);
        });
        page.appendChild(list);
      });
    }

    const view = el("div", { class: "view" }, [topBar("Bookmark", () => Router.navigate("")), page]);
    mount(root, view);
  }

  function removeBtn(b) {
    const btn = el("button", { class: "icon-btn", "aria-label": "Remove bookmark" }, [el("span", { html: ICONS.trash })]);
    attachRipple(btn);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      Storage.removeBookmark(b.id);
      toast("বুকমাৰ্ক আঁতৰোৱা হ'ল।");
      renderBookmarks(qs("#app"));
    });
    return btn;
  }

  // ===========================================================
  // SETTINGS
  // ===========================================================
  async function renderSettings(root) {
    const page = el("div", { class: "page" });
    function draw() {
      page.replaceChildren(SettingsView.render(draw));
      Theme.applyAppTheme();
    }
    draw();
    const view = el("div", { class: "view" }, [topBar("Settings", () => Router.navigate("")), page]);
    mount(root, view);
    window.addEventListener("nyaysetu:settings-changed", draw, { once: true });
  }

  function renderError(root, err) {
    mount(root, el("div", { class: "view" }, [
      topBar("Error", () => Router.navigate("")),
      el("div", { class: "empty-state" }, [
        el("div", { class: "text-body" }, ["তথ্য ল'ড কৰোঁতে সমস্যা হ'ল।"]),
        el("div", { class: "text-caption faint mt-8" }, [String(err.message || err)])
      ])
    ]));
  }

  window.App = {
    MODULES, renderHome, renderPreamble, renderList, renderGroup, renderReader,
    renderCaseStudyList, renderCaseStudyDetail, renderBookmarks, renderSettings, renderError
  };

  // ---------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------
  document.addEventListener("DOMContentLoaded", async () => {
    Theme.applyAppTheme();
    await preloadIcons();
    Router.handle();

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
      });
    }
  });
})();
