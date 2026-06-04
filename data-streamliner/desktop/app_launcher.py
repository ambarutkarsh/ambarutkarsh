"""
Desktop launcher for Data Streamliner.
This is the PyInstaller entry point — sets DESKTOP_MODE and starts uvicorn.
"""
import os
import sys

# Ensure the bundled app directory is on the path when frozen
if getattr(sys, "frozen", False):
    bundle_dir = sys._MEIPASS  # type: ignore[attr-defined]
    sys.path.insert(0, bundle_dir)

# Force desktop mode: SQLite, auto-browser, no Redis
os.environ.setdefault("DESKTOP_MODE", "true")
os.environ.setdefault("CACHE_ENABLED", "false")
os.environ.setdefault("APP_ENV", "production")
os.environ.setdefault("LOG_LEVEL", "WARNING")

# Generate a stable secret key derived from machine ID if not set
if not os.environ.get("SECRET_KEY") or os.environ["SECRET_KEY"].startswith("change"):
    import hashlib
    import platform
    seed = platform.node() + platform.machine() + "streamliner"
    os.environ["SECRET_KEY"] = hashlib.sha256(seed.encode()).hexdigest()

if not os.environ.get("ENCRYPTION_KEY") or os.environ["ENCRYPTION_KEY"].startswith("change"):
    import hashlib
    import platform
    seed = platform.node() + "encryption" + platform.processor()
    os.environ["ENCRYPTION_KEY"] = hashlib.sha256(seed.encode()).hexdigest()[:32]

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("APP_PORT", "8000"))
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=port,
        log_level="warning",
    )
