# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for Data Streamliner desktop build.
Run from the data-streamliner/ directory:
    pyinstaller desktop/DataStreamliner.spec
"""
import os
import sys
from PyInstaller.utils.hooks import collect_all, collect_data_files

block_cipher = None

# Collect all data files needed by fastapi, sqlalchemy, passlib, jose
datas = []
datas += collect_data_files("fastapi")
datas += collect_data_files("starlette")
datas += collect_data_files("sqlalchemy")
datas += collect_data_files("passlib")
datas += collect_data_files("jose")
datas += collect_data_files("pydantic")
datas += collect_data_files("pydantic_settings")

# Include the compiled React frontend
static_dir = os.path.join("backend", "static")
if os.path.isdir(static_dir):
    datas += [(static_dir, "static")]

# Include the backend app package
datas += [("backend/app", "app")]

hiddenimports = [
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "uvicorn.main",
    "sqlalchemy.dialects.sqlite",
    "sqlalchemy.dialects.postgresql",
    "sqlalchemy.dialects.mysql",
    "pymysql",
    "passlib.handlers.argon2",
    "passlib.handlers.bcrypt",
    "jose.jwt",
    "jose.exceptions",
    "cryptography.hazmat.primitives.kdf.pbkdf2",
    "openpyxl",
    "pandas",
    "structlog",
]

a = Analysis(
    ["backend/desktop/app_launcher.py"],
    pathex=[os.getcwd(), "backend"],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["psycopg2", "asyncpg", "redis", "tkinter", "matplotlib"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="DataStreamliner",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,          # No terminal window on Windows
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon="desktop/assets/icon.ico",  # Windows icon (optional)
)

# macOS .app bundle
app = BUNDLE(
    exe,
    name="DataStreamliner.app",
    icon="desktop/assets/icon.icns",  # macOS icon (optional)
    bundle_identifier="in.starhealth.datastreamliner",
    info_plist={
        "CFBundleShortVersionString": "1.0.0",
        "CFBundleName": "Data Streamliner",
        "NSHighResolutionCapable": True,
    },
)
