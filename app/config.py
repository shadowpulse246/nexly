import os
from pathlib import Path


class Config:
    ROOT_DIR = Path(__file__).resolve().parent.parent
    PUBLIC_DIR = ROOT_DIR / "public"
    DATA_DIR = Path(os.getenv("VERVRA_DATA_DIR", str(ROOT_DIR / "data"))).resolve()
    USERS_FILE = DATA_DIR / "users.json"
    SERVERS_DIR = DATA_DIR / "servers"
    PORT = int(os.getenv("PORT", "3000"))
    SECRET_KEY = os.getenv("VERVRA_SECRET_KEY", "change-this-in-production")
