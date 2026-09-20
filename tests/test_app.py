import json
from pathlib import Path

import pytest

from app.main import app
from app.config import Config


@pytest.fixture
def client(tmp_path, monkeypatch):
    users = tmp_path / "users.json"
    servers = tmp_path / "servers"
    servers.mkdir()
    users.write_text(json.dumps([{"username": "Owner", "password": "adminpass", "profilePic": "", "isOwner": True}]))
    monkeypatch.setattr(Config, "USERS_FILE", users)
    monkeypatch.setattr(Config, "SERVERS_DIR", servers)
    return app.test_client()


def test_signup_and_login_preserve_legacy_and_hash_new_users(client):
    response = client.post("/signup", json={"username": "new-user", "password": "secret"})
    assert response.status_code == 200
    stored = json.loads(Config.USERS_FILE.read_text())
    assert stored[-1]["password"] != "secret"
    assert client.post("/login", json={"username": "new-user", "password": "secret"}).status_code == 200
    assert client.post("/login", json={"username": "Owner", "password": "adminpass"}).status_code == 200


def test_servers_and_static_page(client):
    assert client.get("/").status_code == 200
    assert client.post("/servers", json={"name": "General", "owner": "Owner"}).status_code == 200
    assert len(client.get("/servers").get_json()) == 1
