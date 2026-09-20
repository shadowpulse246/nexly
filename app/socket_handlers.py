from datetime import datetime, timezone

from flask import request
from flask_socketio import emit, join_room, leave_room

from .config import Config
from .storage import load_json, save_json


def _room_from_payload(data):
    if isinstance(data, str):
        return data
    if isinstance(data, dict):
        return data.get("room") or data.get("serverId") or data.get("id")
    return None


def register_socketio(socketio):
    @socketio.on("join-server")
    @socketio.on("join-room")
    def join_server(data=None, _legacy=None):
        room = _room_from_payload(data)
        if not room or not isinstance(room, str) or not room.replace("-", "").replace("_", "").isalnum():
            return
        old_room = getattr(join_server, "rooms", {}).get(request.sid)
        if old_room and old_room != room:
            leave_room(old_room)
        join_room(room)
        join_server.rooms = getattr(join_server, "rooms", {})
        join_server.rooms[request.sid] = room
        chat_file = Config.SERVERS_DIR / room / "chat.json"
        emit("chat-history", load_json(chat_file, []) if chat_file.exists() else [])

    @socketio.on("disconnect")
    def disconnected():
        getattr(join_server, "rooms", {}).pop(request.sid, None)

    @socketio.on("send-chat-message")
    def send_chat_message(data):
        if not isinstance(data, dict) or not data.get("room"):
            return
        room = str(data["room"])
        if not room.replace("-", "").replace("_", "").isalnum():
            return
        message = {"name": data.get("name", "Unknown"), "message": data.get("message", ""), "pic": data.get("pic") or "", "time": datetime.now(timezone.utc).isoformat()}
        socketio.emit("chat-message", message, room=room)
        chat_file = Config.SERVERS_DIR / room / "chat.json"
        messages = load_json(chat_file, [])
        messages.append(message)
        save_json(chat_file, messages)

    @socketio.on("typing")
    def typing(data):
        if isinstance(data, dict) and data.get("room"):
            emit("typing", data, room=data["room"], include_self=False)

    @socketio.on("stop-typing")
    def stop_typing(data):
        if isinstance(data, dict) and data.get("room"):
            emit("stop-typing", data, room=data["room"], include_self=False)
