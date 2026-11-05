# 🔒 Privacy and data sources

## What Mesh Tools downloads

Mesh Tools only *downloads* public data. These are the only sites it contacts. They are named in the script, and Tampermonkey blocks anything else:

| Source | Address | Used for | How often |
|---|---|---|---|
| **MeshCore map** | `https://map.meshcore.io/api/v1/nodes` | MeshCore nodes (Mesh nodes tab) and repeater list (Coverage) | At most every 10 min for the map, and every 6 h for the Coverage repeater list |
| **meshmap.net** | `https://meshmap.net/nodes.json` | Meshtastic nodes | At most every 10 min |
| **AWS Terrain Tiles** (Amazon S3 open data) | `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` | Hill heights for coverage | Only when computing coverage, for the tiles needed |
| **PSKReporter** | `https://retrieve.pskreporter.info/query` | FT8 spots for up to 4 grid fields in view. A field is a big two-letter square, such as EM. | Only when you tap **Fetch FT8 now**, then at most every 5 minutes |

Plus aprs.fi itself, which you're already visiting.

## What is sent

- **Nothing about you is uploaded** by Mesh Tools. It never posts data, and has no analytics, tracking or accounts.
- The requests above are ordinary downloads. As with visiting any website, those servers can see your IP address and which file was requested. For terrain tiles, the tile numbers reveal roughly which area of the map you computed coverage for. An FT8 query names the grid fields in view (up to 4, such as EM), so PSKReporter can see that area too. The query also includes this project's GitHub address, so PSKReporter can reach the author if a query misbehaves. Nothing about your callsign is sent.
- Your pins, heights and settings are **never sent anywhere**.

## What is stored on your device

In Tampermonkey's per-script storage:

- your settings (toggles, units, heights, distance, detail…)
- the panel position and the last tab
- your pins (position, name, height, range) and per-repeater heights
- the 60 most recent coverage results, and a copy of the repeater list (up to 6 h old)

Terrain tiles (public hill heights only, nothing about you) are kept in memory (up to 600) and saved in the browser's storage for aprs.fi (up to 900 tiles, about 115 MB), so they aren't downloaded again. **Clear saved results** (Coverage, Advanced) deletes saved results, the repeater list and tiles. Uninstalling the script deletes the Tampermonkey settings. The saved hill tiles go away when you use **Clear saved results**, or when the browser drops that site's saved data.

## Data credits

- MeshCore node data: [map.meshcore.io](https://map.meshcore.io)
- Meshtastic node data: [meshmap.net](https://meshmap.net)
- Terrain: [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) (public hill-height pictures). In the United States that is mostly USGS 3DEP elevation. Elsewhere it mixes other open height maps.
- Map and APRS data: [aprs.fi](https://aprs.fi). Please respect aprs.fi's terms of service.
- FT8 spots: [PSKReporter](https://www.pskreporter.info/). Please follow their request to query at most every 5 minutes. Mesh Tools does that by waiting after **Fetch FT8 now**.
