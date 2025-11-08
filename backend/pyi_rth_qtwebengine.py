#-----------------------------------------------------------------------------
# Copyright (c) 2024, PyInstaller Development Team.
#
# Runtime hook for QtWebEngine to set QTWEBENGINEPROCESS_PATH
#-----------------------------------------------------------------------------

import os
import sys
from pathlib import Path

# When running as a PyInstaller bundle, set the QtWebEngineProcess path
if getattr(sys, 'frozen', False):
    # Get the base path where Qt libraries are bundled
    base_path = Path(sys._MEIPASS)

    # Construct path to QtWebEngineProcess helper
    qtwebengine_process = base_path / "PyQt6" / "Qt6" / "lib" / "QtWebEngineCore.framework" / "Helpers" / "QtWebEngineProcess.app" / "Contents" / "MacOS" / "QtWebEngineProcess"

    if qtwebengine_process.exists():
        # Set environment variable so QtWebEngine can find the helper process
        os.environ['QTWEBENGINEPROCESS_PATH'] = str(qtwebengine_process)
        print(f"✅ Runtime hook: Set QTWEBENGINEPROCESS_PATH to {qtwebengine_process}")
    else:
        print(f"⚠️  Runtime hook: QtWebEngineProcess not found at {qtwebengine_process}")
        # Try alternative path (with Versions/A)
        qtwebengine_process_alt = base_path / "PyQt6" / "Qt6" / "lib" / "QtWebEngineCore.framework" / "Versions" / "A" / "Helpers" / "QtWebEngineProcess.app" / "Contents" / "MacOS" / "QtWebEngineProcess"
        if qtwebengine_process_alt.exists():
            os.environ['QTWEBENGINEPROCESS_PATH'] = str(qtwebengine_process_alt)
            print(f"✅ Runtime hook: Set QTWEBENGINEPROCESS_PATH to {qtwebengine_process_alt} (alternative path)")
        else:
            print(f"❌ Runtime hook: QtWebEngineProcess NOT FOUND!")
