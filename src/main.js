import * as R from "./rules.js";
import { KeeperClient, ollamaTransport, scriptedTransport } from "./keeper.js";

const $ = (id) => document.getElementById(id);
const prompt = await (await fetch("src/keeper_prompt.json")).json();

// ---------- settings ----------
const DEFAULTS = { mode: "model", host: "http://127.0.0.1:11434", model: "gemma4:e4b", timeout: 10 };
const STORE_KEY = "hgt-settings";
function loadSettings() {
  const s = { ...DEFAULTS };
  try { Object.assign(s, JSON.parse(localStorage.getItem(STORE_KEY) || "{}")); } catch { /* storage unavailable */ }
  const p = new URLSearchParams(location.search); // URL overrides are for this visit only
  for (const k of Object.keys(DEFAULTS)) if (p.has(k)) s[k] = k === "timeout" ? Number(p.get(k)) : p.get(k);
  s.timeout = Number(s.timeout) > 0 ? Number(s.timeout) : DEFAULTS.timeout;
  return s;
}
function saveSettings(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}
let settings = loadSettings();

// ---------- game state ----------
let world;
let keeper;
let lastPlayerText = null;
const STAGE_TEXT = { wary: "wary", cooperative: "willing to work with you", lets_guests_in: "letting guests in", let_go: "no longer waiting" };
const TRIGGERS = new Set(["repair_completed", "guest_arrived", "teahouse_restored", "guest_still_waiting", "lantern_noticed", "her_cup_served", "knot_untied"]);

const ACTION_TEXT = {
  none: "does nothing",
  stay_at_counter: "stays at the counter",
  walk_to_door: "walks to the door",
  prepare_tea: "prepares tea",
  invite_to_sit: "invites the guest inside to sit",
  greet_at_door: "greets the guest at the door",
  ask_guest_to_wait: "asks the guest to wait on the stone bench",
  ask_for_help: "asks you for help",
  stay_on: "chooses to stay",
  move_on: "chooses to move on",
};
const KIND = {
  applied: ["applied", "ok"], stale: ["stale, discarded", "warn"], timeout: ["timed out", "warn"],
  error: ["unreachable", "bad"], format: ["bad format", "bad"], bad_ref: ["bad reference", "bad"],
  bad_action: ["rule refused", "bad"], late: ["late, ignored", "warn"],
};
const DEGRADED_TEXT = {
  timeout: (r) => `No reply within ${settings.timeout}s, so the keeper stays silent.`,
  error: () => "The model could not be reached.",
  format: () => "The reply did not follow the required format.",
  bad_ref: () => "The reply pointed at events that are not in the log.",
  bad_action: (r) => `The keeper proposed something the rules do not allow (${r.why}).`,
};

function makeTransport() {
  return settings.mode === "scripted"
    ? scriptedTransport({ delayMs: 500 })
    : ollamaTransport({ host: settings.host, model: settings.model });
}

function newKeeper() {
  if (keeper) keeper.dispose();
  keeper = new KeeperClient({
    world, prompt, transport: makeTransport(), timeoutMs: settings.timeout * 1000, onUpdate,
  });
}

function newGame() {
  world = R.createWorld();
  lastPlayerText = null;
  newKeeper();
  $("log").replaceChildren();
  $("summary").hidden = true;
  setReplyMuted("The keeper watches you from behind the counter.");
  caption("Click things in the scene to look at them and repair them.");
  render();
}

// ---------- keeper updates ----------
function onUpdate(u) {
  if (u.type === "sent") {
    $("thinking").hidden = false;
    return;
  }
  if (u.type === "late") {
    logRow({ kind: "late", req: { ...u.req, seconds: null }, why: "arrived after the timeout" });
    return;
  }
  const r = u.result;
  $("thinking").hidden = !keeper.busy;
  logRow(r);
  if (r.kind === "applied") {
    showReply(r);
    if (r.events.some((e) => ["keeper_stayed", "keeper_moved_on", "knot_untied"].includes(e.kind))) showSummary(r);
    if (r.events.some((e) => e.kind === "knot_untied")) keeper.request({ reason: "knot_untied" });
  }
  else if (r.kind !== "stale") showDegraded(r);
  if (settings.mode === "model") setBadge(r.kind === "error" ? "down" : "model");
  render();
}

// ---------- player actions ----------
function caption(text) { $("caption").textContent = text; }

function afterEvents(events) {
  const reasons = events.filter((e) => TRIGGERS.has(e.kind)).map((e) => e.kind);
  if (reasons.length) keeper.request({ reasons });
  if (events.some((e) => e.kind === "teahouse_restored") && world.cup !== "served") {
    caption("Everything is mended. The crane cup is still in your hands.");
  }
  if (events.some((e) => ["guest_left", "guest_departed_quietly", "guest_still_waiting", "knot_untied"].includes(e.kind))) showSummary();
  render();
}

function act(fn, text) {
  const r = fn(world);
  caption(r.ok ? text : r.reason);
  if (r.ok) afterEvents(r.events);
}

function step(item, stepId, text, opts) {
  const r = R.doStep(world, item, stepId, opts);
  caption(r.ok ? text : r.reason);
  if (r.ok) afterEvents(r.events);
}

const HOT = {
  lamp() {
    const p = world.progress.lamp;
    if (p === 0) step("lamp", "raise", "You heave the fallen lamp post upright. It is cracked down the middle.");
    else if (p === 1) caption("The post stands, but the crack will not hold. The scrap wood by the door might.");
    else if (p === 2) step("lamp", "light", "You light the lamp. Its glow is pale and cold.");
    else caption("The lamp burns with a cold light. Something on the street has noticed.");
  },
  wood() {
    const p = world.progress.lamp;
    if (p === 1) step("lamp", "patch", "You brace the cracked post with scrap wood.");
    else caption("Scrap wood. It could brace something, if that something were standing.");
  },
  debris() {
    if (world.progress.seating === 0) step("seating", "clear", "You drag the broken crates away. Underneath lies an old celadon cup with a crane on it. You keep it.");
  },
  "spot-window"() { step("seating", "place", "You set a table and chairs by the window.", { spot: "window" }); },
  "spot-brazier"() { step("seating", "place", "You set a table and chairs by the cold brazier.", { spot: "brazier" }); },
  teaware() {
    if (world.progress.tea === 0) step("tea", "gather", "You gather the scattered cups. Most are only chipped.");
  },
  stove() {
    const p = world.progress.tea;
    if (p === 0) caption("A cracked clay stove. Its cups lie scattered across the floor.");
    else if (p === 1) step("tea", "fix_stove", "You pack the crack with clay. The stove holds.");
    else if (p === 2) step("tea", "set_and_fire", "You set out the cups and light the stove. The flame burns blue.");
    else if (world.cup === "empty") act(R.pourHerCup, "You pour tea into the crane cup. It is warm, but not too hot to hold.");
    else caption("The kettle mutters to itself.");
  },
  guest() {
    const g = world.guest;
    if (world.cup === "filled" && g.at === "seats") {
      act(R.serveHerCup, "You set the crane cup before her. Her hands close around it.");
    } else if (!g.lanternNoticed) {
      act(R.inspectGuest, "You look closer. She carries a small lantern, the same as the one by the door.");
    } else if (world.cup === "filled") {
      caption("She would need a seat inside before you could set a cup before her.");
    } else {
      caption("A quiet guest with a small lantern. She does not look at the keeper, and he does not look at her.");
    }
  },
  bench() {
    caption("A plain stone bench outside. Anyone may wait here; it is not part of the teahouse.");
  },
};

function say(text) {
  text = text.trim();
  if (!text) return;
  if (world.away) { caption("You are away from the teahouse."); return; }
  R.recordDialogue(world, text);
  lastPlayerText = text;
  $("said").textContent = `You: “${text}”`;
  keeper.request({ playerText: text });
  render();
}

// ---------- rendering ----------
function show(id, on) { $(id).toggleAttribute("hidden", !on); }
function opacity(id, v) { $(id).setAttribute("opacity", String(v)); }
function place(id, [x, y]) { $(id).setAttribute("transform", `translate(${x} ${y})`); }

const KEEPER_AT = { counter: [810, 262], tea: [880, 356], door: [395, 400] };
const GUEST_AT = { door: [300, 400], bench: [130, 445], window: [545, 384], brazier: [690, 458] };

function render() {
  const lamp = world.progress.lamp;
  const tea = world.progress.tea;
  const seat = world.progress.seating;
  const spot = world.seatingSpot;
  const life = world.ending === "stayed";

  show("lamp-fallen", lamp === 0);
  show("lamp-up", lamp >= 1);
  show("lamp-planks", lamp >= 2);
  opacity("lamp-light", lamp === 3 ? 0.9 : 0);
  opacity("lamp-glow", lamp === 3 ? 1 : 0);
  opacity("lamp-pool", lamp === 3 ? 1 : 0);
  $("scene").classList.toggle("lit", lamp === 3);
  show("wood", lamp < 2);

  show("debris", seat === 0);
  show("spot-window", seat === 1);
  show("spot-brazier", seat === 1);
  show("seats-window", seat === 2 && spot === "window");
  show("seats-brazier", seat === 2 && spot === "brazier");

  show("teaware-floor", tea === 0);
  show("stove-broken", tea < 2);
  show("stove-fixed", tea >= 2);
  show("teaware-set", tea === 3);
  opacity("stove-fire", tea === 3 ? 1 : 0);
  opacity("kettle-steam", tea === 3 ? 0.8 : 0);
  opacity("brazier-ember", life && spot === "brazier" ? 0.9 : 0);

  const g = world.guest;
  show("guest", g.present);
  if (g.present) place("guest", GUEST_AT[g.at === "seats" ? spot : g.at]);
  show("keeper", world.keeperAt !== "gone");
  if (world.keeperAt !== "gone") place("keeper", KEEPER_AT[world.keeperAt]);
  opacity("warm", world.letGo ? 1 : 0);
  show("left-cup", world.ending === "moved_on");
  show("shadow", life);
  show("tea-cup-window", g.served && g.at === "seats" && spot === "window");
  show("tea-cup-brazier", g.served && g.at === "seats" && spot === "brazier");

  if (g.present) {
    const [gx, gy] = GUEST_AT[g.at === "seats" ? spot : g.at];
    $("hot-guest").setAttribute("x", gx - 28); $("hot-guest").setAttribute("y", gy - 88);
  }
  show("crane-window", world.cup === "served" && spot === "window");
  show("crane-brazier", world.cup === "served" && spot === "brazier");
  const vis = {
    lamp: true, wood: lamp < 2, debris: seat === 0, "spot-window": seat === 1, "spot-brazier": seat === 1,
    teaware: tea === 0, stove: true, bench: true, guest: g.present && !world.ending,
  };
  const can = {
    lamp: lamp === 0 || lamp === 2, wood: lamp === 1, debris: seat === 0, "spot-window": seat === 1,
    "spot-brazier": seat === 1, teaware: tea === 0, stove: tea === 1 || tea === 2 || (tea === 3 && world.cup === "empty"),
    bench: false, guest: world.cup === "filled" && g.at === "seats",
  };
  for (const el of document.querySelectorAll(".hot")) {
    el.toggleAttribute("hidden", world.away || !vis[el.dataset.hot]);
    el.classList.toggle("can", !!can[el.dataset.hot]);
  }

  show("away", world.away);
  $("leave").hidden = world.away;
  $("return").hidden = !world.away;
  const done = R.ITEMS.filter((i) => R.isRepaired(world, i)).length;
  $("progress").textContent = `Repaired ${done} of 3 · the keeper is ${STAGE_TEXT[world.stage]}`;
  const over = !!world.ending;
  $("talk").disabled = world.away || over;
  for (const b of document.querySelectorAll("#quick button, #talk-form button")) b.disabled = world.away || over;
  const carry = { empty: "You carry: the crane cup (empty)", filled: "You carry: the crane cup, full of warm tea" }[world.cup];
  $("carry").hidden = !carry;
  $("carry").textContent = carry || "";
  $("leave").disabled = over;
}

function setReplyMuted(text) {
  const box = $("reply");
  box.replaceChildren();
  const said = document.createElement("p"); said.id = "said"; said.className = "said";
  const p = document.createElement("p"); p.className = "line muted"; p.textContent = text;
  box.append(said, p);
}

function replyFrame() {
  const box = $("reply");
  const said = $("said") ? $("said").textContent : "";
  box.replaceChildren();
  const s = document.createElement("p"); s.id = "said"; s.className = "said"; s.textContent = said;
  box.append(s);
  return box;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function showReply(r) {
  const box = replyFrame();
  box.append(el("p", "line", r.obj.line));
  const chips = el("div", "chips");
  chips.append(el("span", "chip", r.obj.attitude));
  chips.append(el("span", "chip act", `The keeper ${ACTION_TEXT[r.obj.action]}`));
  if (settings.mode === "scripted") chips.append(el("span", "chip scripted", "Scripted test reply, not the model"));
  box.append(chips);
  const rel = el("div", "related");
  rel.append(el("h3", null, "Related events (from the game's log)"));
  const ul = el("ul");
  for (const e of r.refs) ul.append(el("li", null, `#${e.id} ${R.describeEvent(e)}`));
  if (!r.refs.length) ul.append(el("li", null, "none"));
  rel.append(ul);
  box.append(rel);
}

function showDegraded(r) {
  const box = replyFrame();
  const d = el("div", "degraded");
  d.append(el("p", "line muted", "The keeper says nothing for now."));
  d.append(el("p", "why", `${DEGRADED_TEXT[r.kind](r)} Your repairs are kept. This is a fallback, not a model reply.`));
  if (r.kind === "timeout" || r.kind === "error") {
    const b = el("button", null, "Ask again");
    b.addEventListener("click", () => keeper.request({ playerText: r.req.playerText || null, reason: "retry" }));
    d.append(b);
  }
  if (r.raw !== undefined) {
    const det = el("details");
    det.append(el("summary", null, "Raw model output"), el("pre", null, String(r.raw)));
    d.append(det);
  }
  box.append(d);
}

function logRow(r) {
  const [label, cls] = KIND[r.kind];
  const tr = document.createElement("tr");
  tr.dataset.kind = r.kind;
  const cells = [
    String(r.req.id), String(r.req.sentVersion),
    r.req.seconds == null ? "—" : `${r.req.seconds.toFixed(1)}s`,
    label, r.obj ? r.obj.action : "—", r.why || "",
  ];
  cells.forEach((c, i) => { const td = el("td", i === 3 ? cls : null, c); tr.append(td); });
  $("log").prepend(tr);
}

const OUTCOME = {
  unresolved: ["The guest gave up and left. The teahouse is mended, but the keeper is still waiting at the door.", ""],
  unresolved_quiet: ["The guest finished an ordinary cup of tea and slipped away. The keeper never looked up. He is still waiting at the door.", ""],
  waiting: ["The guest is still waiting on the bench outside. It is not too late to receive them.", ""],
  let_go: ["The keeper saw the crane cup, and then he saw her. He has stopped waiting at the door. What comes next is his own choice.", "warm"],
  stayed: ["The keeper chose to stay. The teahouse is open again: still haunted, but warm.", "warm"],
  moved_on: ["The keeper chose to move on, and she went with him. The lamp is still lit, and the crane cup is still warm.", "warm"],
};

function outcomeKey() {
  if (world.ending) return world.ending;
  if (world.letGo) return "let_go";
  if (world.revisited && world.guest.waited) return "waiting";
  return null;
}

function showSummary(lastReply) {
  const body = $("summary-body");
  body.replaceChildren();
  const ev = world.events;
  const key = outcomeKey();
  if (key) {
    const [text, cls] = OUTCOME[key];
    body.append(el("p", "outcome " + cls, text));
    if ((key === "stayed" || key === "moved_on") && lastReply) {
      body.append(el("p", "muted-note", `The keeper's last words: “${lastReply.obj.line}”` +
        (settings.mode === "scripted" ? " (scripted test mode: this choice was not made by the model)" : " (chosen by the local model)")));
    }
  }
  body.append(el("h3", null, "Your repair order"));
  const ol = el("ol");
  for (const e of ev.filter((x) => x.kind === "repair_completed")) {
    ol.append(el("li", null, R.describeEvent(e) + (e.data.spot ? `, ${e.data.spot === "window" ? "by the window" : "by the brazier"}` : "")));
  }
  body.append(ol);
  body.append(el("h3", null, "How the keeper answered you"));
  const ul = el("ul");
  ev.forEach((e, i) => {
    if (e.kind !== "dialogue") return;
    const next = ev.slice(i + 1).find((x) => x.kind === "dialogue" || x.kind === "keeper_action");
    const act = next && next.kind === "keeper_action" ? `the keeper ${ACTION_TEXT[next.data.action]}` : "no action followed";
    ul.append(el("li", null, `You said “${e.data.text}” → ${act}`));
  });
  if (!ul.children.length) ul.append(el("li", null, "You never spoke to the keeper."));
  body.append(ul);
  body.append(el("h3", null, "What happened to the guest"));
  const gl = el("ul");
  for (const e of ev.filter((x) => ["guest_arrived", "lantern_noticed", "guest_served", "her_cup_served", "guest_still_waiting", "guest_left", "guest_departed_quietly"].includes(x.kind) ||
    (x.kind === "keeper_action" && ["greet_at_door", "ask_guest_to_wait", "invite_to_sit"].includes(x.data.action)))) {
    gl.append(el("li", null, R.describeEvent(e)));
  }
  body.append(gl);
  body.append(el("p", "muted-note", "Everything here is read from the game's event log."));
  $("summary").hidden = false;
}

// ---------- connection / mode ----------
function setBadge(state) {
  const b = $("mode-badge");
  b.className = "mode " + state;
  b.textContent = state === "scripted" ? "Scripted test mode, not a model"
    : state === "down" ? `Model unreachable: ${settings.model}`
    : `Local model: ${settings.model}`;
}

async function checkConnection() {
  const conn = $("conn");
  const banner = $("banner");
  if (settings.mode === "scripted") {
    setBadge("scripted");
    conn.className = "conn"; conn.textContent = "Scripted test mode: no model is used.";
    banner.hidden = true;
    return;
  }
  conn.className = "conn"; conn.textContent = "Checking…";
  try {
    const host = settings.host.replace(/\/+$/, "");
    const v = await (await fetch(host + "/api/version")).json();
    const tags = await (await fetch(host + "/api/tags")).json();
    const has = (tags.models || []).some((m) => m.name === settings.model || m.name === settings.model + ":latest");
    if (!has) throw new Error(`Ollama ${v.version} is running, but ${settings.model} is not installed. Run: ollama pull ${settings.model}`);
    conn.className = "conn ok"; conn.textContent = `Connected to Ollama ${v.version}; ${settings.model} is installed.`;
    setBadge("model");
    banner.hidden = true;
  } catch (e) {
    const msg = e instanceof TypeError
      ? `Cannot reach Ollama at ${settings.host}. Start Ollama, and open this page through http://localhost (not as a file).`
      : String(e.message || e);
    conn.className = "conn bad"; conn.textContent = msg;
    setBadge("down");
    banner.replaceChildren(el("span", null, msg));
    const b = el("button", null, "Play in scripted test mode");
    b.addEventListener("click", () => applySettings({ ...settings, mode: "scripted" }, false));
    banner.append(b);
    banner.hidden = false;
  }
}

function applySettings(next, persist = true) {
  settings = { ...next, timeout: Number(next.timeout) > 0 ? Number(next.timeout) : DEFAULTS.timeout };
  if (persist) saveSettings(settings);
  fillSettings();
  newKeeper(); // the old client is disposed: its pending reply can never apply
  checkConnection();
}

function fillSettings() {
  $("set-mode").value = settings.mode;
  $("set-host").value = settings.host;
  $("set-model").value = settings.model;
  $("set-timeout").value = settings.timeout;
}

// ---------- wiring ----------
for (const hot of document.querySelectorAll(".hot")) {
  const act = () => { if (!world.away) HOT[hot.dataset.hot](); };
  hot.addEventListener("click", act);
  hot.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
}
for (const q of ["Let them in.", "Ask them to wait a moment.", "Just ignore them.", "What do you need?"]) {
  const b = el("button", null, q);
  b.addEventListener("click", () => say(q));
  $("quick").append(b);
}
$("talk-form").addEventListener("submit", (e) => { e.preventDefault(); say($("talk").value); $("talk").value = ""; });
$("leave").addEventListener("click", () => { const r = R.leave(world); if (r.ok) { caption("You step out into the dark street."); render(); } });
$("return").addEventListener("click", () => {
  const r = R.returnToTeahouse(world);
  if (!r.ok) return;
  const gone = r.events.some((e) => e.kind === "guest_left");
  const waiting = r.events.some((e) => e.kind === "guest_still_waiting");
  caption(!R.isRestored(world) ? "You come back. Nothing has changed while you were gone."
    : gone ? "You come back. The guest is gone. The keeper stands at the door, still waiting."
    : waiting ? "You come back. The guest is still out on the bench, waiting to be let in."
    : "You come back. The teahouse is open: still haunted, but orderly.");
  afterEvents(r.events);
});
$("restart").addEventListener("click", newGame);
$("set-apply").addEventListener("click", () => applySettings({
  mode: $("set-mode").value, host: $("set-host").value.trim(), model: $("set-model").value.trim(), timeout: $("set-timeout").value,
}));
$("export").addEventListener("click", () => {
  const data = {
    exported_at: new Date().toISOString(), mode: settings.mode, model: settings.model, timeout_s: settings.timeout,
    events: world.events,
    replies: keeper.history.map(({ kind, why, obj, raw, req }) => ({ kind, why, obj, raw, req })),
  };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = `teahouse-session-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// ---------- prologue ----------
const PROLOGUE = [
  ["art/intro-1.png", "I went back to the village for my great-aunt's funeral. Among her things was an envelope with my name on it."],
  ["art/intro-2.png", "Inside: an old key, and a letter the rain had half washed away. “…someone has to go back, and put the teahouse in order… my crane cup… he will know it…”"],
  ["art/intro-3.png", "The town on the map had been empty for decades. The sign was still there. 候歸: awaiting return."],
  ["art/intro-4.png", "The door was already open. Someone behind the counter was waiting. Not for me."],
];
let introAt = 0;
function showIntroPanel() {
  const [src, text] = PROLOGUE[introAt];
  const img = $("intro-img");
  img.hidden = true;
  img.onload = () => { img.hidden = false; };
  img.onerror = () => { img.hidden = true; };
  img.src = src;
  const t = $("intro-text");
  t.textContent = text;
  t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
  $("intro-next").textContent = introAt === PROLOGUE.length - 1 ? "Enter the teahouse" : "Continue";
}
function openIntro() { introAt = 0; $("intro").hidden = false; showIntroPanel(); $("intro-next").focus(); }
function closeIntro() {
  $("intro").hidden = true;
  try { localStorage.setItem("hgt-intro-seen", "1"); } catch { /* storage unavailable */ }
}
$("intro-next").addEventListener("click", () => { if (++introAt >= PROLOGUE.length) closeIntro(); else showIntroPanel(); });
$("intro-skip").addEventListener("click", closeIntro);
$("replay-intro").addEventListener("click", openIntro);
function introSeen() { try { return localStorage.getItem("hgt-intro-seen") === "1"; } catch { return false; } }

fillSettings();
newGame();
checkConnection();
if (new URLSearchParams(location.search).get("intro") !== "0" && !introSeen()) openIntro();
window.__teahouse = { get world() { return world; }, get keeper() { return keeper; } }; // for automated checks
