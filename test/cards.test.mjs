import { test } from "node:test";
import assert from "node:assert/strict";
import { ITEMS, REPAIRS, applyKeeperAction, createWorld, doStep, inspectGuest, pourHerCup } from "../src/rules.js";
import { GLYPHS, handCards, keepsakeCards } from "../src/cards.js";

const ids = (w) => handCards(w).map((c) => c.id);
const repair = (w, item, spot = "window") => { for (const s of REPAIRS[item].steps) doStep(w, item, s.id, { spot }); };

test("the opening hand offers the first step of each repair", () => {
  assert.deepEqual(ids(createWorld()).sort(), ["lamp-raise", "seat-clear", "tea-gather"]);
});

test("every card names a known glyph and hotspot", () => {
  const w = createWorld();
  repair(w, "seating"); repair(w, "tea"); repair(w, "lamp");
  for (const c of [...handCards(w), ...keepsakeCards(w)]) assert.ok(GLYPHS[c.glyph], c.id);
});

test("the crane cup cards appear only when they can be played", () => {
  const w = createWorld();
  repair(w, "seating");
  assert.ok(!ids(w).includes("cup-pour"), "stove not working yet");
  repair(w, "tea");
  assert.ok(ids(w).includes("cup-pour"));
  pourHerCup(w);
  assert.ok(!ids(w).includes("cup-serve"), "no seated guest yet");
  repair(w, "lamp");
  assert.ok(ids(w).includes("guest-look"));
  inspectGuest(w);
  assert.ok(!ids(w).includes("guest-look"));
  applyKeeperAction(w, "invite_to_sit");
  assert.ok(ids(w).includes("cup-serve"));
});

test("keepsakes collect the clues the player has found", () => {
  const w = createWorld();
  assert.deepEqual(keepsakeCards(w).map((c) => c.id), ["letter"]);
  repair(w, "seating"); repair(w, "lamp"); inspectGuest(w);
  assert.deepEqual(keepsakeCards(w).map((c) => c.id), ["letter", "crane-cup", "lantern"]);
});

test("no cards while away or after the ending", () => {
  const w = createWorld();
  w.away = true;
  assert.equal(handCards(w).length, 0);
  for (const i of ITEMS) assert.ok(i);
});
