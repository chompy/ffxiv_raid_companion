// Minimal websocket client for the IINACT server (ws://127.0.0.1:10501/ws).
//
// IINACT speaks the OverlayPlugin websocket protocol: after connecting we must
// ask for the events we want, or the server sends nothing:
//   -> {"call":"subscribe","events":["LogLine"]}
// It then sends one JSON message per log line:
//   { "type": "LogLine", "line": ["21","<ts>",...], "rawLine": "21|<ts>|..." }
// We only consume `rawLine` (zone changes etc. are re-parsed from it), but the
// raw text fallback keeps us working if the envelope changes.

export class IinactClient {
  constructor({ onLogLine, onState, onMessageCount }) {
    this._onLogLine = onLogLine;
    this._onState = onState ?? (() => {});
    this._onMessageCount = onMessageCount ?? (() => {});
    this.ws = null;
    this.url = null;
    this._shouldRun = false;
    this._retryDelayMs = 1000;
    this._retryTimer = null;
  }

  connect(url) {
    this.url = url;
    this._shouldRun = true;
    this._open();
  }

  disconnect() {
    this._shouldRun = false;
    clearTimeout(this._retryTimer);
    if (this.ws) {
      // Suppress the close handler's reconnect path.
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch {
        /* already closed */
      }
      this.ws = null;
    }
    this._setState('disconnected');
  }

  get connected() {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  _open() {
    if (!this.url || !this._shouldRun) return;
    this._setState('connecting');

    let ws;
    try {
      ws = new WebSocket(this.url);
    } catch (err) {
      console.error('Invalid websocket URL:', err);
      this._scheduleRetry();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this._retryDelayMs = 1000;
      this._msgCount = 0;
      this._onMessageCount(0);
      this._setState('connected');
      // IINACT (OverlayPlugin protocol) sends nothing until we ask for events.
      // Each new socket needs its own subscription, so this runs per connect.
      try {
        ws.send(JSON.stringify({ call: 'subscribe', events: ['LogLine'] }));
      } catch (err) {
        console.error('Failed to send subscribe:', err);
      }
    };

    ws.onmessage = (event) => this._handleMessage(event.data);

    ws.onerror = () => {
      // onclose always follows; retry is scheduled there.
    };

    ws.onclose = () => {
      if (this.ws !== ws) return; // stale socket after disconnect/reconnect
      this.ws = null;
      this._setState('disconnected');
      if (this._shouldRun) this._scheduleRetry();
    };
  }

  _handleMessage(data) {
    this._msgCount = (this._msgCount ?? 0) + 1;
    this._onMessageCount(this._msgCount);

    let rawLine = null;

    const text = typeof data === 'string' ? data : '';
    try {
      const msg = JSON.parse(text);
      if (msg && typeof msg.rawLine === 'string') {
        rawLine = msg.rawLine;
      } else if (Array.isArray(msg.line) && msg.line.length >= 2) {
        // Fallback: reconstruct the pipe-delimited line from its parts.
        rawLine = msg.line.join('|');
      }
    } catch {
      rawLine = text.includes('|') ? text : null;
    }

    if (rawLine && this._onLogLine) this._onLogLine(rawLine);
  }

  _scheduleRetry() {
    clearTimeout(this._retryTimer);
    this._setState('reconnecting');
    const delay = this._retryDelayMs;
    this._retryDelayMs = Math.min(this._retryDelayMs * 2, 10000);
    this._retryTimer = setTimeout(() => this._open(), delay);
  }

  _setState(state) {
    if (this._lastState !== state) {
      this._lastState = state;
      this._onState(state);
    }
  }
}
