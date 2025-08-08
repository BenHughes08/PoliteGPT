// content_script.js -- threshold-based politeness sending
// - message sends if politeness score >= threshold (default 60)
// - caches enabled flag and threshold for synchronous checks
// - prevents original send immediately and re-triggers if allowed
// - logs records via chrome.runtime.sendMessage({ action: 'log', payload: record })

(() => {
  const NOTIFICATION_ID = 'politegpt-notice';

  // cached settings for synchronous use
  let enabledCached = true;
  let thresholdCached = 60; // default threshold (0-100)

  // read initial cached settings
  chrome.storage.local.get({ politegpt_enabled: true, politegpt_threshold: 60 }, (res) => {
    enabledCached = (typeof res.politegpt_enabled === 'undefined') ? true : !!res.politegpt_enabled;
    thresholdCached = (typeof res.politegpt_threshold === 'undefined') ? 60 : Number(res.politegpt_threshold);
  });

  // keep cache fresh
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.politegpt_enabled) enabledCached = !!changes.politegpt_enabled.newValue;
    if (changes.politegpt_threshold) thresholdCached = Number(changes.politegpt_threshold.newValue);
  });

  // suppress flag to allow synthetic re-clicks to pass through
  let suppressNextClick = false;

  // ----------------------
  // Politeness evaluation (Tier1 hybrid)
  // ----------------------
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

  // ----------------------
  // Notice UI
  // ----------------------
  function showNotice(message, type = 'info') {
    let notice = document.getElementById(NOTIFICATION_ID);
    if (!notice) {
      notice = document.createElement('div');
      notice.id = NOTIFICATION_ID;
      notice.className = 'pgp-notice';
      document.body.appendChild(notice);
    }
    notice.textContent = message;
    notice.classList.toggle('pgp-notice-ok', type === 'ok');
    notice.classList.toggle('pgp-notice-error', type === 'error');
    notice.classList.add('show');
    clearTimeout(notice._timer);
    notice._timer = setTimeout(() => { notice.classList.remove('show'); }, 2800);
  }

  // ----------------------
  // Composer helpers
  // ----------------------
  function getComposerElement() {
    const candidates = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea, input[type="text"]'));
    const visible = candidates.filter(el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 10 && rect.height > 10 && style.visibility !== 'hidden' && style.display !== 'none';
    });
    return visible[0] || null;
  }
  function getMessageTextFromComposer(composer) {
    if (!composer) return '';
    const tag = composer.tagName ? composer.tagName.toLowerCase() : '';
    if (tag === 'textarea' || tag === 'input') return composer.value || '';
    return composer.innerText || composer.textContent || '';
  }

  // ----------------------
  // Logging helper
  // ----------------------
  function logMessageRecord(record) {
    try {
      chrome.runtime.sendMessage({ action: 'log', payload: record }, () => {});
    } catch (err) {
      chrome.storage.local.get({ politegpt_messages: [] }, data => {
        const arr = data.politegpt_messages || [];
        arr.push(record);
        if (arr.length > 1000) arr.splice(0, arr.length - 1000);
        chrome.storage.local.set({ politegpt_messages: arr });
      });
    }
  }

  // ----------------------
  // Send button detection
  // ----------------------
  function isLikelySendButton(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'button') {
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const type = (el.getAttribute('type') || '').toLowerCase();
      const dataTest = (el.getAttribute('data-testid') || '').toLowerCase();
      if (aria.includes('send') || type === 'submit' || dataTest.includes('send')) return true;
      if ((el.innerText || '').trim().toLowerCase().includes('send')) return true;
    }
    return false;
  }
  function findSendButton() {
    const candidates = Array.from(document.querySelectorAll('button,div'));
    for (const el of candidates) {
      try {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (rect.width < 6 || rect.height < 6 || style.visibility === 'hidden' || style.display === 'none') continue;
      } catch (ex) {
        continue;
      }
      if (isLikelySendButton(el)) return el;
    }
    return null;
  }

  // ----------------------
  // Click handler (send button)
  // ----------------------
  document.addEventListener('click', function (e) {
    if (suppressNextClick) { suppressNextClick = false; return; }

    const tgt = e.target;
    const button = tgt.closest && tgt.closest('button,div');
    if (!button) return;

    if (isLikelySendButton(button)) {
      // prevent right away
      e.preventDefault();
      e.stopPropagation();

      const composer = getComposerElement();
      const text = (getMessageTextFromComposer(composer) || '').trim();
      const evalResult = evaluatePolitenessHybrid(text);
      const allowed = evalResult.score >= thresholdCached;

      const record = {
        timestamp: Date.now(),
        text: text.slice(0, 200),
        blocked: !allowed,
        score: evalResult.score,
        breakdown: evalResult.breakdown
      };

      logMessageRecord(record);

      if (!enabledCached) {
        showNotice(`Politeness: ${evalResult.score}/100 (filter disabled)`, 'ok');
        suppressNextClick = true;
        try { button.click(); } catch (err) {
          const evt = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
          button.dispatchEvent(evt);
        }
        return;
      }

      if (!allowed) {
        showNotice(`Message blocked — politeness ${evalResult.score}/100 < threshold ${thresholdCached}.`, 'error');
        if (composer && typeof composer.focus === 'function') composer.focus();
        return;
      }

      // allowed -> send
      showNotice(`Politeness: ${evalResult.score}/100 — sending.`, 'ok');
      suppressNextClick = true;
      try { button.click(); } catch (err) {
        const evt = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
        button.dispatchEvent(evt);
      }
    }
  }, true);

  // ----------------------
  // Enter handler (typing + Enter)
  // ----------------------
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      const active = document.activeElement;
      const composer = getComposerElement();
      if (!(composer && (active === composer || composer.contains(active)))) return;

      // prevent immediately
      e.preventDefault();
      e.stopPropagation();

      const text = (getMessageTextFromComposer(composer) || '').trim();
      const evalResult = evaluatePolitenessHybrid(text);
      const allowed = evalResult.score >= thresholdCached;

      const record = {
        timestamp: Date.now(),
        text: text.slice(0, 200),
        blocked: !allowed,
        score: evalResult.score,
        breakdown: evalResult.breakdown
      };

      logMessageRecord(record);

      if (!enabledCached) {
        showNotice(`Politeness: ${evalResult.score}/100 (filter disabled)`, 'ok');
        const sendBtn = findSendButton();
        if (sendBtn) {
          suppressNextClick = true;
          try { sendBtn.click(); } catch (err) {
            const evt = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
            sendBtn.dispatchEvent(evt);
          }
        } else {
          const evt = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
          composer.dispatchEvent(evt);
        }
        return;
      }

      if (!allowed) {
        showNotice(`Message blocked — politeness ${evalResult.score}/100 < threshold ${thresholdCached}.`, 'error');
        return;
      }

      // allowed -> send
      showNotice(`Politeness: ${evalResult.score}/100 — sending.`, 'ok');
      const sendBtn = findSendButton();
      if (sendBtn) {
        suppressNextClick = true;
        try { sendBtn.click(); } catch (err) {
          const evt = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
          sendBtn.dispatchEvent(evt);
        }
      } else {
        const evt = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
        composer.dispatchEvent(evt);
      }
    }
  }, true);

  // lightweight observer to survive SPA changes
  const observer = new MutationObserver(() => {});
  observer.observe(document.body, { childList: true, subtree: true });

  // expose helpers for debugging
  window.__politegpt = { evaluatePolitenessHybrid, getComposerElement, getMessageTextFromComposer };
  console.info('PoliteGPT content script (threshold-based) active');
})();
