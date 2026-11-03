# 📡 Mesh nodes tab

This tab puts **MeshCore** and **Meshtastic** radios on the aprs.fi map, next to the normal APRS stations.

## What you see on the map

Nodes only appear once you're **zoomed in to zoom level 6 or closer** (roughly a region or state). Further out, the status line says *"Zoom in closer to see them"*.

### MeshCore (diamonds ◆)

| Marker | Colour | Meaning |
|---|---|---|
| ◆**R** | red | **Repeater**: passes messages on, extending the mesh |
| ◆**C** | blue | **Companion**: someone's personal radio (usually paired with a phone) |
| ◆**S** | purple | **Room server**: a chat room that stores messages |
| ◆**s** | teal | **Sensor** |

### Meshtastic (green dots ●M)

Every Meshtastic node is a green circle with **M**. Only nodes whose position reaches the internet (through an MQTT gateway) are listed on meshmap.net, so many local Meshtastic radios **won't** appear.

### Node popups

Tap or click any node to see its details:

- **MeshCore:** type, last heard (as "x min/hours/days ago" plus the date and time), position, frequency, radio settings (bandwidth, spreading factor, coding rate), how it was reported, first-seen date, and a short ID (the first 12 characters of its public key).
- **Meshtastic:** role, hardware model, last heard, position, short name, region, modem preset, firmware, altitude, battery (or "plugged in"), nodes nearby, how many internet gateways heard it, and its `!xxxxxxxx` ID.

For MeshCore **repeaters and room servers**, the popup also has a **📶 Coverage** section, so you can show coverage straight from here. See [Coverage](Coverage.md).

Hover over a marker (desktop) to see a small label such as *"MeshCore Repeater: Hilltop"*.

## Settings

| Setting | Options (default **bold**) | What it does |
|---|---|---|
| **Show MeshCore nodes** | **On** / off | Shows or hides MeshCore radios from map.meshcore.io, both the ◆ markers and the plain round dots the Coverage tab draws for repeaters (red) and chat rooms (purple). Hiding works zoomed in or zoomed out. The line under it explains the symbols and shows a status, e.g. *"42 here"*, *"400 nearest of 913 here"*, *"None here"*, *"Hidden"*. |
| **Show Meshtastic nodes** | **On** / off | Shows or hides Meshtastic radios from meshmap.net. |
| **Heard from in the last** *(Advanced)* | 1, 7, **30**, 90 days | Hides nodes not heard from in this many days, so old or switched-off radios disappear. Nodes with no "last heard" time are always shown. |
| **Most nodes to draw** *(Advanced)* | 100, **400**, 1000 | The most markers drawn **per network** (MeshCore and Meshtastic separately). If more are in view, the ones **nearest the centre of the map** are drawn. Lower this if the map feels slow on your phone. |
| **⟳ Download fresh node lists** *(Advanced)* | button | Downloads both lists again right now, ignoring the saved copy. |

All settings are remembered between visits.

## How the data is loaded

- The **MeshCore** list (`map.meshcore.io/api/v1/nodes`) is large. The first download can take up to a minute, and the status line says *"Loading… (first time can take up to a minute)"*. The Coverage tab reuses the same download, so it's never fetched twice at once.
- The **Meshtastic** list comes from `meshmap.net/nodes.json`.
- Lists are kept in memory for **10 minutes**. Moving or zooming the map after that downloads them again.
- Markers are redrawn about 0.6 seconds after you stop moving the map. Only nodes in (or just around) the visible area are drawn.
- If a download fails, a red box explains why (for example *"no internet connection, or the site is blocked"* or *"it took too long"*). Tap **↻ Retry**.

The map data comes from public community services. Positions are whatever each radio advertised, which may be approximate or deliberately offset by its owner.
