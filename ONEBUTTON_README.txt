One-button build
=================
Put these files next to your manifest_gui.py (or manifest_gui_v2.py) and icon.icns.

- build.py (cross-platform builder; detects OS)
- build-mac.sh (shortcut to run the builder on macOS)
- build-win.bat (shortcut to run the builder on Windows)
- installer_win.iss (optional Windows installer for Inno Setup)

Usage
-----
macOS:  chmod +x build-mac.sh && ./build-mac.sh
Windows: Double-click build-win.bat
Linux:   python3 build.py

Outputs
-------
macOS: dist/manifest_gui.app  and  manifest_gui.dmg
Windows: dist/manifest_gui.exe
Linux: dist/manifest_gui

Notes
-----
- macOS uses icon.icns. Windows needs icon.ico. If icon.ico is missing but icon.icns exists, build.py will try to convert it using ImageMagick (`magick`). If not available, build proceeds without a custom icon.
- First run may install PyInstaller automatically.
