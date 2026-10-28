import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACTIONS, ENDING_ACTIONS, ITEMS, REPAIRS, SEAT_SPOTS, STAGES,
  actionBlocker, applyKeeperAction, createWorld, doStep, isRepaired, isRestored,
  inspectGuest, leave, pourHerCup, recordDialogue, returnToTeahouse, serveHerCup, version,
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
        if (item === "lamp") assert.equal(applyKeeperAction(w, "greet_at_door").ok, true, "receive the guest");
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
      // The knot: seat her, pour her crane cup, set it before her.
      assert.equal(w.letGo, false, "restoring and receiving alone do not untie the knot");
      assert.equal(applyKeeperAction(w, "invite_to_sit").ok, true);
      assert.equal(pourHerCup(w).ok, true);
      const served = serveHerCup(w);
      assert.equal(served.ok, true);
      assert.ok(served.events.some((e) => e.kind === "knot_untied"), "her own cup → let go");
      assert.equal(w.stage, "let_go");
      const choice = spot === "window" ? "stay_on" : "move_on";
      assert.equal(applyKeeperAction(w, choice).ok, true);
      assert.equal(w.ending, choice === "stay_on" ? "stayed" : "moved_on");
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

function restoredWith(treat) {
  const w = createWorld();
  repair(w, "lamp");
  if (treat) assert.equal(applyKeeperAction(w, treat).ok, true);
  repair(w, "tea"); repair(w, "seating");
  leave(w);
  const back = returnToTeahouse(w);
  return { w, back };
}

function freeKeeper() {
  const w = createWorld();
  for (const item of ITEMS) repair(w, item);
  applyKeeperAction(w, "invite_to_sit");
  pourHerCup(w);
  serveHerCup(w);
  return w;
}

test("an ignored guest leaves, and the keeper keeps waiting: no letting go", () => {
  const { w, back } = restoredWith(null);
  assert.ok(back.events.some((e) => e.kind === "guest_left"));
  assert.equal(w.guest.present, false);
  assert.equal(w.letGo, false);
  assert.equal(w.ending, "unresolved");
  assert.equal(w.keeperAt, "door");
  for (const a of ENDING_ACTIONS) assert.match(actionBlocker(w, a), /story has ended/);
});

test("a received guest who never got her own cup slips away quietly", () => {
  const { w, back } = restoredWith("greet_at_door");
  assert.ok(back.events.some((e) => e.kind === "guest_departed_quietly"));
  assert.equal(w.ending, "unresolved_quiet");
  assert.equal(w.letGo, false);
});

test("a guest who only waited is still there on return, and the cup can still reach her", () => {
  const { w, back } = restoredWith("ask_guest_to_wait");
  assert.ok(back.events.some((e) => e.kind === "guest_still_waiting"));
  assert.equal(w.guest.at, "bench");
  assert.equal(applyKeeperAction(w, "invite_to_sit").ok, true);
  assert.equal(pourHerCup(w).ok, true);
  assert.ok(serveHerCup(w).events.some((e) => e.kind === "knot_untied"));
});

test("the cup puzzle: found under the crates, filled only at a working stove, served only when seated", () => {
  const w = createWorld();
  assert.match(pourHerCup(w).reason, /no cup/);
  repair(w, "seating");
  assert.equal(w.cup, "empty");
  assert.ok(w.events.some((e) => e.kind === "cup_found"));
  assert.match(pourHerCup(w).reason, /stove/);
  repair(w, "tea");
  assert.equal(pourHerCup(w).ok, true);
  assert.match(pourHerCup(w).reason, /already full/);
  assert.match(serveHerCup(w).reason, /seated first/);
  repair(w, "lamp");
  assert.match(serveHerCup(w).reason, /seated first/, "at the door is not seated");
  applyKeeperAction(w, "invite_to_sit");
  assert.equal(serveHerCup(w).ok, true);
  assert.equal(w.letGo, true);
});

test("talking alone never unties the knot", () => {
  const w = createWorld();
  for (const item of ITEMS) repair(w, item);
  applyKeeperAction(w, "invite_to_sit");
  for (const t of ["She is the one you waited for.", "Let go.", "You are free now."]) recordDialogue(w, t);
  for (const a of ACTIONS) applyKeeperAction(w, a);
  assert.equal(w.letGo, false);
});

test("looking closely at the guest notices her lantern once", () => {
  const w = createWorld();
  assert.equal(inspectGuest(w).ok, false);
  repair(w, "lamp");
  assert.equal(inspectGuest(w).events[0].kind, "lantern_noticed");
  assert.equal(inspectGuest(w).events.length, 0);
});

test("stay or move on is only possible after letting go, and only once", () => {
  const w = createWorld();
  for (const item of ITEMS) repair(w, item);
  for (const a of ENDING_ACTIONS) assert.match(actionBlocker(w, a), /not let go yet/);
  const free = freeKeeper();
  assert.equal(free.letGo, true);
  assert.match(actionBlocker(free, "greet_at_door"), /not allowed while the keeper is let_go/, "after letting go, only the choice remains");
  assert.equal(applyKeeperAction(free, "move_on").ok, true);
  assert.equal(free.keeperAt, "gone");
  assert.equal(free.guest.present, false, "she goes with him");
  assert.match(actionBlocker(free, "stay_on"), /story has ended/);
});
