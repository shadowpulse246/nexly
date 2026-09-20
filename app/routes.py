import re
import time
from datetime import datetime, timezone
from pathlib import PurePath

from flask import jsonify, request, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash

from .config import Config
from .storage import list_server_records, load_json, save_json


def _public_user(user):
    return {key: value for key, value in user.items() if key != "password"}


def _safe_server_id(server_id):
    return isinstance(server_id, str) and bool(re.fullmatch(r"[A-Za-z0-9_-]{1,160}", server_id)) and server_id not in {".", ".."}


def register_routes(app):
    @app.get("/")
    def root():
        return send_from_directory(Config.PUBLIC_DIR, "index.html")

    @app.get("/<path:filename>")
    def public_files(filename):
        return send_from_directory(Config.PUBLIC_DIR, filename)

    @app.post("/signup")
    def signup():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(success=False, message="Invalid JSON request"), 400
        username = str(payload.get("username") or "").strip()
        password = str(payload.get("password") or "").strip()
        profile_pic = str(payload.get("profilePic") or "").strip()
        if not username or not password:
            return jsonify(success=False, message="Username & password required"), 400
        users = load_json(Config.USERS_FILE, [])
        if not isinstance(users, list):
            return jsonify(success=False, message="User data is invalid"), 500
        if any(str(user.get("username", "")).casefold() == username.casefold() for user in users):
            return jsonify(success=False, message="Username taken"), 409
        users.append({"username": username, "password": generate_password_hash(password), "profilePic": profile_pic, "isOwner": False})
        save_json(Config.USERS_FILE, users)
        return jsonify(success=True)

    @app.post("/login")
    def login():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(success=False, message="Invalid JSON request"), 400
        username = str(payload.get("username") or "").strip()
        password = str(payload.get("password") or "")
        users = load_json(Config.USERS_FILE, [])
        user = next((item for item in users if item.get("username") == username), None)
        valid = False
        if user:
            stored = str(user.get("password", ""))
            valid = check_password_hash(stored, password) if stored.startswith(("scrypt:", "pbkdf2:")) else stored == password
        if not user or not valid:
            return jsonify(success=False, message="Invalid credentials"), 401
        return jsonify(success=True, user=_public_user(user))

    @app.get("/servers")
    def servers():
        return jsonify(list_server_records())

    @app.post("/servers")
    def create_server():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(success=False, message="Invalid JSON request"), 400
        name = str(payload.get("name") or "").strip()
        owner = str(payload.get("owner") or "").strip()
        icon = payload.get("icon") or ""
        if not name or not owner:
            return jsonify(success=False, message="Name and owner required"), 400
        server_id = (re.sub(r"\W", "", name.lower()) or "server") + str(int(time.time() * 1000))
        directory = Config.SERVERS_DIR / server_id
        directory.mkdir(parents=True, exist_ok=True)
        record = {"id": server_id, "name": name, "icon": icon, "owner": owner, "created": datetime.now(timezone.utc).isoformat()}
        save_json(directory / "server.json", record)
        save_json(directory / "chat.json", [])
        return jsonify(success=True, server={key: record[key] for key in ("id", "name", "icon", "owner")})
