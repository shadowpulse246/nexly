from __future__ import annotations

import json
import os
from pathlib import Path

from flask import Flask, jsonify, request, send_file
from flask_socketio import SocketIO, disconnect

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
DATA_DIR = BASE_DIR / "data"
USERS_FILE = DATA_DIR / "users.json"
SERVERS_DIR = DATA_DIR / "servers"

app = Flask(__name__, static_folder=str(PUBLIC_DIR), static_url_path="")
app.config["JSON_SORT_KEYS"] = False
socketio = SocketIO(app, cors_allowed_origins="*")

if not DATA_DIR.exists():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
if not SERVERS_DIR.exists():
    SERVERS_DIR.mkdir(parents=True, exist_ok=True)
if not USERS_FILE.exists():
    USERS_FILE.write_text(
        json.dumps([
            {"username": "Owner", "password": "adminpass", "profilePic": "", "isOwner": True}
        ], indent=2),
        encoding="utf-8",
    )


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path: Path, data):
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)


@app.route("/")
def index():
    return send_file(PUBLIC_DIR / "index.html")


@app.route("/login.html")
def login_html():
    return send_file(PUBLIC_DIR / "login.html")


@app.route("/signup.html")
def signup_html():
    return send_file(PUBLIC_DIR / "signup.html")


@app.route("/bible.html")
def bible_html():
    return send_file(PUBLIC_DIR / "bible.html")


@app.route("/admin.html")
def admin_html():
    return send_file(PUBLIC_DIR / "admin.html")


@app.route("/premium.html")
def premium_html():
    return send_file(PUBLIC_DIR / "premium.html")


@app.route("/settings.html")
def settings_html():
    return send_file(PUBLIC_DIR / "settings.html")


@app.route("/tos.html")
def tos_html():
    return send_file(PUBLIC_DIR / "tos.html")


@app.route("/privacy.html")
def privacy_html():
    return send_file(PUBLIC_DIR / "privacy.html")


@app.post("/signup")
def signup():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = (payload.get("password") or "").strip()
    profile_pic = (payload.get("profilePic") or "").strip()

    if not username or not password:
        return jsonify({"success": False, "message": "Username & password required"})

    users = load_json(USERS_FILE)
    if any(user.get("username", "").lower() == username.lower() for user in users):
        return jsonify({"success": False, "message": "Username taken"})

    users.append({"username": username, "password": password, "profilePic": profile_pic, "isOwner": False})
    save_json(USERS_FILE, users)
    return jsonify({"success": True})


@app.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = (payload.get("password") or "").strip()

    users = load_json(USERS_FILE)
    user = next((u for u in users if u.get("username") == username and u.get("password") == password), None)
    if user is None:
        return jsonify({"success": False, "message": "Invalid credentials"})
    return jsonify({"success": True, "user": user})


@app.get("/servers")
def list_servers():
    servers = []
    if SERVERS_DIR.exists():
        for item in sorted(SERVERS_DIR.iterdir()):
            file_path = item / "server.json"
            if item.is_dir() and file_path.exists():
                servers.append(load_json(file_path))
    return jsonify(servers)


@app.post("/servers")
def create_server():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    owner = (payload.get("owner") or "").strip()
    icon = payload.get("icon") or ""

    if not name or not owner:
        return jsonify({"success": False, "message": "Name and owner required"})

    server_id = (re.sub(r"\W+", "", name.lower()) or "server") + str(int(__import__("time").time() * 1000))
    server_path = SERVERS_DIR / server_id
    server_path.mkdir(parents=True, exist_ok=True)

    server_data = {"id": server_id, "name": name, "icon": icon, "owner": owner, "created": __import__("datetime").datetime.utcnow().isoformat() + "Z"}
    save_json(server_path / "server.json", server_data)
    save_json(server_path / "chat.json", [])
    return jsonify({"success": True, "server": {"id": server_id, "name": name, "icon": icon, "owner": owner}})


@socketio.on("join-server")
@socketio.on("join-room")
def on_join_room(data=None):
    room = (data or {}).get("room") or (data or {}).get("serverId") or data
    if not room:
        return

    current_server = getattr(request.sid, "current_server", None)
    if current_server and current_server != room:
        socketio.server.leave_room(current_server, request.sid)

    socketio.server.enter_room(request.sid, room)
    setattr(request.sid, "current_server", room)

    chat_file = SERVERS_DIR / room / "chat.json"
    if chat_file.exists():
        socketio.emit("chat-history", load_json(chat_file), to=request.sid)
    else:
        socketio.emit("chat-history", [], to=request.sid)


@socketio.on("send-chat-message")
def on_send_chat_message(data):
    if not data:
        return
    room = data.get("room")
    if not room:
        return

    message = {
        "name": data.get("name", "Unknown"),
        "message": data.get("message", ""),
        "pic": data.get("pic") or "",
        "time": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }

    socketio.emit("chat-message", message, room=room)

    chat_file = SERVERS_DIR / room / "chat.json"
    messages = []
    if chat_file.exists():
        messages = load_json(chat_file)
    messages.append(message)
    save_json(chat_file, messages)


@socketio.on("typing")
def on_typing(data):
    if not data:
        return
    room = data.get("room")
    if room:
        socketio.emit("typing", data, room=room, include_self=False)


@socketio.on("stop-typing")
def on_stop_typing(data):
    if not data:
        return
    room = data.get("room")
    if room:
        socketio.emit("stop-typing", data, room=room, include_self=False)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "3000"))
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
