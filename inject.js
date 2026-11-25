/**
 * YT Ad Shield — page-context interceptor.
 *
 * Runs in the MAIN world at document_start, before YouTube's own bundle boots.
 * Everything here has one job: remove ad instructions from the player response
 * so the player never learns an ad exists. Nothing is "skipped" at this layer —
 * there is nothing left to skip.
 */
(() => {
  'use strict';

  if (window.__ytAdShield) return;
  window.__ytAdShield = true;

  /** Keys that carry ad instructions inside player / browse / next responses. */
  const AD_KEYS = [
    'adPlacements',
    'adSlots',
    'playerAds',
    'adBreakHeartbeatParams',
    'adBreakServiceParams',
    'adParams',
    'adServerData',
    'adsEngagementPanelRenderer',
    'promotedSparklesWebRenderer',
    'promotedSparklesTextSearchRenderer',
    'compactPromotedVideoRenderer',
    'promotedVideoRenderer',
    'displayAdRenderer',
    'adSlotRenderer',
    'bannerPromoRenderer',
    'statementBannerRenderer',
    'inFeedAdLayoutRenderer'
  ];

  /** Cheap pre-test so we never walk objects that contain nothing interesting. */
  const AD_MARKER = /adPlacements|adSlots|playerAds|adSlotRenderer|promotedSparkles|displayAdRenderer|inFeedAdLayout|enforcementMessageViewModel/;

  let stripped = 0;

  function report() {
    window.postMessage({ source: 'yt-ad-shield', type: 'stripped', count: stripped }, '*');
  }

  /**
   * Walk an object graph and delete ad keys in place.
   * Depth-capped and cycle-safe — YouTube responses are deep but not infinite.
   */
  function scrub(node, depth, seen) {
    if (!node || typeof node !== 'object' || depth > 20) return node;
    if (seen.has(node)) return node;
    seen.add(node);

    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) {
        const item = node[i];
        // Drop array entries that are themselves nothing but an ad renderer.
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const keys = Object.keys(item);
          if (keys.length === 1 && AD_KEYS.includes(keys[0])) {
            node.splice(i, 1);
            stripped++;
            continue;
          }
        }
        scrub(item, depth + 1, seen);
      }
      return node;
    }

    for (const key of AD_KEYS) {
      if (Object.prototype.hasOwnProperty.call(node, key)) {
        delete node[key];
        stripped++;
      }
    }

    // Neutralise the "ad blockers are not allowed" enforcement payload.
    if (node.playabilityStatus && node.playabilityStatus.status === 'ERROR') {
      const reason = String(node.playabilityStatus.reason || '');
      if (/ad blocker|ad-blocker|adblock/i.test(reason)) {
        node.playabilityStatus.status = 'OK';
        delete node.playabilityStatus.errorScreen;
        delete node.playabilityStatus.reason;
        stripped++;
      }
    }

    for (const key in node) {
      scrub(node[key], depth + 1, seen);
    }
    return node;
  }

  function clean(data) {
    const before = stripped;
    scrub(data, 0, new WeakSet());
    if (stripped !== before) report();
    return data;
  }

  /* ---------------------------------------------------------------- *
   * 1. JSON.parse — covers the inline bootstrap and most XHR payloads
   * ---------------------------------------------------------------- */
  const nativeParse = JSON.parse;
  JSON.parse = function (text, reviver) {
    const data = nativeParse.call(this, text, reviver);
    if (typeof text === 'string' && text.length > 200 && AD_MARKER.test(text)) {
      return clean(data);
    }
    return data;
  };

  /* ---------------------------------------------------------------- *
   * 2. Response.prototype.json — the /youtubei/v1/player fetch path
   * ---------------------------------------------------------------- */
  const nativeJson = Response.prototype.json;
  Response.prototype.json = function () {
    const url = this.url || '';
    const p = nativeJson.call(this);
    if (/\/youtubei\/v1\/(player|next|browse|reel)/.test(url)) {
      return p.then(clean);
    }
    return p;
  };

  const nativeText = Response.prototype.text;
  Response.prototype.text = function () {
    const url = this.url || '';
    const p = nativeText.call(this);
    if (!/\/youtubei\/v1\/(player|next|browse|reel)/.test(url)) return p;
    return p.then((body) => {
      if (!AD_MARKER.test(body)) return body;
      try {
        return JSON.stringify(clean(nativeParse(body)));
      } catch {
        return body;
      }
    });
  };

  /* ---------------------------------------------------------------- *
   * 3. XMLHttpRequest — the legacy player path still used on some pages
   * ---------------------------------------------------------------- */
  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__shieldUrl = String(url || '');
    return nativeOpen.call(this, method, url, ...rest);
  };

  const nativeSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    if (/\/youtubei\/v1\/(player|next|browse|reel)/.test(this.__shieldUrl || '')) {
      this.addEventListener('readystatechange', function () {
        if (this.readyState !== 4) return;
        try {
          if (this.responseType === '' || this.responseType === 'text') {
            const body = this.responseText;
            if (!body || !AD_MARKER.test(body)) return;
            const fixed = JSON.stringify(clean(nativeParse(body)));
            Object.defineProperty(this, 'responseText', { value: fixed, configurable: true });
            Object.defineProperty(this, 'response', { value: fixed, configurable: true });
          } else if (this.responseType === 'json' && this.response) {
            clean(this.response);
          }
        } catch { /* leave the original response alone on any failure */ }
      });
    }
    return nativeSend.apply(this, args);
  };

  /* ---------------------------------------------------------------- *
   * 4. Inline bootstrap globals set by <script> tags in the document
   * ---------------------------------------------------------------- */
  function guard(prop) {
    let value;
    try {
      Object.defineProperty(window, prop, {
        configurable: true,
        enumerable: true,
        get: () => value,
        set: (v) => { value = (v && typeof v === 'object') ? clean(v) : v; }
      });
    } catch { /* property already locked by the page */ }
  }

  guard('ytInitialPlayerResponse');
  guard('ytInitialData');

  /* ---------------------------------------------------------------- *
   * 5. Keep playback speed sane if an ad video ever does slip through
   * ---------------------------------------------------------------- */
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.source !== 'yt-ad-shield-ctl') return;
    if (e.data.type === 'ping') report();
  });

  report();
})();
