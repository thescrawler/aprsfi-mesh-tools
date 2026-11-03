# aprs.fi Mesh Tools

## 📲 Install (easiest way, works on phones)
In Tampermonkey, open the menu, choose **Utilities**, then **Import from URL**, and paste this link:

```
https://raw.githubusercontent.com/thescrawler/aprsfi-mesh-tools/main/aprsfi-mesh-tools.user.js
```

Tap **Install**. (On a computer you can also just click the one-click install link below.)

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

2. Tap the Tampermonkey icon in the browser menu, then **Dashboard**. Menus vary a little. In Firefox it is usually the **⋮** menu, then **Extensions** or **Add-ons**, then **Tampermonkey**. In Edge it is usually the **⋮** menu, then **Extensions**, then **Tampermonkey**. In Safari it is usually the puzzle-piece or **aA** button, then **Tampermonkey**.
3. Open **Utilities**.
4. Under **Import from URL**, paste the link and tap **Install**.
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
