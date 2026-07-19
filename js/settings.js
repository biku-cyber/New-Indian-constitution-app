/* ============================================================
   NyaySetu — settings.js
   Renders the Settings view: Appearance, Reading, Speech,
   Accessibility, Storage, About.
   ============================================================ */

(function () {
  "use strict";

  const { el, toast } = Utils;

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

  function groupTitle(text) { return el("div", { class: "group-title text-label" }, [text]); }

  function render(onChange) {
    const s = Storage.getSettings();
    const refresh = () => onChange();

    const appearance = el("div", { class: "settings-group" }, [
      groupTitle("Appearance"),
      row("App Theme", el("span", { class: "row-value text-caption" }, ["Dark (default)"])),
      segmented(
        [{ label: "Day", value: "day" }, { label: "Night", value: "night" }, { label: "Light", value: "light" }],
        s.readerTheme,
        (v) => { Storage.saveSettings({ readerTheme: v }); refresh(); }
      )
    ]);

    const reading = el("div", { class: "settings-group" }, [
      groupTitle("Reading"),
      el("div", {}, [
        row("Font Family", el("span", { class: "row-value text-caption" }, [s.fontFamily === "serif" ? "Serif" : "Sans"])),
      ]),
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
      groupTitle("Speech / Live Read"),
      row("Speed", stepperInline(s.speechRate, 0.5, 2, (n) => { Storage.saveSettings({ speechRate: +n.toFixed(1) }); refresh(); }, 0.1)),
      row("Pitch", stepperInline(s.speechPitch, 0.5, 2, (n) => { Storage.saveSettings({ speechPitch: +n.toFixed(1) }); refresh(); }, 0.1)),
      row("Language", el("span", { class: "row-value text-caption" }, ["অসমীয়া"]))
    ]);

    const translation = el("div", { class: "settings-group" }, [
      groupTitle("Translation"),
      row("Default Language", el("span", { class: "row-value text-caption" }, [translationLabel(s.translationLang)]))
    ]);

    const accessibility = el("div", { class: "settings-group" }, [
      groupTitle("Accessibility"),
      row("High Contrast", switchEl(s.a11yHighContrast, () => { Storage.saveSettings({ a11yHighContrast: !s.a11yHighContrast }); Theme.applyAppTheme(); refresh(); })),
      row("Larger Text", switchEl(s.a11yLargeText, () => { Storage.saveSettings({ a11yLargeText: !s.a11yLargeText }); Theme.applyAppTheme(); refresh(); }))
    ]);

    const storageGroup = el("div", { class: "settings-group" }, [
      groupTitle("Storage"),
      row("Bookmarks Saved", el("span", { class: "row-value text-caption" }, [String(Storage.getBookmarks().length)])),
      clearRow()
    ]);

    const about = el("div", { class: "settings-group" }, [
      groupTitle("About"),
      row("Version", el("span", { class: "row-value text-caption" }, ["1.0.0 (offline)"])),
      linkRow("Privacy"),
      linkRow("Disclaimer")
    ]);

    return el("div", {}, [appearance, reading, speech, translation, accessibility, storageGroup, about]);
  }

  function stepperInline(value, min, max, onChange, step) {
    step = step || 1;
    const label = el("span", { class: "row-value text-caption", style: "min-width:2.5ch;text-align:center;" }, [String(value)]);
    const minus = el("button", { class: "icon-btn", style: "width:30px;height:30px;border:1px solid var(--color-border);" }, ["−"]);
    const plus = el("button", { class: "icon-btn", style: "width:30px;height:30px;border:1px solid var(--color-border);" }, ["+"]);
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
