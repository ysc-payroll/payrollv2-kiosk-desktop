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
        print(f"[JS Console] {message} (line {line})")

    def setup_bridge(self):
        """Set up the Python-JavaScript bridge."""
        self.bridge = KioskBridge()
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

    def keyPressEvent(self, event):
        """Handle key press events. ESC key exits fullscreen for development."""
        from PyQt6.QtCore import Qt

        # Allow ESC to exit fullscreen during development
        if event.key() == Qt.Key.Key_Escape:
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
