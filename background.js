/**
 * YT Ad Shield — service worker.
 * Keeps the running total and owns the on/off switch.
 */

const RULESET = 'ad_endpoints';

chrome.runtime.onInstalled.addListener(async () => {
  const { enabled } = await chrome.storage.local.get('enabled');
  if (enabled === undefined) {
    await chrome.storage.local.set({ enabled: true, total: 0 });
  }
  applyState();
});

chrome.runtime.onStartup.addListener(applyState);

async function applyState() {
  const { enabled = true } = await chrome.storage.local.get('enabled');
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets(
      enabled
        ? { enableRulesetIds: [RULESET] }
        : { disableRulesetIds: [RULESET] }
    );
  } catch { /* ruleset already in the requested state */ }
  chrome.action.setBadgeBackgroundColor({ color: enabled ? '#c2410c' : '#3f4451' });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'blocked') {
    chrome.storage.local.get(['total', 'enabled']).then(({ total = 0, enabled = true }) => {
      if (!enabled) return;
      const next = total + (msg.count || 1);
      chrome.storage.local.set({ total: next });
      chrome.action.setBadgeText({ text: next > 999 ? '999+' : String(next) });
    });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'setEnabled') {
    chrome.storage.local.set({ enabled: msg.value }).then(async () => {
      await applyState();
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'reset') {
    chrome.storage.local.set({ total: 0 }).then(() => {
      chrome.action.setBadgeText({ text: '' });
      sendResponse({ ok: true });
    });
    return true;
  }
});
