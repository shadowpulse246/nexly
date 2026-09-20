import json
import os
import sys
import time
from pathlib import Path

import requests
import socketio

BASE_URL = os.environ.get("VERVRA_BASE_URL", "http://127.0.0.1:3000")
DATA_DIR = Path(os.environ["VERVRA_DATA_DIR"])
SERVER_ID = os.environ["VERVRA_TEST_SERVER_ID"]


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def wait_for_history(client, expected=None, timeout=5):
    end = time.time() + timeout
    while time.time() < end:
        if expected is None and client.history:
            return client.history[-1]
        if expected is not None and any(item.get("message") == expected for item in client.history):
            return client.history[-1]
        time.sleep(0.05)
    raise AssertionError("Timed out waiting for chat-history")


class ChatClient:
    def __init__(self):
        self.sio = socketio.Client(logger=False, engineio_logger=False)
        self.history = []
        self.messages = []
        self.typing = []
        self.stopped = []
        self.sio.on("chat-history", lambda payload: self.history.append(payload))
        self.sio.on("chat-message", lambda payload: self.messages.append(payload))
        self.sio.on("typing", lambda payload: self.typing.append(payload))
        self.sio.on("stop-typing", lambda payload: self.stopped.append(payload))

    def connect(self):
        self.sio.connect(BASE_URL, transports=["polling"])

    def close(self):
        if self.sio.connected:
            self.sio.disconnect()



def main():
    pages = ["/", "/login.html", "/signup.html", "/bible.html", "/admin.html", "/premium.html", "/settings.html", "/tos.html", "/privacy.html", "/servers"]
    for page in pages:
        response = requests.get(BASE_URL + page, timeout=5)
        check(response.status_code == 200, f"{page}: {response.status_code}")

    username = "gha-integration-user"
    password = "gha-secret-password"
    signup = requests.post(BASE_URL + "/signup", json={"username": username, "password": password, "profilePic": ""}, timeout=5)
    check(signup.status_code == 200 and signup.json().get("success"), f"signup failed: {signup.text}")
    duplicate = requests.post(BASE_URL + "/signup", json={"username": username, "password": password}, timeout=5)
    check(duplicate.status_code != 200 or not duplicate.json().get("success"), "duplicate signup accepted")
    login = requests.post(BASE_URL + "/login", json={"username": username, "password": password}, timeout=5)
    check(login.status_code == 200 and login.json().get("success"), f"new login failed: {login.text}")
    invalid = requests.post(BASE_URL + "/login", json={"username": username, "password": "wrong"}, timeout=5)
    check(invalid.status_code != 200 or not invalid.json().get("success"), "invalid login accepted")

    legacy = requests.post(BASE_URL + "/login", json={"username": "Owner", "password": "adminpass"}, timeout=5)
    check(legacy.status_code == 200 and legacy.json().get("success"), "legacy login failed")

    server = requests.post(BASE_URL + "/servers", json={"name": "GHA Integration", "owner": "Owner", "icon": ""}, timeout=5)
    check(server.status_code == 200 and server.json().get("success"), f"server creation failed: {server.text}")
    created_id = server.json()["server"]["id"]
    check(created_id == SERVER_ID, f"unexpected server id: {created_id} != {SERVER_ID}")
    listed = requests.get(BASE_URL + "/servers", timeout=5).json()
    check(any(item.get("id") == SERVER_ID for item in listed), "created server missing from list")

    first = ChatClient()
    second = ChatClient()
    try:
        first.connect()
        second.connect()
        first.sio.emit("join-server", SERVER_ID)
        second.sio.emit("join-room", SERVER_ID, None)
        wait_for_history(first)
        wait_for_history(second)

        first.sio.emit("typing", {"name": "first", "room": SERVER_ID})
        end = time.time() + 5
        while time.time() < end and not second.typing:
            time.sleep(0.05)
        check(second.typing and second.typing[-1]["name"] == "first", "typing event missing")

        first.sio.emit("stop-typing", {"name": "first", "room": SERVER_ID})
        end = time.time() + 5
        while time.time() < end and not second.stopped:
            time.sleep(0.05)
        check(second.stopped, "stop-typing event missing")

        message = "github-actions-vervra-message"
        first.sio.emit("send-chat-message", {"name": "first", "message": message, "pic": "", "room": SERVER_ID})
        end = time.time() + 5
        while time.time() < end and not second.messages:
            time.sleep(0.05)
        check(second.messages and second.messages[-1]["message"] == message, "chat-message not delivered")
    finally:
        first.close()
        second.close()

    chat_file = DATA_DIR / "servers" / SERVER_ID / "chat.json"
    check(chat_file.exists(), "chat.json was not created")
    persisted = json.loads(chat_file.read_text(encoding="utf-8"))
    check(any(item.get("message") == "github-actions-vervra-message" for item in persisted), "message was not persisted")
    print("live Vervra HTTP and Socket.IO integration checks passed")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"integration failure: {error}", file=sys.stderr)
        raise
