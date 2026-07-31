import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).parent
DATA_FILE = ROOT / "data.json"
PORT = int(os.environ.get("PORT", "8000"))
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:1.5b")

STARTER_TASKS = [
    {"id": "p1", "title": "Java Practical 1: Algorithms", "type": "Java practical", "due": "2026-08-07", "status": "active", "fileName": ""},
    {"id": "a1", "title": "Assignment 1: Problem solving", "type": "Assignment", "due": "2026-08-14", "status": "active", "fileName": ""},
    {"id": "p2", "title": "Java Practical 2: Variables & input", "type": "Java practical", "due": "2026-08-21", "status": "ready", "fileName": "comp102_practical2.java"},
    {"id": "p3", "title": "Java Practical 3: Selection & loops", "type": "Java practical", "due": "2026-08-28", "status": "active", "fileName": ""},
    {"id": "a2", "title": "Assignment 2: Control flow", "type": "Assignment", "due": "2026-09-04", "status": "active", "fileName": ""},
    {"id": "p4", "title": "Java Practical 4: Methods", "type": "Java practical", "due": "2026-09-11", "status": "active", "fileName": ""},
    {"id": "p5", "title": "Java Practical 5: Arrays", "type": "Java practical", "due": "2026-09-18", "status": "active", "fileName": ""},
    {"id": "p6", "title": "Java Practical 6: Strings", "type": "Java practical", "due": "2026-09-25", "status": "active", "fileName": ""},
    {"id": "p7", "title": "Java Practical 7: File handling", "type": "Java practical", "due": "2026-10-02", "status": "active", "fileName": ""},
]


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def load_data():
    if not DATA_FILE.exists():
        data = {"tasks": STARTER_TASKS, "submissions": [], "examples": []}
        save_data(data)
        return data
    try:
        data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        data = {"tasks": STARTER_TASKS, "submissions": [], "examples": []}
    data.setdefault("tasks", [])
    data.setdefault("submissions", [])
    data.setdefault("examples", [])
    existing = {task["id"] for task in data["tasks"]}
    data["tasks"].extend(task for task in STARTER_TASKS if task["id"] not in existing)
    return data


def save_data(data):
    DATA_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def jsonl_examples(examples):
    return "".join(json.dumps({"messages": [
        {"role": "system", "content": "You are a careful COMP 102 Java programming tutor."},
        {"role": "user", "content": example["question"]},
        {"role": "assistant", "content": example["answer"]},
    ]}) + "\n" for example in examples if example.get("status") == "approved")


class ApiHandler(BaseHTTPRequestHandler):
    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.end_headers()

    def read_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(length) or b"{}")

    def do_GET(self):
        data = load_data()
        if self.path == "/api/health":
            self.send_json({"ok": True, "model": OLLAMA_MODEL})
        elif self.path == "/api/state":
            self.send_json(data)
        elif self.path == "/api/dataset.jsonl":
            body = jsonl_examples(data["examples"]).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/jsonl; charset=utf-8")
            self.send_header("Content-Disposition", "attachment; filename=comp102-java-training.jsonl")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.serve_file()

    def do_POST(self):
        data = load_data()
        try:
            payload = self.read_body()
        except (json.JSONDecodeError, ValueError):
            self.send_json({"error": "Invalid JSON"}, 400)
            return
        if self.path == "/api/tasks":
            task = {"id": f"task-{uuid4().hex[:8]}", "title": payload.get("title", "Untitled practical"), "type": payload.get("type", "Java practical"), "due": payload.get("due", ""), "status": "active", "fileName": ""}
            data["tasks"].append(task)
            save_data(data)
            self.send_json(task, 201)
        elif self.path == "/api/examples":
            example = {"id": f"example-{uuid4().hex[:8]}", "question": payload.get("question", "").strip(), "answer": payload.get("answer", "").strip(), "status": "pending", "createdAt": utc_now()}
            if not example["question"] or not example["answer"]:
                self.send_json({"error": "Question and answer are required"}, 400)
                return
            data["examples"].append(example)
            save_data(data)
            self.send_json(example, 201)
        elif self.path == "/api/submissions":
            task = next((item for item in data["tasks"] if item["id"] == payload.get("taskId")), None)
            if not task:
                self.send_json({"error": "Task not found"}, 404)
                return
            task["status"] = "ready"
            task["fileName"] = payload.get("fileName", "")
            submission = {"taskId": task["id"], "taskTitle": task["title"], "fileName": task["fileName"], "preparedAt": utc_now(), "moodleStatus": "Ready to upload when connected"}
            data["submissions"].append(submission)
            save_data(data)
            self.send_json(submission, 201)
        elif self.path == "/api/chat":
            self.ask_qwen(payload.get("question", ""))
        else:
            self.send_json({"error": "Not found"}, 404)

    def do_PATCH(self):
        data = load_data()
        try:
            payload = self.read_body()
        except (json.JSONDecodeError, ValueError):
            self.send_json({"error": "Invalid JSON"}, 400)
            return
        parts = self.path.strip("/").split("/")
        if len(parts) == 3 and parts[0] == "api" and parts[1] == "examples":
            example = next((item for item in data["examples"] if item["id"] == parts[2]), None)
            if not example:
                self.send_json({"error": "Example not found"}, 404)
                return
            example["status"] = payload.get("status", example["status"])
            save_data(data)
            self.send_json(example)
        else:
            self.send_json({"error": "Not found"}, 404)

    def ask_qwen(self, question):
        if not question.strip():
            self.send_json({"error": "Question is required"}, 400)
            return
        request = urllib.request.Request(OLLAMA_URL, data=json.dumps({"model": OLLAMA_MODEL, "prompt": f"You are a COMP 102 Java tutor. Explain clearly and safely.\n\nQuestion: {question}", "stream": False}).encode(), headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                result = json.loads(response.read())
            self.send_json({"answer": result.get("response", ""), "model": OLLAMA_MODEL})
        except (urllib.error.URLError, TimeoutError):
            self.send_json({"error": "Qwen is unavailable. Start Ollama and pull the configured model first."}, 503)

    def serve_file(self):
        requested = self.path.split("?", 1)[0].lstrip("/") or "index.html"
        file_path = (ROOT / requested).resolve()
        if ROOT not in file_path.parents and file_path != ROOT:
            self.send_error(403)
            return
        if not file_path.is_file():
            self.send_error(404)
            return
        content_type = "text/html" if file_path.suffix == ".html" else "text/css" if file_path.suffix == ".css" else "application/javascript"
        body = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format_string, *args):
        print(f"{self.address_string()} - {format_string % args}")


if __name__ == "__main__":
    print(f"COMP 102 Qwen server running at http://localhost:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), ApiHandler).serve_forever()
