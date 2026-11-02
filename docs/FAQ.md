# ❓ FAQ

**Is it free?**
Yes, it's free and open source under the MIT licence.

**Does it change aprs.fi or my aprs.fi account?**
No. It only adds things to the page in *your* browser. Turning it off or uninstalling puts everything back.

**Is this an official aprs.fi / MeshCore / Meshtastic tool?**
No, it's an independent community project.

**Does it work on my phone?**
On **Android**, yes, using **Firefox** with Tampermonkey. On **iPhone/iPad**, it's not supported or tested (the *Userscripts* Safari app might work). See [Installation](Installation.md).

**Why don't I see my Meshtastic node?**
Only nodes that reach the internet through MQTT appear on meshmap.net, the source used here. Also check that it was heard within the *Heard from in the last* period.

**Why don't I see my MeshCore node?**
It must be listed on map.meshcore.io (it has to have advertised a position that reached the map). Also check the *heard* filter and that you're zoomed in to zoom 6 or closer.

**How accurate is the coverage?**
It's a terrain-only line-of-sight estimate. It's good for seeing which hills block a repeater, but it ignores trees, buildings, power and antenna gain. See [How the estimate works](Coverage.md#how-the-estimate-works).

**What's Strict mode?**
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
