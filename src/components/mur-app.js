// @ts-check

/**
 * <mur-app>: full-viewport application shell.
 *
 * The page should set `body { margin: 0; }` so the shell fills the viewport
 * exactly.
 *
 * Slots:
 * - `toolbar`: top area.
 * - (default): main content, scrolls on its own.
 * - `statusbar`: bottom area.
 *
 * Parts:
 * - `toolbar`, `main`, `statusbar`: the three areas.
 *
 * Attributes, properties, events: none.
 */

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      height: 100dvh;
      background: var(--mur-color-bg);
      color: var(--mur-color-text);
      font-family: var(--mur-font);
      font-size: var(--mur-font-size-m);
    }

    :host([hidden]) {
      display: none;
    }

    main {
      overflow: auto;
      overscroll-behavior: contain;
    }

    main:focus-visible {
      outline: 2px solid var(--mur-color-focus);
      outline-offset: -2px;
    }
  </style>
  <header part="toolbar"><slot name="toolbar"></slot></header>
  <!-- tabindex lets keyboard users scroll the main area in every browser. -->
  <main part="main" tabindex="0"><slot></slot></main>
  <footer part="statusbar"><slot name="statusbar"></slot></footer>
`;

export class MurApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
  }
}

if (!customElements.get('mur-app')) {
  customElements.define('mur-app', MurApp);
}
