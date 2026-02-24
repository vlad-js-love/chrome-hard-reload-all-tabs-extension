# Hard Reload All Tabs

A minimal Chrome extension that hard-reloads (bypasses cache) every open tab with a single click.

---

## Features

- **One-click hard reload** — forces all tabs to re-fetch assets from the server, ignoring cache
- **Live stats** — shows the number of open tabs and windows right in the popup
- **Progress bar** — tracks reload progress in real time
- **Sequential delay mode** — reload tabs one by one with a configurable pause (50 ms – 1 s) to avoid hammering your network or CPU
  - Delay value and toggle state are persisted between sessions
- **Non-intrusive** — system pages like `chrome://` are silently skipped without errors

---

## Installation

> The extension is not published on the Chrome Web Store. Install it manually as an unpacked extension.

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `chrome_extention_all_reload` folder

The extension icon will appear in the Chrome toolbar.

---

## Usage

1. Click the extension icon to open the popup
2. *(Optional)* Enable **Sequential Delay** and choose a pause interval
3. Click **Reload All Tabs**

All reachable tabs will perform a hard reload (`bypassCache: true`). The status bar confirms how many tabs were reloaded.

---

## Project Structure

```
chrome_extention_all_reload/
├── manifest.json       # MV3 extension manifest
├── popup.html          # Popup UI
├── popup.js            # Popup logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Permissions

| Permission | Reason |
|------------|--------|
| `tabs`     | Query all open tabs and trigger reload |
| `windows`  | Display the open-windows count in the popup |

---

## Options (planned)

- Reload only the active window
- Domain/URL exclusion list
- Reload only pinned / only unpinned tabs
- Keyboard shortcut support
- Auto-reload on a timer
- Reload history log
