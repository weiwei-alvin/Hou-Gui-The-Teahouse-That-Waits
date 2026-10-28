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

export const STAGES = ["wary", "cooperative", "lets_guests_in", "let_go"]; // 戒備 → 能合作 → 不再阻攔客人 → 放下

export const ACTIONS = [
  "none",
  "stay_at_counter",
  "walk_to_door",
  "prepare_tea",
  "invite_to_sit",
  "greet_at_door",
  "ask_guest_to_wait",
  "ask_for_help",
  "stay_on",
  "move_on",
];

// Only once the keeper has let go: what to do with that freedom is the keeper's own choice.
export const ENDING_ACTIONS = ["stay_on", "move_on"];
const WORKING_ACTIONS = ACTIONS.filter((a) => !ENDING_ACTIONS.includes(a));

// Actions the keeper may take in each stage (preconditions still apply on top).
const STAGE_ACTIONS = {
  wary: new Set(["none", "stay_at_counter", "ask_for_help"]),
  cooperative: new Set(WORKING_ACTIONS),
  lets_guests_in: new Set(WORKING_ACTIONS),
  let_go: new Set(["none", ...ENDING_ACTIONS]),
};

export function createWorld() {
  return {
    events: [],
    progress: { lamp: 0, tea: 0, seating: 0 },
    seatingSpot: null,
    stage: "wary",
    keeperAt: "counter", // counter | tea | door | gone
    // at: door | bench | seats. received = greeted at the door or seated; waited = asked to wait.
    guest: {
      present: false, at: null, greeted: false, served: false, received: false, waited: false, left: false,
      lanternNoticed: false, // the player looked closely and saw her lantern
      herCup: false, // served tea in the crane cup
    },
    cup: null, // null | "empty" | "filled" | "served": the crane cup found under the crates
    teaReady: false,
    away: false,
    revisited: false, // came back after the teahouse was restored
    letGo: false, // the keeper's knot is untied (decided by these rules, never by the model)
    ending: null, // null | "stayed" | "moved_on" | "unresolved" | "unresolved_quiet"
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
  if (item === "seating" && step.id === "clear") {
    world.cup = "empty";
    emitted.push(emit(world, "cup_found", "cup"));
  }

  if (isRepaired(world, item)) {
    emitted.push(emit(world, "repair_completed", item, item === "seating" ? { spot: world.seatingSpot } : {}));
    setStage(world, "cooperative", emitted);
    if (item === "lamp" && !world.guest.present) {
      // A lit lamp draws a guest from the street; without facilities they stop at the door.
      world.guest = { ...world.guest, present: true, at: "door" };
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
  if (world.ending && action !== "none") return "the story has ended";
  if (ENDING_ACTIONS.includes(action) && !world.letGo) return "the keeper has not let go yet";
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
      g.received = true;
      break;
    case "ask_guest_to_wait":
      g.at = "bench";
      g.waited = true;
      break;
    case "invite_to_sit":
      g.at = "seats";
      g.received = true;
      world.keeperAt = "counter";
      break;
    case "stay_on":
      world.ending = "stayed";
      world.keeperAt = "counter";
      break;
    case "move_on":
      world.ending = "moved_on";
      world.keeperAt = "gone";
      g.present = false; // she goes with him
      g.at = null;
      break;
    case "prepare_tea":
      world.keeperAt = "tea";
      world.teaReady = true;
      break;
    case "ask_for_help": break;
  }
  const events = [emit(world, "keeper_action", "keeper", { action })];
  if (action === "stay_on") extra.push(emit(world, "keeper_stayed", "keeper"));
  if (action === "move_on") extra.push(emit(world, "keeper_moved_on", "keeper"));
  if (world.teaReady && g.at === "seats" && !g.served) {
    g.served = true;
    extra.push(emit(world, "guest_served", "guest"));
  }
  checkKnot(world, extra);
  return { ok: true, events: events.concat(extra) };
}

/**
 * The keeper lets go only when the rules say so: the guest has been served tea in her own
 * crane cup. Talking cannot do it, and the model never decides it.
 */
function checkKnot(world, emitted) {
  if (world.letGo || world.ending || world.away) return;
  if (!world.guest.herCup) return;
  world.letGo = true;
  setStage(world, "let_go", emitted);
  emitted.push(emit(world, "knot_untied", "keeper"));
}

// ---------- the player's own hands: look, pour, serve ----------

/** Look closely at the guest. */
export function inspectGuest(world) {
  const g = world.guest;
  if (world.away || !g.present) return { ok: false, reason: "there is no one to look at", events: [] };
  if (g.lanternNoticed) return { ok: true, events: [] };
  g.lanternNoticed = true;
  return { ok: true, events: [emit(world, "lantern_noticed", "guest")] };
}

/** Pour tea into the crane cup. Needs the cup and a working, lit stove. */
export function pourHerCup(world) {
  if (world.away) return { ok: false, reason: "you are away from the teahouse", events: [] };
  if (!world.cup) return { ok: false, reason: "you have no cup of your own to fill", events: [] };
  if (world.cup !== "empty") return { ok: false, reason: "the crane cup is already full", events: [] };
  if (!isRepaired(world, "tea")) return { ok: false, reason: "the stove is not working yet", events: [] };
  world.cup = "filled";
  return { ok: true, events: [emit(world, "cup_filled", "cup")] };
}

/** Set the crane cup before the seated guest. */
export function serveHerCup(world) {
  const g = world.guest;
  if (world.away || world.ending) return { ok: false, reason: "not now", events: [] };
  if (world.cup !== "filled") return { ok: false, reason: "the crane cup is empty", events: [] };
  if (!g.present || g.at !== "seats") return { ok: false, reason: "the guest has to be seated first", events: [] };
  world.cup = "served";
  g.herCup = true;
  const events = [emit(world, "her_cup_served", "guest")];
  checkKnot(world, events);
  return { ok: true, events };
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
  if (isRestored(world) && !world.revisited && !world.letGo) {
    world.revisited = true;
    const g = world.guest;
    if (g.received) {
      // Received, but never given her own cup: she drinks an ordinary tea and slips away.
      g.present = false;
      g.at = null;
      g.left = true;
      world.keeperAt = "door";
      world.ending = "unresolved_quiet";
      events.push(emit(world, "guest_departed_quietly", "guest"));
    } else if (g.waited) {
      // Asked to wait, never received: still waiting on the bench. It is not too late.
      events.push(emit(world, "guest_still_waiting", "guest"));
    } else {
      // Ignored the whole time: the guest has gone, and the keeper keeps waiting at the door.
      g.present = false;
      g.at = null;
      g.left = true;
      world.keeperAt = "door";
      world.ending = "unresolved";
      events.push(emit(world, "guest_left", "guest"));
    }
    checkKnot(world, events);
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
    let_go: world.letGo,
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
    case "guest_still_waiting": return "The guest was still waiting on the bench";
    case "guest_departed_quietly": return "The guest finished her tea and left quietly";
    case "cup_found": return "Under the crates you found an old celadon cup with a crane on it";
    case "lantern_noticed": return "The guest carries a small lantern, the same as the one by the door";
    case "cup_filled": return "You poured tea into the crane cup";
    case "her_cup_served": return "You set the crane cup before the guest";
    case "guest_left": return "The guest had given up and left";
    case "knot_untied": return "The keeper stopped waiting at the door";
    case "keeper_stayed": return "The keeper chose to stay";
    case "keeper_moved_on": return "The keeper moved on, and the guest went with him";
    default: return e.kind;
  }
}
