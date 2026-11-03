// @ts-check

/**
 * <mur-table>: read-only table that shows a store's items and follows changes.
 *
 * Only rows whose record changed are rebuilt, so links in the other rows keep
 * their focus while live data arrives. A row that changes position in the sort
 * order can lose focus. Sorting and filtering belong to the store.
 * The header sticks to the top of the nearest scrolling parent.
 *
 * Attributes / properties:
 * - `label` / `label`: accessible name of the table.
 * - `empty-text` / `emptyText`: shown when there are no rows, default "No records".
 *
 * Properties:
 * - `store`: the Store to show, default null.
 * - `columns`: array of column definitions, default []:
 *   - `key`: record field to show.
 *   - `label`: header text.
 *   - `align`: `start` (default) or `end`, for numbers.
 *   - `format(record)`: returns the cell text, instead of using `key`.
 *   - `href(record)`: makes the cell a link to the returned address. Return only
 *     addresses you trust; the table does not check them.
 *
 * Parts:
 * - `table`, `header-cell`, `row`, `cell`, `link`, `empty`.
 *
 * Slots, events: none.
 */

/** @typedef {import('../data/store.js').Store} Store */

/**
 * @typedef {{
 *   key?: string,
 *   label: string,
 *   align?: 'start' | 'end',
 *   format?: (record: any) => string,
 *   href?: (record: any) => string,
 * }} Column
 */

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      font-variant-numeric: tabular-nums;
    }

    :host([hidden]) {
      display: none;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--mur-color-surface);
      box-shadow: inset 0 -1px var(--mur-color-border-strong);
      color: var(--mur-color-text-muted);
      font-size: var(--mur-font-size-s);
      font-weight: 600;
      text-align: start;
    }

    th,
    td {
      padding: var(--mur-space-s) var(--mur-space-m);
    }

    td {
      border-block-end: 1px solid var(--mur-color-border);
    }

    tbody tr:hover {
      background: var(--mur-color-hover);
    }

    .end {
      text-align: end;
    }

    a {
      color: var(--mur-color-accent);
      text-underline-offset: 0.2em;
    }

    a:focus-visible {
      outline: 2px solid var(--mur-color-focus);
      outline-offset: 2px;
      border-radius: var(--mur-radius);
    }

    p {
      margin: 0;
      padding: var(--mur-space-l) var(--mur-space-m);
      color: var(--mur-color-text-muted);
    }
  </style>
  <table part="table">
    <thead><tr></tr></thead>
    <tbody></tbody>
  </table>
  <p part="empty" hidden></p>
`;

export class MurTable extends HTMLElement {
  static observedAttributes = ['label', 'empty-text'];

  /** @type {Store | null} */
  #store = null;

  /** @type {Column[]} */
  #columns = [];

  /** Built rows by record. A changed record is a new object, so gets a new row. */
  #rows = new WeakMap();

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).append(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.#store?.addEventListener('change', this.#renderRows);
    this.#renderRows();
  }

  disconnectedCallback() {
    this.#store?.removeEventListener('change', this.#renderRows);
  }

  attributeChangedCallback() {
    const table = this.shadowRoot.querySelector('table');
    const label = this.getAttribute('label');
    if (label) {
      table.setAttribute('aria-label', label);
    } else {
      table.removeAttribute('aria-label');
    }
    this.#renderRows();
  }

  /** @returns {Store | null} */
  get store() {
    return this.#store;
  }

  set store(value) {
    this.#store?.removeEventListener('change', this.#renderRows);
    this.#store = value;
    if (this.isConnected) {
      this.#store?.addEventListener('change', this.#renderRows);
    }
    this.#renderRows();
  }

  /** @returns {Column[]} */
  get columns() {
    return this.#columns;
  }

  set columns(value) {
    this.#columns = value;
    this.#rows = new WeakMap();
    this.#renderHeader();
    this.#renderRows();
  }

  /** @returns {string | null} */
  get label() {
    return this.getAttribute('label');
  }

  set label(value) {
    if (value === null) {
      this.removeAttribute('label');
    } else {
      this.setAttribute('label', value);
    }
  }

  /** @returns {string} */
  get emptyText() {
    return this.getAttribute('empty-text') ?? 'No records';
  }

  set emptyText(value) {
    this.setAttribute('empty-text', value);
  }

  #renderHeader() {
    const cells = this.#columns.map((column) => {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.part.add('header-cell');
      cell.textContent = column.label;
      if (column.align === 'end') {
        cell.className = 'end';
      }
      return cell;
    });
    this.shadowRoot.querySelector('thead tr').replaceChildren(...cells);
  }

  #renderRows = () => {
    const items = this.#store?.items ?? [];
    const body = this.shadowRoot.querySelector('tbody');

    const rows = items.map((record) => {
      let row = this.#rows.get(record);
      if (!row) {
        row = this.#createRow(record);
        this.#rows.set(record, row);
      }
      return row;
    });

    // Remove old rows first, then move a node only when it is out of place,
    // because moving a node takes away its focus.
    const wanted = new Set(rows);
    for (const row of [...body.children]) {
      if (!wanted.has(row)) {
        row.remove();
      }
    }
    let current = body.firstElementChild;
    for (const row of rows) {
      if (row === current) {
        current = current.nextElementSibling;
      } else {
        body.insertBefore(row, current);
      }
    }

    const empty = /** @type {HTMLElement} */ (this.shadowRoot.querySelector('p'));
    empty.hidden = items.length > 0;
    empty.textContent = this.emptyText;
  };

  /**
   * @param {any} record
   * @returns {HTMLTableRowElement}
   */
  #createRow(record) {
    const row = document.createElement('tr');
    row.part.add('row');
    for (const column of this.#columns) {
      const cell = document.createElement('td');
      cell.part.add('cell');
      if (column.align === 'end') {
        cell.className = 'end';
      }
      const text = column.format ? column.format(record) : String(record[column.key] ?? '');
      if (column.href) {
        const link = document.createElement('a');
        link.part.add('link');
        link.href = column.href(record);
        link.textContent = text;
        cell.append(link);
      } else {
        cell.textContent = text;
      }
      row.append(cell);
    }
    return row;
  }
}

if (!customElements.get('mur-table')) {
  customElements.define('mur-table', MurTable);
}
