# -*- mode: python ; coding: utf-8 -*-
import sys
import os
from pathlib import Path

block_cipher = None

# PyInstaller's hook-PyQt6.QtWebEngineCore.py will automatically collect
# QtWebEngineProcess and resources when PyQt6.QtWebEngineCore is imported.
# We just need to ensure it's in hiddenimports.

# Collect face_recognition model files
try:
    import face_recognition_models
    face_models_path = Path(face_recognition_models.__file__).parent / 'models'
    face_models_datas = [(str(face_models_path), 'face_recognition_models/models')]
except ImportError:
    face_models_datas = []

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('../frontend/dist', 'frontend/dist'),  # Include built frontend
    ] + face_models_datas,  # Include face recognition model files
    hiddenimports=[
        'PyQt6.QtCore',
        'PyQt6.QtGui',
        'PyQt6.QtWidgets',
        'PyQt6.QtWebEngineWidgets',
        'PyQt6.QtWebChannel',
        'PyQt6.QtWebEngineCore',
        # Face recognition libraries (dynamically imported in bridge.py)
        'face_recognition',
        'face_recognition_models',
        'dlib',
        'cv2',
        'numpy',
        'PIL',
        'PIL.Image',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=['pyi_rth_qtwebengine.py'],  # Custom hook to set QTWEBENGINEPROCESS_PATH
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='TimekeeperPayroll',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # No console window for production
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='../icons/icon.ico' if os.path.exists('../icons/icon.ico') else None,
    version_file=None,  # Can add version_info.txt for Windows version resource
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='TimekeeperPayroll',
    # Output to project root dist directory
    # DISTPATH is set via pyinstaller --distpath ../dist
)
