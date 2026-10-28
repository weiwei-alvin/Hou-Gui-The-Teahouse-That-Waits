// The keeper's model link: builds the prompt, keeps one request in flight, binds each reply
// to the request that produced it, and passes only validated actions to the rule system.
import { applyKeeperAction, isRepaired, modelState, version } from "./rules.js";

export function buildSchema(prompt) {
  return {
    type: "object",
    properties: {
      attitude: { type: "string", enum: prompt.attitudes },
      line: { type: "string" },
      references: { type: "array", items: { type: "integer" }, maxItems: 2 },
      action: { type: "string", enum: Object.keys(prompt.actions) },
    },
    required: ["attitude", "line", "references", "action"],
  };
}

export function buildUserMessage(world, prompt, { playerText = null, reasons = [] } = {}) {
  const events = world.events.slice(-prompt.max_events_sent);
  const actions = Object.entries(prompt.actions).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  const tail = playerText
    ? `PLAYER SAYS: ${playerText}`
    : `PLAYER SAYS: (nothing). React briefly to the newest events (${reasons.join(", ") || "none"}).`;
  return {
    text: `STATE:\n${JSON.stringify(modelState(world))}\n\nEVENTS:\n${JSON.stringify(events)}\n\nACTIONS:\n${actions}\n\n${tail}`,
    sentIds: events.map((e) => e.id),
  };
}

/** Format and reference checks. Preconditions are checked by the rules when applying. */
export function validateReply(raw, { prompt, sentIds }) {
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { ok: false, kind: "format", why: "not JSON" };
  }
  const shapeOk = obj && typeof obj === "object" && !Array.isArray(obj) &&
    prompt.attitudes.includes(obj.attitude) && typeof obj.line === "string" && obj.line.trim() !== "" &&
    Array.isArray(obj.references) && Object.hasOwn(prompt.actions, obj.action);
  if (!shapeOk) return { ok: false, kind: "format", why: "does not match the schema", obj };
  const allowed = new Set(sentIds);
  const refs = obj.references;
  if (refs.length > 2 || !refs.every((id) => Number.isInteger(id) && allowed.has(id))) {
    return { ok: false, kind: "bad_ref", why: `references not among the events sent: ${JSON.stringify(refs)}`, obj };
  }
  return { ok: true, obj };
}

function freshQueue() {
  return { pending: false, playerText: null, reasons: new Set() };
}

export class KeeperClient {
  /**
   * transport: async ({ system, user, schema, signal, world, playerText, reasons }) => string (model JSON text)
   * onUpdate: called with { type: "sent" | "result" | "late", ... }
   */
  constructor({ world, prompt, transport, timeoutMs = 10000, onUpdate = () => {}, now = () => Date.now() }) {
    this.world = world;
    this.prompt = prompt;
    this.schema = buildSchema(prompt);
    this.transport = transport;
    this.timeoutMs = timeoutMs;
    this.onUpdate = onUpdate;
    this.now = now;
    this.inflight = null;
    this.queue = freshQueue();
    this.seq = 0;
    this.history = [];
  }

  get busy() {
    return this.inflight !== null;
  }

  /** Stop for good (e.g. when switching modes): any reply still on its way is never applied. */
  dispose() {
    const req = this.inflight;
    if (req) {
      req.dead = true;
      clearTimeout(req.timer);
      req.controller.abort();
    }
    this.inflight = null;
    this.queue = freshQueue();
    this.disposed = true;
  }

  /** Ask the keeper to respond. While a request is in flight, inputs are merged into one follow-up. */
  request({ playerText = null, reason = null, reasons = [] } = {}) {
    if (this.disposed) return;
    for (const r of [].concat(reason || [], reasons)) this.queue.reasons.add(r);
    if (playerText) this.queue.playerText = playerText;
    this.queue.pending = true;
    if (!this.inflight) this._sendQueued();
  }

  _sendQueued() {
    if (!this.queue.pending || this.inflight) return;
    const q = this.queue;
    this.queue = freshQueue();
    const reasons = [...q.reasons];
    const { text, sentIds } = buildUserMessage(this.world, this.prompt, { playerText: q.playerText, reasons });
    const req = {
      id: ++this.seq,
      sentVersion: version(this.world),
      sentIds,
      playerText: q.playerText,
      reasons,
      startedAt: this.now(),
      dead: false,
      controller: new AbortController(),
      timer: null,
    };
    this.inflight = req;
    this.onUpdate({ type: "sent", req: this._summary(req) });
    req.timer = setTimeout(() => this._timeout(req), this.timeoutMs);
    let call;
    try {
      call = Promise.resolve(this.transport({
        system: this.prompt.system, user: text, schema: this.schema, signal: req.controller.signal,
        world: this.world, playerText: q.playerText, reasons,
      }));
    } catch (err) {
      call = Promise.reject(err);
    }
    call.then((content) => this._reply(req, content), (err) => this._fail(req, err));
  }

  _summary(req) {
    return { id: req.id, sentVersion: req.sentVersion, playerText: req.playerText, reasons: req.reasons };
  }

  _timeout(req) {
    if (req.dead || this.inflight !== req) return;
    req.dead = true;
    req.controller.abort();
    this._finish(req, { kind: "timeout", why: `no reply within ${this.timeoutMs / 1000}s` });
  }

  _fail(req, err) {
    if (req.dead) return;
    clearTimeout(req.timer);
    req.dead = true;
    this._finish(req, { kind: "error", why: String((err && err.message) || err) });
  }

  _reply(req, content) {
    if (req.dead) {
      // Timed out earlier: a late reply is never applied.
      this.onUpdate({ type: "late", req: this._summary(req) });
      return;
    }
    clearTimeout(req.timer);
    req.dead = true;
    const now = version(this.world);
    if (now !== req.sentVersion) {
      // Whole reply discarded. Carry its inputs into the next request so nothing is lost.
      if (req.playerText && !this.queue.playerText) this.queue.playerText = req.playerText;
      req.reasons.forEach((r) => this.queue.reasons.add(r));
      this.queue.pending = true;
      return this._finish(req, { kind: "stale", why: `state changed (${req.sentVersion} → ${now})`, raw: content });
    }
    const v = validateReply(content, { prompt: this.prompt, sentIds: req.sentIds });
    if (!v.ok) return this._finish(req, { kind: v.kind, why: v.why, obj: v.obj, raw: content });
    const applied = applyKeeperAction(this.world, v.obj.action);
    if (!applied.ok) return this._finish(req, { kind: "bad_action", why: applied.reason, obj: v.obj, raw: content });
    const refs = v.obj.references.map((id) => this.world.events.find((e) => e.id === id));
    this._finish(req, { kind: "applied", obj: v.obj, refs, raw: content, events: applied.events });
  }

  _finish(req, result) {
    result.req = { ...this._summary(req), seconds: (this.now() - req.startedAt) / 1000 };
    this.inflight = null;
    this.history.push(result);
    this.onUpdate({ type: "result", result });
    this._sendQueued();
  }
}

/** Transport to a local Ollama server. */
export function ollamaTransport({ host, model }) {
  return async ({ system, user, schema, signal }) => {
    const res = await fetch(host.replace(/\/+$/, "") + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model, stream: false, format: schema, keep_alive: "10m",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal,
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return data && data.message ? data.message.content : "";
  };
}

/**
 * Scripted test mode: fixed rules pick the reply. Used to play and test without a model.
 * The UI must label these replies as scripted; they are never shown as model output.
 */
export function scriptedTransport({ delayMs = 300 } = {}) {
  const LINES = {
    greet_at_door: "I will meet them at the threshold.",
    ask_guest_to_wait: "Let them rest on the stone bench a while.",
    invite_to_sit: "Come in. There is a place for you now.",
    prepare_tea: "The kettle remembers its song.",
    stay_at_counter: "I will stay where I am.",
    ask_for_help: "Help me a little more, living one.",
    none: "…",
    stay_on: "I think I will keep the lamp lit a while longer.",
    move_on: "The road is open now. Keep the tea warm for me.",
  };
  return ({ world, playerText, reasons, signal }) => new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      const p = (playerText || "").toLowerCase();
      const g = world.guest;
      const guestOutside = g.present && g.at !== "seats";
      let action = "none";
      if (guestOutside && /wait|not ready|moment|bench/.test(p)) action = "ask_guest_to_wait";
      else if (guestOutside && /\b(sit|seat)\b/.test(p) && isRepaired(world, "seating")) action = "invite_to_sit";
      else if (guestOutside && /\b(let|welcome|greet|in|door)\b/.test(p)) action = "greet_at_door";
      else if (/ignore|leave them|stay/.test(p)) action = "stay_at_counter";
      else if (/tea/.test(p) && isRepaired(world, "tea")) action = "prepare_tea";
      else if (/help/.test(p)) action = "ask_for_help";
      const recent = world.events.slice(-12).reverse()
        .find((e) => ["repair_completed", "guest_arrived", "life_resumed"].includes(e.kind));
      if (world.letGo && !world.ending) action = /\b(go|free|rest|move on)\b/.test(p) ? "move_on" : "stay_on";
      let line = LINES[action];
      if (!playerText && reasons.includes("life_resumed")) line = "Sit. Drink. The house remembers how.";
      else if (!playerText && reasons.includes("guest_arrived")) line = "Someone stands in the new light.";
      else if (!playerText && reasons.includes("repair_completed")) line = "Something here feels less broken.";
      resolve(JSON.stringify({
        attitude: world.stage === "wary" ? "wary" : "guarded",
        line,
        references: recent ? [recent.id] : [],
        action,
      }));
    }, delayMs);
    if (signal) signal.addEventListener("abort", () => { clearTimeout(t); reject(new Error("aborted")); });
  });
}
