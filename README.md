# aprs.fi Mesh Tools

## 📲 Install (easiest way, works on phones)
Firefox on Android is the usual way. Copy this link, open Tampermonkey's **Utilities** page, then use **Import from URL**.

```
https://raw.githubusercontent.com/thescrawler/aprsfi-mesh-tools/main/aprsfi-mesh-tools.user.js
```

1. Long-press the link and choose **Copy link** (or copy it from the box).
2. In Firefox, tap the menu (the three dots), then **Extensions**. Older Firefox says **Add-ons**. Tap **Tampermonkey**. If you already see a Tampermonkey icon, tap that instead.
3. Tap **Dashboard**.
4. At the top of the Dashboard, tap the **Utilities** tab. On a small screen those tabs sit in a row you can slide sideways until **Utilities** shows. Tampermonkey's own help says: if that tab is missing, set **Config mode** to **Beginner** or **Advanced**.
5. Find **Import from URL**, paste the link, and tap **Install**.
6. Tap **Install** again on the next page.

On a computer you can also click the one-click link below. Edge, Kiwi, and iPhone are a little different: [phone steps](docs/Installation.md#installing-on-a-phone).

A Tampermonkey userscript that adds **MeshCore and Meshtastic nodes**, **terrain-based coverage estimates** and **map layer toggles** to [aprs.fi](https://aprs.fi), all in one touch-friendly panel.

<img src="docs/img/phone-coverage.png" alt="Mesh Tools coverage panel on a phone" width="320">

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/). On Chrome/Edge, also turn on **Allow User Scripts** in the extension's details ([how](docs/Installation.md)).
2. **[👉 One-click install aprs.fi Mesh Tools](https://github.com/thescrawler/aprsfi-mesh-tools/raw/main/aprsfi-mesh-tools.user.js)**
3. Open <https://aprs.fi>. The 🛰️ Mesh Tools panel appears in the bottom-right corner.

**On a phone?** Chrome on a phone can't run extensions. On Android, install Tampermonkey in **Firefox** or **Microsoft Edge**. On iPhone or iPad, install the **Tampermonkey** app, then turn it on in **Settings**, **Safari**, **Extensions** and allow all websites. Then add the script like this:

1. Long-press the link below and choose **Copy link** (or copy it from the box).

```
https://raw.githubusercontent.com/thescrawler/aprsfi-mesh-tools/main/aprsfi-mesh-tools.user.js
```

2. Open Tampermonkey's **Dashboard**. Menus vary a little.
   - **Firefox (Android):** tap the **⋮** menu, then **Extensions** (older Firefox says **Add-ons**), then **Tampermonkey**. Or tap the Tampermonkey icon, then **Dashboard**.
   - **Edge (Android):** usually the **⋮** menu, then **Extensions**, then **Tampermonkey**, then **Dashboard**.
   - **Kiwi:** the same idea as Edge, if you already have it. Tampermonkey says Kiwi is no longer updated, so Firefox or Edge is safer.
   - **iPhone / iPad:** in Safari, usually the puzzle-piece or **aA** button, then **Tampermonkey**, then **Dashboard**. The Tampermonkey app has to be turned on for Safari first (see the link above).
3. At the top of the Dashboard, tap the **Utilities** tab. On a small screen, slide that tab row sideways until you see **Utilities**. If the tab is missing, Tampermonkey's help says to set **Config mode** to **Beginner** or **Advanced**.
4. Find **Import from URL**, paste the link, and tap **Install**.
5. Tap **Install** again on the next screen, then open <https://aprs.fi>.

[Details](docs/Installation.md#installing-on-a-phone)

Tampermonkey keeps it updated automatically from this repository. A Greasy Fork listing is coming later.

## Documentation

📖 **[User guide](docs/Home.md)**: installation, every setting, how coverage is estimated, troubleshooting and FAQ.

## Beta

This is **beta** software. Coverage is a bare-earth signal-strength *estimate* only (terrain diffraction plus a typical LoRa link budget). Trees and buildings are not modelled. Please report problems in [Issues](https://github.com/thescrawler/aprsfi-mesh-tools/issues).

Not affiliated with aprs.fi, MeshCore or Meshtastic.

## License

[MIT](LICENSE) © 2026 thescrawler
