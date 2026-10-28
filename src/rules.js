// World rules for the Hou Gui Teahouse.
// The rule system owns every fact. The model never writes here directly: it can only
// propose one action, which this module validates and executes, producing an event.

export const ITEMS = ["lamp", "tea", "seating"];

export const REPAIRS = {
  lamp: {
    name: "Door lamp",
    steps: [
      { id: "raise", label: "Raise the fallen lamp post" },
      { id: "patch", label: "Patch it with the scrap wood" },
      { id: "light", label: "Light the lamp" },
    ],
  },
  tea: {
    name: "Tea station",
    steps: [
      { id: "gather", label: "Gather the scattered teaware" },
      { id: "fix_stove", label: "Fix the clay stove" },
      { id: "set_and_fire", label: "Set the teaware and light the stove" },
    ],
  },
  seating: {
    name: "Waiting area",
    steps: [
      { id: "clear", label: "Clear the broken crates" },
      { id: "place", label: "Place the table and chairs" },
    ],
  },
};

export const SEAT_SPOTS = ["window", "brazier"];

export const STAGES = ["wary", "cooperative", "lets_guests_in"]; // 戒備 → 能合作 → 不再阻攔客人

export const ACTIONS = [
  "none",
  "stay_at_counter",
  "walk_to_door",
  "prepare_tea",
  "invite_to_sit",
  "greet_at_door",
  "ask_guest_to_wait",
  "ask_for_help",
];

// Actions the keeper may take in each stage (preconditions still apply on top).
const STAGE_ACTIONS = {
  wary: new Set(["none", "stay_at_counter", "ask_for_help"]),
  cooperative: new Set(ACTIONS),
  lets_guests_in: new Set(ACTIONS),
};

export function createWorld() {
  return {
    events: [],
    progress: { lamp: 0, tea: 0, seating: 0 },
    seatingSpot: null,
    stage: "wary",
    keeperAt: "counter", // counter | tea | door
    guest: { present: false, at: null, greeted: false, served: false }, // at: door | bench | seats
    teaReady: false,
    away: false,
  };
}

/** The state version is the number of events: it only ever grows. */
export function version(world) {
  return world.events.length;
}

function emit(world, kind, target, data = {}) {
  const event = { id: world.events.length + 1, kind, target, data };
  world.events.push(event);
  return event;
}

export function isRepaired(world, item) {
  return world.progress[item] >= REPAIRS[item].steps.length;
}

export function isRestored(world) {
  return ITEMS.every((item) => isRepaired(world, item));
}

export function nextStep(world, item) {
  if (isRepaired(world, item)) return null;
  return REPAIRS[item].steps[world.progress[item]];
}

function setStage(world, stage, emitted) {
  if (STAGES.indexOf(stage) <= STAGES.indexOf(world.stage)) return; // never backwards
  world.stage = stage;
  emitted.push(emit(world, "stage_changed", "keeper", { stage }));
}

/**
 * Player performs the next step of a repair. Returns { ok, reason?, events }.
 * Steps must go in order within an item; items can be done in any order.
 */
export function doStep(world, item, stepId, opts = {}) {
  if (!REPAIRS[item]) return { ok: false, reason: `unknown item: ${item}`, events: [] };
  if (world.away) return { ok: false, reason: "you are away from the teahouse", events: [] };
  const step = nextStep(world, item);
  if (!step) return { ok: false, reason: `${REPAIRS[item].name} is already repaired`, events: [] };
  if (step.id !== stepId) return { ok: false, reason: `next step is ${step.id}, not ${stepId}`, events: [] };
  if (item === "seating" && step.id === "place" && !SEAT_SPOTS.includes(opts.spot)) {
    return { ok: false, reason: "choose window or brazier", events: [] };
  }

  const emitted = [];
  world.progress[item] += 1;
  const data = { step: step.id };
  if (item === "seating" && step.id === "place") {
    world.seatingSpot = opts.spot;
    data.spot = opts.spot;
  }
  emitted.push(emit(world, "repair_step", item, data));

  if (isRepaired(world, item)) {
    emitted.push(emit(world, "repair_completed", item, item === "seating" ? { spot: world.seatingSpot } : {}));
    setStage(world, "cooperative", emitted);
    if (item === "lamp" && !world.guest.present) {
      // A lit lamp draws a guest from the street; without facilities they stop at the door.
      world.guest = { present: true, at: "door", greeted: false, served: false };
      emitted.push(emit(world, "guest_arrived", "guest", { at: "door" }));
    }
    if (isRestored(world)) {
      setStage(world, "lets_guests_in", emitted);
      emitted.push(emit(world, "teahouse_restored", "teahouse"));
    }
  }
  return { ok: true, events: emitted };
}

/** Why an action is not allowed right now, or null if it is. */
export function actionBlocker(world, action) {
  if (!ACTIONS.includes(action)) return `unknown action: ${action}`;
  if (!STAGE_ACTIONS[world.stage].has(action)) return `not allowed while the keeper is ${world.stage}`;
  if (world.away && action !== "none") return "the player is away";
  const g = world.guest;
  switch (action) {
    case "prepare_tea":
      return isRepaired(world, "tea") ? null : "tea station not repaired";
    case "invite_to_sit":
      if (!isRepaired(world, "seating")) return "waiting area not repaired";
      if (!g.present) return "no guest present";
      if (g.at === "seats") return "guest is already seated";
      return null;
    case "greet_at_door":
    case "ask_guest_to_wait":
      if (!g.present) return "no guest present";
      if (g.at === "seats") return "guest is already seated";
      return null;
    default:
      return null;
  }
}

/**
 * Execute a validated keeper action. This is the only path by which a model proposal
 * can change the world. Returns { ok, reason?, events }.
 */
export function applyKeeperAction(world, action) {
  const blocker = actionBlocker(world, action);
  if (blocker) return { ok: false, reason: blocker, events: [] };
  if (action === "none") return { ok: true, events: [] };
  const g = world.guest;
  const extra = [];
  switch (action) {
    case "stay_at_counter": world.keeperAt = "counter"; break;
    case "walk_to_door": world.keeperAt = "door"; break;
    case "greet_at_door":
      world.keeperAt = "door";
      g.at = "door";
      g.greeted = true;
      break;
    case "ask_guest_to_wait": g.at = "bench"; break;
    case "invite_to_sit":
      g.at = "seats";
      world.keeperAt = "counter";
      break;
    case "prepare_tea":
      world.keeperAt = "tea";
      world.teaReady = true;
      break;
    case "ask_for_help": break;
  }
  const events = [emit(world, "keeper_action", "keeper", { action })];
  if (world.teaReady && g.at === "seats" && !g.served) {
    g.served = true;
    extra.push(emit(world, "guest_served", "guest"));
  }
  return { ok: true, events: events.concat(extra) };
}

export function recordDialogue(world, text) {
  return emit(world, "dialogue", "player", { text: String(text).slice(0, 300) });
}

/** Leave the front hall. Takes no time and costs nothing. */
export function leave(world) {
  if (world.away) return { ok: false, reason: "already away", events: [] };
  world.away = true;
  return { ok: true, events: [emit(world, "player_left", "player")] };
}

/**
 * Return to the front hall. Once the teahouse is restored, the residents use what the
 * player built: the guest sits at the chosen spot and the keeper's shadow serves tea.
 */
export function returnToTeahouse(world) {
  if (!world.away) return { ok: false, reason: "not away", events: [] };
  world.away = false;
  const events = [emit(world, "player_returned", "player")];
  if (isRestored(world) && world.guest.present && !world.events.some((e) => e.kind === "life_resumed")) {
    world.guest.at = "seats";
    world.guest.greeted = true;
    world.guest.served = true;
    world.teaReady = true;
    world.keeperAt = "counter";
    events.push(emit(world, "life_resumed", "teahouse", { spot: world.seatingSpot }));
    events.push(emit(world, "guest_served", "guest"));
  }
  return { ok: true, events };
}

/** The state the model sees. No version: the game binds replies to its own requests. */
export function modelState(world) {
  return {
    keeper_stage: world.stage,
    repaired: Object.fromEntries(ITEMS.map((i) => [i, isRepaired(world, i)])),
    seating_spot: world.seatingSpot,
    guest_present: world.guest.present,
    guest_at: world.guest.at,
    keeper_at: world.keeperAt,
    tea_ready: world.teaReady,
  };
}

const NAMES = { lamp: "Door lamp", tea: "Tea station", seating: "Waiting area" };

/** Program-generated text for an event, shown under "Related events". */
export function describeEvent(e) {
  switch (e.kind) {
    case "repair_step": {
      const step = REPAIRS[e.target].steps.find((s) => s.id === e.data.step);
      return `${step ? step.label : e.data.step}${e.data.spot ? ` (${e.data.spot})` : ""}`;
    }
    case "repair_completed": return `${NAMES[e.target]} repaired`;
    case "stage_changed": return `The keeper became ${e.data.stage.replace(/_/g, " ")}`;
    case "guest_arrived": return "A guest arrived and stopped at the door";
    case "teahouse_restored": return "The teahouse was restored";
    case "dialogue": return `You said: "${e.data.text}"`;
    case "keeper_action": return `The keeper chose to ${e.data.action.replace(/_/g, " ")}`;
    case "guest_served": return "The guest was served tea";
    case "player_left": return "You stepped away";
    case "player_returned": return "You came back";
    case "life_resumed": return "Life returned to the teahouse";
    default: return e.kind;
  }
}
