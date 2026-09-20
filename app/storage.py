import json
import os
import tempfile
from pathlib import Path

from .config import Config


def ensure_data_dirs():
    Config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    Config.SERVERS_DIR.mkdir(parents=True, exist_ok=True)
    if not Config.USERS_FILE.exists():
        save_json(Config.USERS_FILE, [])


def load_json(path: Path, default=None):
    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return [] if default is None else default


def save_json(path: Path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            json.dump(value, file, indent=2)
            file.write("\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def list_server_records():
    records = []
    for directory in sorted(Config.SERVERS_DIR.iterdir()) if Config.SERVERS_DIR.exists() else []:
        if directory.is_dir() and (directory / "server.json").is_file():
            record = load_json(directory / "server.json", None)
            if isinstance(record, dict):
                records.append(record)
    return records
