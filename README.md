# Youtube Ad Shield

Chrome extension (Manifest V3) that keeps YouTube playback clear of video ads, banners, overlays, and the “turn off your ad blocker” dialog. Chrome 111 or newer.

পপআপ থেকে শিল্ড চালু বা বন্ধ করা যায়, আর কতগুলো অ্যাড আটকেছে সেই হিসাবও সেখানেই থাকে।

## যা আটকায়

- ভিডিওর আগে, মাঝে ও পরে চলা video ad
- হোম, সার্চ ও ওয়াচ পেজের banner, masthead ও promoted video
- প্লেয়ারের ওপর ভাসমান overlay
- “Ad blockers are not allowed on YouTube” nag dialog

ক্রিয়েটরের নিজের স্পন্সর সেগমেন্ট (ভিডিওর ভিতরের রিড-আউট) আটকায় না। ওটা মূল ভিডিওর অংশ।

## তিনটা লেয়ার

| লেয়ার | ফাইল | কাজ |
| --- | --- | --- |
| Network | `rules.json` | `declarativeNetRequest` দিয়ে doubleclick, googlesyndication, `/pagead/`, `/api/stats/ads`-এর মতো অ্যাড এন্ডপয়েন্ট ড্রপ করে |
| Payload | `inject.js` | পেজ লোডের আগেই `MAIN` world-এ `JSON.parse`, `fetch` ও `XHR` হুক করে প্লেয়ার রেসপন্স থেকে `adPlacements`, `adSlots`, `playerAds` সরিয়ে দেয় |
| Page | `content.js`, `hide.css` | বাকি ব্যানার ও ওভারলে সরায়, টিকে যাওয়া video ad শেষে পাঠায়, nag dialog বন্ধ করে |

Payload লেয়ারটা মূল কাজ। অ্যাডের নির্দেশনা রেসপন্স থেকেই কেটে ফেলা হয়, তাই প্লেয়ার অ্যাডের কথা জানতেই পারে না।

পপআপের টগল বন্ধ করলে নেটওয়ার্ক রুলসেটও বন্ধ হয়। ব্যাজে ব্লক করা অ্যাডের সংখ্যা দেখায় (`999+` পর্যন্ত)। **Reset count** কাউন্টার শূন্য করে।

## ইনস্টল

Load unpacked দিয়ে ইনস্টল হয়।

1. Chrome, Edge বা Brave-এ `chrome://extensions` খুলুন।
2. **Developer mode** চালু করুন।
3. **Load unpacked** চেপে এই ফোল্ডারটা সিলেক্ট করুন।
4. YouTube খোলা থাকলে পেজ hard reload দিন (`Ctrl+Shift+R` / `Cmd+Shift+R`)।

## ফাইল

```
manifest.json    extension manifest
background.js    অন/অফ, কাউন্টার, ব্যাজ
rules.json       নেটওয়ার্ক ব্লক রুল
inject.js        প্লেয়ার রেসপন্স থেকে অ্যাড কেটে ফেলা
content.js       DOM পরিষ্কার, video ad, nag dialog
hide.css         অ্যাড স্লট যাতে ফ্ল্যাশ না করে
popup.html       পপআপ
popup.css
popup.js
icons/           16, 48, 128
```

## YouTube বদলালে

YouTube মাঝে মাঝে renderer-এর ট্যাগের নাম বদলায়। কোনো অ্যাড আবার দেখা দিলে:

1. এলিমেন্টে Inspect করে ট্যাগের নাম নিন, যেমন `ytd-something-renderer`।
2. নামটা `content.js`-এর `REMOVE` অ্যারে এবং `hide.css`-এ যোগ করুন।
3. প্লেয়ার রেসপন্সে নতুন অ্যাড কী থাকলে `inject.js`-এর `AD_KEYS`-এ যোগ করুন।

কনসোলে চেক:

```js
JSON.parse(JSON.stringify(window.ytInitialPlayerResponse)).adPlacements
```

`undefined` হলে payload লেয়ার সেই রেসপন্স পরিষ্কার করতে পেরেছে।

## সীমা

YouTube ডিটেকশন বদলাতে থাকে। কোনো ব্লকারই স্থায়ী গ্যারান্টি দেয় না — সময়ে সময়ে সিলেক্টর আপডেট লাগে। স্টোরে পাবলিশ করলে রিভিউতে আটকে যেতে পারে; ব্যক্তিগত ব্যবহারে unpacked load-ই নিরাপদ পথ।

## লাইসেন্স

ব্যক্তিগত ব্যবহার। ইচ্ছেমতো বদলাতে পারেন।
