(function(global){
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  function normalizeText(s) {
    try {
      return String(s).toLowerCase().normalize('NFKC');
    } catch (_) {
      return String(s || '').toLowerCase();
    }
  }

  function deriveNameFromUrl(u) {
    if (!u) return '';
    try {
      const s = String(u);
      const m = s.match(/([^\/?#]+)(?:[?#].*)?$/);
      const base = m ? m[1] : s;
      return base.replace(/\.[a-z0-9]+$/i, '');
    } catch (_) {
      return '';
    }
  }

  function jaro(a, b) {
    const s1 = String(a);
    const s2 = String(b);
    const len1 = s1.length;
    const len2 = s2.length;
    if (len1 === 0 && len2 === 0) return 1;
    const matchDist = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);
    let matches = 0;
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchDist);
      const end = Math.min(i + matchDist + 1, len2);
      for (let j = start; j < end; j++) {
        if (s2Matches[j]) continue;
        if (s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
    if (matches === 0) return 0;
    let k = 0;
    let transpositions = 0;
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
    transpositions /= 2;
    return (
      (matches / len1 + matches / len2 + (matches - transpositions) / matches) / 3
    );
  }

  function jaroWinkler(s1, s2) {
    if (s1 === s2) return 1;
    const m = jaro(s1, s2);
    if (m <= 0.7) return m;
    let p = 0;
    const maxPrefix = 4;
    const n = Math.min(maxPrefix, Math.min(s1.length, s2.length));
    while (p < n && s1[p] === s2[p]) p++;
    const scaling = 0.1;
    return m + p * scaling * (1 - m);
  }

  function bestMatchIndex(query, list) {
    const wallpapers = Array.isArray(list) ? list : [];
    if (!wallpapers.length) return null;
    const q = normalizeText(query);
    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < wallpapers.length; i++) {
      const entry = wallpapers[i] || {};
      const name = String(entry.name || deriveNameFromUrl(entry.url) || '').trim();
      if (!name) continue;
      const score = jaroWinkler(normalizeText(name), q);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
      if (score >= 0.999) return i;
    }
    return bestIdx;
  }

  KB.normalizeText = KB.normalizeText || normalizeText;
  KB.deriveNameFromUrl = KB.deriveNameFromUrl || deriveNameFromUrl;
  KB.jaro = KB.jaro || jaro;
  KB.jaroWinkler = KB.jaroWinkler || jaroWinkler;
  KB.bestMatchIndex = KB.bestMatchIndex || bestMatchIndex;

})(typeof window !== 'undefined' ? window : this);
