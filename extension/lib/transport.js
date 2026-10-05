// Fan-out WebSocket client: keeps one connection per configured frontend
// endpoint, reconnects with backoff, and replays a snapshot on (re)connect.

const HEARTBEAT_MS = 20000;
const MAX_BACKOFF_MS = 30000;

class Endpoint {
  constructor(url, hub) {
    this.url = url;
    this.hub = hub;
    this.ws = null;
    this.backoff = 1000;
    this.retryTimer = null;
    this.closed = false;
    this.connect();
  }

  get status() {
    if (!this.ws) return 'waiting';
    return ['connecting', 'connected', 'closing', 'waiting'][this.ws.readyState] ?? 'waiting';
  }

  connect() {
    if (this.closed) return;
    let ws;
    try {
      ws = new this.hub.WebSocketImpl(this.url);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.backoff = 1000;
      for (const msg of this.hub.snapshot()) this.send(msg);
      this.hub.onStatus?.();
    };
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      this.hub.onStatus?.();
      this.scheduleRetry();
    };
    ws.onerror = () => {}; // onclose follows
    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg?.type === 'command') this.hub.onCommand?.(msg);
    };
  }

  scheduleRetry() {
    if (this.closed || this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, this.backoff);
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
  }

  send(msg) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg));
  }

  close() {
    this.closed = true;
    clearTimeout(this.retryTimer);
    this.ws?.close();
  }
}

export class Broadcaster {
  /**
   * @param {{snapshot: () => object[], onStatus?: () => void, onCommand?: (msg: object) => void, WebSocketImpl?: typeof WebSocket}} opts
   */
  constructor(opts) {
    this.snapshot = opts.snapshot;
    this.onStatus = opts.onStatus;
    this.onCommand = opts.onCommand;
    this.WebSocketImpl = opts.WebSocketImpl ?? WebSocket;
    /** @type {Map<string, Endpoint>} */
    this.endpoints = new Map();
    this.heartbeat = setInterval(() => this.send({ type: 'ping', ts: Date.now() }), HEARTBEAT_MS);
    this.heartbeat.unref?.(); // Node (tests): don't keep the process alive
  }

  setEndpoints(urls) {
    const wanted = new Set(urls.map((u) => u.trim()).filter(Boolean));
    for (const [url, ep] of this.endpoints) {
      if (!wanted.has(url)) {
        ep.close();
        this.endpoints.delete(url);
      }
    }
    for (const url of wanted) {
      if (!this.endpoints.has(url)) this.endpoints.set(url, new Endpoint(url, this));
    }
  }

  /** Nudge endpoints waiting on backoff to retry now (e.g. on new activity). */
  wake() {
    for (const ep of this.endpoints.values()) {
      if (!ep.ws && ep.retryTimer) {
        clearTimeout(ep.retryTimer);
        ep.retryTimer = null;
        ep.backoff = 1000;
        ep.connect();
      }
    }
  }

  send(msg) {
    for (const ep of this.endpoints.values()) ep.send(msg);
  }

  status() {
    return [...this.endpoints.values()].map((ep) => ({ url: ep.url, status: ep.status }));
  }
}
