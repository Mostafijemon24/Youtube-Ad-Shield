# YT Ad Shield

YouTube-এর video ad, banner, overlay এবং "ad blocker off করুন" nag dialog — তিন লেয়ারে ব্লক করে।

## Install (Load unpacked)

1. Chrome / Edge / Brave-এ `chrome://extensions` খুলুন
2. উপরে ডানে **Developer mode** on করুন
3. **Load unpacked** ক্লিক করে `yt-ad-shield` ফোল্ডারটা সিলেক্ট করুন
4. YouTube খোলা থাকলে **hard reload** দিন (`Ctrl+Shift+R`)

Chrome 111+ লাগবে (`world: "MAIN"` content script-এর জন্য)।

## কীভাবে কাজ করে

| Layer | File | কাজ |
|---|---|---|
| Network | `rules.json` | declarativeNetRequest দিয়ে doubleclick, googlesyndication, `/pagead/`, `/api/stats/ads` ইত্যাদি endpoint drop করে |
| Payload | `inject.js` | MAIN world-এ `JSON.parse`, `fetch`, `XHR` hook করে player response থেকে `adPlacements` / `adSlots` / `playerAds` মুছে দেয় — player কখনো জানেই না যে ad ছিল |
| Page | `content.js` + `hide.css` | বাকি banner/overlay সরায়, কোনো video ad টিকে গেলে end-এ jump করায়, anti-adblock dialog dismiss করে |

Payload layer-টাই আসল কাজটা করে। "skip" করার বদলে ad instruction-টাই response থেকে কেটে ফেলে, তাই মাঝে কালো স্ক্রিন বা ১ সেকেন্ডের ফ্ল্যাশ আসে না।

## Selector আপডেট করা

YouTube রেগুলার তাদের renderer tag নাম বদলায়। কিছু ad ফিরে এলে:

- নতুন element-এ **Inspect** করুন, tag name (`ytd-something-renderer`) নিন
- `content.js`-এর `REMOVE` array আর `hide.css`-এ যোগ করুন
- Player response-এ নতুন ad key দেখলে `inject.js`-এর `AD_KEYS`-এ যোগ করুন

Debug করতে console-এ:

```js
JSON.parse(JSON.stringify(window.ytInitialPlayerResponse)).adPlacements // undefined হওয়া উচিত
```

## সীমাবদ্ধতা

- YouTube নিয়মিত detection বদলায়। ১০০% permanent guarantee কোনো blocker-ই দিতে পারে না — মাঝে মাঝে selector আপডেট লাগবে।
- Sponsor segment (creator-এর নিজের রিড-আউট) ব্লক হয় না — ওটা মূল ভিডিওর অংশ। ওর জন্য SponsorBlock আলাদা লাগবে।
- Chrome Web Store-এ publish করলে review-এ আটকাতে পারে; personal use-এ unpacked load-ই নিরাপদ।

## License

Personal use. যেমন খুশি modify করুন।
