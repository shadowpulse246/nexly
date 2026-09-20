# Vervra

Vervra is a Flask and Flask-SocketIO application with a preserved static frontend and JSON persistence.

## Install

```bash
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows
.venv\\Scripts\\activate
pip install -r requirements.txt
```

## Run

```bash
python server.py
```

The default address is http://localhost:3000/. Set `PORT` to override the port. Existing JavaScript frontend assets remain in `public/`; the Python backend is the production server.
