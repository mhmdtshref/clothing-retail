# Tauri wrapper (URL-mode)

This minimal config opens the production URL inside a native window.

Steps:
1. Install Tauri CLI and prerequisites per https://tauri.app
2. Set APP URL:
   export TAURI_APP_URL="https://your-domain.example.com"
3. Replace in config:
   sed -i.bak "s|__APP_URL__|$TAURI_APP_URL|g" src-tauri/tauri.conf.json
4. Dev:
   tauri dev
5. Build:
   tauri build

Later, you can bundle local assets or run a local server process.


