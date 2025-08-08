// popup.js (updated)
// - reads/writes politegpt_threshold
// - shows examples in info modal using same evaluatePolitenessHybrid function
// - renders stats/history as before

const KEYS = {
  MESSAGES: 'politegpt_messages',
  STATS: 'politegpt_stats',
  ENABLED: 'politegpt_enabled',
  THRESHOLD: 'politegpt_threshold'
};

function $(id) { return document.getElementById(id); }

function evaluatePolitenessHybrid(text) {
  const original = (text || '').trim();
  const s = original.toLowerCase();

  const positive = new Set(['please','thank','thanks','appreciate','kind','would','could','helpful','grateful','sorry','thanks!','thankyou']);
  const negative = new Set(['stupid','idiot','hate','dumb','shut up','sucks','fuck','shit','bitch','terrible','awful','asshole','damn']);

  let lexScore = 0;
  const tokens = s.split(/\s+/).filter(Boolean);
  tokens.forEach(w => {
    if (positive.has(w)) lexScore += 1;
    if (negative.has(w)) lexScore -= 1;
  });
  lexScore = Math.max(-20, Math.min(20, lexScore * 4));

  const hasPlease = /\bplease\b/i.test(s);
  const hasThankYou = /\bthank you\b/i.test(s);
  const hasThanks = /\bthanks\b/i.test(s);

  const modalMatches = s.match(/\b(could|would|can you|would you|could you|please could|please would)\b/g) || [];
  const modalBonus = Math.min(10, modalMatches.length * 3);

  const profanityRegex = /\b(shit|fuck|bitch|asshole|damn)\b/i;
  const profanityPenalty = profanityRegex.test(s) ? -40 : 0;

  const letters = original.replace(/[^A-Za-z]/g, '');
  let capsPenalty = 0;
  if (letters.length > 4) {
    const caps = original.replace(/[^A-Z]/g, '');
    if ((caps.length / letters.length) > 0.6) capsPenalty = -15;
  }

  const exclaimCount = (s.match(/!/g) || []).length;
  const exclaimPenalty = exclaimCount >= 3 ? -8 : 0;

  const wordCount = tokens.length;
  const shortPenalty = wordCount <= 2 ? -8 : 0;

  let score = 50 + lexScore
    + (hasPlease ? 20 : 0)
    + (hasThankYou ? 20 : 0)
    + (hasThanks ? 8 : 0)
    + modalBonus
    + capsPenalty
    + profanityPenalty
    + exclaimPenalty
    + shortPenalty;

  score = Math.round(Math.max(0, Math.min(100, score)));

  const breakdown = [
    { reason: 'lexicon', delta: lexScore },
    { reason: 'please', delta: hasPlease ? 20 : 0 },
    { reason: 'thank you', delta: hasThankYou ? 20 : 0 },
    { reason: 'thanks', delta: hasThanks ? 8 : 0 },
    { reason: 'modalBonus', delta: modalBonus },
    { reason: 'capsPenalty', delta: capsPenalty },
    { reason: 'profanityPenalty', delta: profanityPenalty },
    { reason: 'exclaimPenalty', delta: exclaimPenalty },
    { reason: 'shortPenalty', delta: shortPenalty }
  ];

  return { score, breakdown, wordCount, text: original };
}

function formatTime(ts) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function renderStats(stats) {
  $('allowedCount').textContent = stats.allowed || 0;
  $('blockedCount').textContent = stats.blocked || 0;
  $('avgScore').textContent = (typeof stats.avgScore === 'number') ? `${stats.avgScore}` : '0';
}

function createHistoryItem(rec) {
  const div = document.createElement('div');
  div.className = 'history-item';
  const snippet = document.createElement('div');
  snippet.className = 'message-snippet';
  snippet.textContent = rec.text || '(empty)';
  const meta = document.createElement('div');
  meta.className = 'message-meta';
  const ts = document.createElement('div');
  ts.textContent = formatTime(rec.timestamp);
  const sb = document.createElement('div');
  sb.innerHTML = `<strong>${rec.score}</strong>${rec.blocked ? ' ⛔' : ''}`;
  const bar = document.createElement('div');
  bar.className = 'score-bar';
  const fill = document.createElement('div');
  fill.className = 'score-fill';
  fill.style.width = `${rec.score}%`;
  bar.appendChild(fill);

  meta.appendChild(ts);
  meta.appendChild(sb);
  meta.appendChild(bar);

  div.appendChild(snippet);
  div.appendChild(meta);
  return div;
}

function renderHistory(messages) {
  const list = $('historyList');
  list.innerHTML = '';
  if (!messages || messages.length === 0) {
    list.textContent = 'No messages yet.';
    return;
  }
  const recent = messages.slice(-30).reverse();
  recent.forEach(rec => list.appendChild(createHistoryItem(rec)));
}

function loadAndRender() {
  chrome.storage.local.get([KEYS.MESSAGES, KEYS.STATS, KEYS.ENABLED, KEYS.THRESHOLD], (res) => {
    const messages = res[KEYS.MESSAGES] || [];
    const stats = res[KEYS.STATS] || { allowed:0, blocked:0, total:0, avgScore:0 };
    const enabled = (typeof res[KEYS.ENABLED] === 'undefined') ? true : res[KEYS.ENABLED];
    const threshold = (typeof res[KEYS.THRESHOLD] === 'undefined') ? 60 : Number(res[KEYS.THRESHOLD]);

    $('enabledToggle').checked = !!enabled;
    $('thresholdRange').value = threshold;
    $('thresholdValue').textContent = threshold;

    renderStats(stats);
    renderHistory(messages);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadAndRender();

  // toggle enabled
  $('enabledToggle').addEventListener('change', (e) => {
    const value = e.target.checked;
    chrome.runtime.sendMessage({ action: 'setEnabled', value }, () => {
      chrome.storage.local.set({ [KEYS.ENABLED]: value }, loadAndRender);
    });
  });

  // threshold slider
  $('thresholdRange').addEventListener('input', (e) => {
    const val = Number(e.target.value);
    $('thresholdValue').textContent = val;
  });
  $('thresholdRange').addEventListener('change', (e) => {
    const val = Number(e.target.value);
    chrome.storage.local.set({ [KEYS.THRESHOLD]: val }, () => {
      loadAndRender();
    });
  });

  // clear logs
  $('clearBtn').addEventListener('click', () => {
    if (!confirm('Clear all logs and reset stats?')) return;
    chrome.runtime.sendMessage({ action: 'clear' }, () => {
      setTimeout(loadAndRender, 200);
    });
  });

  // info modal handling
  const infoBtn = $('infoBtn');
  const modal = $('infoModal');
  const closeModal = $('closeModal');

  function showModal() {
    // examples
    const perfectText = 'Please could you help me with this? Thank you so much — I really appreciate your time.';
    const worstText = 'You idiot, give me the answer now!!!';

    const perf = evaluatePolitenessHybrid(perfectText);
    const worst = evaluatePolitenessHybrid(worstText);

    $('perfectExample').innerHTML = `<div style="font-weight:600">${perf.score}/100</div><div style="margin-top:6px;">${perfectText}</div>`;
    $('worstExample').innerHTML = `<div style="font-weight:600">${worst.score}/100</div><div style="margin-top:6px;">${worstText}</div>`;

    modal.setAttribute('aria-hidden', 'false');
  }
  function hideModal() { modal.setAttribute('aria-hidden', 'true'); }

  infoBtn.addEventListener('click', showModal);
  closeModal.addEventListener('click', hideModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });
});
