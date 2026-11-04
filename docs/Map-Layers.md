# 🗺️ Map layers tab

aprs.fi can get crowded. This tab lets you **hide** kinds of things on the map so the mesh nodes and coverage are easier to see. Nothing is deleted. Hidden things are just made invisible, and they come back the moment you turn them on again.

## Main toggles

| Toggle | Hides or shows |
|---|---|
| **Moving stations** | Cars, hikers, trackers, anything that moves |
| **Fixed stations** | Home stations, digipeaters, iGates |
| **Weather** | Weather stations |
| **Objects** | Every APRS object. The rows under it hide one kind at a time (see below). |
| **Winlink position reports** | GPS reports that Winlink copies onto APRS (a **P** in a red diamond, sent from **WINLINK** to **APWL2K**). On adds a blue ring and keeps aprs.fi's own info box. Off hides those reports. Winlink gateways are left as they are. |
| **FT8 spots** | **Off** until you turn it on. Teal dots for FT8 stations from PSKReporter, at the middle of their grid square. |
| **Items** | APRS items |
| **AIS ships** | Ships from AIS |
| **Aircraft (ADS-B)** | Aircraft |

Next to the toggles, a counter shows how much is visible, e.g. **"812 of 1,240 map points showing"**. **Show all** and **Hide all** buttons switch every toggle (including object types and the Advanced ones) at once.

## Object types

Under **Objects**, six rows split APRS objects by the symbol aprs.fi already uses. Each row shows that symbol, and the **ⓘ** button explains it in plain language. Your choices are remembered.

| Toggle | What it hides | Symbol it uses |
|---|---|---|
| **Repeaters & towers** | Digipeaters, repeater towers, gateways, nodes and antennas | Repeater tower |
| **Weather & alerts** | Weather stations, storms, tornadoes, floods and similar warnings | Weather station |
| **Events** | Camps, picnics and parks | Picnic / park |
| **Emergency** | Police, fire, ambulance, hospitals and shelters | Emergency |
| **Generic markers** | Plain dots, numbered circles and crosses | Red dot |
| **Other objects** | Everything else (shops, ships, restrooms, and any symbol that does not fit above) | Question mark |

**Objects** is the master switch. Turn it off and every object disappears, whatever the rows say. Turn it on, then untick one row to hide just that kind. The rows look faded while **Objects** is off, so you can see they are waiting.

A real weather station, ship or home station is **not** an object. Those stay on **Weather**, **AIS ships** or **Fixed stations**, even when they use a similar picture. **Items** stay on the **Items** row.

**Winlink position reports** are only the GPS positions Winlink posts as APRS objects. aprs.fi already shows who they are and when they were heard, so Mesh Tools does not replace that box. It only adds a blue ring, or hides them if you turn the switch off. A Winlink gateway (a station that is itself a gateway) is not one of these reports, and this switch does not hide it.

**FT8 spots** stays off until you turn it on. Then Mesh Tools asks [PSKReporter](https://www.pskreporter.info/pskdev.html) for FT8 reports in the grid square at the middle of the map (`modify=grid`, mode FT8, about the last hour). PSKReporter asks apps not to query more than once every 5 minutes, so Mesh Tools waits at least that long, and it remembers the last answer so a reload in that window does not ask again. Zoomed far out, it uses the wider 2-letter grid. Each dot is the middle of the station's grid square, not a precise GPS fix. Tap a dot for the callsign, band and frequency, SNR, time, and who heard them. **Show all** does not turn this on, because it downloads from another site.

## Advanced

| Toggle | Hides or shows |
|---|---|
| **Callsign labels** | The text labels beside stations |
| **Track lines** | Lines showing where stations have travelled |
| **Old positions (track dots)** | Dots at earlier positions along a track |
| **Direction-of-travel lines** | Short lines showing which way something is heading |
| **Relay path lines (on hover)** | The lines aprs.fi draws through digipeaters/iGates when you hover a station |
| **Range circles (PHG)** | Circles from stations' power/height/gain (PHG) reports |

## Good to know

- New stations keep arriving, so the map is re-checked **every 5 seconds** and after you move it. Newly arrived points follow your toggles.
- Your choices are remembered between visits.
- If an old *aprs.fi Map Layer Toggles* script is on, this tab stays off and aprs.fi shows everything as normal (see [Installation](Installation.md#step-3-turn-off-the-old-separate-scripts-if-you-had-them))
- Mesh nodes and coverage shading are *not* affected by these toggles. Use the 📡 and 📶 tabs for those.
- This tab works by reading aprs.fi's own internal map data. If aprs.fi changes how its map works, some toggles may stop working until Mesh Tools is updated. Please [report it](Troubleshooting.md#reporting-a-problem).
- Object types follow aprs.fi's symbol table. A letter or number drawn on top of a symbol (an overlay) is grouped with the alternate-table symbol underneath, the same way aprs.fi names it. If an object has no symbol, it counts as **Other objects**.
- Older positions along an object's track follow that object's type, and also the **Old positions** switch under Advanced.
