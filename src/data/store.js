// @ts-check

/**
 * Store: holds records and tells listeners when they change.
 *
 * It knows nothing about the DOM or about where the data comes from.
 *
 * Every record needs a unique id, read from the `id` field by default.
 * `items` returns a shared array; treat it and its records as read-only.
 *
 * Events:
 * - `change`: records, `filter`, or `sorter` changed. Read `items` for the result.
 *
 * @example
 * const store = new Store();
 * store.addEventListener('change', () => console.log(store.items));
 * store.setAll([{ id: 1, total: 20 }, { id: 2, total: 10 }]);
 * store.sorter = (a, b) => a.total - b.total;
 */

/**
 * Feeds a store with data, and reports the state of its connection.
 *
 * @typedef {EventTarget & {
 *   start(store: Store): void,
 *   stop(): void,
 *   status: 'online' | 'offline',
 *   lastUpdate: Date | null,
 * }} DataSource
 *
 * Dispatches a `status` event when `status` or `lastUpdate` changes.
 */

export class Store extends EventTarget {
  /** Records by id, in insertion order. @type {Map<unknown, any>} */
  #records = new Map();

  /** @type {string} */
  #idKey;

  /** @type {((record: any) => boolean) | null} */
  #filter = null;

  /** @type {((a: any, b: any) => number) | null} */
  #sorter = null;

  /** The filtered and sorted result, until something changes. @type {any[] | null} */
  #items = null;

  /** @param {{ idKey?: string }} [options] */
  constructor({ idKey = 'id' } = {}) {
    super();
    this.#idKey = idKey;
  }

  /**
   * Records after applying `filter` and `sorter`.
   * @returns {any[]}
   */
  get items() {
    if (this.#items === null) {
      let items = [...this.#records.values()];
      if (this.#filter) {
        items = items.filter(this.#filter);
      }
      if (this.#sorter) {
        items.sort(this.#sorter);
      }
      this.#items = items;
    }
    return this.#items;
  }

  /** @returns {((record: any) => boolean) | null} */
  get filter() {
    return this.#filter;
  }

  /** Keeps only the records this function accepts; `null` keeps all. */
  set filter(value) {
    this.#filter = value;
    this.#changed();
  }

  /** @returns {((a: any, b: any) => number) | null} */
  get sorter() {
    return this.#sorter;
  }

  /** Compare function as for `Array.sort`; `null` means insertion order. */
  set sorter(value) {
    this.#sorter = value;
    this.#changed();
  }

  /**
   * Replaces all records.
   * @param {any[]} records
   */
  setAll(records) {
    this.#records.clear();
    this.#put(records);
    this.#changed();
  }

  /**
   * Adds records, or replaces those with the same id. An array counts as one
   * update and causes one `change` event.
   * @param {any | any[]} records
   */
  upsert(records) {
    this.#put(Array.isArray(records) ? records : [records]);
    this.#changed();
  }

  /**
   * Removes a record. Does nothing if the id is unknown.
   * @param {unknown} id
   */
  remove(id) {
    if (this.#records.delete(id)) {
      this.#changed();
    }
  }

  /** @param {any[]} records */
  #put(records) {
    for (const record of records) {
      const id = record[this.#idKey];
      if (id === undefined || id === null) {
        throw new TypeError(`Store: record has no "${this.#idKey}" field.`);
      }
      this.#records.set(id, record);
    }
  }

  #changed() {
    this.#items = null;
    this.dispatchEvent(new Event('change'));
  }
}
