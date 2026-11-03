# 📶 Coverage tab

The Coverage tab shades the area a **MeshCore repeater** (or any spot you choose) can probably reach, based on the **shape of the land**. Hills block radio signals. This tool works out, direction by direction, where the hills get in the way.

> ⚠️ **It's an estimate, not a guarantee.** It uses bare-earth terrain only. Trees, buildings and interference are **not** included. Radio power and antenna gain are only rough defaults you can change under Advanced. Read [Limitations](#limitations) below.

---

## Quick start

1. **Zoom in** to zoom level 9 or closer (about county level). Further out, the status line says *"Zoom in closer to pick a repeater"*.
2. Tap a red **◆R** repeater (or a purple **◆S** room server). In its popup, tap **Show coverage**.
3. The status line shows progress, e.g. `1/1 Hilltop: Loading terrain 37/110`, then `Computing…`.
4. A shaded area appears, with a **dashed circle** marking the distance limit. With **Signal strength** (the default), the colour is the strength: **green = strong**, **yellow = fair**, **orange = weak**. Clear map means unlikely. The same three colours are used for every repeater. A small legend sits on this tab and at the bottom-left of the map while coverage is showing.
5. To compare repeaters, tap more of them and tap **Show coverage** on each. The dot on the repeater still has its own colour so you can tell them apart. The shaded area stays green, yellow, or orange.
6. To test a spot with no repeater, open the Coverage tab and tap **📍 Drop a pin to test a spot**, then tap the map. Pins are **orange**.

If the 📡 Mesh nodes tab is showing MeshCore nodes, the coverage controls appear inside the normal ◆ popups. The Coverage tab also draws its own small round markers for repeaters (red) and room servers (purple) when those ◆ markers are not on the map. **Show MeshCore nodes** hides those dots too, including when you are zoomed out. **Repeaters** and **Room servers** under that switch hide the matching dots on their own. Turn the switch back on to tap a repeater, or use **Drop a pin**. A repeater you already chose with **Show coverage**, and any pin, stays on the map.

---

## Main controls

| Control | What it does |
|---|---|
| **Coverage on** | Master switch. When off, picked repeaters aren't drawn and nothing new is computed. *Your test pins are still shown.* |
| **"N picked" / None picked yet**, **Clear** | How many repeaters you've picked with *Show coverage*. **Clear** un-picks them all. |
| **📍 Drop a pin to test a spot** | Tap it, then tap the map to place one pin (tap the button again to cancel). You can keep up to **10 pins**. Adding an 11th removes the oldest. |
| **Remove my pins** | Deletes every pin and its shading. |
| **Map shows** | **Signal strength** (default, since 1.1.0): estimates how strong the repeater would be, including signal bending over hills. **Clear view only**: the older method, which shades only places with a straight, unblocked line to the repeater. |

### Repeater popup (📶 Coverage section)

- **Colour dot and status:** *Coverage shown in this colour*, *Shown (all nearby repeaters)* or *Coverage not shown*.
- **Ground height:** the terrain height at the repeater, read from the terrain tiles.
- **Antenna above sea level:** ground height plus antenna height.
- **Antenna height:** a box plus an ft/m picker. Leave it blank to use the default **Repeater height** (it then shows *(default)*). Type a value to override it for **this repeater only**. Coverage recomputes automatically.
- A summary line of the settings used, e.g. *Estimate: your antenna 7 ft up, 20 mi* (plus *60% F1* in Strict mode).
- **Show coverage / Hide coverage**.

### Pin popup

- **Pin name** (up to 40 characters), coordinates, ground height and antenna height above sea level.
- **Antenna height** for this pin (blank = default Repeater height).
- **Max range** for this pin, in your distance unit (blank = default *Farthest distance*). Values are kept between 1 km and 81 km.
- **Recompute** forces a fresh calculation. **Delete pin** removes it.

---

## Advanced settings (every setting in depth)

All settings are remembered. Changing any setting marked ♻️ throws away what's drawn and recomputes with the new value.

### Show ALL nearby repeaters (slow)
Default **off**. When on, coverage is drawn automatically for the **nearest 25** repeaters/room servers around the middle of the map, as well as anything you picked. It updates as you move the map, and the status says e.g. *Showing 25 (nearest 25 of 140)*. On phones this can take a long time and use a lot of data, especially with high Terrain detail.

### Include repeaters / Include chat rooms
Both default **on**. These choose which kinds of MeshCore nodes count as "nearby" for *Show ALL* and for the Coverage tab's own round markers. Those round markers also follow **Show MeshCore nodes**, and the **Repeaters** and **Room servers** rows under it: off hides the matching dots at every zoom. Chat rooms are room servers (◆S). Repeaters or rooms you picked by hand are always shown.

### Heard in the last
**7, 30 (default), 90 days.** Repeaters not heard from in this many days are ignored when finding "nearby" ones, so dead repeaters are skipped. This is separate from the Mesh nodes tab's own *Heard from in the last* setting.

### ♻️ Repeater height
Default **10 ft (3 m)**. How high repeater antennas are above the ground, used for any repeater or pin without its own height. Type any value from **1 ft to 328 ft (0.3–100 m)**. A value outside that range shows a red warning and is not saved. Higher antennas see over more hills, so coverage grows.

### ♻️ Your height
Default **7 ft (2 m)**. How high **your** radio's antenna is at the receiving end. Every shaded spot means "a radio held this high here could probably hear the repeater". Use about 6 ft for a handheld, more for a car roof or house antenna. Same 0.3–100 m limits.

The **ft / m** picker next to either height box switches units for *all* heights everywhere (panel and popups). Heights are stored in metres, so switching units never changes the real value. Feet show as whole numbers, and metres to one decimal place.

### ♻️ Farthest distance
How far from the repeater to check. Choose **mi** (default) or **km**:

- miles: 5, 10, **20**, 30, 50
- km: 10, 20, 30, 45, 60, 80

Default is **20 mi (≈32 km)**. Bigger distances take longer and download more terrain. Switching unit snaps to the nearest preset in the new unit. Popups and pin ranges use the same unit.

### ♻️ Terrain detail
How finely the hills are measured. Each level loads terrain tiles at a different zoom and checks the ground at a matching spacing along each ray:

| Level | Tile zoom | Ground checked every | Tiles for 5 / 10 / 20 / 30 / 50 mi* |
|---|---|---|---|
| **Fast** | 11 | ~75 m | 4 / 12 / 36 / 64 / 156 |
| **Balanced** (default) | 12 | ~38 m | 12 / 30 / 110 / 225 / *600 → uses Fast* |
| **Sharp** | 13 | ~19 m | 36 / 100 / 400 / *870 → uses Balanced* / *2304 → uses Fast* |

\*Measured at about 46° N. Tile counts vary a little with location.

- **Tile cap:** one coverage may use at most **480 tiles**. If the chosen level would need more, Mesh Tools steps down one level at a time until it fits, and the status line adds *"(area too big for this detail, using lower)"*. So at 50 mi every level actually uses Fast.
- **Download size:** each tile is roughly 60–130 KB. At 20 mi that's about 4 MB (Fast), 12 MB (Balanced) and 40–50 MB (Sharp). Tiles are downloaded **6 at a time**, and progress shows as *Loading terrain x/y*.
- **Rough first-load times** on typical home broadband, for 20 mi: Fast a few seconds, Balanced ~5–15 s, Sharp ~20–60 s. Phones on mobile data can be much slower. Tiles already in memory (up to 600) are reused, so the next repeater nearby is quicker.
- Sharp catches small ridges and valleys that Fast smooths over, so it's more accurate in rugged country. On flat land the difference is small.

### ♻️ Repeater power
Default **22 dBm** (the usual MeshCore repeater setting). Choices: 14, 17, 20, 22, 27, 30 dBm. Only used by *Signal strength*.

### ♻️ Antenna gain (each)
Default **3 dBi**, applied to both the repeater and your radio. Choices: 0, 2, 3, 5, 6, 8 dBi. Only used by *Signal strength*.

### ♻️ Fade margin (dB)
*New in 1.2.0.* Default **10**. Choices: 0, 5, 10, 15, 20. Only used by *Signal strength*.

Think of it as a **safety cushion**. Radio signals don't stay perfectly steady: they rise and fall as people walk by, trucks pass, leaves move, the weather changes, or you hold the radio differently. A spot that only *just* gets a signal on paper will often drop out in real life. The fade margin asks the map to keep this many dB in reserve before it calls a spot covered.

- **10 (default):** a good everyday choice. Shaded areas should work most of the time.
- **0:** shows the most area, but the edges are "on a good day" only. Expect dropouts there.
- **15 or 20:** shows only very dependable spots. Good if you're planning where to put a repeater and want to be sure.

Every 3 dB is roughly half or double the signal power, so 10 dB is about a tenth of the power held back as a cushion.

### ♻️ Smoothness
**180** or **360 (default)** directions (rays) are checked around each repeater, i.e. one every 2° or every 1°. More rays give smoother edges, but take longer to compute.

### ♻️ Strict mode (Fresnel 60%)
Only used by *Clear view only*. Default **off**. Normal mode only asks "can the two antennas *see* each other over the hills?". Strict mode also requires **60% of the first Fresnel zone** to be clear. That's the football-shaped region around the direct line that radio waves need for a strong signal, worked out for **915 MHz**. It is more realistic for a reliable link, and shows **less** coverage. It is also slower, especially at Sharp detail.

### Clear saved results
Throws away saved coverage results, the saved repeater list, and terrain tiles saved in the browser. Everything is then worked out and downloaded again. Use it if something looks wrong or stuck.

---

## How the estimate works

For each repeater or pin:

1. **Find the ground height** at the antenna from the terrain tiles, then add the antenna height. This gives the *antenna above sea level*.
2. **Cast rays.** From the antenna, draw 180 or 360 straight lines out to the *Farthest distance*.
3. **Sample the ground** along each ray every ~75 / 38 / 19 m (by Terrain detail). Each sample uses the nearest terrain pixel.
4. **Allow for the curve of the Earth.** Each sample is lowered by `d² / (2 · k · R)`, where *d* is the distance, *R* = 6,371 km and **k = 4/3**. The 4/3 "effective Earth radius" is the standard allowance for radio waves bending slightly in the atmosphere, so you can see a bit further than a straight line would suggest. For example, at 20 mi (32 km) the ground "drops" by about 60 m (200 ft).
   *Antenna's own hillside (since 1.0.8-beta):* ground within **100 m** of the antenna is never treated as blocking. That ground is the spot the antenna is mounted on. A pin a few metres off a summit, or on a slope, used to have the next terrain pixel uphill hide whole directions from a short mast.
5. **Line-of-sight test.** A point counts as covered if a straight line from the repeater antenna to a radio held at *Your height* above that point clears every hill in between.
6. **Strict mode test (optional).** Instead, every point in between must sit below the line by at least 60% of the first Fresnel zone radius, `0.6 · √(λ · d₁ · d₂ / D)`, with λ for 915 MHz.
7. **Draw.** Covered stretches of every ray are painted as wedges on a 512 × 512 image at 35% opacity, placed over the map with a dashed circle at the distance limit.

Results are saved (in Tampermonkey's storage) for the **60 most recently computed** repeater/setting combinations, so reloading the page redraws them instantly. Changing a setting that affects the result gives a new combination, which is computed fresh.

### Signal strength mode (default since 1.1.0)

Steps 1 to 4 are the same. Then, every few hundred metres along each ray, the script works out how much signal would be left:

- **Distance loss:** free-space loss at the node's frequency, plus **ground reflection** (improved in 1.2.0). Over open ground, part of the signal bounces off the ground and partly cancels the direct signal. For low antennas this makes the signal fall off much faster with distance (the "two-ray" or plane-earth model, `40·log10(d) − 20·log10(ht·hr)`). Close in it makes no difference. It starts to matter past the *breakpoint* distance `4·ht·hr/λ` and blends in smoothly (3 dB extra at π times the breakpoint), until it equals plane-earth loss far out. **ht** and **hr** are the antenna heights above a straight line fitted through the ground along that path, never less than the real mast heights. So a repeater on a mountain top looking down over a basin gets full credit for its height, while a short mast on flat ground doesn't.
- **Hill loss:** **Deygout knife-edge diffraction** over up to **3 ridges** (the worst ridge, then the worst one on each side of it). Signals can bend over a ridge and lose some strength, instead of stopping dead. This is added on top of the ground-reflection loss, so hills still block. The first 6 dB of "just grazing the ground" loss, which both models describe, is only counted once.
- **Link budget:** repeater power (default 22 dBm) + antenna gain at both ends (default 3 dBi each) - losses, compared with the receiver's **sensitivity**. Sensitivity is worked out from the node's own **spreading factor (SF)** and **bandwidth** when it reports them on map.meshcore.io: `-174 + 10·log10(BW in Hz) + 6 dB noise figure + the SNR that SF needs`. Otherwise it uses the MeshCore US default of 910.525 MHz, SF7, 62.5 kHz (about **-127.5 dBm**).
- **Fade margin:** the *Fade margin* setting (default 10 dB) is taken off what's left, as a safety cushion.
- **Shading:** after the fade margin, the spare signal is painted in three colours (about 55% see-through, so the map still shows). **10 dB or more** to spare = **strong** (green). **5 to 10 dB** = **fair** (yellow). **0 to 5 dB** = **weak** (orange). Less than 0 = not shaded. Green is the darkest of the three, yellow the lightest, so they still differ if colour is hard to tell apart. The legend on the Coverage tab and at the bottom-left of the map uses the same swatches.

Ground within 100 m of the antenna never counts as a ridge, in either mode.

### Terrain data

Hill heights come from **AWS Terrain Tiles** (the open "terrarium" elevation tiles on Amazon S3, from the AWS Open Data registry). In the USA these are largely based on **USGS 3DEP** (formerly NED) elevation data. Elsewhere they mix sources such as SRTM, so detail and accuracy vary by country. Mesh Tools stores heights to the nearest **1 m**. Tiles are saved in your browser (up to 900, oldest dropped first), so reloads and setting changes don't download them again. Only tiles that touch the coverage circle are fetched, nearest first. Beyond about 34 km (or 15 km at low detail) one coarser terrain level is used. In a new area you'll first see a quick low-detail preview with a progress bar, and then the full map replaces it. Where there's no data, the ground is treated as sea level (0 m). If there's no height at the antenna itself, that repeater shows an error ("no hill/terrain data for that spot").

---

## Limitations

- **Bare earth only.** Trees, forests, buildings and other clutter are not included. In towns and woodland, real coverage is usually **smaller** than shown.
- **Power and gain are defaults.** *Signal strength* uses a simple link budget, with no cable loss, local noise or interference. *Clear view only* doesn't check signal strength at all, so distant shaded spots may still be too weak.
- **Your settings are guesses.** Default heights apply unless you set per-repeater heights. Repeater positions are whatever the node advertised.
- **Simplified physics.** Signal strength uses knife-edge diffraction (max 3 ridges) and a simple ground-reflection term, not a full Longley-Rice model. It doesn't include ducting. *Clear view only* ignores diffraction completely and uses 915 MHz for Strict mode.
- **Terrain resolution.** Small features narrower than the detail level can be missed. Sharp helps, within the tile cap.
- **Flat-map geometry.** Rays use a local flat approximation, which is fine within the 81 km maximum distance.
- **Two-way, but not symmetric in reality.** The test is about the line between antennas. Real links also depend on both radios' power and gain.

Treat the result as "where it's worth trying", then confirm with real tests in the field.
