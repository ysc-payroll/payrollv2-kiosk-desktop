# -*- mode: python ; coding: utf-8 -*-
import sys
import os
from pathlib import Path

block_cipher = None

# Find PyQt6 and QtWebEngine paths
import PyQt6
pyqt6_path = Path(PyQt6.__file__).parent
qt6_path = pyqt6_path / 'Qt6'

# Build paths for QtWebEngine resources
qt_webengine_resources = []
qt_webengine_binaries = []

# Add QtWebEngine resources and translations
resources_path = qt6_path / 'resources'
translations_path = qt6_path / 'translations'
libexec_path = qt6_path / 'libexec'

if resources_path.exists():
    qt_webengine_resources.append((str(resources_path), 'PyQt6/Qt6/resources'))
if translations_path.exists():
    qt_webengine_resources.append((str(translations_path), 'PyQt6/Qt6/translations'))

# Add QtWebEngineProcess helper binary
if sys.platform == 'darwin':
    # macOS - QtWebEngineProcess is in libexec
    helper_path = libexec_path / 'QtWebEngineProcess.app'
    if helper_path.exists():
        qt_webengine_binaries.append((str(helper_path), 'PyQt6/Qt6/libexec'))
elif sys.platform == 'win32':
    # Windows
    helper_path = qt6_path / 'QtWebEngineProcess.exe'
    if helper_path.exists():
        qt_webengine_binaries.append((str(helper_path), 'PyQt6/Qt6'))

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=qt_webengine_binaries,
    datas=[
        ('../frontend/dist', 'frontend/dist'),  # Include built frontend
        ('database', 'database'),  # Include database folder
    ] + qt_webengine_resources,
    hiddenimports=[
        'PyQt6.QtCore',
        'PyQt6.QtGui',
        'PyQt6.QtWidgets',
        'PyQt6.QtWebEngineWidgets',
        'PyQt6.QtWebChannel',
        'PyQt6.QtWebEngineCore',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
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
    name='Timekeeper Payroll',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # No console for production
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='../icons/icon.icns'  # Path to your icon
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='Timekeeper Payroll',
    # Output to project root dist directory
    # DISTPATH is set via pyinstaller --distpath ../dist
)

app = BUNDLE(
    coll,
    name='Timekeeper Payroll.app',
    icon='../icons/icon.icns',  # Path to your icon
    bundle_identifier='com.theabba.timekeeper-payroll',
    info_plist={
        'CFBundleName': 'Timekeeper Payroll',
        'CFBundleDisplayName': 'Timekeeper Payroll',
        'CFBundleVersion': '2.0.0',
        'CFBundleShortVersionString': '2.0.0',
        'NSHighResolutionCapable': True,
        'LSBackgroundOnly': False,  # Ensure app shows UI
        'NSCameraUsageDescription': 'Timekeeper Payroll needs camera access to capture employee photos for time logging and facial recognition.',
        'NSMicrophoneUsageDescription': 'Timekeeper Payroll may need microphone access for video recording features.',
    },
)
