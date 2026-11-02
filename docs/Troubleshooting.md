# 🛠️ Troubleshooting

## The panel doesn't appear on aprs.fi

1. **Is Tampermonkey allowed to run userscripts?** In Chrome/Edge, open `chrome://extensions` (or `edge://extensions`), click **Details** under Tampermonkey and turn on **Allow User Scripts**. On older versions, turn on **Developer mode** instead. See [Installation](Installation.md).
2. **Is the script enabled?** Click the Tampermonkey icon. *aprs.fi Mesh Tools (beta)* should be listed with its switch on.
3. **Reload the page.** Wait for the aprs.fi map to fully load. The panel appears once the map is ready.
4. **Are you on aprs.fi?** The script only runs on `https://aprs.fi/…` and its subdomains.
5. **Did you drag it off somewhere odd?** The panel is kept on screen automatically. If it's in the way, double-tap its drag bar or use **⚙ Panel settings, Put this box back in the corner**.
6. **Bot check page.** If aprs.fi shows a "checking your browser" or verification page, complete it normally. The panel appears on the real map page afterwards.

## "⚠ Old scripts are still on" / a tab says it's turned off

An older separate script is still running. Turn it off in the Tampermonkey Dashboard and reload. See [Installation, Step 3](Installation.md#step-3-turn-off-the-old-separate-scripts-if-you-had-them).

If you accidentally installed Mesh Tools twice, only the first copy runs. Delete the duplicate in the Dashboard.

## No mesh nodes on the map

- **Zoom in.** Nodes only show at map zoom 6 or closer.
- **Check the switches** *Show MeshCore nodes* / *Show Meshtastic nodes*.
- **Raise "Heard from in the last"** (Advanced) to 30 or 90 days. Quiet nodes may be filtered out.
- **First load is slow.** The MeshCore list can take up to a minute the first time.
- **Meshtastic:** only internet/MQTT-connected nodes are on meshmap.net. Many real radios won't appear.
- **Allow the connection.** If Tampermonkey asked to allow `map.meshcore.io` or `meshmap.net` and you clicked *Forbid*, open the Tampermonkey **Dashboard**, then the script, then **Settings**, and remove the blocked domain or add it to the allowed list (or reinstall).
- **Red error box?** Tap **↻ Retry**, or **⟳ Download fresh node lists** under Advanced. The source site may be temporarily down.

## The status says "X nearest of Y here"

There are more nodes in view than *Most nodes to draw* allows, so the ones nearest the map centre are shown. Zoom in, or raise the limit to 1000 (Advanced).

## No "Show coverage" button / coverage won't start

- **Zoom in** to map zoom 9 or closer.
- **Coverage on** must be ticked.
- Only MeshCore **repeaters (◆R)** and **room servers (◆S)** have coverage. Companions, sensors and Meshtastic nodes don't. To test any other spot, use **📍 Drop a pin**.
- If the repeater was heard longer ago than the Coverage tab's *Heard in the last* setting, it won't show as "nearby". You can still tap it from the Mesh nodes markers.

## Coverage is very slow

- Use **Terrain detail: Fast** or **Balanced**, and a smaller **Farthest distance**.
- Turn off **Show ALL nearby repeaters**.
- Use **Smoothness 180** and turn off **Strict mode**.
- The first coverage in a new area downloads terrain. Later ones nearby reuse it.

## "(area too big for this detail, using lower)"

The chosen Terrain detail would need more than 480 terrain tiles at this distance, so a coarser level was used automatically. This is normal at 30–50 mi. See [Terrain detail](Coverage.md#terrain-detail).

## Coverage looks wrong

- Check the **antenna heights**. A repeater on a tower needs its real height set in its popup.
- Remember it's [bare earth only](Coverage.md#limitations): no trees or buildings.
- Some repeater positions are approximate.
- Try **Clear saved results** (Coverage, Advanced) to recompute from scratch.
- "No hill/terrain data for that spot" means the terrain service had no height there (rare, mostly at sea).

## Some map-layer toggles don't hide anything

Map layers depend on aprs.fi's internal map code. If aprs.fi changed it, please report it (below). Turning toggles back on, or reloading, always restores the map.

## The panel covers something I need

Drag the **⠿ drag to move** bar, or tap the header to collapse the panel. Double-tap the bar to send it back to the corner.

## Reporting a problem

Open an issue at <https://github.com/thescrawler/aprsfi-mesh-tools/issues> and include:

- the Mesh Tools version (shown under **⚙ Panel settings**)
- your browser and device (e.g. *Firefox 132 on Android*)
- what you did, what you expected, and what happened
- a screenshot, and if possible any red errors from the browser console (press F12, then **Console**)
