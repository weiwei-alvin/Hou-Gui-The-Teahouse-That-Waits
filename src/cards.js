// Card view of what the player can do right now. Pure: reads the world, never changes it.
// Each action card maps to a scene hotspot handler in main.js, so cards and hotspots share one path.
import { isRepaired } from "./rules.js";

// Simple glyphs drawn inside the card's arch (viewBox 0 0 40 40).
export const GLYPHS = {
  lamp: "M20 6 L26 12 L14 12 Z M15 12 H25 V24 H15 Z M20 24 V36",
  wood: "M8 14 L32 10 M8 22 L32 18 M8 30 L32 26",
  flame: "M20 6 C28 16 28 24 20 34 C12 24 12 16 20 6 Z M20 20 C23 25 23 28 20 32 C17 28 17 25 20 20 Z",
  crate: "M8 12 H32 V32 H8 Z M8 12 L32 32 M32 12 L8 32",
  chair: "M12 8 V32 M12 20 H28 V32 M28 20 V8",
  cup: "M10 14 H28 V26 C28 30 24 32 19 32 C14 32 10 30 10 26 Z M28 17 H32 V23 H28",
  stove: "M10 16 H30 L28 32 H12 Z M16 16 V10 H24 V16",
  eye: "M4 20 C12 10 28 10 36 20 C28 30 12 30 4 20 Z M20 15 A5 5 0 1 0 20.01 15",
  crane: "M8 28 C16 24 22 24 30 14 M30 14 L34 12 M18 25 L14 34 M22 23 L26 33",
  key: "M10 20 A6 6 0 1 0 10.01 20 M16 20 H34 M28 20 V26 M32 20 V24",
};

const C = (id, hot, glyph, title, text, extra = {}) => ({ id, hot, glyph, title, text, ...extra });

/** The hand: one card for each thing the player can do right now. */
export function handCards(world) {
  if (world.away || world.ending) return [];
  const p = world.progress;
  const g = world.guest;
  const hand = [];

  if (p.lamp === 0) hand.push(C("lamp-raise", "lamp", "lamp", "Raise the lamp post", "Heave the fallen post upright.", { group: "Door lamp" }));
  if (p.lamp === 1) hand.push(C("lamp-patch", "wood", "wood", "Brace with scrap wood", "The crack will not hold on its own.", { group: "Door lamp" }));
  if (p.lamp === 2) hand.push(C("lamp-light", "lamp", "flame", "Light the lamp", "Give the street a little light.", { group: "Door lamp" }));

  if (p.tea === 0) hand.push(C("tea-gather", "teaware", "cup", "Gather the teaware", "Cups lie scattered across the floor.", { group: "Tea station" }));
  if (p.tea === 1) hand.push(C("tea-stove", "stove", "stove", "Mend the stove", "Pack the crack with fresh clay.", { group: "Tea station" }));
  if (p.tea === 2) hand.push(C("tea-fire", "stove", "flame", "Light the stove", "Set out the cups and kindle a flame.", { group: "Tea station" }));

  if (p.seating === 0) hand.push(C("seat-clear", "debris", "crate", "Clear the crates", "Something may be buried underneath.", { group: "Waiting area" }));
  if (p.seating === 1) {
    hand.push(C("seat-window", "spot-window", "chair", "Seats by the window", "Set a table and chairs under the lattice.", { group: "Waiting area" }));
    hand.push(C("seat-brazier", "spot-brazier", "chair", "Seats by the brazier", "Set a table and chairs by the iron brazier.", { group: "Waiting area" }));
  }

  if (world.cup === "empty" && isRepaired(world, "tea")) {
    hand.push(C("cup-pour", "stove", "crane", "Fill the crane cup", "Pour tea into the cup you found.", { group: "Crane cup", special: true }));
  }
  if (g.present && !g.lanternNoticed) {
    hand.push(C("guest-look", "guest", "eye", "Look at the guest", "Who stands in the new light?", { group: "Guest" }));
  }
  if (world.cup === "filled" && g.present && g.at === "seats") {
    hand.push(C("cup-serve", "guest", "crane", "Set down the crane cup", "Place it before the seated guest.", { group: "Crane cup", special: true }));
  }
  return hand;
}

/** Keepsakes: clues and things found, kept for the player to look back at. */
export function keepsakeCards(world) {
  const has = (kind) => world.events.some((e) => e.kind === kind);
  const cards = [
    C("letter", null, "key", "Great-aunt's letter", "“…someone has to go back, and put the teahouse in order… my crane cup… he will know it…”"),
  ];
  if (has("cup_found")) {
    const state = { empty: "Empty.", filled: "Full of warm tea.", served: "Set before her." }[world.cup] || "";
    cards.push(C("crane-cup", null, "crane", "Crane cup", `An old celadon cup with a crane on it, found under the crates. ${state}`));
  }
  if (has("lantern_noticed")) {
    cards.push(C("lantern", null, "lamp", "Her small lantern", "The guest carries a lantern, the same as the one by the door."));
  }
  return cards;
}
