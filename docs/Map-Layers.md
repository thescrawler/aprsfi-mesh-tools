# 🗺️ Map layers tab

aprs.fi can get crowded. This tab lets you **hide** kinds of things on the map so the mesh nodes and coverage are easier to see. Nothing is deleted. Hidden things are just made invisible, and they come back the moment you turn them on again.

## Main toggles

| Toggle | Hides or shows |
|---|---|
| **Moving stations** | Cars, hikers, trackers, anything that moves |
| **Fixed stations** | Home stations, digipeaters, iGates |
| **Weather** | Weather stations |
| **Objects** | APRS objects (nets, events, repeater objects…) |
| **Items** | APRS items |
| **AIS ships** | Ships from AIS |
| **Aircraft (ADS-B)** | Aircraft |

Next to the toggles, a counter shows how much is visible, e.g. **"812 of 1,240 map points showing"**. **Show all** and **Hide all** buttons switch every toggle (including the Advanced ones) at once.

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
