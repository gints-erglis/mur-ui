// @ts-check

/**
 * MockSource: generates fake records on a timer, for demos and development.
 *
 * `stop()` makes it report `offline`. `start()` continues with the same records.
 *
 * Options:
 * - `type`: `orders` or `metrics`.
 * - `interval`: milliseconds between updates, default 2000.
 *
 * Events:
 * - `status`: `status` or `lastUpdate` changed.
 *
 * Order records: `{ id, number, customer, total, state, created }`.
 * Metric records: `{ id, label, value, unit }`. Services have a text value.
 *
 * @example
 * const source = new MockSource({ type: 'orders' });
 * source.start(store);
 */

/** @typedef {import('../store.js').Store} Store */
/** @typedef {{ changed: any[], removed: unknown[] }} Tick */

const MAX_ORDERS = 30;
const ORDER_STATES = ['new', 'processing', 'completed'];
const CUSTOMERS = ['Anna Ozola', 'Jānis Bērziņš', 'Līga Kalniņa', 'Mārtiņš Liepa', 'Rūta Krūmiņa'];
const SERVICES = ['nginx', 'php-fpm', 'mariadb'];

/**
 * @param {any[]} list
 * @returns {any}
 */
function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * @param {number} id
 * @returns {object}
 */
function createOrder(id) {
  return {
    id,
    number: `#${1000 + id}`,
    customer: pick(CUSTOMERS),
    total: Math.round(Math.random() * 30000) / 100,
    state: 'new',
    created: new Date().toISOString(),
  };
}

/**
 * Each tick brings a new order, moves another one forward, and drops the oldest
 * above the limit.
 * @param {Map<unknown, any>} records
 * @returns {Tick}
 */
function tickOrders(records) {
  const ids = [...records.keys()];
  const nextId = ids.length ? Math.max(...ids) + 1 : 1;
  const changed = [createOrder(nextId)];

  const open = [...records.values()].filter((order) => order.state !== 'completed');
  if (open.length) {
    const order = pick(open);
    const state = ORDER_STATES[ORDER_STATES.indexOf(order.state) + 1];
    changed.push({ ...order, state });
  }

  const removed = ids.length >= MAX_ORDERS ? [Math.min(...ids)] : [];
  return { changed, removed };
}

/** @returns {any[]} */
function createMetrics() {
  return [
    { id: 'cpu', label: 'CPU', value: 30, unit: '%' },
    { id: 'memory', label: 'Memory', value: 55, unit: '%' },
    { id: 'disk', label: 'Disk /', value: 70, unit: '%' },
    ...SERVICES.map((name) => ({ id: name, label: name, value: 'running', unit: '' })),
  ];
}

/**
 * Numbers drift a little. Services are rarely stopped, and restart soon.
 * @param {Map<unknown, any>} records
 * @returns {Tick}
 */
function tickMetrics(records) {
  const changed = [...records.values()].map((metric) => {
    if (typeof metric.value === 'number') {
      const value = metric.value + (Math.random() - 0.5) * 10;
      return { ...metric, value: Math.round(Math.min(Math.max(value, 0), 100)) };
    }
    if (metric.value === 'stopped') {
      return { ...metric, value: 'running' };
    }
    return { ...metric, value: Math.random() < 0.05 ? 'stopped' : 'running' };
  });
  return { changed, removed: [] };
}

export class MockSource extends EventTarget {
  /** @type {'online' | 'offline'} */
  status = 'offline';

  /** @type {Date | null} */
  lastUpdate = null;

  /** @type {'orders' | 'metrics'} */
  #type;

  /** @type {number} */
  #interval;

  /** All records, because the store's `items` may be filtered. @type {Map<unknown, any>} */
  #records = new Map();

  /** @type {ReturnType<typeof setInterval> | undefined} */
  #timer;

  /** @param {{ type: 'orders' | 'metrics', interval?: number }} options */
  constructor({ type, interval = 2000 }) {
    super();
    this.#type = type;
    this.#interval = interval;
    const seed = type === 'orders'
      ? Array.from({ length: 8 }, (_, index) => createOrder(index + 1))
      : createMetrics();
    for (const record of seed) {
      this.#records.set(record.id, record);
    }
  }

  /** @param {Store} store */
  start(store) {
    clearInterval(this.#timer);
    store.setAll([...this.#records.values()]);
    this.status = 'online';
    this.lastUpdate = new Date();
    this.dispatchEvent(new Event('status'));
    this.#timer = setInterval(() => this.#tick(store), this.#interval);
  }

  stop() {
    clearInterval(this.#timer);
    this.status = 'offline';
    this.dispatchEvent(new Event('status'));
  }

  /** @param {Store} store */
  #tick(store) {
    const tick = this.#type === 'orders' ? tickOrders : tickMetrics;
    const { changed, removed } = tick(this.#records);

    for (const record of changed) {
      this.#records.set(record.id, record);
    }
    store.upsert(changed);
    for (const id of removed) {
      this.#records.delete(id);
      store.remove(id);
    }

    this.lastUpdate = new Date();
    this.dispatchEvent(new Event('status'));
  }
}
