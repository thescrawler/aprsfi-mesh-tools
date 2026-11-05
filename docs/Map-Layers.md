# 🗺️ Map layers tab

aprs.fi can get crowded. This tab lets you **hide** kinds of things on the map so the mesh nodes and coverage are easier to see. Nothing is deleted. Hidden things are just made invisible, and they come back the moment you turn them on again.

## Main toggles

| Toggle | Hides or shows |
|---|---|
| **Moving stations** | Cars, hikers, trackers, anything that moves |
| **Fixed stations** | Home stations, digipeaters (radios that pass a packet along), and iGates (stations that copy packets to the internet) |
| **Weather stations** | Weather stations |
| **Objects** | Every APRS object. The rows under it hide one kind at a time (see below). |
| **Winlink position reports** | GPS reports that Winlink copies onto APRS (a **P** in a red diamond, sent from **WINLINK** to **APWL2K**). On adds a blue ring and keeps aprs.fi's own info box. Off hides those reports. Winlink gateways are left as they are. |
| **FT8 spots** | **Off** until you turn it on. Small teal dots for FT8 stations. Zoomed out, they become little count bubbles instead of covering the map. |
| **Activity squares** | **Off.** These are aprs.fi's own red and blue blocks when you zoom out (busy areas). On shows a faint outline only. |
| **Items** | APRS items (markers someone placed, a lot like objects) |
| **AIS ships** | Ships. AIS is the system boats use to report where they are. |
| **Aircraft (ADS-B)** | Planes. ADS-B is the system planes use to report where they are. |

Next to the toggles, a counter shows how much is visible, e.g. **"812 of 1,240 map points showing"**.

**Show all** turns every switch in this list on, including **Activity squares**, the object rows, and the Advanced rows. It does **not** turn **FT8 spots** on. **Hide all** turns those same switches off. It does **not** turn **FT8 spots** off. Use the **FT8 spots** switch for that.

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

A real weather station, ship or home station is **not** an object. Those stay on **Weather stations**, **AIS ships** or **Fixed stations**, even when they use a similar picture. **Items** stay on the **Items** row.

**Winlink position reports** are only the GPS positions Winlink posts as APRS objects. aprs.fi already shows who they are and when they were heard, so Mesh Tools does not replace that box. It only adds a blue ring, or hides them if you turn the switch off. A Winlink gateway (a station that is itself a gateway) is not one of these reports, and this switch does not hide it.

The big red and purple squares you see when zoomed out are **aprs.fi's own "most active areas"** layer (blue means quieter, red means busier). Mesh Tools does not draw them. **Activity squares** is off, so those fills are hidden and the map stays readable. Turn it on for a light outline of the same squares.

**FT8 spots** stays off until you turn it on. Turning it on does not download anything. Moving the map does not download anything either.

1. Turn **FT8 spots** on if you want the dots drawn.
2. Tap **Fetch FT8 now**. That is the only time Mesh Tools asks [PSKReporter](https://www.pskreporter.info/) for spots.
3. It asks for stations that were heard **from** the area you can see, using the last 15 minutes of FT8. The area is split into big squares hams call grid fields. A field is two letters, such as **EM** or **FN**. The middle of the United States is EM. One download can name only one field, so the button asks for up to **4** fields, the ones nearest the middle of the map. If the view covers more than 4, the line under the button says so. Zoom in and tap again for the rest.
4. The button then waits 5 minutes. It reads **Cached, refresh in 5m** (the number counts down). The line under it reads **Cached, refresh available in 5m.**
5. The answer is saved, including after a reload. Moving the map only redraws that saved list.

Zoomed in, stations are small teal dots under the APRS markers (up to 250 dots). Zoomed out, each small grid square is one count bubble (up to about 80 bubbles) so they do not cover the map. Tap a dot or bubble for the callsign, band, signal report (SNR, in dB), time, and who heard them. SNR is how strong the other station copied the signal. The position is the middle of that station's grid square, not a GPS fix.

## Advanced

| Toggle | Hides or shows |
|---|---|
| **Callsign labels** | The text labels beside stations |
| **Track lines** | Lines showing where stations have travelled |
| **Old positions (track dots)** | Dots at earlier positions along a track |
| **Direction-of-travel lines** | Short lines showing which way something is heading |
| **Relay path lines (on hover)** | The lines aprs.fi draws through digipeaters/iGates when you hover a station |
| **Range circles (PHG)** | Circles from a station's power, height, and antenna gain. APRS calls that a PHG report. |

## Good to know

- New stations keep arriving, so the map is re-checked **every 5 seconds** and after you move it. Newly arrived points follow your toggles.
- Your choices are remembered between visits.
- If an old *aprs.fi Map Layer Toggles* script is on, this tab stays off and aprs.fi shows everything as normal (see [Installation](Installation.md#step-3-turn-off-the-old-separate-scripts-if-you-had-them))
- Mesh nodes and coverage shading are *not* affected by these toggles. Use the 📡 and 📶 tabs for those.
- This tab works by reading aprs.fi's own internal map data. If aprs.fi changes how its map works, some toggles may stop working until Mesh Tools is updated. Please [report it](Troubleshooting.md#reporting-a-problem).
- Object types follow the same symbol pictures aprs.fi uses. A letter or number drawn on top of a symbol is grouped with the picture underneath, the same way aprs.fi names it. If an object has no symbol, it counts as **Other objects**.
- Older positions along an object's track follow that object's type, and also the **Old positions** switch under Advanced.
