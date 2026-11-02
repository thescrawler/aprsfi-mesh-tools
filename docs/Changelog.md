# 📝 Changelog

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
