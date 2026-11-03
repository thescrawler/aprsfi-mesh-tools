# 📝 Changelog

## Nov 3, 2026: 1.3.0-beta
- **Hide APRS objects by type.** aprs.fi only had one switch for every object. The Map layers tab now has six rows under **Objects**: Repeaters & towers, Weather & alerts, Events, Emergency, Generic markers, and Other objects. Each row shows the same symbol aprs.fi draws on the map, and the ⓘ button explains that kind in plain language. **Objects** still hides them all. Choices are remembered. Real stations, weather stations and ships are unchanged.

## Nov 3, 2026: 1.2.1-beta
- **Fix: red dots stayed on the map after turning off Show MeshCore nodes.** The Coverage tab draws plain circles for MeshCore repeaters (red) and chat rooms (purple) when the ◆ markers are not on screen. Turning the switch off hid the red ◆R markers but left those circles, including when zoomed out around a town. The switch now hides and shows them too, at every zoom.

## Nov 2, 2026: docs
- Easier install on phones: copy-paste link for Tampermonkey Import from URL at the top of the README and guide.

## Nov 2, 2026: 1.2.0-beta
- **More realistic Signal strength maps for low antennas on flat ground.** Over open, flat land, part of the signal bounces off the ground and partly cancels itself out, so a short mast doesn't reach as far as the old map suggested. The ground-bounce loss now blends in smoothly with distance, and antenna heights are measured above the ground along each path, so hilltop and mountain sites (like Pine Observatory) still get credit for their height. Hills still block as before.
- **New setting: Fade margin (dB)** under Advanced, default **10**. It's a safety cushion: the map only counts a spot as covered if the signal is this much stronger than the bare minimum, because real signals come and go. Lower = more area but more dropouts, higher = only dependable spots. See *Fade margin (dB)* on the [Coverage](Coverage.md) page.
- Example, pin at 45.79556, -119.41658 (ground 607 ft, 50 ft antenna, your radio at about 6.6 ft), 50 mi: usable area **27.2% → 18.0%**, unbroken strong coverage from the pin **21.6 mi → 13.4 mi** at most (median 6.7 → 5.2 mi). Distant hillsides that face the pin (for example the slopes south of Prosser) can still show up, because they have a clear view.
- Pine Observatory (10 ft mast, 50 mi): usable area **35.2% → 21.4%**. Almost all of that change is the new 10 dB fade margin. With Fade margin set to 0 it's 36.6%, so mountain sites aren't penalized by the ground-bounce change.
- Speed is unchanged. The maths still runs in the background Web Worker (Chrome bench, 50 mi pin: 2.1 s first load, 0.01 s after a reload).
- Saved results from older versions are worked out again automatically.

## Nov 2, 2026: 1.1.3-beta
- **Fix: repeater popups closing the first time.** Clicking a repeater opened its info box, but as soon as you moved the mouse up into it, it disappeared, and you had to click a second time. When a box opens near the edge of the map, the map slides over a little so the box fits. That slide made the script redraw the nodes, and the redraw removed the repeater you had just clicked, which closed its box. Now the redraw leaves the clicked node and its box alone, so one click is enough.

## Nov 2, 2026: 1.1.2-beta
- **Big speed fix for Chrome + Tampermonkey.** A 50 mi dropped pin could take a minute or more there, even though it took about 2 s in our tests. Tampermonkey runs scripts inside a protective "sandbox" wrapper, and every bit of maths in the coverage loop (millions of calls) had to go through that wrapper, which made it about 15 times slower. Now the maths runs in a background **Web Worker**, where the wrapper doesn't apply. If a browser blocks workers, the script falls back to running on the page with its own fast copies of the maths functions.
- Measured in real Chrome with a Tampermonkey-style sandbox, Columbia River Gorge pin, 50 mi, Signal strength, Balanced: **36 s → 2.3 s** the first time (terrain download included), and about **0.01 s** after a reload (saved result).
- The map stays responsive while coverage is worked out, because the heavy work is off the page.

## Nov 2, 2026: 1.1.1-beta
- Coverage loads much faster. Pine Observatory at 50 mi, Balanced: about 2 s on a fresh browser, down from about 3.7 s. On a 10 Mbps line it is about 6 s, down from 16 s. A rough picture appears in under 1.5 s.
- Terrain tiles are now saved in the browser (IndexedDB, up to 900 tiles), so after a reload, or when you change a setting, a new map takes about 0.6 s instead of downloading everything again.
- Only tiles that touch the coverage circle are downloaded, nearest first, 12 at a time from two S3 addresses. Beyond about 34 km the map uses one terrain level coarser, which halves the download with almost no change in the result.
- A quick low-detail preview is drawn first, then replaced by the full map. A progress bar shows how far along it is.
- Clear saved results now also clears the saved terrain.

## Nov 2, 2026: 1.1.0-beta
- New default **Signal strength** coverage map: free-space/ground-reflection loss plus Deygout knife-edge diffraction over up to 3 ridges, checked against a LoRa link budget. Solid = strong (≥10 dB to spare), light = weak (0-10 dB), clear = unlikely.
- Uses each node's own frequency, SF and bandwidth from map.meshcore.io when it reports them, otherwise the MeshCore US default (910.525 MHz, SF7, 62.5 kHz, about -127.5 dBm).
- New **Map shows** choice (Signal strength / Clear view only). Repeater power (22 dBm) and Antenna gain (3 dBi each) are under Advanced. All have ⓘ info buttons.
- The old line-of-sight check is still there as *Clear view only*. The 100 m hillside fix applies to both modes.

## Nov 2, 2026: 1.0.8-beta
- Coverage fix: the antenna's own hillside (ground within 100 m of it) no longer blocks coverage. This fixes repeaters pinned just off a summit or on a slope, where whole directions used to show as uncovered.

## Nov 2, 2026: Docs: phone install steps
- Added simple steps for installing on Android and iPhone/iPad, and what to do if the install link only shows code. The script itself did not change.

## 1.0.7-beta
- Published on GitHub. Added homepage, support, download and update links to the script header so Tampermonkey auto-updates from GitHub.
- Help / Wiki link now opens these docs on GitHub.

## 1.0.6-beta
- Added **📖 Help / Wiki** link under ⚙ Panel settings (opens this wiki in a new tab).
- User guide written.

## 1.0.5-beta
- Added **ⓘ info buttons** to every setting, with a short explanation. One opens at a time, and they work with a keyboard.

## 1.0.4-beta
- New **Terrain detail** setting: Fast / Balanced / Sharp, with an automatic step-down when the area is too big (480-tile cap).

## 1.0.3-beta
- **mi / km** choice for distances. Farthest distance presets in miles (default 20 mi) or km. Pin max range in your unit.

## 1.0.2-beta
- Hardened the panel's look against aprs.fi's own page styles, so controls display correctly.

## 1.0.1-beta
- Modern, touch-friendly panel design: drag bar, collapsible header, tabs, Advanced sections, welcome tip.

## 1.0.0-beta
- First release. Bundled three earlier scripts into one panel:
  - aprs.fi MeshCore + Meshtastic Overlay **1.2.0**, which became the Mesh nodes tab
  - aprs.fi MeshCore Coverage Overlay **0.4.0**, which became the Coverage tab
  - aprs.fi Map Layer Toggles **0.2.0**, which became the Map layers tab
- Detects the old scripts and turns the matching tab off. Runs only once if installed twice.
