(function(global){
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  KB.ensureAddStyle = KB.ensureAddStyle || function ensureAddStyle(css) {
    try {
      if (typeof GM_addStyle === 'function') {
        GM_addStyle(css);
        return;
      }
    } catch (_) {}
    const style = document.createElement('style');
    style.textContent = css;
    document.documentElement.appendChild(style);
  };

  KB.onReady = KB.onReady || function onReady(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }
  };

  KB.getOrCreateStyle = KB.getOrCreateStyle || function getOrCreateStyle(id) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.documentElement.appendChild(el);
    }
    return el;
  };

  KB.replaceStyle = KB.replaceStyle || function replaceStyle(id, css) {
    const el = KB.getOrCreateStyle(id);
    el.textContent = css;
  };

  KB.normalizeUrl = KB.normalizeUrl || function normalizeUrl(u) {
    if (!u) return '';
    const s = String(u).trim();
    const match = s.match(/^url\((['"]?)(.*)\1\)$/);
    return match ? match[2] : s;
  };

})(typeof window !== 'undefined' ? window : this);
