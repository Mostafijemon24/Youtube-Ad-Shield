const els = {
  toggle: document.getElementById('toggle'),
  count: document.getElementById('count'),
  ticks: document.getElementById('ticks'),
  state: document.getElementById('state'),
  reset: document.getElementById('reset')
};

const TICKS = 28;

for (let i = 0; i < TICKS; i++) els.ticks.appendChild(document.createElement('i'));

function paint({ total = 0, enabled = true }) {
  els.count.textContent = total.toLocaleString();
  els.toggle.checked = enabled;
  els.state.textContent = enabled ? 'Shield on' : 'Shield off';
  document.body.classList.toggle('off', !enabled);

  // Each tick stands for one block, then rolls over — the last one runs hot.
  const lit = total % TICKS;
  const full = total >= TICKS;
  els.ticks.querySelectorAll('i').forEach((tick, i) => {
    tick.classList.toggle('lit', enabled && (full || i < lit));
    tick.classList.toggle('hot', enabled && total > 0 && i === (lit === 0 ? TICKS - 1 : lit - 1));
  });
}

chrome.storage.local.get(['total', 'enabled']).then(paint);

chrome.storage.onChanged.addListener((changes) => {
  chrome.storage.local.get(['total', 'enabled']).then(paint);
});

els.toggle.addEventListener('change', () => {
  chrome.runtime.sendMessage({ type: 'setEnabled', value: els.toggle.checked });
});

els.reset.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'reset' });
});
