from flask import Flask
from flask_socketio import SocketIO

from .config import Config
from .routes import register_routes
from .socket_handlers import register_socketio
from .storage import ensure_data_dirs


def create_app():
    ensure_data_dirs()
    app = Flask(__name__, static_folder=str(Config.PUBLIC_DIR), static_url_path="")
    app.config["SECRET_KEY"] = Config.SECRET_KEY
    socketio = SocketIO(app, cors_allowed_origins="*")
    register_routes(app)
    register_socketio(socketio)
    return app, socketio


app, socketio = create_app()
