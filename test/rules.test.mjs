import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACTIONS, ITEMS, REPAIRS, SEAT_SPOTS, STAGES,
  actionBlocker, applyKeeperAction, createWorld, doStep, isRepaired, isRestored,
  leave, recordDialogue, returnToTeahouse, version,
} from "../src/rules.js";

const ORDERS = [
  ["lamp", "tea", "seating"], ["lamp", "seating", "tea"],
  ["tea", "lamp", "seating"], ["tea", "seating", "lamp"],
  ["seating", "lamp", "tea"], ["seating", "tea", "lamp"],
];

function repair(world, item, spot = "window") {
  for (const step of REPAIRS[item].steps) {
    const r = doStep(world, item, step.id, { spot });
    assert.equal(r.ok, true, `${item}/${step.id}: ${r.reason}`);
  }
}

function snapshot(world) {
  return JSON.parse(JSON.stringify({ progress: world.progress, seatingSpot: world.seatingSpot }));
}

for (const order of ORDERS) {
  for (const spot of SEAT_SPOTS) {
    test(`order ${order.join(" → ")} with seats by the ${spot} completes`, () => {
      const w = createWorld();
      let lastStage = 0;
      for (const item of order) {
        repair(w, item, spot);
        const s = STAGES.indexOf(w.stage);
        assert.ok(s >= lastStage, "stage never goes backwards");
        lastStage = s;
      }
      assert.equal(isRestored(w), true);
      assert.equal(w.stage, "lets_guests_in");
      assert.equal(w.seatingSpot, spot);
      assert.deepEqual(w.events.map((e) => e.id), w.events.map((_, i) => i + 1), "event ids increase by one");
      assert.equal(version(w), w.events.length);
      assert.equal(w.events.filter((e) => e.kind === "guest_arrived").length, 1);
      const lampDone = w.events.findIndex((e) => e.kind === "repair_completed" && e.target === "lamp");
      const arrived = w.events.findIndex((e) => e.kind === "guest_arrived");
      assert.ok(arrived > lampDone, "guest arrives only after the lamp is lit");
      // Revisit: residents use what the player built.
      assert.equal(leave(w).ok, true);
      const back = returnToTeahouse(w);
      assert.equal(back.ok, true);
      assert.ok(back.events.some((e) => e.kind === "life_resumed"));
      assert.equal(w.guest.at, "seats");
      assert.equal(w.guest.served, true);
    });
  }
}

test("steps must follow their order within an item", () => {
  const w = createWorld();
  const before = version(w);
  const r = doStep(w, "lamp", "light");
  assert.equal(r.ok, false);
  assert.equal(version(w), before, "a rejected step adds no event");
  assert.equal(w.progress.lamp, 0);
});

test("placing furniture needs a legal spot", () => {
  const w = createWorld();
  doStep(w, "seating", "clear");
  assert.equal(doStep(w, "seating", "place").ok, false);
  assert.equal(doStep(w, "seating", "place", { spot: "roof" }).ok, false);
  assert.equal(doStep(w, "seating", "place", { spot: "brazier" }).ok, true);
});

test("a completed repair cannot be repeated or undone", () => {
  const w = createWorld();
  repair(w, "lamp");
  const before = snapshot(w);
  assert.equal(doStep(w, "lamp", "raise").ok, false);
  assert.equal(doStep(w, "lamp", "light").ok, false);
  assert.deepEqual(snapshot(w), before);
});

test("no keeper action changes repairs, furniture or history", () => {
  for (const order of ORDERS) {
    const w = createWorld();
    for (const item of order) {
      repair(w, item);
      for (const action of ACTIONS) {
        const before = snapshot(w);
        const history = JSON.stringify(w.events);
        const r = applyKeeperAction(w, action);
        assert.deepEqual(snapshot(w), before, `${action} must not touch repairs`);
        assert.ok(JSON.stringify(w.events).startsWith(history.slice(0, -1)), "existing events are never rewritten");
        for (const e of r.events) assert.ok(["keeper_action", "guest_served"].includes(e.kind));
      }
    }
  }
});

test("preconditions are enforced by the rules", () => {
  const w = createWorld();
  assert.match(actionBlocker(w, "greet_at_door"), /not allowed while the keeper is wary/);
  repair(w, "seating");
  assert.match(actionBlocker(w, "prepare_tea"), /tea station not repaired/);
  assert.match(actionBlocker(w, "invite_to_sit"), /no guest present/);
  assert.match(actionBlocker(w, "ask_guest_to_wait"), /no guest present/);
  assert.match(actionBlocker(w, "fly_away"), /unknown action/);
  repair(w, "lamp");
  assert.equal(actionBlocker(w, "invite_to_sit"), null);
  const r = applyKeeperAction(w, "prepare_tea");
  assert.equal(r.ok, false);
  assert.equal(w.keeperAt, "counter");
});

test("the three guest intents end in three different places", () => {
  const base = () => { const w = createWorld(); repair(w, "lamp"); repair(w, "seating"); return w; };
  const wait = base(); applyKeeperAction(wait, "ask_guest_to_wait");
  const greet = base(); applyKeeperAction(greet, "greet_at_door");
  const sit = base(); applyKeeperAction(sit, "invite_to_sit");
  assert.deepEqual([wait.guest.at, wait.keeperAt], ["bench", "counter"]);
  assert.deepEqual([greet.guest.at, greet.keeperAt], ["door", "door"]);
  assert.deepEqual([sit.guest.at, sit.keeperAt], ["seats", "counter"]);
});

test("the stone bench does not stand in for the repaired waiting area", () => {
  const w = createWorld();
  repair(w, "lamp");
  applyKeeperAction(w, "ask_guest_to_wait");
  assert.equal(w.guest.at, "bench");
  assert.equal(isRepaired(w, "seating"), false);
  assert.match(actionBlocker(w, "invite_to_sit"), /waiting area not repaired/);
});

test("repair order changes what happens: lamp first vs tea first", () => {
  const lampFirst = createWorld(); repair(lampFirst, "lamp");
  const teaFirst = createWorld(); repair(teaFirst, "tea");
  assert.equal(lampFirst.guest.present, true, "lamp first: a guest is waiting with no tea");
  assert.match(actionBlocker(lampFirst, "prepare_tea"), /not repaired/);
  assert.equal(teaFirst.guest.present, false, "tea first: no guest yet");
  assert.equal(actionBlocker(teaFirst, "prepare_tea"), null, "tea first: the keeper can work");
});

test("tea is served when the guest is seated and tea is ready", () => {
  const w = createWorld();
  repair(w, "lamp"); repair(w, "seating"); repair(w, "tea");
  applyKeeperAction(w, "prepare_tea");
  const r = applyKeeperAction(w, "invite_to_sit");
  assert.ok(r.events.some((e) => e.kind === "guest_served"));
});

test("leaving and returning before restoration keeps the world as it was", () => {
  const w = createWorld();
  repair(w, "lamp");
  const before = snapshot(w);
  leave(w);
  assert.equal(doStep(w, "tea", "gather").ok, false, "no repairs while away");
  returnToTeahouse(w);
  assert.deepEqual(snapshot(w), before);
  assert.equal(w.guest.at, "door");
});

test("dialogue is recorded as an event and never changes repairs", () => {
  const w = createWorld();
  const before = snapshot(w);
  const e = recordDialogue(w, "You promised to help me");
  assert.equal(e.kind, "dialogue");
  assert.deepEqual(snapshot(w), before);
  assert.ok(ITEMS.every((i) => !isRepaired(w, i)));
});
