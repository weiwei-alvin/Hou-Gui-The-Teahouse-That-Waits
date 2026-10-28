// Browser check of the game page. Run: node test/e2e/game.e2e.cjs <base-url> <mock-ollama-url> [shots-dir]
// Needs Playwright with Chromium. Uses scripted mode and a fake Ollama; it never needs a real model.
const { chromium } = require("playwright");

const BASE = process.argv[2];
const MOCK = process.argv[3];
const SHOTS = process.argv[4];
const ORDERS = [
  ["lamp", "tea", "seating"], ["lamp", "seating", "tea"], ["tea", "lamp", "seating"],
  ["tea", "seating", "lamp"], ["seating", "lamp", "tea"], ["seating", "tea", "lamp"],
];
const CLICKS = {
  lamp: ["lamp", "wood", "lamp"],
  tea: ["teaware", "stove", "stove"],
  seating: (spot) => ["debris", `spot-${spot}`],
};

const results = [];
const check = (name, ok, extra = "") => results.push(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : "  " + extra}`);

async function open(browser, query, viewport = { width: 1280, height: 900 }) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`${BASE}/index.html?${query}`);
  await page.waitForFunction(() => window.__teahouse && window.__teahouse.world);
  return { page, errors };
}
const hot = (page, name) => page.click(`.hot[data-hot="${name}"]`);
const w = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__teahouse.world)));
const idle = (page) => page.waitForFunction(() => !window.__teahouse.keeper.busy, null, { timeout: 10000 });
const lastKind = (page) => page.getAttribute("#log tr:first-child", "data-kind");

async function repair(page, item, spot) {
  const seq = item === "seating" ? CLICKS.seating(spot) : CLICKS[item];
  for (const h of seq) await hot(page, h);
}

(async () => {
  const browser = await chromium.launch();

  // 1. Every order, through the real UI, in scripted mode.
  for (const [i, order] of ORDERS.entries()) {
    const spot = i % 2 ? "brazier" : "window";
    const { page, errors } = await open(browser, "mode=scripted&timeout=5");
    for (const item of order) { await repair(page, item, spot); await idle(page); }
    let s = await w(page);
    const done = s.progress.lamp === 3 && s.progress.tea === 3 && s.progress.seating === 2;
    await page.click("#leave");
    await page.click("#return");
    await idle(page);
    s = await w(page);
    const summary = await page.textContent("#summary");
    check(`order ${order.join(" → ")} (${spot}) completes in the UI`, done && s.guest.at === "seats" && s.guest.served, JSON.stringify(s.progress));
    check(`  summary lists the order (${order[0]} first)`, (await page.isVisible("#summary")) &&
      summary.indexOf({ lamp: "Door lamp", tea: "Tea station", seating: "Waiting area" }[order[0]]) <
      summary.indexOf({ lamp: "Door lamp", tea: "Tea station", seating: "Waiting area" }[order[2]]));
    check(`  no page errors`, errors.length === 0, errors.join(" | "));
    if (i === 0 && SHOTS) await page.screenshot({ path: `${SHOTS}/restored.png` });
    await page.close();
  }

  // 2. Scripted: the three intents move the guest to three places; scripted replies are labeled.
  {
    const { page } = await open(browser, "mode=scripted&timeout=5");
    await repair(page, "lamp"); await idle(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/guest-at-door.png` });
    await page.click("text=Ask them to wait a moment."); await idle(page);
    check("scripted: wait → guest on the bench", (await w(page)).guest.at === "bench");
    check("scripted replies are labeled as not the model", (await page.textContent("#reply")).includes("Scripted test reply, not the model"));
    check("badge says scripted", (await page.textContent("#mode-badge")).includes("Scripted"));
    await page.click("text=Let them in."); await idle(page);
    const s = await w(page);
    check("scripted: let them in → greeted at the door", s.guest.at === "door" && s.keeperAt === "door");
    await page.close();
  }

  // 3. Model mode against a fake Ollama: applied, refused, bad ref, format, stale, timeout.
  {
    const { page, errors } = await open(browser, `mode=model&host=${encodeURIComponent(MOCK)}&timeout=1.5`);
    await page.waitForFunction(() => document.getElementById("mode-badge").textContent.includes("Local model"));
    check("model mode: badge shows the local model", true);
    await repair(page, "lamp"); await idle(page);
    await page.fill("#talk", "Ask them to wait a moment."); await page.click("#talk-form button"); await idle(page);
    check("model: valid reply applied through rules", (await lastKind(page)) === "applied" && (await w(page)).guest.at === "bench");
    check("model: related events come from the log", (await page.textContent("#reply")).includes("Related events"));
    await page.fill("#talk", "Please sit down"); await page.click("#talk-form button"); await idle(page);
    check("model: action refused by rules (waiting area not repaired)", (await lastKind(page)) === "bad_action" &&
      (await page.textContent("#reply")).includes("not a model reply") && (await w(page)).guest.at === "bench");
    await page.fill("#talk", "phantom memory"); await page.click("#talk-form button"); await idle(page);
    check("model: unknown reference rejected", (await lastKind(page)) === "bad_ref");
    await page.fill("#talk", "garbage"); await page.click("#talk-form button"); await idle(page);
    check("model: non-JSON reply degraded", (await lastKind(page)) === "format");
    // stale: say something, then keep repairing while the keeper thinks
    await page.fill("#talk", "Let them in."); await page.click("#talk-form button");
    await page.waitForTimeout(150);
    await hot(page, "teaware");
    await idle(page);
    const kinds = await page.$$eval("#log tr", (rows) => rows.slice(0, 2).map((r) => r.dataset.kind));
    check("model: reply for an older state discarded, resent, applied", kinds[1] === "stale" && kinds[0] === "applied", kinds.join(","));
    check("model: resent reply greeted the guest", (await w(page)).guest.greeted === true);
    // timeout: fake model takes 3s, timeout is 1.5s
    const before = (await w(page)).events.length;
    await page.fill("#talk", "slow reply"); await page.click("#talk-form button"); await idle(page);
    check("model: timeout degrades with a retry button", (await lastKind(page)) === "timeout" && (await page.isVisible("text=Ask again")));
    await page.waitForTimeout(2200);
    const after = (await w(page)).events.length;
    check("model: late reply after timeout changed nothing", after === before + 1, `${before} → ${after}`); // +1 = the dialogue event
    check("model: repairs still work after a timeout", (await (async () => { await hot(page, "stove"); return (await w(page)).progress.tea === 2; })()));
    check("model mode: no page errors", errors.length === 0, errors.join(" | "));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/model-mode.png`, fullPage: true });
    await page.close();
  }

  // 4. Ollama unreachable: banner offers scripted mode; nothing pretends to be the model.
  {
    const { page } = await open(browser, "mode=model&host=http%3A%2F%2F127.0.0.1%3A9&timeout=2");
    await page.waitForSelector("#banner:not([hidden])");
    check("unreachable: banner explains and offers scripted mode", (await page.textContent("#banner")).includes("Cannot reach Ollama"));
    check("unreachable: badge says unreachable", (await page.textContent("#mode-badge")).includes("unreachable"));
    await page.click("#banner button");
    check("switching to scripted mode updates the badge", (await page.textContent("#mode-badge")).includes("Scripted"));
    await page.close();
  }

  // 5. Phone width: no horizontal scroll.
  {
    const { page } = await open(browser, "mode=scripted", { width: 375, height: 800 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check("375px wide: no horizontal scroll", !overflow);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/mobile.png`, fullPage: true });
    await page.close();
  }
  {
    const { page } = await open(browser, "mode=scripted");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/start.png` });
    await page.close();
  }

  await browser.close();
  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
