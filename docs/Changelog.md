# 📝 Changelog

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
