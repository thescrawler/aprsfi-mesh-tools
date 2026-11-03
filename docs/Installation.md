# Installation

## 📲 Install (easiest way, works on phones)
Firefox on Android is the usual way. Copy this link, open Tampermonkey's **Utilities** page, then use **Import from URL**.

```
https://raw.githubusercontent.com/thescrawler/aprsfi-mesh-tools/main/aprsfi-mesh-tools.user.js
```

1. Long-press the link and choose **Copy link** (or copy it from the box).
2. In Firefox, tap the menu (the three dots), then **Extensions**. Older Firefox says **Add-ons**. Tap **Tampermonkey**. If you already see a Tampermonkey icon, tap that instead.
3. Tap **Dashboard**.
4. At the top of the Dashboard, tap the **Utilities** tab. On a small screen those tabs sit in a row you can slide sideways until **Utilities** shows. Tampermonkey's own help says: if that tab is missing, set **Config mode** to **Beginner** or **Advanced**.
5. Find **Import from URL**, paste the link, and tap **Install**.
6. Tap **Install** again on the next page.

On a computer you can also click the one-click link in [Step 2](#step-2-install-the-mesh-tools-script). Edge, Kiwi, and iPhone are below.

Mesh Tools is a **userscript**: a small program that a browser extension runs on certain web pages. You need two things:

1. A userscript manager extension. We recommend **Tampermonkey**.
2. The Mesh Tools script itself.

It takes about five minutes. You only do it once.

---

## Step 1: install Tampermonkey

On a phone? Skip to [Installing on a phone](#installing-on-a-phone).

### Google Chrome (Windows, Mac, Linux, ChromeOS)

1. Open the [Tampermonkey page on the Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) and click **Add to Chrome**, then **Add extension**.
2. **Important: turn on "Allow User Scripts".** Newer versions of Chrome (Manifest V3) block userscripts until you allow them:
   1. Click the puzzle-piece **Extensions** icon (top right), then **⋮** next to Tampermonkey, then **Manage extension**.
      You can also type `chrome://extensions` in the address bar and click **Details** under Tampermonkey.
   2. Turn on **Allow User Scripts**.
   3. On older Chrome versions this switch doesn't exist. Instead, turn on **Developer mode** (top-right of `chrome://extensions`).
3. Optional: pin Tampermonkey so its icon is always visible. Click the puzzle piece, then the 📌 next to Tampermonkey.

> If the script is installed but the panel never appears on aprs.fi, the missing **Allow User Scripts** / **Developer mode** switch is the most common cause.

### Microsoft Edge

1. Open [Tampermonkey on Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) and click **Get**.
2. Go to `edge://extensions`. Under Tampermonkey, click **Details** and turn on **Allow User Scripts**. If that isn't shown, turn on **Developer mode** (left-hand menu).

### Firefox (Windows, Mac, Linux)

1. Open [Tampermonkey on Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/), then click **Add to Firefox** and **Add**.
2. No extra switch is needed.

---

## Step 2: install the Mesh Tools script

1. Click the one-click install link: **[Install aprs.fi Mesh Tools](https://github.com/thescrawler/aprsfi-mesh-tools/raw/main/aprsfi-mesh-tools.user.js)**.
   (A Greasy Fork listing is coming later.)
2. Tampermonkey opens an install screen showing **aprs.fi Mesh Tools (beta)**. Click **Install**.
3. Open or reload <https://aprs.fi>. Wait a couple of seconds, and the **🛰️ Mesh Tools** panel appears in the bottom-right corner.

### About the permission prompts

The first time the script downloads data, Tampermonkey may ask whether it can connect to another website. The script only connects to these three domains, which are declared in its header:

| Domain | Why |
|---|---|
| `map.meshcore.io` | List of MeshCore radios |
| `meshmap.net` | List of Meshtastic radios |
| `s3.amazonaws.com` | Terrain (hill height) tiles for coverage |

Choose **Always allow** (or **Always allow domain**) for each. See [Privacy and data sources](Privacy-and-Data-Sources.md) for details.

## Installing on a phone

Chrome on a phone **can't run extensions**, so Tampermonkey won't work there. Use one of these instead.

### Android

1. Install **Firefox** or **Microsoft Edge** from the Google Play Store. (Kiwi Browser also works, but Tampermonkey says it is no longer updated, so Firefox or Edge is safer.)
2. In that browser, add **Tampermonkey**: in Firefox tap **⋮**, then **Extensions**, and search for Tampermonkey. In Edge tap **☰**, then **Extensions**, and add Tampermonkey.

Then install Mesh Tools with **Import from URL**. This is the reliable way on a phone, including when a link only shows code. First you have to open Tampermonkey's **Utilities** page. Menus vary a little, so the names below are the usual ones.

1. Long-press the link below and choose **Copy link** (or copy it from the box).

```
https://raw.githubusercontent.com/thescrawler/aprsfi-mesh-tools/main/aprsfi-mesh-tools.user.js
```

2. Open the **Dashboard**.
   - **Firefox:** tap the **⋮** menu, then **Extensions** (older Firefox says **Add-ons**), then **Tampermonkey**. Or tap the Tampermonkey icon and choose **Dashboard**.
   - **Edge:** usually the **⋮** menu, then **Extensions**, then **Tampermonkey**, then **Dashboard**.
   - **Kiwi:** usually the same path as Edge. Tampermonkey lists Kiwi only for an old version and says it is no longer updated, so Firefox or Edge is safer.
3. At the top of the Dashboard, tap the **Utilities** tab. On a small screen the tabs are in a row you slide sideways. Keep sliding until **Utilities** appears. Tampermonkey's help says that if the tab is hidden, set **Config mode** to **Beginner** or **Advanced**.
4. On that page, find **Import from URL**. Paste the link and tap **Install**.
5. Tap **Install** again on the confirm page, then open <https://aprs.fi>.

### iPhone / iPad

1. Install the **Tampermonkey** app from the App Store.
2. Open **Settings**, then **Safari**, then **Extensions** (on newer iOS: **Settings**, **Apps**, **Safari**, **Extensions**). Turn on **Tampermonkey** and set it to **Allow** on **All Websites**.

Then install Mesh Tools with **Import from URL**. Tampermonkey's iPhone app is a Safari extension. These steps are for that. Another browser only works if it can run the same extension. Bluefy, for example, is a Bluetooth browser and does not have Tampermonkey's Dashboard.

1. Long-press the link below and choose **Copy link** (or copy it from the box).

```
https://raw.githubusercontent.com/thescrawler/aprsfi-mesh-tools/main/aprsfi-mesh-tools.user.js
```

2. In **Safari**, open Tampermonkey and tap **Dashboard**. This is usually the puzzle-piece or **aA** button, then **Tampermonkey**, then **Dashboard**.
3. At the top of the Dashboard, tap the **Utilities** tab. On a small screen, slide that tab row sideways until **Utilities** shows. If the tab is missing, Tampermonkey's help says to set **Config mode** to **Beginner** or **Advanced**.
4. Find **Import from URL**, paste the link, and tap **Install**.
5. Tap **Install** again on the confirm page, then open <https://aprs.fi>.

iPhone/iPad support is new and less tested. If something doesn't work, please tell us at <https://github.com/thescrawler/aprsfi-mesh-tools/issues>.

### Only seeing code?

If tapping the install link just shows a page of code, you're in a browser that doesn't have Tampermonkey (often Chrome). Open the link in the browser where you installed Tampermonkey.

---

## Step 3: turn off the old separate scripts (if you had them)

Mesh Tools replaces three older scripts:

- **aprs.fi MeshCore + Meshtastic Overlay** (the "Mesh Overlay" script)
- **aprs.fi MeshCore Coverage Overlay**
- **aprs.fi Map Layer Toggles**

If any of them is still running, Mesh Tools notices. That part of Mesh Tools stays **off** so nothing is drawn twice. You'll see a yellow **⚠ Old scripts are still on** box, and the tab says the part is turned off.

To fix it:

1. Click the **Tampermonkey icon**, then **Dashboard**.
2. Flip the switch **off** next to each old script. You can also delete them with the 🗑 button.
3. Reload aprs.fi.

Mesh Tools checks for old scripts when it starts, and again every second for the first 30 seconds.

---

## Updating

The script tells Tampermonkey where its latest version lives (on GitHub), so Tampermonkey checks for updates automatically, about once a day by default. To update right away, open the Tampermonkey **Dashboard**, tick the script, and choose **Trigger update**. You can also simply open the install link again.

Your settings, pins and saved coverage results are kept when you update.

## Uninstalling

Open the Tampermonkey **Dashboard** and click 🗑 next to **aprs.fi Mesh Tools (beta)**. This also removes its saved settings. aprs.fi itself is never changed.
