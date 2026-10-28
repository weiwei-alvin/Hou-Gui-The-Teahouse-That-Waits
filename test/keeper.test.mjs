import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ACTIONS, REPAIRS, createWorld, doStep, recordDialogue, version } from "../src/rules.js";
import { KeeperClient, buildSchema, scriptedTransport, validateReply } from "../src/keeper.js";

const prompt = JSON.parse(readFileSync(new URL("../src/keeper_prompt.json", import.meta.url), "utf8"));

function repair(world, item, spot = "window") {
  for (const s of REPAIRS[item].steps) doStep(world, item, s.id, { spot });
}

/** A transport whose replies the test resolves by hand. */
function manualTransport() {
  const calls = [];
  const transport = (args) => new Promise((resolve, reject) => {
    calls.push({ args, resolve, reject });
    args.signal.addEventListener("abort", () => reject(new Error("aborted")));
  });
  return { transport, calls };
}

const reply = (o) => JSON.stringify({ attitude: "guarded", line: "Hm.", references: [], action: "none", ...o });
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

function setup(timeoutMs = 1000) {
  const world = createWorld();
  repair(world, "lamp"); // guest waiting at the door
  const { transport, calls } = manualTransport();
  const results = [];
  const late = [];
  const keeper = new KeeperClient({
    world, prompt, transport, timeoutMs,
    onUpdate: (u) => { if (u.type === "result") results.push(u.result); if (u.type === "late") late.push(u); },
  });
  return { world, keeper, calls, results, late };
}

test("prompt actions match the rule system exactly", () => {
  assert.deepEqual(Object.keys(prompt.actions).sort(), [...ACTIONS].sort());
  assert.equal("state_version" in buildSchema(prompt).properties, false, "the model never reports a version");
});

test("a valid reply runs its action through the rules", async () => {
  const { world, keeper, calls, results } = setup();
  recordDialogue(world, "Ask them to wait.");
  keeper.request({ playerText: "Ask them to wait." });
  const arrived = world.events.find((e) => e.kind === "guest_arrived");
  calls[0].resolve(reply({ action: "ask_guest_to_wait", references: [arrived.id] }));
  await tick();
  assert.equal(results[0].kind, "applied");
  assert.equal(world.guest.at, "bench");
  assert.equal(results[0].refs[0].kind, "guest_arrived", "related events come from the log");
  assert.equal(world.events.at(-1).kind, "keeper_action");
});

test("a reply for an older state is discarded whole and the request is resent", async () => {
  const { world, keeper, calls, results } = setup();
  recordDialogue(world, "Let them in.");
  keeper.request({ playerText: "Let them in." });
  doStep(world, "tea", "gather"); // player keeps repairing while waiting
  const before = version(world);
  calls[0].resolve(reply({ action: "greet_at_door", line: "Coming." }));
  await tick();
  assert.equal(results[0].kind, "stale");
  assert.equal(version(world), before, "nothing from the stale reply was applied");
  assert.equal(world.guest.greeted, false);
  assert.equal(calls.length, 2, "one follow-up request with the latest state");
  assert.equal(calls[1].args.playerText, "Let them in.", "the player's words are carried over");
  calls[1].resolve(reply({ action: "greet_at_door" }));
  await tick();
  assert.equal(results[1].kind, "applied");
  assert.equal(world.guest.greeted, true);
});

test("a timed-out request is dead: its late reply is never applied", async () => {
  const world = createWorld();
  repair(world, "lamp");
  let resolveLate;
  const late = [];
  const results = [];
  const keeper = new KeeperClient({
    world, prompt, timeoutMs: 30,
    transport: () => new Promise((r) => { resolveLate = r; }), // ignores abort, answers late
    onUpdate: (u) => { if (u.type === "result") results.push(u.result); if (u.type === "late") late.push(u); },
  });
  keeper.request({ reason: "guest_arrived" });
  await tick(60);
  assert.equal(results[0].kind, "timeout");
  assert.equal(keeper.busy, false, "the game is not blocked after a timeout");
  const before = version(world);
  resolveLate(reply({ action: "greet_at_door" }));
  await tick();
  assert.equal(version(world), before);
  assert.equal(world.guest.greeted, false);
  assert.equal(late.length, 1);
  assert.equal(doStep(world, "tea", "gather").ok, true, "repairs still work");
});

test("only one request is in flight; inputs during the wait merge into one follow-up", async () => {
  const { world, keeper, calls, results } = setup();
  keeper.request({ reason: "repair_completed" });
  for (const t of ["one", "two", "three"]) keeper.request({ playerText: t });
  keeper.request({ reason: "guest_arrived" });
  assert.equal(calls.length, 1);
  assert.equal(keeper.busy, true);
  calls[0].resolve(reply({}));
  await tick();
  assert.equal(results[0].kind, "applied");
  assert.equal(calls.length, 2);
  assert.equal(calls[1].args.playerText, "three", "the latest words win");
  assert.deepEqual(calls[1].args.reasons, ["guest_arrived"]);
  assert.ok(!world.events.some((e) => e.kind === "dialogue"), "client never records dialogue by itself");
});

test("references must exist among the events that were sent", async () => {
  const { keeper, calls, results } = setup();
  keeper.request({ reason: "x" });
  calls[0].resolve(reply({ references: [999] }));
  await tick();
  assert.equal(results[0].kind, "bad_ref");
  const sent = calls[0].args.user;
  assert.ok(sent.includes("EVENTS:"));
});

test("events outside the window sent to the model cannot be cited", () => {
  const w = createWorld();
  for (let i = 0; i < 40; i++) recordDialogue(w, `line ${i}`);
  const sentIds = w.events.slice(-prompt.max_events_sent).map((e) => e.id);
  const r = validateReply(reply({ references: [1] }), { prompt, sentIds });
  assert.equal(r.ok, false);
  assert.equal(r.kind, "bad_ref");
});

test("malformed replies degrade without touching the world", async () => {
  const bad = ["not json", "[]", reply({ attitude: "furious" }), reply({ action: "fly" }), reply({ line: "" }),
    JSON.stringify({ line: "x", references: [], action: "none" })];
  for (const raw of bad) {
    const { world, keeper, calls, results } = setup();
    const before = version(world);
    keeper.request({ reason: "x" });
    calls[0].resolve(raw);
    await tick();
    assert.equal(results[0].kind, "format", raw);
    assert.equal(version(world), before);
  }
});

test("an action that breaks a precondition is refused by the rules", async () => {
  const { world, keeper, calls, results } = setup();
  keeper.request({ playerText: "Seat them." });
  calls[0].resolve(reply({ action: "invite_to_sit" }));
  await tick();
  assert.equal(results[0].kind, "bad_action");
  assert.match(results[0].why, /waiting area not repaired/);
  assert.equal(world.guest.at, "door");
});

test("a version the model makes up is ignored; binding is by request", async () => {
  const { world, keeper, calls, results } = setup();
  keeper.request({ reason: "x" });
  doStep(world, "tea", "gather");
  calls[0].resolve(reply({ action: "greet_at_door", state_version: version(world) }));
  await tick();
  assert.equal(results[0].kind, "stale");
});

test("transport errors degrade and the game continues", async () => {
  const { world, keeper, calls, results } = setup();
  keeper.request({ reason: "x" });
  calls[0].reject(new Error("connection refused"));
  await tick();
  assert.equal(results[0].kind, "error");
  assert.equal(keeper.busy, false);
  assert.equal(doStep(world, "tea", "gather").ok, true);
});

test("after dispose (mode switch) a pending reply is never applied", async () => {
  const { world, keeper, calls } = setup();
  keeper.request({ playerText: "Let them in." });
  const before = version(world);
  keeper.dispose();
  calls[0].resolve(reply({ action: "greet_at_door" }));
  await tick();
  assert.equal(version(world), before);
  keeper.request({ reason: "x" });
  assert.equal(calls.length, 1, "a disposed client sends nothing");
});

test("scripted test mode maps the three intents to three actions", async () => {
  const intents = { "Ask them to wait a moment.": "ask_guest_to_wait", "Let them in.": "greet_at_door", "Just ignore them.": "stay_at_counter" };
  for (const [text, action] of Object.entries(intents)) {
    const world = createWorld();
    repair(world, "lamp");
    const results = [];
    const keeper = new KeeperClient({
      world, prompt, transport: scriptedTransport({ delayMs: 1 }), timeoutMs: 500,
      onUpdate: (u) => { if (u.type === "result") results.push(u.result); },
    });
    recordDialogue(world, text);
    keeper.request({ playerText: text });
    await tick(20);
    assert.equal(results[0].kind, "applied", text);
    assert.equal(results[0].obj.action, action, text);
  }
});
