# What is Tampermonkey?

**New here?** This page is the simple version. Install steps are on [Installation](Installation.md).

Tampermonkey is a **free add-on for your web browser**. It runs small extras called **userscripts**. A userscript adds a feature to a website. It does not replace the website, and it is not a separate app you open from your home screen.

**aprs.fi Mesh Tools** is one userscript. Tampermonkey runs it when you open [aprs.fi](https://aprs.fi). That is how the Mesh Tools panel gets onto the map.

You install Tampermonkey once. Then you install the Mesh Tools script into it. After that, opening aprs.fi is enough.

## How it works

- Tampermonkey runs Mesh Tools **only on aprs.fi** pages. It does not change your other websites.
- Nothing is installed into aprs.fi’s servers, and nothing is added to your phone or computer as its own program. The script lives inside the browser, in Tampermonkey.
- Turning the script **off**, or removing Tampermonkey, puts aprs.fi back the way it was. Your aprs.fi account is never changed.
- Tampermonkey **checks for updates** about once a day. When we publish a new version, it can install that for you. Your settings, pins, and saved coverage stay.
- It is safe to leave installed. If you do not want it today, switch that one script off. You do not have to delete anything.

On a computer, Tampermonkey is a browser extension (Chrome, Edge, or Firefox). On a phone, Chrome cannot run extensions. Use **Firefox or Edge on Android**, or **Safari plus the Tampermonkey app on iPhone or iPad**. [How to install](Installation.md#installing-on-a-phone).

## After installing: how to use it

### 1. Open the map

On a computer or a phone, open <https://aprs.fi> in the **same browser** where you installed Tampermonkey.

### 2. Check that the script is on

**Computer:** click the Tampermonkey icon (a black square, often on the puzzle-piece **Extensions** menu). **aprs.fi Mesh Tools (beta)** should be in the list with its switch **on**.

**Phone:** open Tampermonkey’s menu, then **Dashboard**.

- Firefox: **⋮** menu, then **Extensions** (older Firefox says **Add-ons**), then **Tampermonkey**.
- Edge: usually **⋮**, then **Extensions**, then **Tampermonkey**.
- iPhone Safari: usually the puzzle-piece or **aA** button, then **Tampermonkey**.

On the Dashboard, **aprs.fi Mesh Tools (beta)** should show as enabled (the switch on). If it is off, tap the switch, then go back to aprs.fi and reload the page.

### 3. Find the panel

A white box titled **🛰️ Mesh Tools** sits in the **bottom-right corner** of the map. On a phone it is the same box, with larger buttons.

- Tap the **title bar** to fold it up or open it again.
- Drag the **⠿ drag to move** bar if it covers something you need. Double-tap that bar, or tap **⟲**, to send it back to the corner.
- The first time, a short welcome tip appears. Tap **Got it**.

The panel has three tabs along the top: **📡 Mesh nodes**, **📶 Coverage**, and **🗺️ Map layers**. It remembers the tab you used last.

Every setting has a small **ⓘ** button. Tap it for one sentence about that setting. Tap it again to close.

### 4. Map layers: hide clutter

Open **🗺️ Map layers** when the map is too busy.

Switches turn kinds of aprs.fi markers **off or on**. Nothing is deleted. Turn a switch back on and those markers return.

- **Moving stations**, **Fixed stations**, **Weather**, **Objects**, **Winlink position reports**, **Items**, **AIS ships**, **Aircraft**.
- **Winlink position reports** are GPS positions Winlink posts onto APRS (a P in a red diamond). On, they get a blue ring and keep aprs.fi's own info box. Off, those reports hide. Winlink gateways stay either way.
- **Activity squares** is off. Those are aprs.fi's red and blue blocks when you zoom out, not Mesh Tools. Turn the switch on only if you want a faint outline of them.
- **FT8 spots** is off until you turn it on. Zoomed in, stations are small teal dots under the other markers. Zoomed out, they become count bubbles so they do not cover the map. It checks PSKReporter at most once every 5 minutes, for the grid at the middle of the map.
- Under **Objects**, extra rows hide one kind of object: repeater towers, weather alerts, events, emergency markers, plain dots, and anything else. Each row shows the same little picture aprs.fi uses.
- **Show all** and **Hide all** flip every switch at once.
- **Advanced** hides labels, track lines, old-position dots, direction lines, and range circles.

### 5. Mesh nodes: see radios

Open **📡 Mesh nodes**, then **zoom in**. Radios appear at about a state or region view (map zoom 6 or closer). Further out, the line under the switch says to zoom in.

**Show MeshCore nodes** is the master switch. Off means no MeshCore diamonds, and no plain red or purple dots from Coverage either.

Under it, one row per kind. The picture matches the map:

| Row | On the map |
|---|---|
| **Repeaters** | Red **◆R**. These pass messages along. |
| **Companions** | Blue **◆C**. Someone’s own radio, often used for chat. |
| **Room servers** | Purple **◆S**. A chat room that stores messages. |
| **Sensors** | Teal **◆s**. |
| **Other / unknown** | Grey **◆?**, if a radio’s type is none of the above. |

**Show Meshtastic nodes** shows green **●M** dots. Only Meshtastic radios that reach the internet appear.

Tap a diamond or dot for its name, when it was last heard, and where it is. On a repeater or room server, the popup also has **Show coverage**.

**Flag gone-quiet repeaters** (on by default) puts a gold ring on repeaters and room servers that have not advertised for a while. **Quiet after** is 12 hours, 24 hours, 3 days, or 7 days. Open **Gone quiet in view** for the names on the map right now. The popup says **Silent for**, with days and hours.

**Advanced** on this tab: hide quiet radios (**Heard from in the last**), draw fewer markers if the phone feels slow, or **Download fresh node lists** if new radios are missing.

### 6. Coverage: where a signal might reach

Open **📶 Coverage**. This shades the map with a **guess** from the shape of the hills. It does not know about trees or buildings. Do not treat the colour as a promise.

1. Zoom in a bit more (about county level).
2. Tap a red **◆R** repeater, then **Show coverage**. A shaded area appears after a short wait. **Green** is a strong guess, **yellow** is fair, and **orange** is weak. The same colours are listed on the Coverage tab and in a small legend at the bottom-left of the map.
3. Or tap **📍 Drop a pin to test a spot**, then tap the map, to try a place with no repeater.
4. **Coverage on** turns this whole tab off without uninstalling anything. Pins you already dropped can still show.

**Farthest distance** is how far out to check. Next to it, pick **mi** or **km**. That choice is used everywhere distances appear. Heights (how high the antenna is) can be **ft** or **m**. The pickers sit on the height and distance rows.

**Advanced** has the rest: show every nearby repeater at once (slow on a phone), include repeaters or chat rooms, how recently a repeater must have been heard, antenna heights, how sharp the hill map is, and a **Fade margin** cushion so the map is less optimistic. Each of those has an ⓘ button.

### 7. Turn a feature off without uninstalling

Use the switch in the panel. Off means that part is hidden. On brings it back. The choice is remembered next time you open aprs.fi.

To stop the whole add-on but keep it installed, open Tampermonkey’s **Dashboard** and switch off **aprs.fi Mesh Tools (beta)**. Reload aprs.fi. The panel goes away. Switch it on again when you want it back. Your aprs.fi map is otherwise unchanged.

## How to update

You do not have to watch for new versions. Tampermonkey looks for one about once a day.

To update now, on a computer or a phone:

1. Open Tampermonkey’s **Dashboard** (same menus as in step 2 above).
2. Select **aprs.fi Mesh Tools (beta)** and choose **Trigger update**.

You can also open the install link again and tap **Install**. Settings, pins, and saved coverage stay.

The version number is at the bottom of the panel, under **⚙ Panel settings**. **📖 Help / Wiki** there opens this guide.

## How to turn it off or remove it

**Turn off just this script:** Dashboard, switch off **aprs.fi Mesh Tools (beta)**, reload aprs.fi.

**Remove the script:** Dashboard, tap the trash can **🗑** next to **aprs.fi Mesh Tools (beta)**. That also clears its saved settings. aprs.fi itself is not changed.

**Remove Tampermonkey:**

- **Computer:** browser menu, **Extensions** (or **Add-ons**), remove Tampermonkey.
- **Android Firefox or Edge:** the browser’s extensions list, remove Tampermonkey.
- **iPhone:** **Settings**, **Safari**, **Extensions**, turn off Tampermonkey. You can also delete the Tampermonkey app.

After that, aprs.fi looks the way it did before you installed anything.

## If the panel never shows

See [Troubleshooting](Troubleshooting.md). The usual causes: the script switch is off, you are in a browser that does not have Tampermonkey (often Chrome on a phone), or on a computer Chrome/Edge still needs **Allow User Scripts** turned on.
