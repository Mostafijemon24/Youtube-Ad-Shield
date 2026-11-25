# Youtube Ad Shield

Chrome extension (Manifest V3) that keeps YouTube playback clear of video ads, banners, overlays, and the “turn off your ad blocker” dialog. Requires Chrome 111 or newer.

The popup turns the shield on or off and shows how many ads have been blocked.

## What it blocks

- Video ads before, during, and after a video
- Banners, mastheads, and promoted videos on Home, Search, and Watch
- Overlays sitting on top of the player
- The “Ad blockers are not allowed on YouTube” nag dialog

Creator sponsor segments stay in the video. They are part of the video itself.

## Three layers

| Layer | File | What it does |
| --- | --- | --- |
| Network | `rules.json` | Drops ad endpoints such as doubleclick, googlesyndication, `/pagead/`, and `/api/stats/ads` with `declarativeNetRequest` |
| Payload | `inject.js` | Hooks `JSON.parse`, `fetch`, and `XHR` in the `MAIN` world before the page boots, and removes `adPlacements`, `adSlots`, and `playerAds` from the player response |
| Page | `content.js`, `hide.css` | Removes leftover banners and overlays, sends a surviving video ad to its end, and closes the nag dialog |

The payload layer does the real work. Ad instructions are cut out of the response, so the player never learns an ad was there.

Turning the popup toggle off also disables the network ruleset. The toolbar badge shows the blocked count, up to `999+`. **Reset count** sets the counter back to zero.

## Install

Load the folder unpacked.

1. Open `chrome://extensions` in Chrome, Edge, or Brave.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. If YouTube is already open, hard-reload the page (`Ctrl+Shift+R` / `Cmd+Shift+R`).

## Files

```
manifest.json    extension manifest
background.js    on/off switch, counter, badge
rules.json       network block rules
inject.js        strips ads from the player response
content.js       DOM cleanup, video ads, nag dialog
hide.css         keeps ad slots from flashing on screen
popup.html       popup
popup.css
popup.js
icons/           16, 48, 128
```

## When YouTube changes

YouTube renames renderer tags from time to time. When an ad shows up again:

1. Inspect the element and copy the tag name, for example `ytd-something-renderer`.
2. Add it to the `REMOVE` array in `content.js` and to `hide.css`.
3. If the player response has a new ad key, add it to `AD_KEYS` in `inject.js`.

Check in the console:

```js
JSON.parse(JSON.stringify(window.ytInitialPlayerResponse)).adPlacements
```

`undefined` means the payload layer cleaned that response.

## Limits

YouTube keeps changing how it detects blockers, so selectors need an update now and then. For personal use, load the folder unpacked. A Chrome Web Store submission can sit in review.

## License

Personal use. Change it however you like.
