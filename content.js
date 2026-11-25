/**
 * YT Ad Shield — DOM layer.
 *
 * The interceptor handles almost everything. This file is the safety net:
 * it removes ad surfaces that are baked into the page shell, force-ends any
 * video ad that survives, and dismisses the "turn off your ad blocker" dialog.
 */
(() => {
  'use strict';

  const REMOVE = [
    '#player-ads',
    '#masthead-ad',
    '#panels ytd-ads-engagement-panel-content-renderer',
    'ytd-ad-slot-renderer',
    'ytd-display-ad-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-sparkles-text-search-renderer',
    'ytd-promoted-video-renderer',
    'ytd-compact-promoted-video-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-banner-promo-renderer',
    'ytd-banner-promo-renderer-background',
    'ytd-statement-banner-renderer',
    'ytd-video-masthead-ad-v3-renderer',
    'ytd-video-masthead-ad-advertiser-info-renderer',
    'ytd-primetime-promo-renderer',
    'ytd-companion-slot-renderer',
    'ytd-action-companion-ad-renderer',
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    'ytm-promoted-video-renderer',
    'ytm-companion-ad-renderer',
    'ytm-promoted-sparkles-web-renderer',
    '.ytp-ad-overlay-container',
    '.ytp-ad-overlay-slot',
    '.ytp-ad-progress-list',
    '.ytd-companion-slot-renderer',
    'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
    'ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer)',
    'ytd-rich-section-renderer:has(ytd-statement-banner-renderer)',
    'ytd-item-section-renderer:has(> #contents > ytd-ad-slot-renderer)'
  ].join(',');

  const SKIP_BUTTONS = [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button-container button',
    '.ytp-ad-survey-answer-button'
  ].join(',');

  let blocked = 0;
  let restoreMuted = null;

  const bump = (n = 1) => {
    blocked += n;
    chrome.runtime.sendMessage({ type: 'blocked', count: n }).catch(() => {});
  };

  /* --------------------------------------------------------------- */
  /* Static ad surfaces                                              */
  /* --------------------------------------------------------------- */
  function sweepDom() {
    let hits = 0;
    for (const el of document.querySelectorAll(REMOVE)) {
      el.remove();
      hits++;
    }
    if (hits) bump(hits);
  }

  /* --------------------------------------------------------------- */
  /* Video ads that slipped past the interceptor                     */
  /* --------------------------------------------------------------- */
  function killVideoAd() {
    const player = document.querySelector('#movie_player, .html5-video-player');
    if (!player) return;

    const showingAd = player.classList.contains('ad-showing') ||
                      player.classList.contains('ad-interrupting');
    const video = player.querySelector('video.html5-main-video') ||
                  player.querySelector('video');

    if (!showingAd) {
      // Ad finished — undo anything we changed.
      if (video && restoreMuted !== null) {
        video.muted = restoreMuted;
        video.playbackRate = 1;
        restoreMuted = null;
      }
      return;
    }

    const skip = player.querySelector(SKIP_BUTTONS);
    if (skip && skip.offsetParent !== null) {
      skip.click();
      bump();
      return;
    }

    if (!video) return;

    if (restoreMuted === null) restoreMuted = video.muted;
    video.muted = true;

    if (Number.isFinite(video.duration) && video.duration > 0) {
      // Jump to the end — the player then advances to the real video.
      video.currentTime = video.duration;
      bump();
    } else {
      video.playbackRate = 16;
    }
  }

  /* --------------------------------------------------------------- */
  /* "Ad blockers are not allowed on YouTube" dialog                 */
  /* --------------------------------------------------------------- */
  function dismissNag() {
    const nag = document.querySelector(
      'ytd-enforcement-message-view-model, .ytd-enforcement-message-view-model'
    );
    if (!nag) return;

    (nag.closest('tp-yt-paper-dialog') || nag.closest('ytd-popup-container') || nag).remove();
    document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach((el) => el.remove());

    document.body.style.removeProperty('overflow');
    document.body.removeAttribute('no-y-overflow');
    document.documentElement.style.removeProperty('overflow');

    const video = document.querySelector('video.html5-main-video');
    if (video && video.paused) video.play().catch(() => {});

    bump();
  }

  /* --------------------------------------------------------------- */
  /* Scheduling                                                      */
  /* --------------------------------------------------------------- */
  let queued = false;
  function run() {
    queued = false;
    try {
      sweepDom();
      killVideoAd();
      dismissNag();
    } catch { /* never let a DOM hiccup kill the observer */ }
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
  }

  const observer = new MutationObserver(schedule);

  function start() {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    // YouTube is an SPA with a lot of async churn; a slow poll catches the rest.
    setInterval(run, 400);
    run();
  }

  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });

  document.addEventListener('yt-navigate-finish', run);

  /* Count payloads the MAIN-world interceptor removed. */
  let lastStripped = 0;
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.source !== 'yt-ad-shield') return;
    if (e.data.type === 'stripped' && e.data.count > lastStripped) {
      const delta = e.data.count - lastStripped;
      lastStripped = e.data.count;
      bump(delta);
    }
  });
})();
