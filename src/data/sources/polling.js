// @ts-check

/**
 * PollingSource: fetches a URL repeatedly and merges the changes into a store.
 *
 * The server must answer with JSON: `{ records: [...], now: <number> }`.
 * `now` is an opaque position that comes back as the `since` query parameter of
 * the next request, and the server then returns only what changed after it.
 * The first request has no `since`, and its records replace the store's.
 *
 * Deleted records are not noticed, because a list of changes cannot show them.
 *
 * Requests send the session cookie of the same origin. When one fails, the
 * records stay, `status` becomes `offline`, `error` says why, and polling goes on.
 *
 * Options:
 * - `url`: the address to fetch.
 * - `interval`: milliseconds between the end of one request and the next,
 *   default 15000.
 *
 * Properties: `status`, `lastUpdate`, `error` (string or null).
 *
 * Events:
 * - `status`: `status`, `lastUpdate`, or `error` changed.
 *
 * @example
 * const source = new PollingSource({ url: '/dashboard/orders.json' });
 * source.start(store);
 */

/** @typedef {import('../store.js').Store} Store */

export class PollingSource extends EventTarget {
  /** @type {'online' | 'offline'} */
  status = 'offline';

  /** @type {Date | null} */
  lastUpdate = null;

  /** @type {string | null} */
  error = null;

  /** @type {string} */
  #url;

  /** @type {number} */
  #interval;

  /** The store the current `since` position belongs to. @type {Store | null} */
  #store = null;

  /** @type {number | null} */
  #since = null;

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #timer;

  /** Cancels the running request. @type {AbortController | null} */
  #controller = null;

  /** @param {{ url: string, interval?: number }} options */
  constructor({ url, interval = 15000 }) {
    super();
    this.#url = url;
    this.#interval = interval;
  }

  /** @param {Store} store */
  start(store) {
    this.#cancel();
    if (store !== this.#store) {
      this.#store = store;
      this.#since = null;
    }
    this.#poll(store);
  }

  stop() {
    this.#cancel();
    this.status = 'offline';
    this.error = null;
    this.dispatchEvent(new Event('status'));
  }

  #cancel() {
    clearTimeout(this.#timer);
    this.#controller?.abort();
    this.#controller = null;
  }

  /** @param {Store} store */
  async #poll(store) {
    const controller = new AbortController();
    this.#controller = controller;

    const url = new URL(this.#url, location.href);
    if (this.#since !== null) {
      url.searchParams.set('since', String(this.#since));
    }

    try {
      const response = await fetch(url, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const { records, now } = await this.#read(response);
      if (this.#since === null) {
        store.setAll(records);
      } else if (records.length) {
        store.upsert(records);
      }
      this.#since = now;
      this.status = 'online';
      this.lastUpdate = new Date();
      this.error = null;
    } catch (error) {
      if (controller.signal.aborted) {
        return; // stop() or a new start() took over.
      }
      this.status = 'offline';
      this.error = error instanceof Error ? error.message : 'Request failed';
    }

    this.dispatchEvent(new Event('status'));
    this.#timer = setTimeout(() => this.#poll(store), this.#interval);
  }

  /**
   * Parses and checks a response. A login page instead of JSON fails here.
   * @param {Response} response
   * @returns {Promise<{ records: any[], now: number }>}
   */
  async #read(response) {
    let body;
    try {
      body = await response.json();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      throw new Error('Response is not JSON');
    }
    if (!Array.isArray(body?.records) || typeof body?.now !== 'number') {
      throw new Error('Unexpected response');
    }
    return body;
  }
}
