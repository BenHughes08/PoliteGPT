// background.js
const STORAGE_KEYS = {
  MESSAGES: 'politegpt_messages',
  STATS: 'politegpt_stats',
  ENABLED: 'politegpt_enabled'
};

// initialize on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get([STORAGE_KEYS.ENABLED, STORAGE_KEYS.MESSAGES, STORAGE_KEYS.STATS], (res) => {
    const init = {};
    if (typeof res[STORAGE_KEYS.ENABLED] === 'undefined') init[STORAGE_KEYS.ENABLED] = true;
    if (!Array.isArray(res[STORAGE_KEYS.MESSAGES])) init[STORAGE_KEYS.MESSAGES] = [];
    if (typeof res[STORAGE_KEYS.STATS] === 'undefined') init[STORAGE_KEYS.STATS] = {
      allowed: 0,
      blocked: 0,
      total: 0,
      avgScore: 0
    };
    if (Object.keys(init).length) chrome.storage.local.set(init);
  });
});

// helper to update stats and store message
function pushMessageRecord(record) {
  chrome.storage.local.get([STORAGE_KEYS.MESSAGES, STORAGE_KEYS.STATS], (data) => {
    const arr = Array.isArray(data[STORAGE_KEYS.MESSAGES]) ? data[STORAGE_KEYS.MESSAGES] : [];
    arr.push(record);
    if (arr.length > 1000) arr.splice(0, arr.length - 1000); // keep last 1000

    // update stats
    const stats = data[STORAGE_KEYS.STATS] || { allowed:0, blocked:0, total:0, avgScore:0 };
    stats.total = (stats.total || 0) + 1;
    if (record.blocked) stats.blocked = (stats.blocked || 0) + 1;
    else stats.allowed = (stats.allowed || 0) + 1;
    // update running average safely
    const prevTotal = stats.total - 1;
    const prevAvg = stats.avgScore || 0;
    stats.avgScore = prevTotal > 0 ? Math.round(((prevAvg * prevTotal) + record.score) / stats.total) : record.score;

    chrome.storage.local.set({
      [STORAGE_KEYS.MESSAGES]: arr,
      [STORAGE_KEYS.STATS]: stats
    });
  });
}

// handle messages from content script / popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return;
  if (msg.action === 'log' && msg.payload) {
    pushMessageRecord(msg.payload);
    sendResponse({ ok: true });
  } else if (msg.action === 'clear') {
    chrome.storage.local.set({
      [STORAGE_KEYS.MESSAGES]: [],
      [STORAGE_KEYS.STATS]: { allowed:0,blocked:0,total:0,avgScore:0 }
    }, () => sendResponse({ ok: true }));
    return true; // indicate async
  } else if (msg.action === 'setEnabled' && typeof msg.value === 'boolean') {
    chrome.storage.local.set({ [STORAGE_KEYS.ENABLED]: msg.value }, () => sendResponse({ ok: true }));
    return true;
  }
});
