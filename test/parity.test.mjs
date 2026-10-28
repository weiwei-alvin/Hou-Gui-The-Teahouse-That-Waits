// The model-layer test (Python) must send the model exactly what the game would send.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { REPAIRS, createWorld, doStep, recordDialogue } from "../src/rules.js";
import { buildUserMessage } from "../src/keeper.js";

const prompt = JSON.parse(readFileSync(new URL("../src/keeper_prompt.json", import.meta.url), "utf8"));
const SCENARIOS = {
  A: [["lamp", "seating:window"], "The guest is still waiting at the door."],
  B: [["lamp", "tea"], "The guest is still waiting at the door."],
  C: [["tea", "seating:brazier", "lamp"], "Someone's at the door."],
  "E-wait-1": [["lamp"], "Ask them to wait a moment."],
};

function python() {
  for (const cmd of ["python3", "python"]) {
    try { execFileSync(cmd, ["--version"], { stdio: "ignore" }); return cmd; } catch { /* try next */ }
  }
  return null;
}
const py = python();

for (const [id, [items, player]] of Object.entries(SCENARIOS)) {
  test(`model test sends the same prompt as the game: scenario ${id}`, { skip: !py && "python not found" }, () => {
    const out = JSON.parse(execFileSync(py, ["tools/keeper_model_test.py", "--dump-scenario", id], { encoding: "utf8" }));
    const world = createWorld();
    for (const entry of items) {
      const [item, spot] = entry.split(":");
      for (const s of REPAIRS[item].steps) doStep(world, item, s.id, { spot });
    }
    recordDialogue(world, player);
    const game = buildUserMessage(world, prompt, { playerText: player });
    assert.equal(out.user, game.text);
  });
}
