# aprs.fi Mesh Tools

## 📲 Install (easiest way, works on phones)
In Tampermonkey, open the menu, choose **Utilities**, then **Import from URL**, and paste this link:

```
https://raw.githubusercontent.com/thescrawler/aprsfi-mesh-tools/main/aprsfi-mesh-tools.user.js
```

Tap **Install**. (On a computer you can also just click the one-click install link below.)

**aprs.fi Mesh Tools** is a free add-on (a *userscript*) for the [aprs.fi](https://aprs.fi) map. It adds one small panel to the map with three tools:

| Tab | What it does |
|---|---|
| 📡 **Mesh nodes** | Shows MeshCore and Meshtastic radios on the aprs.fi map, alongside the normal APRS stations. |
| 📶 **Coverage** | Shades roughly where a MeshCore repeater (or a spot you choose) can reach over the hills. |
| 🗺️ **Map layers** | Hides clutter on the aprs.fi map, such as ships, planes, track lines or labels. Nothing is deleted. |

Current version: **1.2.0-beta**. It runs in your web browser through the free **Tampermonkey** extension. It only runs on `aprs.fi` pages.

> **Beta software.** Coverage is an *estimate* from hills only. It does not include trees, buildings, or your radio's power and antenna gain. Read [How the coverage estimate works](Coverage.md#how-the-estimate-works) before relying on it.

## Quick links

- 🚀 **New here?** Start with [Installation](Installation.md).
- 📡 [Mesh nodes tab](Mesh-Nodes.md)
- 📶 [Coverage tab](Coverage.md), including every setting and how the estimate works
- 🗺️ [Map layers tab](Map-Layers.md)
- ⚙️ [The panel and its settings](Panel-and-Settings.md): moving it, units, ⓘ info buttons
- 🛠️ [Troubleshooting](Troubleshooting.md)
- ❓ [FAQ](FAQ.md)
- 🔒 [Privacy and data sources](Privacy-and-Data-Sources.md)
- 📝 [Changelog](Changelog.md)

## Five-minute tour

1. [Install Tampermonkey](Installation.md), then **[install the script](https://github.com/thescrawler/aprsfi-mesh-tools/raw/main/aprsfi-mesh-tools.user.js)**, then open <https://aprs.fi>.
2. A white **Mesh Tools** panel appears in the bottom-right corner. Read the welcome tip and tap **Got it**.
3. **Zoom in** on an area. MeshCore radios appear as coloured **◆ diamonds**, and Meshtastic radios as green **● M** dots.
4. Tap a red **◆R** repeater. In its popup, tap **Show coverage**. After a few seconds, a shaded area shows where it can probably reach.
5. Open the **Coverage** tab and tap **📍 Drop a pin to test a spot**, then tap the map. You'll see what a radio at that spot could reach.
6. Tap any small round **ⓘ** button in the panel for a one-line explanation of that setting.

## Links

- Source code and issues: <https://github.com/thescrawler/aprsfi-mesh-tools>
- Report a problem: <https://github.com/thescrawler/aprsfi-mesh-tools/issues>
- Licence: MIT

*This project is not affiliated with aprs.fi, MeshCore, Meshtastic, meshmap.net or Amazon Web Services.*
