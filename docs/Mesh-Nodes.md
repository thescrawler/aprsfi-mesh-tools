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
| ◆**?** | grey | **Other / unknown**: a type this list does not name |

### Meshtastic (green dots ●M)

Every Meshtastic node is a green circle with **M**. Only nodes whose position reaches the internet (through an MQTT gateway) are listed on meshmap.net, so many local Meshtastic radios **won't** appear.

### Node popups

Tap or click any node to see its details:

- **MeshCore:** type, last heard (as "x min/hours/days ago" plus the date and time), position, frequency, radio settings (bandwidth, spreading factor, coding rate), how it was reported, first-seen date, and a short ID (the first 12 characters of its public key).
- **Meshtastic:** role, hardware model, last heard, position, short name, region, modem preset, firmware, altitude, battery (or "plugged in"), nodes nearby, how many internet gateways heard it, and its `!xxxxxxxx` ID.

For MeshCore **repeaters and room servers**, the popup also has a **📶 Coverage** section, so you can show coverage straight from here. See [Coverage](Coverage.md).

Hover over a marker (desktop) to see a small label such as *"MeshCore Repeater: Hilltop"*.

A **gold ring** around a red ◆R or purple ◆S means that repeater or room server has **gone quiet**: no advert for longer than **Quiet after** (24 hours by default). The popup adds a line, **Silent for 1d 4h** (days and hours). Companions and sensors are not flagged. This uses the last-heard time already downloaded. It does not check the network any more often.

## Settings

| Setting | Options (default **bold**) | What it does |
|---|---|---|
| **Show MeshCore nodes** | **On** / off | Shows or hides every MeshCore radio from map.meshcore.io, both the ◆ markers and the plain round dots the Coverage tab draws for repeaters and chat rooms. Off hides them all, zoomed in or zoomed out. The status line says e.g. *"42 here"*, *"400 nearest of 913 here"*, *"None here"*, *"Hidden"*. |
| **Repeaters** | **On** / off | Red ◆R. Radios that pass messages along. Also hides the plain red repeater dots. Only applies while **Show MeshCore nodes** is on. |
| **Companions** | **On** / off | Blue ◆C. Someone's own radio, usually the chat node paired with a phone. |
| **Room servers** | **On** / off | Purple ◆S. Chat rooms that store messages. Also hides the plain purple room dots. |
| **Sensors** | **On** / off | Teal ◆s. Radios that report a sensor reading. |
| **Other / unknown** | **On** / off | Grey ◆?. Any MeshCore type that is not one of the four above. |
| **Flag gone-quiet repeaters** | **On** / off | Gold ring on MeshCore repeaters and room servers that have not been heard for longer than **Quiet after**. The popup says *Silent for Xd Yh*. |
| **Quiet after** | 12 hours, **24 hours**, 3 days, 7 days | How long with no advert before the gold ring appears. |
| **Gone quiet in view** | list, closed until you open it | Names of quiet repeaters and room servers in the current map view, longest silent first. |
| **Show Meshtastic nodes** | **On** / off | Shows or hides Meshtastic radios from meshmap.net. |
| **Heard from in the last** *(Advanced)* | 1, 7, **30**, 90 days | Hides nodes not heard from in this many days, so old or switched-off radios disappear. Nodes with no "last heard" time are always shown. |
| **Most nodes to draw** *(Advanced)* | 100, **400**, 1000 | The most markers drawn **per network** (MeshCore and Meshtastic separately). If more are in view, the ones **nearest the centre of the map** are drawn. Lower this if the map feels slow on your phone. |
| **⟳ Download fresh node lists** *(Advanced)* | button | Downloads both lists again right now, ignoring the saved copy. |

All settings are remembered between visits.

## How the data is loaded

- The **MeshCore** list (`map.meshcore.io/api/v1/nodes`) is large (about 55 MB). The download starts as soon as the aprs.fi page starts. The very first visit waits for that download. After that, the saved list is drawn straight away and a fresh copy loads in the background. The Coverage tab reuses the same download, so it's never fetched twice at once.
- The **Meshtastic** list comes from `meshmap.net/nodes.json`, with the same saved-list behaviour.
- A fresh list is kept for **10 minutes**. Moving the map does not download it again.
- Markers update about 0.6 seconds after you stop moving the map. Only nodes in (or just around) the visible area are drawn, and ones already on screen are left in place.
- If a download fails, a red box explains why (for example *"no internet connection, or the site is blocked"* or *"it took too long"*). Tap **↻ Retry**.

The map data comes from public community services. Positions are whatever each radio advertised, which may be approximate or deliberately offset by its owner.
