/* ============================================================
   NyaySetu — reader.js
   Renders a single reading entry (Article or Section) with its
   toolbar (Translate / Live Read / Keep Screen On / Bookmark /
   More), previous/next navigation with first/last warnings, and
   the reading-progress indicator.
   ============================================================ */

(function () {
  "use strict";

  const { el, qs, attachRipple, toast } = Utils;

  let wakeLock = null;
  let keepScreenOn = false;

  async function toggleKeepScreenOn(btn) {
    try {
      if (!keepScreenOn) {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
          wakeLock.addEventListener("release", () => {
            keepScreenOn = false;
            btn.classList.remove("active", "screen-on-active");
          });
        }
        keepScreenOn = true;
        btn.classList.add("active", "screen-on-active");
        toast("স্ক্ৰীন সক্ৰিয় থাকিব।");
      } else {
        if (wakeLock) { await wakeLock.release(); wakeLock = null; }
        keepScreenOn = false;
        btn.classList.remove("active", "screen-on-active");
        toast("স্বাভাৱিক স্ক্ৰীন সময় পুনৰুদ্ধাৰ কৰা হ'ল।");
      }
    } catch (e) {
      toast("এই ডিভাইচত সমৰ্থিত নহয়।");
    }
  }

  function releaseWakeLockOnLeave() {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; keepScreenOn = false; }
  }

  // Builds the plain-text version of an entry, used for TTS and email report.
  function entryPlainText(entry) {
    const parts = [entry.title];
    (entry.text || []).forEach((p) => parts.push(p));
    return parts.join(". ");
  }

  function renderToolbar(ctx, onBack, onMore) {
    const isBookmarked = Storage.isBookmarked(ctx.entry.id);

    const translateBtn = el("button", { class: "icon-btn", "aria-label": "Translate", title: "Translate" }, [translateIcon()]);
    const speakBtn = el("button", { class: "icon-btn", "aria-label": "Live Read", title: "Live Read" }, [speakerIcon()]);
    const screenBtn = el("button", { class: "icon-btn", "aria-label": "Keep Screen On", title: "Keep Screen On" }, [screenIcon()]);
    const bookmarkBtn = el("button", { class: "icon-btn" + (isBookmarked ? " active" : ""), "aria-label": "Bookmark", title: "Bookmark" }, [bookmarkIcon(isBookmarked)]);
    const moreBtn = el("button", { class: "icon-btn", "aria-label": "More options", title: "More" }, [moreIcon()]);

    [translateBtn, speakBtn, screenBtn, bookmarkBtn, moreBtn].forEach(attachRipple);

    translateBtn.addEventListener("click", () => openTranslateSheet(ctx));
    speakBtn.addEventListener("click", () => {
      const state = Speech.toggle(entryPlainText(ctx.entry));
      speakBtn.classList.toggle("active", state === "playing");
    });
    screenBtn.addEventListener("click", () => toggleKeepScreenOn(screenBtn));
    bookmarkBtn.addEventListener("click", () => {
      const rec = Bookmark.makeRecord({
        moduleKey: ctx.moduleKey, moduleLabel: ctx.moduleLabel, groupLabel: ctx.groupLabel, groupId: ctx.groupId,
        id: ctx.entry.id, number: ctx.entry.number, title: ctx.entry.title, titleEn: ctx.entry.titleEn
      });
      Storage.toggleBookmark(rec);
      const nowBookmarked = Storage.isBookmarked(ctx.entry.id);
      bookmarkBtn.classList.toggle("active", nowBookmarked);
      bookmarkBtn.replaceChildren(bookmarkIcon(nowBookmarked));
      if (nowBookmarked) {
        bookmarkBtn.classList.remove("seal-stamp");
        void bookmarkBtn.offsetWidth; // restart animation
        bookmarkBtn.classList.add("seal-stamp");
      }
      toast(nowBookmarked ? "বুকমাৰ্ক কৰা হ'ল।" : "বুকমাৰ্ক আঁতৰোৱা হ'ল।");
    });
    moreBtn.addEventListener("click", () => onMore(ctx));

    const backBtn = el("button", { class: "icon-btn", "aria-label": "Back" }, [backIcon()]);
    attachRipple(backBtn);
    backBtn.addEventListener("click", onBack);

    return el("div", { class: "reader-toolbar" }, [
      backBtn,
      el("div", { class: "toolbar-title" }, [ctx.entry.number ? `${ctx.entryWord} ${ctx.entry.number}` : ctx.entry.title]),
      translateBtn, speakBtn, screenBtn, bookmarkBtn, moreBtn
    ]);
  }

  function openTranslateSheet(ctx) {
    const settings = Storage.getSettings();
    const langs = [
      { code: "as", label: "অসমীয়া (Default)" },
      { code: "en", label: "English — demo" },
      { code: "hi", label: "हिन्दी — demo" },
      { code: "bn", label: "বাংলা — demo" }
    ];
    const items = langs.map((l) => {
      const item = el("button", { class: "sheet-item" }, [
        el("span", { class: "left" }, [l.label]),
        settings.translationLang === l.code ? checkIcon() : null
      ]);
      item.addEventListener("click", () => {
        Storage.saveSettings({ translationLang: l.code });
        closeSheet();
        if (l.code !== "as") {
          toast("এই সংস্কৰণত অনুবাদ ডেমো — সম্পূৰ্ণ পাঠ শীঘ্ৰে আহিব।");
        }
      });
      return item;
    });
    openSheet("অনুবাদ ভাষা / Translate", items);
  }

  let sheetBackdrop = null, sheetEl = null;
  function openSheet(title, items) {
    closeSheet();
    sheetBackdrop = el("div", { class: "sheet-backdrop", onClick: closeSheet });
    sheetEl = el("div", { class: "sheet", role: "dialog", "aria-label": title }, [
      el("div", { class: "sheet-handle" }),
      el("div", { class: "text-label", style: "padding: 4px 18px 8px; color: var(--color-text-faint);" }, [title]),
      ...items
    ]);
    document.body.appendChild(sheetBackdrop);
    document.body.appendChild(sheetEl);
  }
  function closeSheet() {
    if (sheetBackdrop) sheetBackdrop.remove();
    if (sheetEl) sheetEl.remove();
    sheetBackdrop = sheetEl = null;
  }

  function openMoreMenu(ctx) {
    const settings = Storage.getSettings();
    const fontRow = el("div", { class: "segmented" }, [
      segBtn("সান্স", settings.fontFamily === "sans", () => setFont(ctx, "sans")),
      segBtn("চেৰিফ", settings.fontFamily === "serif", () => setFont(ctx, "serif"))
    ]);
    const themeRow = el("div", { class: "segmented" }, [
      segBtn("Day", settings.readerTheme === "day", () => setReaderTheme(ctx, "day")),
      segBtn("Night", settings.readerTheme === "night", () => setReaderTheme(ctx, "night")),
      segBtn("Light", settings.readerTheme === "light", () => setReaderTheme(ctx, "light"))
    ]);
    const lineHeightStepper = el("div", { class: "stepper" }, [
      el("span", { class: "text-body" }, ["Line Height"]),
      el("div", { class: "flex items-center gap-8" }, [
        stepBtn("−", () => adjustLineHeight(ctx, -0.1)),
        el("span", { class: "text-body", style: "min-width:2ch;text-align:center;" }, [settings.lineHeight.toFixed(1)]),
        stepBtn("+", () => adjustLineHeight(ctx, 0.1))
      ])
    ]);
    const fontSizeStepper = el("div", { class: "stepper" }, [
      el("span", { class: "text-body" }, ["Font Size"]),
      el("div", { class: "flex items-center gap-8" }, [
        stepBtn("A−", () => adjustFontSize(ctx, -1)),
        el("span", { class: "text-body", style: "min-width:2ch;text-align:center;" }, [String(settings.fontSize)]),
        stepBtn("A+", () => adjustFontSize(ctx, 1))
      ])
    ]);

    const shareItem = el("button", { class: "sheet-item" }, [
      el("span", { class: "left" }, [shareIcon(), "Share"])
    ]);
    shareItem.addEventListener("click", async () => {
      const text = `${ctx.entry.title} — ${ctx.moduleLabel}, ${ctx.entryWord} ${ctx.entry.number} (NyaySetu)`;
      if (navigator.share) { try { await navigator.share({ text }); } catch (e) {} }
      else { toast("Share সমৰ্থিত নহয় এই ব্ৰাউজাৰত।"); }
      closeSheet();
    });

    const reportItem = el("button", { class: "sheet-item" }, [
      el("span", { class: "left" }, [reportIcon(), "Report"])
    ]);
    reportItem.addEventListener("click", () => { sendReport(ctx); closeSheet(); });

    openSheet("More", [fontRow, themeRow, lineHeightStepper, fontSizeStepper, shareItem, reportItem]);
  }

  function segBtn(label, active, onClick) {
    const b = el("button", { class: active ? "active" : "" }, [label]);
    b.addEventListener("click", onClick);
    return b;
  }
  function stepBtn(label, onClick) {
    const b = el("button", { class: "icon-btn" }, [label]);
    b.addEventListener("click", onClick);
    return b;
  }

  function setFont(ctx, font) {
    Storage.saveSettings({ fontFamily: font });
    Theme.applyReaderTheme(qs(".reader-view"));
    openMoreMenu(ctx); // refresh sheet state
  }
  function setReaderTheme(ctx, theme) {
    Theme.setReaderTheme(theme);
    Theme.applyReaderTheme(qs(".reader-view"));
    openMoreMenu(ctx);
  }
  function adjustLineHeight(ctx, delta) {
    const s = Storage.getSettings();
    const next = Math.min(2.4, Math.max(1.3, +(s.lineHeight + delta).toFixed(1)));
    Storage.saveSettings({ lineHeight: next });
    Theme.applyReaderTheme(qs(".reader-view"));
    openMoreMenu(ctx);
  }
  function adjustFontSize(ctx, delta) {
    const s = Storage.getSettings();
    const next = Math.min(24, Math.max(14, s.fontSize + delta));
    Storage.saveSettings({ fontSize: next });
    Theme.applyReaderTheme(qs(".reader-view"));
    openMoreMenu(ctx);
  }

  function sendReport(ctx) {
    const subject = encodeURIComponent("NyaySetu Content Report");
    const body = encodeURIComponent(
      `Law : ${ctx.moduleLabel}\nSection : ${ctx.entryWord} ${ctx.entry.number} — ${ctx.entry.title}\nProblem : \n`
    );
    window.location.href = `mailto:report@nyaysetu.app?subject=${subject}&body=${body}`;
  }

  function renderProgress(index, total) {
    return el("div", { class: "reader-progress text-caption" }, [`${ctx_word(index, total)}`]);
    function ctx_word(i, t) { return `${i + 1} / ${t}`; }
  }

  function renderContent(entry) {
    const body = entry.sections ? renderSections(entry.sections) : renderFlatText(entry.text);
    const wrap = [
      el("h1", { class: "reader-article-title" }, [entry.title]),
      entry.titleEn ? el("div", { class: "reader-article-subtitle text-body" }, [entry.titleEn]) : null,
      el("div", { class: "reader-rule" }),
      body
    ];
    if (entry.explanation) {
      wrap.push(el("div", { class: "reader-explanation" }, [
        el("span", { class: "label text-label" }, ["ব্যাখ্যা"]),
        entry.explanation
      ]));
    }
    return wrap.filter(Boolean);
  }

  function renderFlatText(text) {
    const body = el("div", { class: "reader-content" });
    (text || []).forEach((para, i) => {
      body.appendChild(el("p", { class: "clause" }, [
        text.length > 1 ? el("span", { class: "clause-num" }, [`(${i + 1})`]) : null,
        para
      ]));
    });
    return body;
  }

  // Renders a structured document: an array of { heading, paragraphs?,
  // list?, orderedList?, items? }. Used for longer reference entries
  // (amendments, case studies) that have real sub-headings rather than
  // numbered clauses. One level of nesting is supported (items[].list,
  // orderedList[].sublist) — enough for constitutional-amendment-style
  // content without turning this into a general document renderer.
  function renderSections(sections) {
    const wrap = el("div", { class: "reader-content reader-sections" });
    sections.forEach((sec) => {
      if (sec.heading) wrap.appendChild(el("h2", { class: "section-heading" }, [sec.heading]));
      (sec.paragraphs || []).forEach((p) => wrap.appendChild(el("p", { class: "section-para" }, [p])));
      if (sec.list) {
        wrap.appendChild(el("ul", { class: "section-list" }, sec.list.map((item) => el("li", {}, [item]))));
      }
      if (sec.orderedList) {
        wrap.appendChild(el("ol", { class: "section-ordered" }, sec.orderedList.map((item) => {
          if (typeof item === "string") return el("li", {}, [item]);
          const li = el("li", {}, [item.text]);
          if (item.sublist) li.appendChild(el("ul", { class: "section-sublist" }, item.sublist.map((s) => el("li", {}, [s]))));
          return li;
        })));
      }
      if (sec.items) {
        sec.items.forEach((it) => {
          const block = el("div", { class: "section-item" }, [el("div", { class: "section-item-title" }, [it.title])]);
          if (it.list) block.appendChild(el("ul", { class: "section-list" }, it.list.map((l) => el("li", {}, [l]))));
          wrap.appendChild(block);
        });
      }
    });
    return wrap;
  }

  function renderNav(hasPrev, hasNext, onPrev, onNext) {
    const prevBtn = el("button", { class: "btn-nav", disabled: hasPrev ? undefined : "true" }, [chevronLeft(), "Previous"]);
    const nextBtn = el("button", { class: "btn-nav", disabled: hasNext ? undefined : "true" }, ["Next", chevronRight()]);
    prevBtn.addEventListener("click", () => hasPrev ? onPrev() : toast("আপুনি ইতিমধ্যে প্ৰথম " + "এন্ট্ৰীত আছে।"));
    nextBtn.addEventListener("click", () => hasNext ? onNext() : toast("এইটো শেষ এন্ট্ৰী।"));
    return el("div", { class: "reader-nav" }, [prevBtn, nextBtn]);
  }

  // ---- icons (inline, no external icon library) ----
  function icon(pathHtml, extra) {
    return el("svg", { viewBox: "0 0 24 24", fill: "none", html: pathHtml, ...(extra || {}) });
  }
  function backIcon() { return icon('<path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'); }
  function translateIcon() {
    const asset = window.AppIcons && window.AppIcons.translate;
    return asset ? el("span", { class: "icon-slot", html: asset }) : icon('<path d="M4 5h9M8 3v2M6 5c0 4 3 7 6 8M12 5c0 4-3 7-6 8M14 21l4-9 4 9M15.5 18h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>');
  }
  function speakerIcon() { return icon('<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'); }
  function screenIcon() { return icon('<rect x="6" y="3" width="12" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="17" r="1" fill="currentColor"/>'); }
  function bookmarkIcon(active) {
    const asset = window.AppIcons && (active ? window.AppIcons.bookmarkChecked : window.AppIcons.bookmarkAdd);
    if (asset) return el("span", { class: "icon-slot", html: asset });
    return icon(`<path d="M6 3h12v18l-6-4-6 4V3z" ${active ? 'fill="currentColor"' : ''} stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`);
  }
  function moreIcon() { return icon('<circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>'); }
  function chevronLeft() { return icon('<path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'); }
  function chevronRight() { return icon('<path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'); }
  function checkIcon() { return icon('<path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'); }
  function shareIcon() { return icon('<circle cx="6" cy="12" r="2.2" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="6" r="2.2" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="18" r="2.2" stroke="currentColor" stroke-width="1.8"/><path d="M8 11l7-4M8 13l7 4" stroke="currentColor" stroke-width="1.8"/>'); }
  function reportIcon() { return icon('<path d="M12 9v4M12 16.5h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.3 3.9L2.9 17a1.8 1.8 0 001.6 2.7h15a1.8 1.8 0 001.6-2.7L13.7 3.9a1.8 1.8 0 00-3.4 0z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'); }
  function warnIcon() { return icon('<path d="M12 9v4M12 16.5h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.3 3.9L2.9 17a1.8 1.8 0 001.6 2.7h15a1.8 1.8 0 001.6-2.7L13.7 3.9a1.8 1.8 0 00-3.4 0z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'); }

  window.Reader = {
    renderToolbar, renderProgress, renderContent, renderNav,
    openMoreMenu, closeSheet, releaseWakeLockOnLeave, warnIcon
  };
})();
