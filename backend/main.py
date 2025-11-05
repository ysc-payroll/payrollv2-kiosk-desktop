"""
Main PyQt6 application entry point.
Creates fullscreen kiosk window with embedded Vue.js frontend.
"""
import sys
import os
from pathlib import Path
from PyQt6.QtWidgets import QApplication, QMainWindow
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtCore import QUrl
from bridge import KioskBridge


class KioskWindow(QMainWindow):
    """Main kiosk application window."""

    def __init__(self):
        super().__init__()
        self.init_ui()
        self.setup_bridge()
        self.create_menu_bar()

    def init_ui(self):
        """Initialize the UI components."""
        self.setWindowTitle("Timekeeper Kiosk")

        # Create web view
        self.browser = QWebEngineView()
        self.setCentralWidget(self.browser)

        # Enable camera/microphone permissions
        from PyQt6.QtWebEngineCore import QWebEnginePage, QWebEngineSettings

        settings = self.browser.page().settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.ScreenCaptureEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)

        # Enable developer tools (F12 to open)
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptEnabled, True)

        # DISABLE CACHE to force reload of JS files during development
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)
        from PyQt6.QtWebEngineCore import QWebEngineProfile
        profile = self.browser.page().profile()
        profile.setHttpCacheType(QWebEngineProfile.HttpCacheType.NoCache)
        print("🔄 Cache disabled - JavaScript will reload on every restart")

        # Handle feature permission requests (camera/microphone)
        self.browser.page().featurePermissionRequested.connect(self.on_feature_permission_requested)

        # Enable console messages (for debugging)
        self.browser.page().javaScriptConsoleMessage = self.on_console_message

        # Set up web channel for Python-JS communication
        self.channel = QWebChannel()
        self.browser.page().setWebChannel(self.channel)

        # Enable fullscreen kiosk mode
        self.showFullScreen()

        # Load Vue.js frontend
        self.load_frontend()

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
        """Load the Vue.js frontend from the dist folder or dev server."""
        # Check if production build exists
        frontend_dist = Path(__file__).parent.parent / "frontend" / "dist" / "index.html"

        if frontend_dist.exists():
            # Load production build
            url = QUrl.fromLocalFile(str(frontend_dist.absolute()))
            self.browser.setUrl(url)
            print(f"Loading production build from: {frontend_dist}")
        else:
            # Load from Vite dev server (default: http://localhost:5173)
            dev_url = "http://localhost:5173"
            self.browser.setUrl(QUrl(dev_url))
            print(f"Loading dev server from: {dev_url}")
            print("Make sure Vite dev server is running: cd frontend && npm run dev")

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
    app = QApplication(sys.argv)
    app.setApplicationName("Timekeeper Kiosk")

    # Create and show main window
    window = KioskWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
