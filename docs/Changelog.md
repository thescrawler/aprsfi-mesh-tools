# 📝 Changelog

Current version: **1.6.3-beta**. Each note below is what changed in that version. If a later note changes the same feature, follow the later note.

## Nov 5, 2026: docs
- The guide now matches 1.6.3-beta: FT8 only when you tap **Fetch FT8 now** (up to 4 two-letter fields), **Activity squares** off unless you turn them on, **Winlink position reports**, and the gold **gone quiet** ring. Install steps are written out once, on the Installation page. Headings that started with a symbol were renamed so the in-page links land on the right section.

## Nov 4, 2026: 1.6.3-beta
- **FT8 downloads only when you tap Fetch FT8 now.** Turning the switch on, moving the map, and the old center-square check no longer contact PSKReporter, and they no longer start the 5-minute wait. An empty saved result (such as 0 spots) does not lock the button either.
- **The button asks for stations in the fields you can see.** A field is a big two-letter square, such as EM. Each request is one field, for stations transmitting from that field, mode FT8, the last 15 minutes. The old center-square question was wrong: `HN14` is a patch of the North Atlantic and correctly comes back empty, while fields such as CN, DN, DM, and EM come back with stations. One request cannot name two fields, so a wide view still fetches the 4 nearest the center and says so. Zoom in and tap again for the rest.

## Nov 4, 2026: 1.6.2-beta
- **Fetch FT8 now** was added. It loaded up to 4 two-letter fields, then waited 5 minutes. This version still ran a background check of the square at the middle of the map, and that check shared the wait with the button. **1.6.3 removed that background check.**

## Nov 4, 2026: 1.6.1-beta
- **The red and purple squares are aprs.fi's, not FT8.** When you zoom out, aprs.fi paints "most active areas" (blue quieter, red busier). **Activity squares** is off, so that fill is hidden. Turn it on for a faint outline only. This is still how it works.
- **FT8 drawing.** Zoomed in, stations are small teal dots under the APRS and MeshCore markers. Zoomed out, each grid is one count bubble. This version still downloaded one square at the middle of the map on its own. **1.6.3 downloads only when you tap Fetch FT8 now.**

## Nov 4, 2026: 1.6.0-beta
- **Gone quiet.** MeshCore repeaters and room servers that have not advertised for longer than **Quiet after** get a gold ring. The default is 24 hours. Other choices are 12 hours, 3 days, and 7 days. The popup says **Silent for Xd Yh**. **Gone quiet in view** lists those radios on the map you are looking at. This uses the last-heard time already downloaded. It does not check the network any more often. Turn **Flag gone-quiet repeaters** off to hide the rings and the list.
- **Winlink position reports.** GPS reports that Winlink copies onto APRS (source **WINLINK**, destination **APWL2K**, the P in a red diamond) get a blue ring. The switch shows or hides them. aprs.fi's own info box is left as it is. Winlink gateways are not touched. No extra download.
- **FT8 spots** were added, off until you turn them on. This first version asked only for the grid square at the middle of the map. **1.6.3 replaced that** with **Fetch FT8 now** and up to 4 fields in view. The dot is still the middle of the grid square, not a GPS fix.

## Nov 3, 2026: 1.5.0-beta
- **Coverage colours are easier to tell apart.** Signal strength used to be a dark and a light shade of the same colour. It is now **green** for strong (at least 10 dB to spare, after the fade margin), **yellow** for fair (5 to 10 dB), and **orange** for weak (0 to 5 dB). Nothing is drawn below 0 dB. The colours also differ in lightness. A **Strong / Fair / Weak** legend sits on the Coverage tab and at the bottom-left of the map while coverage is showing. Older saved maps are worked out again so the new colours apply.

## Nov 3, 2026: docs
- Phone install: step-by-step way to open Tampermonkey's Utilities tab before Import from URL. Firefox for Android is spelled out (menu, Extensions, Dashboard, slide to Utilities). Edge, Kiwi, and iPhone Safari are included briefly.
- New page [What is Tampermonkey](What-is-Tampermonkey.md): what the add-on is, and how to use the panel after it is installed (computer and phone). Linked from the home page, README, and Installation.

## Nov 3, 2026: 1.4.0-beta
- **Show or hide each kind of MeshCore radio.** Under **Show MeshCore nodes**: Repeaters (red ◆R), Companions (blue ◆C, the chat nodes), Room servers (purple ◆S), Sensors (teal ◆s), and Other / unknown (grey ◆?). Each row uses the same diamond as the map, and the ⓘ button explains it. The master switch still hides everything, including the plain coverage dots. Turning off Repeaters or Room servers hides those dots too. The choice is remembered, and it does not download the node list again.

## Nov 3, 2026: 1.3.1-beta
- **MeshCore nodes appear much sooner.** The full list from map.meshcore.io is about 55 MB, so the very first visit still has to download it. That download now starts as soon as the page starts, instead of waiting until the map is ready. On later visits the saved list is drawn immediately and a fresh copy loads behind it. Panning the map keeps markers that are already on screen. **Show MeshCore nodes** off still hides every MeshCore marker, including the old plain circles.

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
- New default **Signal strength** coverage map: loss over distance, bounce off the ground, and bending over up to 3 ridges, checked against a typical MeshCore radio. The two-shade colours in this note were replaced in **1.5.0** (green, yellow, and orange).
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
