# Saydrop icons

`generate.py` draws the app icon and the tray icons as SVG and renders them with
`rsvg-convert` (Homebrew: `brew install librsvg`). Run it from this folder:

```bash
python3 generate.py
```

Then create every platform size from the app icon and copy the files that
already exist in `src-tauri/icons/`:

```bash
npx tauri icon design/saydrop-icons/app-icon.png -o /tmp/saydrop-icons
```

Tray files: `tray-idle.png` (idle), `tray-dictating.png` → `src-tauri/icons/tray-microphone.png`,
and `frame_00.png`…`frame_11.png` → `src-tauri/icons/tray-spinner/`.
