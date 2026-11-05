# ❓ FAQ

**Is it free?**
Yes. It is free, and the MIT licence lets anyone use it and share it.

**Does it change aprs.fi or my aprs.fi account?**
No. It only adds things to the page in *your* browser. Turning it off or uninstalling puts everything back.

**Is this an official aprs.fi / MeshCore / Meshtastic tool?**
No, it's an independent community project.

**Does it work on my phone?**
Yes, but not in Chrome. On **Android**, use Firefox or Microsoft Edge with Tampermonkey. On **iPhone/iPad**, use Safari with the Tampermonkey app. If the install link only shows code, you're in a browser without Tampermonkey. See [Installing on a phone](Installation.md#installing-on-a-phone).

**Why don't I see my Meshtastic node?**
Only nodes that reach the internet appear on meshmap.net, the list this tool uses. That usually means the radio is connected through MQTT, which is a way for the radio to send its position out to the internet. Also check that it was heard within **Heard from in the last** on the Mesh nodes tab (Advanced).

**What is the blue ring on a red diamond with P?**
That is a Winlink GPS position report. Winlink copies it onto APRS as an object from the station **WINLINK** to **APWL2K**. aprs.fi already shows the details, including when it was heard, so Mesh Tools does not replace that box. The **Winlink position reports** switch on the Map layers tab hides those reports. A Winlink gateway is a different station and stays on the map.

**What are the big red and purple squares when I zoom out?**
Those are aprs.fi's own activity squares (blue is quieter, red is busier). Mesh Tools does not draw them. **Activity squares** on the Map layers tab is off, so the fill is hidden. Turn it on if you want a faint outline instead.

**What are the teal FT8 dots?**
Stations that [PSKReporter](https://www.pskreporter.info/) heard on FT8. The switch is **off** until you turn it on, and turning it on does not download anything. Tap **Fetch FT8 now**. That loads spots from the last 15 minutes for up to 4 big grid fields in view (two letters, such as EM), the ones nearest the middle of the map. The button then waits 5 minutes. PSKReporter asks apps not to query more often than that. Zoomed in, the spots are small dots under the other markers. Zoomed out, each small square is one count bubble. The position is the middle of the station's grid square, not an exact location. Tap a dot for the callsign, band, signal report, time, and who heard them. See [Map layers](Map-Layers.md).

**What does the gold ring on a repeater mean?**
That repeater or room server has gone quiet. It has not sent an advert for longer than **Quiet after** on the Mesh nodes tab (24 hours unless you change it). The popup says **Silent for**, with days and hours, for example *Silent for 2d 3h*. Open **Gone quiet in view** for a list of the ones on the map. It uses the last-heard time already downloaded. It does not ask the server any more often.

**Why don't I see my MeshCore node?**
It must be listed on map.meshcore.io (it has to have advertised a position that reached the map). Also check the *heard* filter and that you're zoomed in to zoom 6 or closer.

**How accurate is the coverage?**
**Signal strength** (the default) estimates how strong the signal would be from the distance, from hills the signal can bend over, and from a typical MeshCore radio. It ignores trees and buildings. **Clear view only** only shades places with a clear line over the hills. See [How the estimate works](Coverage.md#how-the-estimate-works).

**What do the green, yellow, and orange colours mean?**
They are signal-strength bands, after the fade-margin cushion (10 dB by default). A dB (decibel) measures spare signal. More dB means more to spare. **Green** means strong (at least 10 dB to spare). **Yellow** means fair (5 to 10 dB). **Orange** means weak but maybe usable (0 to 5 dB). No colour means unlikely. The same colours are on the Coverage tab and in a small legend at the bottom-left of the map while coverage is showing. **Clear view only** does not use these colours. It shades one colour wherever there is a clear line over the hills.

**Why does coverage look larger than a simple line of sight?**
**Signal strength** does not treat every hill as a hard stop. Real signals bend over ridges and lose some strength. A high site, such as a mountain-top repeater, can show the basin below it as strong, fair, or weak instead of empty gaps. Switch **Map shows** to **Clear view only** if you only want the straight-line picture.

**What's Strict mode?**
Only used by **Clear view only**. A radio link needs some clear space around the straight line, not only a gap you could see through. That space is called the Fresnel zone. Strict mode asks for most of it (60%) to be clear of hills. It shows less coverage. See [Strict mode](Coverage.md#strict-mode-fresnel-60).

**Which detail level should I use?**
**Balanced** for everyday use, **Sharp** for hilly areas within about 20 mi, and **Fast** on slow phones or mobile data.

**How much data does coverage use?**
At the default 20 mi: about 4 MB (Fast), 12 MB (Balanced) or 40–50 MB (Sharp) for the first coverage in an area. Repeats in the same area use much less.

**Can I set the real height of a repeater?**
Yes. Open its popup and type the height under **📶 Coverage, Antenna height**. It's saved for that repeater.

**Can I use metres and km?**
Yes. Use the **ft/m** and **mi/km** pickers in the Coverage tab. See [Units](Panel-and-Settings.md#units).

**Can I use it with the old scripts?**
No need. Mesh Tools contains all three. If they're still on, the matching tabs turn themselves off so nothing is doubled.

**Where are my settings stored? Can I move them to another computer?**
They're in Tampermonkey's storage on that browser only, and aren't synced by Mesh Tools.

**Does it send my location anywhere?**
No. See [Privacy and data sources](Privacy-and-Data-Sources.md).

**Why is the first coverage map in an area slower than the rest?**
It has to download the hill heights first. A rough picture shows quickly, then the full map replaces it. The tiles are saved in your browser, so the next time in the same area is much faster. **Clear saved results** (Coverage, Advanced) deletes that saved terrain too. The maths runs in the background, so the page stays usable while it works. A fresh 50 mile map on a normal home connection is usually a few seconds.
