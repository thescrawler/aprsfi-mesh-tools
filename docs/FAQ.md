# ❓ FAQ

**Is it free?**
Yes, it's free and open source under the MIT licence.

**Does it change aprs.fi or my aprs.fi account?**
No. It only adds things to the page in *your* browser. Turning it off or uninstalling puts everything back.

**Is this an official aprs.fi / MeshCore / Meshtastic tool?**
No, it's an independent community project.

**Does it work on my phone?**
Yes, but not in Chrome. On **Android**, use Firefox or Microsoft Edge with Tampermonkey. On **iPhone/iPad**, use Safari with the Tampermonkey app. If the install link only shows code, you're in a browser without Tampermonkey. See [Installing on a phone](Installation.md#installing-on-a-phone).

**Why don't I see my Meshtastic node?**
Only nodes that reach the internet through MQTT appear on meshmap.net, the source used here. Also check that it was heard within the *Heard from in the last* period.

**What is the blue ring on a red diamond with P?**
That is a Winlink GPS position report. Winlink copies it onto APRS as an object from the station **WINLINK** to **APWL2K**. aprs.fi already shows the details, including when it was heard, so Mesh Tools does not replace that box. The **Winlink position reports** switch on the Map layers tab hides those reports. A Winlink gateway is a different station and stays on the map.

**What are the big red and purple squares when I zoom out?**
Those are aprs.fi's own activity squares (blue is quieter, red is busier). Mesh Tools does not draw them. **Activity squares** on the Map layers tab is off, so the fill is hidden. Turn it on if you want a faint outline instead.

**What are the teal FT8 dots?**
Stations that PSKReporter heard on FT8. Zoomed in they are small dots, drawn under the APRS and MeshCore markers. Zoomed out they become a count bubble per grid so they do not cover the map. The position is the middle of the grid square, not an exact location. The switch is **off** until you turn it on. Mesh Tools then asks PSKReporter at most once every 5 minutes, for the grid at the middle of the map, which is as often as they allow. Tap a dot for the callsign, band, signal report, time, and who heard them.

**What does the gold ring on a repeater mean?**
That repeater or room server has gone quiet. It has not sent an advert for longer than **Quiet after** on the Mesh nodes tab (24 hours unless you change it). The popup says **Silent for**, with days and hours, for example *Silent for 2d 3h*. Open **Gone quiet in view** for a list of the ones on the map. It uses the last-heard time already downloaded. It does not ask the server any more often.

**Why don't I see my MeshCore node?**
It must be listed on map.meshcore.io (it has to have advertised a position that reached the map). Also check the *heard* filter and that you're zoomed in to zoom 6 or closer.

**How accurate is the coverage?**
By default (**Signal strength**, since 1.1.0) it estimates signal level from distance, signal bending over hills and a typical LoRa link budget. It ignores trees and buildings. **Clear view only** is the older, stricter line-of-sight check. See [How the estimate works](Coverage.md#how-the-estimate-works).

**What do the green, yellow, and orange colours mean?**
They are signal-strength bands, after the fade-margin cushion (10 dB by default). **Green** means strong (at least 10 dB to spare). **Yellow** means fair (5 to 10 dB). **Orange** means weak but maybe usable (0 to 5 dB). No colour means unlikely. The same swatches are on the Coverage tab and in a small legend at the bottom-left of the map while coverage is showing. **Clear view only** does not use these colours. It shades one colour wherever there is a clear line over the hills.

**Why did coverage grow a lot in 1.1.0?**
The old check treated any hill in the way as a hard stop. Real signals bend over ridges and lose some strength. A high site like a mountain-top repeater now shows the basin below it as strong or weak coverage instead of patchy blobs. Switch **Map shows** to **Clear view only** for the old picture.

**What's Strict mode?**
Only used by *Clear view only*.
It also requires most (60%) of the radio "Fresnel zone" around the signal path to be clear, which is closer to what a solid link needs. It shows less coverage. See [Strict mode](Coverage.md#strict-mode-fresnel-60).

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
It has to download terrain first: about 60–80 tiles for 50 mi (around 8 MB). Since 1.1.1 you get a rough preview in about a second, and the tiles are saved in your browser. After that, reloads and setting changes take well under a second. **Clear saved results** also clears this saved terrain. Since 1.1.2 the working-out runs in a background worker, so Chrome + Tampermonkey is as quick as other browsers (about 2–3 s for a fresh 50 mi map on broadband).
