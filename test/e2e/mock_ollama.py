"""Fake Ollama for the browser check (test/e2e/game.e2e.cjs): CORS, keyword replies, cites only events it was sent. Usage: python test/e2e/mock_ollama.py PORT"""
import json
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

CALLS = []


def reply_for(player, events):
    p = player.lower()
    last = events[-1]["id"] if events else None
    refs = [last] if last else []
    if "garbage" in p:
        return "the keeper stares silently", 0.2
    if "slow" in p:
        return {"attitude": "uneasy", "line": "Too late.", "references": refs, "action": "greet_at_door"}, 3.0
    if "phantom" in p:
        return {"attitude": "wary", "line": "I remember.", "references": [9999], "action": "none"}, 0.2
    if "wait" in p:
        return {"attitude": "guarded", "line": "Rest on the bench, traveler.", "references": refs, "action": "ask_guest_to_wait"}, 0.3
    if "sit" in p:
        return {"attitude": "curious", "line": "Sit, sit.", "references": [], "action": "invite_to_sit"}, 0.2
    if "let them in" in p:
        return {"attitude": "uneasy", "line": "I will meet them at the threshold.", "references": refs, "action": "greet_at_door"}, 0.8
    return {"attitude": "guarded", "line": "Hm. The house is listening.", "references": refs, "action": "none"}, 0.3


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def cors(self):
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def send(self, obj, code=200):
        body = json.dumps(obj).encode()
        try:
            self.send_response(code)
            self.cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/version":
            return self.send({"version": "mock-0.0"})
        if self.path == "/api/tags":
            return self.send({"models": [{"name": "gemma4:e4b", "digest": "abcdef1234567890", "size": 1}]})
        if self.path == "/calls":
            return self.send({"calls": CALLS})
        self.send({"error": "not found"}, 404)

    def do_POST(self):
        req = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        user = req["messages"][1]["content"]
        assert req["format"]["required"] == ["attitude", "line", "references", "action"]
        events = json.loads(user.split("EVENTS:\n", 1)[1].split("\n\nACTIONS:", 1)[0])
        player = user.rsplit("PLAYER SAYS: ", 1)[1]
        CALLS.append({"player": player, "n_events": len(events)})
        r, delay = reply_for(player, events)
        time.sleep(delay)
        content = r if isinstance(r, str) else json.dumps(r)
        self.send({"message": {"role": "assistant", "content": content}})


ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
