(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  const info = KB.info || (() => {});
  const warn = KB.warn || ((...args) => console.warn('[Kabegami]', ...args));
  const error = KB.error || ((...args) => console.error('[Kabegami]', ...args));

  const DEFAULT_MANIFEST_URL = KB.DEFAULT_MANIFEST_URL || 'https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/main/wallpapers.manifest.json';
  KB.DEFAULT_MANIFEST_URL = DEFAULT_MANIFEST_URL;

  const STORAGE_USE_MANIFEST = 'kabegami_use_manifest_v1';
  const STORAGE_MANIFEST_URL = 'kabegami_manifest_url_v1';
  const STORAGE_MANIFEST_CACHE = 'kabegami_manifest_cache_v1';
  const STORAGE_MANIFEST_ETAG = 'kabegami_manifest_etag_v1';
  const STORAGE_MANIFEST_LASTMOD = 'kabegami_manifest_lastmod_v1';
  const STORAGE_MANIFEST_FETCH_AT = 'kabegami_manifest_fetched_at_v1';

  const MANIFEST_TTL_MS = KB.MANIFEST_TTL_MS || (60 * 60 * 1000);
  KB.MANIFEST_TTL_MS = MANIFEST_TTL_MS;

  function normalizeUrlFallback(u) {
    if (!u) return u;
    const s = String(u).trim();
    const m = s.match(/^url\((['"]?)(.*)\1\)$/);
    return m ? m[2] : s;
  }

  function deriveNameFallback(u) {
    if (typeof KB.deriveNameFromUrl === 'function') return KB.deriveNameFromUrl(u);
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

  KB.isUseManifest = KB.isUseManifest || function isUseManifest() {
    return !!GM_getValue(STORAGE_USE_MANIFEST, true);
  };

  KB.setUseManifest = KB.setUseManifest || function setUseManifest(v) {
    GM_setValue(STORAGE_USE_MANIFEST, !!v);
  };

  KB.getManifestUrl = KB.getManifestUrl || function getManifestUrl() {
    return GM_getValue(STORAGE_MANIFEST_URL, DEFAULT_MANIFEST_URL);
  };

  KB.setManifestUrl = KB.setManifestUrl || function setManifestUrl(s) {
    GM_setValue(STORAGE_MANIFEST_URL, s || DEFAULT_MANIFEST_URL);
  };

  KB.loadManifestCache = KB.loadManifestCache || function loadManifestCache() {
    try {
      const raw = GM_getValue(STORAGE_MANIFEST_CACHE, '{}');
      const obj = JSON.parse(raw);
      return obj || {};
    } catch (_) {
      return {};
    }
  };

  KB.saveManifestCache = KB.saveManifestCache || function saveManifestCache(obj) {
    try {
      GM_setValue(STORAGE_MANIFEST_CACHE, JSON.stringify(obj || {}));
    } catch (e) {
      error('マニフェストキャッシュの保存エラー', e);
    }
  };

  KB.getValidators = KB.getValidators || function getValidators() {
    return {
      etag: GM_getValue(STORAGE_MANIFEST_ETAG, ''),
      lastmod: GM_getValue(STORAGE_MANIFEST_LASTMOD, ''),
    };
  };

  KB.saveValidators = KB.saveValidators || function saveValidators(etag, lastmod) {
    if (etag) GM_setValue(STORAGE_MANIFEST_ETAG, etag);
    if (lastmod) GM_setValue(STORAGE_MANIFEST_LASTMOD, lastmod);
  };

  KB.lastFetchedAt = KB.lastFetchedAt || function lastFetchedAt() {
    return parseInt(GM_getValue(STORAGE_MANIFEST_FETCH_AT, '0'), 10) || 0;
  };

  KB.touchFetchTime = KB.touchFetchTime || function touchFetchTime() {
    GM_setValue(STORAGE_MANIFEST_FETCH_AT, String(Date.now()));
  };

  KB.shouldRefetchByTTL = KB.shouldRefetchByTTL || function shouldRefetchByTTL() {
    return (Date.now() - KB.lastFetchedAt()) > MANIFEST_TTL_MS;
  };

  KB.pickBestImageSource = KB.pickBestImageSource || function pickBestImageSource(sources) {
    if (!Array.isArray(sources)) return null;
    const normalize = KB.normalizeUrl || normalizeUrlFallback;
    const img = sources.find((s) => typeof s?.mediaType === 'string' && s.mediaType.startsWith('image/'))
             || sources.find((s) => typeof s?.id === 'string');
    return img ? normalize(img.id) : null;
  };

  KB.normalizeFromManifestEntry = KB.normalizeFromManifestEntry || function normalizeFromManifestEntry(entry, defaultsStyle) {
    try {
      const url = KB.pickBestImageSource(entry.sources);
      if (!url) return null;
      const style = Object.assign({}, defaultsStyle, entry.style || {});
      const out = {
        name: entry.id || entry.title || deriveNameFallback(url),
        url,
      };
      if (style.backgroundSize) out.size = style.backgroundSize;
      if (style.backgroundPosition) out.position = style.backgroundPosition;
      if (style.opacity != null) {
        const n = parseFloat(style.opacity);
        if (!Number.isNaN(n)) out.opacity = n;
      }
      if (style.backgroundAttachment) out.attach = style.backgroundAttachment;
      if (style.mixBlendMode) out.blend = style.mixBlendMode;
      return out;
    } catch (e) {
      warn('マニフェストエントリの正規化エラー', e);
      return null;
    }
  };

  KB.gmFetchJson = KB.gmFetchJson || function gmFetchJson(url) {
    const v = KB.getValidators();
    return new Promise((resolve, reject) => {
      try {
        GM_xmlhttpRequest({
          method: 'GET', url, responseType: 'json',
          headers: Object.assign(
            {},
            v.etag ? { 'If-None-Match': v.etag } : {},
            v.lastmod ? { 'If-Modified-Since': v.lastmod } : {}
          ),
          onload: (res) => {
            try {
              if (res.status === 304) {
                resolve({ status: 304, data: null, headers: res.responseHeaders });
                return;
              }
              const data = (res.response && typeof res.response === 'object') ? res.response : JSON.parse(res.responseText);
              const etag = /etag:\s*(.+)/i.exec(res.responseHeaders || '')?.[1]?.trim();
              const lastmod = /last-modified:\s*(.+)/i.exec(res.responseHeaders || '')?.[1]?.trim();
              resolve({ status: 200, data, etag, lastmod });
            } catch (e) { reject(e); }
          },
          onerror: (e) => reject(e)
        });
      } catch (e) { reject(e); }
    });
  };

  KB.refreshManifest = KB.refreshManifest || async function refreshManifest(force = false) {
    const url = KB.getManifestUrl();
    info('マニフェスト更新開始', url, { force });
    try {
      if (!force && !KB.shouldRefetchByTTL()) {
        info('TTL内のためマニフェスト取得をスキップ');
        return KB.loadManifestCache();
      }
      const res = await KB.gmFetchJson(url);
      if (res.status === 304) {
        info('マニフェスト 304 Not Modified');
        KB.touchFetchTime();
        return KB.loadManifestCache();
      }
      const data = res.data;
      if (!data || !Array.isArray(data.wallpapers)) {
        throw new Error('Invalid manifest schema');
      }
      const defaultsStyle = (data.defaults && data.defaults.style) ? data.defaults.style : {};
      const normalized = data.wallpapers.map((w) => KB.normalizeFromManifestEntry(w, defaultsStyle)).filter(Boolean);
      const cache = {
        url,
        updatedAt: data.updatedAt || Date.now(),
        manifestVersion: data.manifestVersion || '1.0.0',
        wallpapers: normalized,
      };
      KB.saveManifestCache(cache);
      KB.saveValidators(res.etag, res.lastmod);
      KB.touchFetchTime();
      info('マニフェスト更新完了', { count: normalized.length });
      return cache;
    } catch (e) {
      error('マニフェスト更新に失敗しました', e);
      return KB.loadManifestCache();
    }
  };

})(typeof window !== 'undefined' ? window : this);
