/* ============================================================
   NyaySetu — settings.js
   Renders the Settings view: Appearance, Reading, Speech,
   Translation, Accessibility, Storage, About.
   Group icons reuse the uploaded asset set where a real match
   exists (Translation → translate.svg, Storage → bookmarks.svg);
   the rest use small hand-drawn glyphs in the same style.
   ============================================================ */

(function () {
  "use strict";

  const { el, toast } = Utils;

  // Small hand-drawn glyphs for groups with no matching uploaded asset.
  const GROUP_ICONS = {
    appearance: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5v2.4M12 19v2.5M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.5 12h2.4M19 12h2.5M4.9 19l1.7-1.7M17.4 6.6l1.7-1.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    reading: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 5.5c2.4-1 5.2-1.2 8 0v13.5c-2.8-1.2-5.6-1-8 0V5.5zM20 5.5c-2.4-1-5.2-1.2-8 0v13.5c2.8-1.2 5.6-1 8 0V5.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    speech: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 010 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    accessibility: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="8.6" r="1.6" fill="currentColor"/><path d="M6.5 11c2-.8 3.7-1.1 5.5-1.1s3.5.3 5.5 1.1M12 10.4V17M9.3 17l1-3M14.7 17l-1-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    about: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.6"/><path d="M12 11v5.5M12 7.6v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };

  function groupHeader(key, label) {
    const asset = window.AppIcons && (
      key === "translation" ? window.AppIcons.translate :
      key === "storage" ? window.AppIcons.bookmark :
      null
    );
    const iconHtml = asset || GROUP_ICONS[key] || "";
    return el("div", { class: "settings-group-header" }, [
      el("span", { class: "icon-wrap", html: iconHtml }),
      el("span", { class: "group-title text-label" }, [label])
    ]);
  }

  function row(label, valueNode) {
    return el("div", { class: "settings-row" }, [
      el("span", { class: "row-label" }, [label]),
      valueNode
    ]);
  }

  function switchEl(on, onToggle) {
    const s = el("div", { class: "switch" + (on ? " on" : ""), role: "switch", "aria-checked": String(on), tabindex: "0" });
    const trigger = () => { onToggle(); };
    s.addEventListener("click", trigger);
    s.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trigger(); } });
    return s;
  }

  function segmented(options, current, onSelect) {
    const wrap = el("div", { class: "segmented", style: "padding:8px 14px;" });
    options.forEach((opt) => {
      const b = el("button", { class: opt.value === current ? "active" : "" }, [opt.label]);
      b.addEventListener("click", () => onSelect(opt.value));
      wrap.appendChild(b);
    });
    return wrap;
  }

  function render(onChange) {
    const s = Storage.getSettings();
    const refresh = () => onChange();

    const appearance = el("div", { class: "settings-group" }, [
      groupHeader("appearance", "Appearance"),
      row("App Theme", el("span", { class: "row-value text-caption" }, ["Dark (default)"])),
      segmented(
        [{ label: "Day", value: "day" }, { label: "Night", value: "night" }, { label: "Light", value: "light" }],
        s.readerTheme,
        (v) => { Storage.saveSettings({ readerTheme: v }); refresh(); }
      )
    ]);

    const reading = el("div", { class: "settings-group" }, [
      groupHeader("reading", "Reading"),
      row("Font Family", el("span", { class: "row-value text-caption" }, [s.fontFamily === "serif" ? "Serif" : "Sans"])),
      segmented(
        [{ label: "সান্স", value: "sans" }, { label: "চেৰিফ", value: "serif" }],
        s.fontFamily,
        (v) => { Storage.saveSettings({ fontFamily: v }); refresh(); }
      ),
      row("Font Size", stepperInline(s.fontSize, 14, 24, (n) => { Storage.saveSettings({ fontSize: n }); refresh(); })),
      row("Line Height", stepperInline(s.lineHeight, 1.3, 2.4, (n) => { Storage.saveSettings({ lineHeight: +n.toFixed(1) }); refresh(); }, 0.1)),
      row("Bold Reading", switchEl(s.boldReading, () => { Storage.saveSettings({ boldReading: !s.boldReading }); refresh(); })),
      row("Keep Screen On (default)", switchEl(s.keepScreenOnDefault, () => { Storage.saveSettings({ keepScreenOnDefault: !s.keepScreenOnDefault }); refresh(); }))
    ]);

    const speech = el("div", { class: "settings-group" }, [
      groupHeader("speech", "Speech / Live Read"),
      row("Speed", stepperInline(s.speechRate, 0.5, 2, (n) => { Storage.saveSettings({ speechRate: +n.toFixed(1) }); refresh(); }, 0.1)),
      row("Pitch", stepperInline(s.speechPitch, 0.5, 2, (n) => { Storage.saveSettings({ speechPitch: +n.toFixed(1) }); refresh(); }, 0.1)),
      row("Language", el("span", { class: "row-value text-caption" }, ["অসমীয়া"]))
    ]);

    const translation = el("div", { class: "settings-group" }, [
      groupHeader("translation", "Translation"),
      row("Default Language", el("span", { class: "row-value text-caption" }, [translationLabel(s.translationLang)]))
    ]);

    const accessibility = el("div", { class: "settings-group" }, [
      groupHeader("accessibility", "Accessibility"),
      row("High Contrast", switchEl(s.a11yHighContrast, () => { Storage.saveSettings({ a11yHighContrast: !s.a11yHighContrast }); Theme.applyAppTheme(); refresh(); })),
      row("Larger Text", switchEl(s.a11yLargeText, () => { Storage.saveSettings({ a11yLargeText: !s.a11yLargeText }); Theme.applyAppTheme(); refresh(); }))
    ]);

    const storageGroup = el("div", { class: "settings-group" }, [
      groupHeader("storage", "Storage"),
      row("Bookmarks Saved", el("span", { class: "row-value text-caption" }, [String(Storage.getBookmarks().length)])),
      clearRow()
    ]);

    const about = el("div", { class: "settings-group" }, [
      groupHeader("about", "About"),
      row("Version", el("span", { class: "row-value text-caption" }, ["1.0.0 (offline)"])),
      linkRow("Privacy"),
      linkRow("Disclaimer")
    ]);

    return el("div", {}, [appearance, reading, speech, translation, accessibility, storageGroup, about]);
  }

  function stepperInline(value, min, max, onChange, step) {
    step = step || 1;
    const label = el("span", { class: "row-value text-caption", style: "min-width:2.5ch;text-align:center;" }, [String(value)]);
    const minus = el("button", { class: "icon-btn", "aria-label": "Decrease" }, ["−"]);
    const plus = el("button", { class: "icon-btn", "aria-label": "Increase" }, ["+"]);
    minus.addEventListener("click", () => { const n = Math.max(min, +(value - step).toFixed(2)); onChange(n); });
    plus.addEventListener("click", () => { const n = Math.min(max, +(value + step).toFixed(2)); onChange(n); });
    return el("div", { class: "flex items-center gap-8" }, [minus, label, plus]);
  }

  function clearRow() {
    const btn = el("button", { class: "row-value text-caption accent" }, ["Clear Bookmarks"]);
    btn.addEventListener("click", () => {
      if (confirm("সকলো বুকমাৰ্ক মচিব বিচাৰে নেকি?")) {
        localStorage.removeItem(Storage.KEYS.BOOKMARKS);
        toast("বুকমাৰ্ক মচি পেলোৱা হ'ল।");
        window.dispatchEvent(new Event("nyaysetu:settings-changed"));
      }
    });
    return el("div", { class: "settings-row" }, [el("span", { class: "row-label" }, ["Reset"]), btn]);
  }

  function linkRow(label) {
    return el("div", { class: "settings-row" }, [el("span", { class: "row-label" }, [label]), el("span", { class: "row-value faint" }, ["›"])]);
  }

  function translationLabel(code) {
    return { as: "অসমীয়া", en: "English", hi: "हिन्दी", bn: "বাংলা" }[code] || "অসমীয়া";
  }

  window.SettingsView = { render };
})();
