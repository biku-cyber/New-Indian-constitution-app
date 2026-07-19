# ন্যায়সেতু · NyaySetu

Offline-first Progressive Web App — an Assamese-language legal reference
covering the Constitution of India, BNS, BNSS, BSA, IPC, and CrPC.

> **Status:** Working prototype / architecture skeleton. All legal text in
> `/data` is **placeholder demo content** marked `[নমুনা]`, not verified law.
> Replace it with checked official text before any real release — see
> [Content Update Guide](#content-update-guide).

---

## Project Overview

- 100% offline after first load — no login, no server, no tracking.
- Pure HTML + CSS + Vanilla JavaScript. No frameworks, no build step.
- Content lives in flat JSON files. Adding a law or a section is a data
  change, not a code change.
- Firebase is **not used** in this version. One integration point is left
  for a future "Content Update" feature — see below.

## Features

- Home with Preamble, Parts, Schedules, Amendments, Case Study, and
  Bookmark shortcuts, plus a vertical list of BNS / BNSS / BSA (active
  laws) and IPC / CrPC (historical laws).
- "Continue Reading" card that jumps back into the last-opened Article/Section.
- Independent search per module: by number, title (Assamese/English), or
  keyword, with match highlighting.
- Reader with Translate (demo), Live Read (TTS via Web Speech API), Keep
  Screen On (Screen Wake Lock API), Bookmark, Share, and Report (opens the
  device's email app) actions.
- Previous/Next navigation with first/last warnings and a reading-progress
  indicator ("Section 15 of 358"-style).
- Three reading themes (Eye Comfort Day / Night / Light) independent of the
  dark home theme, plus font family, font size, line height, and bold
  reading controls.
- Bookmarks grouped by law with one-tap removal.
- Settings: Appearance, Reading, Speech, Translation, Accessibility, Storage,
  About.
- Offline caching via a Service Worker (cache-first for the app shell,
  stale-while-revalidate for JSON data).

## Folder Structure

```
NyaySetu/
  README.md
  LICENSE
  index.html
  manifest.json
  sw.js
  assets/
    fonts/            → put font1.ttf, font2.ttf, font3.ttf... here
    icons/            → app_icon.svg (Ashoka Emblem placeholder)
    images/
  css/
    base.css          → reset, @font-face, type scale
    theme.css         → CSS variables: dark app theme + 3 reader themes
    layout.css        → page/header/grid structure
    components.css    → cards, buttons, search box, sheets, toasts
    reader.css        → reader typography + TTS/keep-screen-on states
    utilities.css     → spacing/flex helpers, accessibility overrides
  js/
    utils.js          → dom helpers, JSON fetch+cache, highlight, ripple
    storage.js         → settings/bookmarks/last-read persistence (localStorage)
    theme.js           → applies app theme + reader theme from settings
    speech.js          → Web Speech API wrapper (Live Read)
    search.js          → per-module search index + matching
    bookmark.js         → bookmark record shape + grouping for the Bookmarks view
    reader.js           → reader toolbar, content rendering, nav, more-menu
    settings.js         → Settings page UI
    router.js           → hash router
    app.js              → module registry + all view renderers + bootstrap
  data/
    constitution/
      preamble.json
      parts/parts.json
      schedules/schedules.json
      amendments/amendments.json
    laws/
      bns/bns.json
      bnss/bnss.json
      bsa/bsa.json
      ipc/ipc.json
      crpc/crpc.json
    casestudies/casestudies.json
```

## Build Architecture

- **No bundler.** `index.html` loads each CSS/JS file directly via
  `<link>`/`<script>` tags, in dependency order (utils → storage → theme →
  speech → search → bookmark → reader → settings → router → app).
- **`app.js` is the only file that knows about specific laws.** It holds a
  `MODULES` registry (key → label, data path, chapter/section word,
  historical flag). Every list/group/reader view is generic and driven by
  this registry plus the JSON shape below — so adding BNSS was zero new UI
  code, just a registry entry and a data file.
- **Routing** is a minimal hash router (`router.js`): `#/`, `#/preamble`,
  `#/list/:module`, `#/group/:module/:groupId`, `#/reader/:module/:groupId/:entryId`,
  `#/casestudy`, `#/casestudy/:id`, `#/bookmarks`, `#/settings`.

## JSON Schema

Two shapes, both normalized internally into the same `{ groups: [...] }`
structure so search and rendering code doesn't special-case them.

**Grouped** (Constitution Parts, BNS, BNSS, BSA, IPC, CrPC) — chapter/part
layer above sections/articles:

```json
{
  "groups": [
    {
      "id": "ch6",
      "number": 6,
      "title": "Chapter 6",
      "titleEn": "Offences Affecting the Human Body",
      "entries": [
        {
          "id": "bns_s103",
          "number": 103,
          "title": "নৰবধৰ শাস্তি",
          "titleEn": "Punishment for murder",
          "keywords": ["murder", "punishment"],
          "text": ["Clause or paragraph 1", "Clause or paragraph 2 (optional)"],
          "explanation": "Optional plain-language note shown below the text."
        }
      ]
    }
  ]
}
```

**Flat** (Schedules, Amendments) — no chapter layer, entries are the
leaf reader pages directly:

```json
{
  "flat": true,
  "entries": [
    { "id": "sch6", "number": 6, "title": "...", "titleEn": "...", "text": ["..."] }
  ]
}
```

Every entry needs a **unique `id`** — this is what bookmarks, last-read, and
deep links (`#/reader/bns/ch6/bns_s103`) key off. Recommended convention:
`<module>_<type><number>`, e.g. `bns_s103`, `art14`, `sch6`.

## Offline Support

`sw.js` registers on load and caches:
- the app shell (HTML/CSS/JS/icon) — cache-first, versioned by `CACHE_VERSION`
- everything under `/data/*.json` — stale-while-revalidate, so the app always
  has something to show offline, and quietly picks up updates when online.

Settings, bookmarks, and last-read state are stored in `localStorage`
(see `storage.js`) — no network or account needed.

## Browser Compatibility

Targets modern evergreen mobile/desktop browsers (Chrome, Edge, Safari,
Firefox — recent versions). Two features degrade gracefully when
unsupported, rather than breaking the page:
- **Live Read** needs `window.speechSynthesis`; if absent, the button shows
  a toast instead of speaking.
- **Keep Screen On** needs the Screen Wake Lock API; if absent, same
  graceful toast fallback.

## Future Firebase Integration

Firebase is intentionally **not wired up** in this version. The only hook
left for it is a `message` listener in `sw.js` that can accept a
`{ type: "CONTENT_UPDATE", files: [...] }` message to refresh specific
cached JSON files without touching the app shell. When ready, a future
`update-check.js` would call Firebase (or any remote source), diff content
versions, and post that message — no other file needs to change.

## Content Update Guide

To add or correct content:
1. Edit the relevant file under `/data`. Keep the JSON schema above.
2. Every `entries[]` item needs a stable, unique `id` — never reuse or
   reassign an existing `id`, since bookmarks reference it.
3. Remove the `[নমুনা]` prefix and the `explanation` disclaimer line once
   text is verified against the official source.
4. Bump `CACHE_VERSION` in `sw.js` so returning offline users get the update.

## Font Guide

Drop Assamese Unicode-compatible `.ttf` files into `assets/fonts/` as
`font1.ttf` (sans, referenced as `NotoSansBengaliUI`) and `font2.ttf` (serif,
referenced as `NotoSerifBengaliUI`). Both are declared in `css/base.css` via
`@font-face`; add more with a new `@font-face` block plus a settings option
in `settings.js` if you want a third choice.

## SVG Icon Guide

Icons are real assets under `assets/icons/`, recolored to `fill:currentColor` so
one file works on both the dark home theme and the light/night/day reader
themes — no separate "dark mode" duplicate needed. `app.js` preloads them
into the `ICONS` map (`ICON_ASSET_PATHS`) at boot and falls back to a small
hand-drawn SVG if a fetch ever fails (e.g. `schedules`, `search`, `chevron`,
`settings`, `trash` have no supplied asset yet and stay hand-drawn).

| Icon | File | Used for |
|---|---|---|
| Preamble | `preamble.svg` | প্ৰস্তাৱনা card |
| Parts | `parts.svg` | পাৰ্টছ card |
| Amendments | `amendments.svg` | সংশোধনী card |
| Case Study | `case_study.svg` | Case Study card + list rows |
| Law (generic) | `law.svg` | BNS/BNSS/BSA/IPC/CrPC row icon |
| Bookmark | `bookmarks.svg` | Bookmark card + Bookmarks page |
| Bookmark — saved | `bookmark_checked.svg` | Reader toolbar, entry already bookmarked |
| Bookmark — add | `add_bookmark.svg` | Reader toolbar, entry not yet bookmarked |
| Translate | `translate.svg` | Reader toolbar |
| Ashoka Emblem | `ashoka.svg` | Preamble page header + PWA app icon (`app_icon.svg`) |

`bookmark.svg` (from the uploaded `Group_3.svg`, a gavel mark) is currently
**unused** — it was an early guess for the Bookmark icon before the real
`Bookmarks.svg` / `Bookmark_Checked.svg` / `add_bookmark.svg` assets arrived.
Kept on disk in case it's meant for another slot later.

To add a module icon that has no supplied asset, add one entry to `ICONS` in
`app.js` following the existing 24×24 viewBox / `currentColor` stroke
convention, so it inherits the accent color automatically.

## Accessibility

- High Contrast and Larger Text toggles in Settings (`utilities.css`).
- Visible keyboard focus ring (`:focus-visible`) app-wide.
- `prefers-reduced-motion` respected — animations collapse to ~0ms.
- Buttons carry `aria-label`s; toolbar actions are real `<button>` elements,
  reachable and operable by keyboard.

## Contribution Guide

- One law/schedule/amendment = one JSON file. No code changes needed to add
  content, only to add an entirely new *module type*.
- Keep `app.js` the single place that knows about specific laws (the
  `MODULES` registry) — don't hardcode a law name anywhere else.
- Run through the JSON schema validation mentally (or write a small script)
  before committing new content: every entry needs `id`, `number`, `title`.
- Match the existing CSS variable naming (`--color-*` for app theme,
  `--read-*` for reader themes) rather than hardcoding hex values.

## License

App code is MIT-licensed — see `LICENSE`. Legal texts are government works;
verify reproduction terms independently of this license.
