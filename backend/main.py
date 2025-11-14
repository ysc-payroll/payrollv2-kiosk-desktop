"""
Main PyQt6 application entry point.
Creates fullscreen kiosk window with embedded Vue.js frontend.
"""
import sys
import os
import logging
import threading
from pathlib import Path
from datetime import datetime

# CRITICAL: Set QtWebEngineProcess path BEFORE importing PyQt6
# This must happen before any PyQt6 imports
if getattr(sys, 'frozen', False):
    # Running as PyInstaller bundle
    base_path = Path(sys._MEIPASS)

    # Try primary path (with symlink)
    qtwebengine_process = base_path / "PyQt6" / "Qt6" / "lib" / "QtWebEngineCore.framework" / "Helpers" / "QtWebEngineProcess.app" / "Contents" / "MacOS" / "QtWebEngineProcess"

    if not qtwebengine_process.exists():
        # Try alternative path (Versions/A)
        qtwebengine_process = base_path / "PyQt6" / "Qt6" / "lib" / "QtWebEngineCore.framework" / "Versions" / "A" / "Helpers" / "QtWebEngineProcess.app" / "Contents" / "MacOS" / "QtWebEngineProcess"

    if qtwebengine_process.exists():
        os.environ['QTWEBENGINEPROCESS_PATH'] = str(qtwebengine_process)
        # Write to stderr BEFORE logging is set up
        if sys.stderr:
            sys.stderr.write(f"[QTWEBENGINE] Set QTWEBENGINEPROCESS_PATH={qtwebengine_process}\n")
            sys.stderr.flush()
    else:
        if sys.stderr:
            sys.stderr.write(f"[QTWEBENGINE] QtWebEngineProcess NOT FOUND at {qtwebengine_process}\n")
            sys.stderr.flush()

from http.server import HTTPServer, SimpleHTTPRequestHandler
from PyQt6.QtWidgets import QApplication, QMainWindow
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtCore import QUrl
from bridge import KioskBridge
from database import get_app_data_dir

# Setup logging to file in app data directory (same folder as database)
app_data_dir = get_app_data_dir()
log_file = app_data_dir / "timekeeper_debug.log"
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, mode='a'),  # Append mode to keep logs across sessions
        logging.StreamHandler(sys.stderr)  # Also print to console
    ]
)
logger = logging.getLogger(__name__)

logger.info("="*80)
logger.info("TIMEKEEPER PAYROLL APPLICATION STARTING")
logger.info(f"App data directory: {app_data_dir}")
logger.info(f"Log file: {log_file}")
logger.info(f"Python version: {sys.version}")
logger.info(f"Platform: {sys.platform}")
logger.info(f"Frozen (PyInstaller): {getattr(sys, 'frozen', False)}")
if getattr(sys, 'frozen', False):
    logger.info(f"_MEIPASS: {sys._MEIPASS}")
logger.info("="*80)


class LocalHTTPRequestHandler(SimpleHTTPRequestHandler):
    """Custom HTTP request handler for serving frontend files."""

    def __init__(self, *args, directory=None, **kwargs):
        self.directory_to_serve = directory
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, format, *args):
        """Override to use our logger instead of printing to stderr."""
        logger.debug(f"HTTP: {format % args}")


def start_local_server(directory, port=8765):
    """
    Start a local HTTP server to serve frontend files.
    This solves CORS issues by serving from http://localhost instead of file://

    Args:
        directory: Path to the directory to serve (frontend/dist)
        port: Port number (default: 8765)

    Returns:
        HTTPServer instance
    """
    logger.info(f"Starting local HTTP server on port {port}")
    logger.info(f"Serving directory: {directory}")

    handler = lambda *args, **kwargs: LocalHTTPRequestHandler(
        *args, directory=str(directory), **kwargs
    )

    try:
        server = HTTPServer(('localhost', port), handler)

        # Start server in daemon thread (will exit when main app exits)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()

        logger.info(f"✅ Local HTTP server started successfully on http://localhost:{port}")
        return server

    except OSError as e:
        if e.errno == 48:  # Address already in use
            logger.error(f"❌ Port {port} is already in use!")
            logger.error("Another instance might be running or another app is using this port")
        raise


class KioskWindow(QMainWindow):
    """Main kiosk application window."""

    def __init__(self):
        logger.info("KioskWindow.__init__() starting")
        try:
            super().__init__()
            logger.info("QMainWindow initialized")
            self.init_ui()
            logger.info("UI initialized")
            self.setup_bridge()
            logger.info("Bridge setup complete")
            self.create_menu_bar()
            logger.info("Menu bar created")
            logger.info("KioskWindow.__init__() completed successfully")
        except Exception as e:
            logger.error(f"ERROR in KioskWindow.__init__(): {e}", exc_info=True)
            raise

    def init_ui(self):
        """Initialize the UI components."""
        logger.info("init_ui() starting")
        self.setWindowTitle("Timekeeper Kiosk")
        logger.info("Window title set")

        # Create web view
        logger.info("=" * 60)
        logger.info("STEP 1: About to import QWebEngineView")
        from PyQt6.QtWebEngineWidgets import QWebEngineView as WebView
        logger.info("STEP 2: QWebEngineView imported successfully")

        logger.info("STEP 3: About to instantiate QWebEngineView()")
        self.browser = WebView()
        logger.info("STEP 4: QWebEngineView instantiated successfully")

        logger.info("STEP 5: About to set as central widget")
        self.setCentralWidget(self.browser)
        logger.info("STEP 6: Web view set as central widget successfully")
        logger.info("=" * 60)

        # Enable camera/microphone permissions
        logger.info("STEP 7: About to import QWebEnginePage and QWebEngineSettings")
        from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineSettings
        logger.info("STEP 8: QWebEngineCore imports successful")

        logger.info("STEP 9: About to get page settings")
        settings = self.browser.page().settings()
        logger.info("STEP 10: Got page settings")

        logger.info("STEP 11: Configuring settings attributes")
        settings.setAttribute(QWebEngineSettings.WebAttribute.ScreenCaptureEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)

        # Windows-specific: Disable hardware acceleration to prevent blinking/flickering
        # This fixes the issue where opening camera dialogs causes the entire app to blink
        if sys.platform == 'win32':
            logger.info("STEP 11a: Applying Windows-specific settings")
            settings.setAttribute(QWebEngineSettings.WebAttribute.Accelerated2dCanvasEnabled, False)
            settings.setAttribute(QWebEngineSettings.WebAttribute.WebGLEnabled, False)
            logger.info("STEP 11b: Hardware acceleration disabled for Windows")

        logger.info("STEP 12: Settings attributes configured")

        logger.info("STEP 13: About to configure cache settings")
        from PyQt6.QtWebEngineCore import QWebEngineProfile
        profile = self.browser.page().profile()
        profile.setHttpCacheType(QWebEngineProfile.HttpCacheType.NoCache)
        logger.info("STEP 14: Cache disabled - JavaScript will reload on every restart")

        # Handle feature permission requests (camera/microphone)
        self.browser.page().featurePermissionRequested.connect(self.on_feature_permission_requested)
        logger.info("Feature permission handler connected")

        # Enable console messages (for debugging)
        self.browser.page().javaScriptConsoleMessage = self.on_console_message
        logger.info("Console message handler set")

        # Set up web channel for Python-JS communication
        self.channel = QWebChannel()
        self.browser.page().setWebChannel(self.channel)
        logger.info("WebChannel created and set")

        # Enable fullscreen kiosk mode
        self.showFullScreen()
        logger.info("Window set to fullscreen mode")

        # Load Vue.js frontend
        logger.info("About to load frontend")
        self.load_frontend()
        logger.info("Frontend load initiated")

    def on_feature_permission_requested(self, origin, feature):
        """Handle permission requests for camera, microphone, etc."""
        from PyQt6.QtWebEngineCore import QWebEnginePage

        # Grant all camera/microphone permissions automatically
        if feature in [
            QWebEnginePage.Feature.MediaAudioCapture,
            QWebEnginePage.Feature.MediaVideoCapture,
            QWebEnginePage.Feature.MediaAudioVideoCapture
        ]:
            self.browser.page().setFeaturePermission(
                origin, feature, QWebEnginePage.PermissionPolicy.PermissionGrantedByUser
            )
            print(f"Granted permission: {feature} for {origin}")

    def on_console_message(self, level, message, line, source):
        """Print JavaScript console messages to terminal."""
        print(f"js: {message}")

    def setup_bridge(self):
        """Set up the Python-JavaScript bridge."""
        self.bridge = KioskBridge(parent=self)
        self.channel.registerObject("kioskBridge", self.bridge)

    def load_frontend(self):
        """Load the Vue.js frontend from local HTTP server or dev server."""
        logger.info("load_frontend() starting")
        try:
            # Check for DEV_MODE environment variable
            dev_mode = os.environ.get('DEV_MODE', 'false').lower() == 'true'

            if dev_mode:
                # Development mode: Use Vite dev server
                dev_url = "http://localhost:5173"
                logger.info(f"🔧 DEV_MODE enabled - Loading from Vite dev server: {dev_url}")
                logger.info("Make sure Vite dev server is running: cd frontend && npm run dev")
                self.browser.setUrl(QUrl(dev_url))
                return

            # Production mode: Check if running from PyInstaller bundle
            if getattr(sys, 'frozen', False):
                # Running in PyInstaller bundle
                base_path = Path(sys._MEIPASS)
                frontend_dist = base_path / "frontend" / "dist"
                logger.info(f"Running in PyInstaller bundle, base_path: {base_path}")
            else:
                # Running in normal Python environment
                base_path = Path(__file__).parent.parent
                frontend_dist = base_path / "frontend" / "dist"
                logger.info(f"Running in normal Python, base_path: {base_path}")

            logger.info(f"Looking for frontend directory at: {frontend_dist}")
            logger.info(f"Frontend directory exists: {frontend_dist.exists()}")

            if frontend_dist.exists():
                # Start local HTTP server to serve frontend
                # This solves CORS issues by using http://localhost instead of file://
                port = 8765
                self.http_server = start_local_server(frontend_dist, port=port)

                # Load from local HTTP server
                url = f"http://localhost:{port}/index.html"
                logger.info(f"✅ Loading frontend from local HTTP server: {url}")
                self.browser.setUrl(QUrl(url))
                logger.info("Frontend URL set in browser")
            else:
                # Fallback to Vite dev server
                dev_url = "http://localhost:5173"
                logger.warning(f"Frontend dist not found! Falling back to dev server: {dev_url}")
                self.browser.setUrl(QUrl(dev_url))
                logger.info("Make sure Vite dev server is running: cd frontend && npm run dev")
        except Exception as e:
            logger.error(f"ERROR in load_frontend(): {e}", exc_info=True)
            raise

    def create_menu_bar(self):
        """Create menu bar with File, View, Window, and Help menus."""
        menubar = self.menuBar()

        # File menu
        file_menu = menubar.addMenu("&File")
        exit_action = file_menu.addAction("E&xit")
        exit_action.triggered.connect(self.close)

        # View menu
        view_menu = menubar.addMenu("&View")

        # Developer tools
        dev_tools_action = view_menu.addAction("&Developer Tools")
        dev_tools_action.setShortcut("F12")
        dev_tools_action.triggered.connect(self.open_dev_tools)

        # Window menu
        window_menu = menubar.addMenu("&Window")

        # Toggle fullscreen
        fullscreen_action = window_menu.addAction("&Fullscreen")
        fullscreen_action.setCheckable(True)
        fullscreen_action.setChecked(True)
        fullscreen_action.triggered.connect(self.toggle_fullscreen)

        # Help menu
        help_menu = menubar.addMenu("&Help")

        # About
        about_action = help_menu.addAction("&About")
        about_action.triggered.connect(self.show_about)

    def toggle_fullscreen(self):
        """Toggle fullscreen mode."""
        if self.isFullScreen():
            self.showNormal()
        else:
            self.showFullScreen()

    def open_dev_tools(self):
        """Open developer tools in a separate window."""
        from PyQt6.QtWebEngineWidgets import QWebEngineView

        # Create dev tools window if it doesn't exist
        if not hasattr(self, 'dev_tools_view'):
            self.dev_tools_view = QWebEngineView()
            self.dev_tools_view.setWindowTitle("Developer Tools - Timekeeper Kiosk")
            self.dev_tools_view.resize(1024, 768)

        # Attach dev tools to main page
        self.browser.page().setDevToolsPage(self.dev_tools_view.page())
        self.dev_tools_view.show()
        print("Developer tools opened")

    def show_about(self):
        """Show about dialog."""
        from PyQt6.QtWidgets import QMessageBox
        QMessageBox.about(
            self,
            "About Timekeeper Kiosk",
            "Timekeeper Payroll v2.0\nDesktop Application\n\nBuilt with PyQt6 and Vue.js"
        )

    def keyPressEvent(self, event):
        """Handle key press events. ESC key exits fullscreen for development."""
        from PyQt6.QtCore import Qt

        # F12 opens developer tools
        if event.key() == Qt.Key.Key_F12:
            self.open_dev_tools()
        # Allow ESC to exit fullscreen during development
        elif event.key() == Qt.Key.Key_Escape:
            if self.isFullScreen():
                self.showNormal()
            else:
                self.close()
        else:
            super().keyPressEvent(event)


def main():
    """Application entry point."""
    logger.info("main() function starting")
    try:
        # Windows-specific: Disable GPU/hardware acceleration via command-line args
        # This prevents blinking/flickering when opening dialogs with camera streams
        if sys.platform == 'win32':
            logger.info("Applying Windows-specific GPU workarounds")
            os.environ['QTWEBENGINE_CHROMIUM_FLAGS'] = '--disable-gpu --disable-software-rasterizer --disable-gpu-compositing'

        logger.info("Creating QApplication")
        app = QApplication(sys.argv)
        app.setApplicationName("Timekeeper Kiosk")
        logger.info("QApplication created successfully")

        # Create and show main window
        logger.info("Creating KioskWindow")
        window = KioskWindow()
        logger.info("KioskWindow created successfully")

        logger.info("Showing window")
        window.show()
        logger.info("Window shown successfully")

        logger.info("Entering Qt event loop")
        sys.exit(app.exec())
    except Exception as e:
        logger.error(f"FATAL ERROR in main(): {e}", exc_info=True)
        raise


if __name__ == "__main__":
    main()
