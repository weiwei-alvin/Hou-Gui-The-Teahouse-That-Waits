#!/usr/bin/env python3
"""Model-layer test for the Teahouse Keeper (Gemma via Ollama): latency and output quality.

Run on the computer that will run the game (Windows: PowerShell, not WSL), from the repo root:

    ollama pull gemma4:e4b
    python tools/keeper_model_test.py --model gemma4:e4b --runs 3

The prompt, attitudes and actions come from src/keeper_prompt.json, the same file the game
uses. Worlds are built with the same event sequence as src/rules.js. Prints a summary and
writes keeper_test_results.json; fill in its "human_label" fields by hand. The script checks
format, ids, actions and timing, but it cannot judge whether a line states a guess as fact.
"""
import argparse
import json
import os
import re
import statistics
import sys
import time
import urllib.error
import urllib.request

PROMPT_PATH = os.environ.get(
    "KEEPER_PROMPT", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "keeper_prompt.json"))
try:
    with open(PROMPT_PATH, encoding="utf-8") as _f:
        PROMPT = json.load(_f)
except OSError:
    sys.exit(f"Cannot read the prompt file at {PROMPT_PATH}. Run this from the repository.")

ACTIONS = PROMPT["actions"]
ATTITUDES = PROMPT["attitudes"]
SYSTEM_PROMPT = PROMPT["system"]
MAX_EVENTS = PROMPT["max_events_sent"]

# No state_version on purpose: the game binds each reply to its own request id and the state
# version at send time; it never trusts a version the model claims.
SCHEMA = {
    "type": "object",
    "properties": {
        "attitude": {"type": "string", "enum": ATTITUDES},
        "line": {"type": "string"},
        "references": {"type": "array", "items": {"type": "integer"}, "maxItems": 2},
        "action": {"type": "string", "enum": list(ACTIONS)},
    },
    "required": ["attitude", "line", "references", "action"],
}

STEPS = {"lamp": ["raise", "patch", "light"], "tea": ["gather", "fix_stove", "set_and_fire"],
         "seating": ["clear", "place"]}


def build_world(items, player):
    """items: e.g. ["lamp", "seating:window"]. Mirrors the event sequence of src/rules.js,
    ending with the player's dialogue event, as the game records it before asking."""
    events, done, spot, guest = [], [], None, False

    def add(kind, target, **data):
        events.append({"id": len(events) + 1, "kind": kind, "target": target, "data": data})

    for entry in items:
        item, _, where = entry.partition(":")
        for step in STEPS[item]:
            if item == "seating" and step == "place":
                spot = where or "window"
                add("repair_step", item, step=step, spot=spot)
            else:
                add("repair_step", item, step=step)
        add("repair_completed", item, **({"spot": spot} if item == "seating" else {}))
        done.append(item)
        if len(done) == 1:
            add("stage_changed", "keeper", stage="cooperative")
        if item == "lamp":
            add("guest_arrived", "guest", at="door")
            guest = True
        if len(done) == 3:
            add("stage_changed", "keeper", stage="lets_guests_in")
            add("teahouse_restored", "teahouse")
    add("dialogue", "player", text=player)
    stage = "wary" if not done else ("lets_guests_in" if len(done) == 3 else "cooperative")
    state = {
        "keeper_stage": stage,
        "repaired": {k: (k in done) for k in ("lamp", "tea", "seating")},
        "seating_spot": spot,
        "guest_present": guest,
        "guest_at": "door" if guest else None,
        "keeper_at": "counter",
        "tea_ready": False,
        "let_go": False,
    }
    return state, events


INTENTS = {  # acceptable actions per player intent (E scenarios)
    "welcome": {"greet_at_door", "walk_to_door"},
    "wait": {"ask_guest_to_wait"},
    "leave": {"stay_at_counter", "none"},
}

SCENARIOS = {
    # id: (description, repairs so far, player message, intent or None)
    "A": ("lamp -> seating, guest waiting, no tea yet",
          ["lamp", "seating:window"], "The guest is still waiting at the door.", None),
    "B": ("lamp -> tea, guest waiting, no seats yet",
          ["lamp", "tea"], "The guest is still waiting at the door.", None),
    "C": ("tea -> seating -> lamp, guest just arrived",
          ["tea", "seating:brazier", "lamp"], "Someone's at the door.", None),
    "E-welcome-1": ("lamp only, guest at door", ["lamp"], "Let them in.", "welcome"),
    "E-welcome-2": ("lamp only, guest at door", ["lamp"], "Go and greet our guest.", "welcome"),
    "E-wait-1": ("lamp only, guest at door", ["lamp"], "Ask them to wait a moment.", "wait"),
    "E-wait-2": ("lamp only, guest at door", ["lamp"], "Tell the guest we're not ready yet.", "wait"),
    "E-leave-1": ("lamp only, guest at door", ["lamp"], "Just ignore them.", "leave"),
    "E-leave-2": ("lamp only, guest at door", ["lamp"], "Leave them be and stay where you are.", "leave"),
}


def action_allowed(action, state):
    """Same preconditions as actionBlocker() in src/rules.js for these scenarios."""
    r = state["repaired"]
    outside = state["guest_present"] and state["guest_at"] != "seats"
    if action == "prepare_tea":
        return r["tea"]
    if action == "invite_to_sit":
        return r["seating"] and outside
    if action in ("greet_at_door", "ask_guest_to_wait"):
        return outside
    if action in ("stay_on", "move_on"):
        return state["let_go"]
    return action in ACTIONS


def user_message(state, events, player):
    actions = "\n".join(f"- {k}: {v}" for k, v in ACTIONS.items())
    sent = events[-MAX_EVENTS:]
    return (f"STATE:\n{json.dumps(state, ensure_ascii=False, separators=(',', ':'))}\n\n"
            f"EVENTS:\n{json.dumps(sent, ensure_ascii=False, separators=(',', ':'))}\n\n"
            f"ACTIONS:\n{actions}\n\nPLAYER SAYS: {player}")


def http_json(host, path, payload=None, timeout=300):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(host + path, data=data,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def check(raw, state, events, intent=None):
    """Rule-side checks only. Returns dict of results."""
    out = {"json_ok": False, "schema_ok": False, "refs_exist": False, "action_ok": False,
           "intent_ok": None, "line_sentences": None}
    try:
        obj = json.loads(raw)
        out["json_ok"] = True
    except (json.JSONDecodeError, TypeError):
        return out, None
    ok = isinstance(obj, dict) and all(k in obj for k in SCHEMA["required"])
    ok = ok and isinstance(obj.get("line"), str) and isinstance(obj.get("references"), list)
    ok = ok and obj.get("attitude") in ATTITUDES and obj.get("action") in ACTIONS
    out["schema_ok"] = bool(ok)
    if not ok:
        return out, obj
    ids = {e["id"] for e in events[-MAX_EVENTS:]}  # only events actually sent
    refs = obj["references"]
    out["refs_exist"] = len(refs) <= 2 and all(isinstance(i, int) and i in ids for i in refs)
    out["action_ok"] = action_allowed(obj["action"], state)
    if intent:
        out["intent_ok"] = obj["action"] in INTENTS[intent]
    out["line_sentences"] = len([s for s in re.split(r"[.!?。！？]+", obj["line"]) if s.strip()])
    return out, obj


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")  # avoid crashes on non-UTF-8 consoles
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--model", default="gemma4:e4b")
    ap.add_argument("--runs", type=int, default=3, help="runs per scenario (default 3)")
    ap.add_argument("--scenarios", default=",".join(SCENARIOS), help="comma list, e.g. A,B,E-wait-1")
    ap.add_argument("--host", default=os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434"))
    ap.add_argument("--out", default="keeper_test_results.json")
    ap.add_argument("--dump-scenario", metavar="ID", help="print the state, events and prompt text for one scenario and exit")
    args = ap.parse_args()
    if args.dump_scenario:
        _, items, player, _ = SCENARIOS[args.dump_scenario]
        state, events = build_world(items, player)
        print(json.dumps({"state": state, "events": events, "user": user_message(state, events, player)}, ensure_ascii=False))
        return
    host = args.host if args.host.startswith("http") else "http://" + args.host
    host = host.rstrip("/")
    chosen = [s.strip() for s in args.scenarios.split(",") if s.strip()]
    unknown = [s for s in chosen if s not in SCENARIOS]
    if unknown:
        sys.exit(f"Unknown scenario(s): {unknown}. Choose from {list(SCENARIOS)}")

    try:
        version = http_json(host, "/api/version", timeout=10).get("version")
        tags = http_json(host, "/api/tags", timeout=10).get("models", [])
    except (urllib.error.URLError, OSError) as e:
        sys.exit(f"Cannot reach Ollama at {host} ({e}).\n"
                 "Start the Ollama app first. If you are in WSL, run this script in Windows PowerShell instead.")
    tag = next((m for m in tags if m.get("name") in (args.model, args.model + ":latest")), None)
    if tag is None:
        sys.exit(f"Model {args.model} is not installed. Run: ollama pull {args.model}")
    print(f"Ollama {version} | model {args.model} | id {tag.get('digest', '?')[:12]} | "
          f"size {tag.get('size', 0) / 1e9:.1f} GB")

    def call(state, events, player):
        payload = {"model": args.model, "stream": False, "format": SCHEMA, "keep_alive": "10m",
                   "messages": [{"role": "system", "content": SYSTEM_PROMPT},
                                {"role": "user", "content": user_message(state, events, player)}]}
        t0 = time.perf_counter()
        resp = http_json(host, "/api/chat", payload)
        return resp, time.perf_counter() - t0

    # Cold start: load the model once, reported separately and not counted.
    s0, e0 = build_world(SCENARIOS[chosen[0]][1], SCENARIOS[chosen[0]][2])
    try:
        warm, cold_secs = call(s0, e0, SCENARIOS[chosen[0]][2])
    except urllib.error.HTTPError as e:
        sys.exit(f"Ollama returned HTTP {e.code}: {e.read().decode('utf-8', 'replace')}")
    print(f"Cold start (model load + first reply): {cold_secs:.1f}s, not counted\n")

    results = []
    for sid in chosen:
        desc, steps, player, intent = SCENARIOS[sid]
        state, events = build_world(steps, player)
        for run in range(1, args.runs + 1):
            err, resp, secs = None, {}, None
            try:
                resp, secs = call(state, events, player)
            except (urllib.error.URLError, OSError, ValueError) as e:
                err = str(e)
            raw = resp.get("message", {}).get("content") if resp else None
            checks, parsed = check(raw, state, events, intent) if raw is not None else ({}, None)
            ns = 1e9
            rec = {
                "scenario": sid, "description": desc, "intent": intent,
                "accepted_actions": sorted(INTENTS[intent]) if intent else None,
                "run": run, "error": err,
                "seconds": None if secs is None else round(secs, 2),
                "ollama": {k: (round(resp[k] / ns, 2) if k.endswith("duration") else resp[k])
                           for k in ("total_duration", "load_duration", "prompt_eval_count",
                                     "prompt_eval_duration", "eval_count", "eval_duration")
                           if k in resp},
                "checks": checks, "output": parsed, "raw": raw,
                "input": {"state": state, "events": events, "player": player},
                "human_label": {"references_support_line": None, "states_guess_as_fact": None,
                                "fits_situation": None, "notes": ""},
            }
            results.append(rec)
            rules_ok = bool(checks) and all(checks.get(k) for k in ("schema_ok", "refs_exist", "action_ok"))
            mark = "BAD" if not rules_ok else ("OK " if checks.get("intent_ok") in (None, True) else "OFF")
            act = parsed.get("action") if isinstance(parsed, dict) else "-"
            line = (parsed.get("line") if isinstance(parsed, dict) else raw or err or "")[:80]
            t = f"{secs:5.1f}s" if secs is not None else "  err "
            print(f"{sid:>11} #{run} {t} {mark} action={act:<17} {line}")

    secs = [r["seconds"] for r in results if r["seconds"] is not None]
    n = len(results)

    def count(key):
        return sum(1 for r in results if r["checks"].get(key))

    print("\nSummary")
    if secs:
        print(f"  latency: median {statistics.median(secs):.1f}s, max {max(secs):.1f}s; "
              f"within 5s: {sum(s <= 5 for s in secs)}/{len(secs)}; "
              f"over 10s (would time out): {sum(s > 10 for s in secs)}/{len(secs)}")
    for key in ("json_ok", "schema_ok", "refs_exist", "action_ok"):
        print(f"  {key:<11} {count(key)}/{n}")
    e_runs = [r for r in results if r["intent"]]
    if e_runs:
        print(f"  intent_ok   {count('intent_ok')}/{len(e_runs)} (E scenarios only)")
        for intent in INTENTS:
            acts = [r["output"].get("action") for r in e_runs
                    if r["intent"] == intent and isinstance(r["output"], dict)]
            if acts:
                print(f"    {intent:<8} actions: {', '.join(acts)}")
    print(f"  errors      {sum(1 for r in results if r['error'])}/{n}")
    print("  OK = rules + intent pass; OFF = legal but not the expected intent; BAD = rule check failed")

    gpu_share = None
    try:
        loaded = http_json(host, "/api/ps", timeout=10).get("models", [])
        m = next((x for x in loaded if x.get("name") in (args.model, args.model + ":latest")), None)
        if m and m.get("size"):
            gpu_share = round(100 * m.get("size_vram", 0) / m["size"])
            print(f"  model in GPU memory: {gpu_share}% (0% = running on CPU only)")
    except (urllib.error.URLError, OSError, ValueError):
        pass

    report = {"ollama_version": version, "model": args.model, "model_id": tag.get("digest"),
              "cold_start_seconds": round(cold_secs, 2), "gpu_share_percent": gpu_share,
              "system_prompt": SYSTEM_PROMPT,
              "schema": SCHEMA, "results": results}
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\nSaved {args.out}. Fill in human_label for each run.")


if __name__ == "__main__":
    main()
