#!/usr/bin/env python3
import os, sys, shutil, subprocess, platform
from pathlib import Path

APP_FILE = "manifest_gui_v2.py" if Path("manifest_gui_v2.py").exists() else "manifest_gui.py"
APP_NAME = "manifest_gui"
ICON_ICNS = "icon.icns"
ICON_ICO = "icon.ico"

def run(cmd, check=True):
    print(">", " ".join(cmd))
    return subprocess.run(cmd, check=check)

def ensure_pyinstaller():
    try:
        import PyInstaller  # noqa
    except Exception:
        run([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
        run([sys.executable, "-m", "pip", "install", "pyinstaller"])

def ensure_windows_ico():
    # If icon.ico exists, use it
    if Path(ICON_ICO).exists():
        return True
    # If no icon.icns, give up (will build without icon)
    if not Path(ICON_ICNS).exists():
        return False
    # Try to convert icon.icns -> icon.ico using ImageMagick
    for tool in ("magick", "convert"):
        try:
            subprocess.run([tool, "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            print(f"Converting {ICON_ICNS} -> {ICON_ICO} with {tool} ...")
            if tool == "magick":
                cmd = [tool, ICON_ICNS, "-define", "icon:auto-resize=256,128,64,48,32,16", ICON_ICO]
            else:
                # fallback (coarse): resize to 256 and save .ico
                cmd = [tool, ICON_ICNS, "-resize", "256x256", ICON_ICO]
            run(cmd, check=True)
            return Path(ICON_ICO).exists()
        except Exception:
            continue
    print("WARNING: icon.ico not found and ImageMagick not available. Proceeding without custom icon.")
    return False

def build_mac():
    ensure_pyinstaller()
    icon_opt = ["--icon", ICON_ICNS] if Path(ICON_ICNS).exists() else []
    cmd = ["pyinstaller", "--noconfirm", "--windowed", "--onefile", "--name", APP_NAME, *icon_opt, APP_FILE]
    run(cmd)
    app = Path("dist") / f"{APP_NAME}.app"
    if app.exists():
        print(f"✅ Built {app}")
        # --- Ensure the .app uses our transparent icon.icns ---
        try:
            res_dir = app / "Contents" / "Resources"
            plist = app / "Contents" / "Info.plist"
            res_dir.mkdir(parents=True, exist_ok=True)
            if Path(ICON_ICNS).exists():
                dst_icns = res_dir / "AppIcon.icns"
                shutil.copy2(ICON_ICNS, dst_icns)
                # Update CFBundleIconFile to "AppIcon" (extension-less)
                if shutil.which("plutil"):
                    run(["plutil", "-replace", "CFBundleIconFile", "-string", "AppIcon", str(plist)], check=False)
                elif Path("/usr/libexec/PlistBuddy").exists():
                    run(["/usr/libexec/PlistBuddy", "-c", "Set :CFBundleIconFile AppIcon", str(plist)], check=False)
                # Best-effort: apply icon to the bundle for Finder immediately if fileicon is available
                if shutil.which("fileicon"):
                    run(["fileicon", "set", str(app), ICON_ICNS], check=False)
                # Nudge Finder to refresh icon cache for this bundle
                if Path("/usr/bin/touch").exists():
                    run(["/usr/bin/touch", str(app)], check=False)
        except Exception as _e:
            # Non-fatal: continue to DMG creation
            pass
        # If available, also create a DMG so users can drag to Applications
        if shutil.which("hdiutil"):
            root_dir = Path("build") / "dmgroot"
            shutil.rmtree(root_dir, ignore_errors=True)
            root_dir.mkdir(parents=True, exist_ok=True)
            # /Applications シンボリックリンク
            (root_dir / "Applications").symlink_to("/Applications")
            shutil.copytree(app, root_dir / app.name)
            dmg = Path(f"{APP_NAME}.dmg")
            run(["hdiutil", "create", "-volname", "Manifest GUI",
                 "-srcfolder", str(root_dir), "-ov", "-format", "UDZO", str(dmg)])
            print(f"✅ DMG: {dmg}")
    else:
        print("❌ Build failed (no .app found)")

def build_windows():
    ensure_pyinstaller()
    icon_opt = ["--icon", ICON_ICO] if ensure_windows_ico() else []
    cmd = ["pyinstaller", "--noconfirm", "--noconsole", "--onefile", "--name", APP_NAME, *icon_opt, APP_FILE]
    run(cmd)
    exe = Path("dist") / f"{APP_NAME}.exe"
    if exe.exists():
        print(f"✅ Built {exe}")
        print("Tip: If you need a proper installer, compile installer_win.iss with Inno Setup.")
    else:
        print("❌ Build failed (no .exe found)")

def build_linux():
    ensure_pyinstaller()
    cmd = ["pyinstaller", "--noconfirm", "--noconsole", "--onefile", "--name", APP_NAME, APP_FILE]
    run(cmd)
    binp = Path("dist") / APP_NAME
    if binp.exists():
        print(f"✅ Built {binp}")
    else:
        print("❌ Build failed (no binary found)")

def main():
    if not Path(APP_FILE).exists():
        print(f"ERROR: {APP_FILE} not found in current folder.")
        sys.exit(1)
    sysname = platform.system()
    print(f"Detected OS: {sysname}")
    if sysname == "Darwin":
        build_mac()
    elif sysname == "Windows":
        build_windows()
    else:
        build_linux()

if __name__ == "__main__":
    main()