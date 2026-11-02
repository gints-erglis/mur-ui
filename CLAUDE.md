# CLAUDE.md — Mur UI

Mur is a small, dependency-free UI component library built on plain web standards
(Custom Elements, Shadow DOM, ES modules, CSS custom properties). It is a personal
library used in the owner's own projects. It is not sold or published to npm.

The name comes from "murmuration": a flock of starlings moving in sync. Many
independent components reacting to the same data in real time.

## Philosophy (read this first)

- **Plain JavaScript only.** No frameworks (no React, Lit, Vue), no runtime dependencies.
- **No build step.** Files are loaded directly by the browser as ES modules.
  Do not add bundlers, transpilers, or `package.json` dependencies without asking.
- **Web standards over abstractions.** Prefer what the platform already offers
  (`EventTarget`, `CustomEvent`, `ElementInternals`, Pointer Events, `<template>`).
- **Small and readable over clever.** The owner must be able to read and understand
  every file. Prefer clear code with short comments over compact tricks.
- **Build only what is needed.** Do not add components or features that no current
  task asks for.

## Context: where Mur is used

Mur runs inside a Drupal site. Drupal provides a route (e.g. `/dashboard`) that
requires a logged-in user with a specific permission and returns a page that loads
Mur. Because the dashboard is served from the same origin as Drupal:

- there are no CORS issues;
- data requests use the Drupal session cookie (`credentials: 'same-origin'`);
- write requests (POST/PATCH/DELETE) must send the `X-CSRF-Token` header,
  fetched from `/session/token`.

First real use cases:

1. **Drupal Commerce order dashboard**: shows incoming orders and refreshes itself.
   Starts with polling Drupal JSON:API, may later switch to Server-Sent Events.
2. **IRBE server monitor**: shows live server metrics (CPU, memory, disks, services)
   streamed via Server-Sent Events.

The library itself must never depend on Drupal. Drupal-specific code lives in
data sources (see below), not in components.

## Repository structure

```
mur-ui/
├── src/
│   ├── mur.js              # entry point: imports and registers all components
│   ├── tokens.css          # design tokens (CSS custom properties)
│   ├── components/         # one file per custom element
│   └── data/
│       ├── store.js        # Store class (framework-agnostic)
│       └── sources/        # data sources: mock, polling, sse
├── demo/
│   └── index.html          # kitchen sink page: every component on one page
├── CLAUDE.md
└── README.md
```

Run the demo with any static server from the repo root, e.g.
`python3 -m http.server 8000` then open `http://localhost:8000/demo/`.

## Coding conventions

### General
- Modern JavaScript (ES2022+), evergreen browsers only (current Chrome, Firefox,
  Safari, Edge). No polyfills.
- Add `// @ts-check` at the top of every JS file and use JSDoc types for public
  APIs. This gives type checking in the editor without a build step.
- Two-space indentation, single quotes, semicolons.
- Code, comments, and identifiers in English.

### Custom elements
- Tag names use the `mur-` prefix: `mur-app`, `mur-toolbar`, `mur-splitter`.
- One element per file, file named after the tag: `src/components/mur-splitter.js`.
- Class names in PascalCase: `MurSplitter`.
- Register with a guard so double imports do not throw:
  ```js
  if (!customElements.get('mur-splitter')) {
    customElements.define('mur-splitter', MurSplitter);
  }
  ```
- Use Shadow DOM (`mode: 'open'`). Content goes in through `<slot>` elements.
- Expose styling hooks with `part="..."` and CSS custom properties, never by
  requiring users to reach into the shadow root.
- Configuration through attributes (kebab-case) mirrored by properties (camelCase).
  Use `static observedAttributes` and `attributeChangedCallback`.
- Clean up in `disconnectedCallback`: remove global listeners, observers, timers.
- Components must work if created before or after being added to the DOM.

### Events
- Custom events are named with the `mur-` prefix: `mur-tab-change`, `mur-resize`.
- Dispatch with `bubbles: true, composed: true` and put data in `detail`.

### Styling
- All colors, spacing, radii, and fonts come from tokens in `tokens.css`
  (`--mur-color-bg`, `--mur-space-m`, `--mur-radius`, ...). No hard-coded colors
  in components.
- Support light and dark themes: tokens get dark values under
  `@media (prefers-color-scheme: dark)` and can be forced with
  `<html data-theme="light|dark">`.
- Layout with CSS Grid and Flexbox. Use `dvh` units for full-height layouts.

### Accessibility
- Follow the WAI-ARIA Authoring Practices Guide pattern for each widget
  (tabs, splitter/window splitter, toolbar, etc.).
- Every interactive part works with the keyboard and has a visible focus style.
- Remember that ARIA ID references do not cross shadow boundaries; keep related
  elements (e.g. tab and its label) inside the same shadow root.

### Security
- Never put data from the server or the user into `innerHTML`. Use
  `textContent`, `createElement`, or cloned `<template>` content.
- Static markup inside a component's own template is fine.

## Data layer

Components never fetch data themselves. The pattern is:

```
data source  ──►  Store  ──(change event)──►  components
```

- **Store** (`src/data/store.js`): extends `EventTarget`, holds records, supports
  sorting and filtering, dispatches a `change` event after updates. Has no
  knowledge of the DOM or of where data comes from.
- **Data sources** implement a tiny interface:
  ```js
  /** @typedef {{ start(store: Store): void, stop(): void }} DataSource */
  ```
  Planned sources:
  - `MockSource`: generates fake records on a timer (used by the demo).
  - `PollingSource`: fetches a URL every N seconds, merges changed records.
    For Drupal JSON:API, filter by the `changed` field since the last fetch.
  - `SseSource`: wraps `EventSource`, updates the store on each message.
- Components receive a store through a property (`grid.store = ordersStore`) and
  listen for `change`.
- Connection status (online, offline, last update time) is exposed by the source
  so a status bar can display it.

## Roadmap

Work in this order. Finish and demo each step before starting the next.

### Step 1 — App shell (start here)
1. `tokens.css` with a small token set for both themes.
2. `<mur-app>`: full-viewport grid with three areas, filled through named slots:
   `toolbar` (top), default slot (main content, scrolls), `statusbar` (bottom).
3. `<mur-toolbar>`: horizontal flex bar with slots `start`, default, `end`.
   `role="toolbar"` with arrow-key navigation between focusable children.
4. `<mur-statusbar>`: thin bar with slots `start`, default, `end`, smaller text.
5. `demo/index.html` showing the shell with placeholder content.

### Step 2 — Splitter and tabs
1. `<mur-splitter>`: two panes via slots `start` and `end`.
   - Attributes: `orientation` (`horizontal` | `vertical`), `position`
     (percent of the first pane, default 50), `min-start`, `min-end` (px),
     `persist` (key for remembering the position in `localStorage`, wrapped in
     try/catch).
   - Dragging with Pointer Events and `setPointerCapture`.
   - The divider has `role="separator"`, `aria-valuenow`, `aria-orientation`,
     and responds to arrow keys, Home, End.
   - Dispatches `mur-resize` with `{ position }`.
2. `<mur-tabs>` with `<mur-tab-panel label="...">` children.
   - `mur-tabs` builds the tab buttons from the panels' `label` attributes.
   - Attribute/property `selected` (index).
   - Inactive panels are hidden, not removed, so live data keeps updating.
   - Keyboard: arrow keys move between tabs, Home/End jump to first/last.
   - Dispatches `mur-tab-change` with `{ index }`.
3. Add both to the demo, nested inside the app shell.

### Step 3 — Data layer
1. `Store` with `setAll`, `upsert`, `remove`, `items`, `sorter`, `filter`, `change` event.
2. `MockSource` generating fake orders and fake server metrics.
3. Status bar shows connection status and last update time from the source.

### Step 4 — First real views
1. Orders view (simple list or table) bound to a store, fed by `MockSource`,
   then by `PollingSource` against Drupal JSON:API.
2. Server metrics view fed by `SseSource`.

Later (only when needed): data grid with virtualization, tree, combobox, form fields
using `ElementInternals`, dialogs.

## Definition of done for a component

- Works in the demo page in both light and dark theme.
- Fully usable with the keyboard; focus is visible.
- No console errors or warnings; no leaked listeners after removal from the DOM.
- Public attributes, properties, slots, parts, and events are documented in a
  JSDoc block at the top of the file.
- The demo shows its main states.

## When unsure

Ask before adding a dependency, a build tool, or a component that is not on the
roadmap. Prefer the simplest solution that follows the conventions above.
