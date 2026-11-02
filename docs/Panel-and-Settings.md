# ⚙️ The panel and its settings

## The panel

The **🛰️ Mesh Tools** panel opens in the **bottom-right corner** of aprs.fi (320 px wide, narrower on small screens). It has three tabs: **📡 Mesh nodes**, **📶 Coverage** and **🗺️ Map layers**. It remembers which tab you used last.

- **Collapse / open:** tap the panel header (the title bar). The ▾ arrow turns to ▸ when collapsed.
- **Advanced:** each tab keeps less-used settings inside a folded **Advanced** section. Tap it to open.
- **Touch friendly:** on touch screens the buttons, menus and boxes get taller (about 40 px), so they're easier to hit.
- **Welcome tip:** a short tip appears the first time. Tap **Got it** to hide it. Bring it back with **Show tips again**.

## Moving the panel

- **Drag** the **⠿ drag to move** bar at the top to put the panel anywhere. This works with a mouse or a finger.
- The position is **saved**, and the panel is kept on screen if the window is resized or the phone is rotated.
- **Reset the position** any of these ways:
  - tap **⟲** on the drag bar
  - **double-click** or **double-tap** the drag bar
  - tap **Put this box back in the corner** under *⚙ Panel settings*

## ⚙ Panel settings

At the bottom of the panel:

- **📖 Help / Wiki:** opens this wiki in a new tab.
- **Show tips again:** shows the welcome tip (and any old-script notice) again.
- **Put this box back in the corner**
- The version number, e.g. *Mesh Tools 1.0.7-beta*.

## Units

- **Distances** (Coverage *Farthest distance* and pin *Max range*): **mi** (default) or **km**.
- **Heights** (repeater, your antenna, per-node and per-pin heights): **ft** (default) or **m**.

Changing a unit picker changes it everywhere, including popups. Values are stored in metric internally, so switching units never changes the real number. Feet are shown as whole numbers, metres to one decimal place, and miles/km to one decimal place where needed.

## ⓘ Info buttons

Every setting has a small round **ⓘ** button. Tap it for a short plain-English explanation of that setting right under it. Tap it again (or another ⓘ) to close it, since only one is open at a time. The buttons work with a keyboard too (Tab, then Enter/Space).

## When a tab is turned off for you

If an old separate script is detected, the matching tab is switched off and shows a notice instead of its controls. A yellow **⚠ Old scripts are still on** card also appears at the top. Tap **OK** to dismiss it. To fix the cause, see [Installation, Step 3](Installation.md#step-3-turn-off-the-old-separate-scripts-if-you-had-them). **Show tips again** brings back both the welcome tip and this notice.

The Coverage tab also has its own **Coverage on** switch. See [Coverage](Coverage.md#main-controls).

## Where settings are stored

All settings, pins and saved coverage results are kept in **Tampermonkey's own storage** for this script, on your device only. They aren't shared between browsers or devices. Uninstalling the script removes them.
