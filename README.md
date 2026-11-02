# aprs.fi Mesh Tools

A Tampermonkey userscript that adds **MeshCore and Meshtastic nodes**, **terrain-based coverage estimates** and **map layer toggles** to [aprs.fi](https://aprs.fi), all in one touch-friendly panel.

<img src="docs/img/phone-coverage.png" alt="Mesh Tools coverage panel on a phone" width="320">

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/). On Chrome/Edge, also turn on **Allow User Scripts** in the extension's details ([how](docs/Installation.md)).
2. **[👉 One-click install aprs.fi Mesh Tools](https://github.com/thescrawler/aprsfi-mesh-tools/raw/main/aprsfi-mesh-tools.user.js)**
3. Open <https://aprs.fi>. The 🛰️ Mesh Tools panel appears in the bottom-right corner.

**On a phone?** Chrome can't run extensions. On Android, install Tampermonkey in **Firefox** or **Microsoft Edge** and open the install link there. On iPhone/iPad, install the **Tampermonkey** app, turn it on in **Settings, Safari, Extensions** (allow all websites), and open the link in **Safari**. If you only see code, you're in a browser without Tampermonkey. [Details](docs/Installation.md#installing-on-a-phone)

Tampermonkey keeps it updated automatically from this repository. A Greasy Fork listing is coming later.

## Documentation

📖 **[User guide](docs/Home.md)**: installation, every setting, how coverage is estimated, troubleshooting and FAQ.

## Beta

This is **beta** software. Coverage is a bare-earth signal-strength *estimate* only (terrain diffraction plus a typical LoRa link budget). Trees and buildings are not modelled. Please report problems in [Issues](https://github.com/thescrawler/aprsfi-mesh-tools/issues).

Not affiliated with aprs.fi, MeshCore or Meshtastic.

## License

[MIT](LICENSE) © 2026 thescrawler
