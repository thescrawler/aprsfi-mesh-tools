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

**Why don't I see my MeshCore node?**
It must be listed on map.meshcore.io (it has to have advertised a position that reached the map). Also check the *heard* filter and that you're zoomed in to zoom 6 or closer.

**How accurate is the coverage?**
By default (**Signal strength**, since 1.1.0) it estimates signal level from distance, signal bending over hills and a typical LoRa link budget, then shades strong (solid) and weak (light) areas. It ignores trees and buildings. **Clear view only** is the older, stricter line-of-sight check. See [How the estimate works](Coverage.md#how-the-estimate-works).

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
It has to download terrain first: about 60–80 tiles for 50 mi (around 8 MB). Since 1.1.1 you get a rough preview in about a second, and the tiles are saved in your browser. After that, reloads and setting changes take well under a second. **Clear saved results** also clears this saved terrain.
