/* ============================================================
   NyaySetu — theme.js
   Applies the app theme (dark, default) and the reader theme
   (day / night / light) based on stored settings.
   ============================================================ */

(function () {
  "use strict";

  function applyAppTheme() {
    const settings = Storage.getSettings();
    document.body.setAttribute("data-theme", settings.appTheme || "dark");
    document.body.classList.toggle("a11y-high-contrast", !!settings.a11yHighContrast);
    document.body.classList.toggle("a11y-large-text", !!settings.a11yLargeText);
  }

  // Applies reader-specific theme + typography vars to a given root element
  // (the .reader-view wrapper), so it doesn't leak into the rest of the app.
  function applyReaderTheme(rootEl) {
    const settings = Storage.getSettings();
    rootEl.setAttribute("data-reader-theme", settings.readerTheme || "day");
    rootEl.setAttribute("data-font", settings.fontFamily || "sans");
    rootEl.classList.toggle("bold-reading", !!settings.boldReading);
    rootEl.style.setProperty("--reader-font-size", settings.fontSize + "px");
    rootEl.style.setProperty("--reader-line-height", settings.lineHeight);
  }

  function setReaderTheme(theme) {
    Storage.saveSettings({ readerTheme: theme });
  }

  window.Theme = { applyAppTheme, applyReaderTheme, setReaderTheme };
})();
