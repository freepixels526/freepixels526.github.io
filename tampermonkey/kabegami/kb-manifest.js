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
  const STORAGE_MANIFEST_URL = 'kb_manifest_url';
  const LEGACY_MANIFEST_URL = 'kabegami_manifest_url_v1';
  const STORAGE_MANIFEST_CACHE = 'kb_manifest_cache_v2';
  const LEGACY_MANIFEST_CACHE = 'kabegami_manifest_cache_v1';
  const LEGACY_MANIFEST_ETAG = 'kabegami_manifest_etag_v1';
  const LEGACY_MANIFEST_LASTMOD = 'kabegami_manifest_lastmod_v1';
  const LEGACY_MANIFEST_FETCH_AT = 'kabegami_manifest_fetched_at_v1';

  const DEFAULT_TTL_MS = 5 * 60 * 1000;
  const MANIFEST_TTL_MS = KB.MANIFEST_TTL_MS = KB.MANIFEST_TTL_MS || DEFAULT_TTL_MS;
  const FETCH_TIMEOUT_MS = KB.MANIFEST_FETCH_TIMEOUT_MS = KB.MANIFEST_FETCH_TIMEOUT_MS || 8000;
  const RETRIES = KB.MANIFEST_FETCH_RETRIES = KB.MANIFEST_FETCH_RETRIES || 2;

  const REFRESH_PROMISES = new Map();

  function safeParseJSON(raw, fallback) {
    if (raw == null) return fallback;
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(String(raw));
    } catch (_) {
      return fallback;
    }
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function cloneWallpapers(list) {
    if (!Array.isArray(list)) return [];
    return list.map((item) => {
      if (!item || typeof item !== 'object') return item;
      return Object.assign({}, item);
    });
  }

  function cloneRecord(record) {
    if (!record || typeof record !== 'object') return {};
    const out = Object.assign({}, record);
    out.wallpapers = cloneWallpapers(record.wallpapers);
    if (record.raw && typeof record.raw === 'object') {
      try {
        out.raw = JSON.parse(JSON.stringify(record.raw));
      } catch (_) {
        out.raw = record.raw;
      }
    }
    return out;
  }

  function uniqueUrls(urls) {
    const seen = new Set();
    const out = [];
    for (const raw of urls || []) {
      if (!raw) continue;
      const url = String(raw).trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push(url);
    }
    return out;
  }

  function sanitizeRecordForSave(record, key) {
    if (!record || typeof record !== 'object') return undefined;
    const out = Object.assign({}, record);
    delete out.changed;
    delete out.__changed;
    out.url = out.url || key;
    out.resolvedUrl = out.resolvedUrl || out.url;
    out.manifestVersion = (out.manifestVersion != null) ? String(out.manifestVersion) : '';
    out.updatedAt = (out.updatedAt != null) ? String(out.updatedAt) : '';
    out.wallpapers = Array.isArray(out.wallpapers) ? out.wallpapers : [];
    out.fetchedAt = Number.isFinite(out.fetchedAt) ? out.fetchedAt : Number(out.fetchedAt) || 0;
    if (out.etag != null) out.etag = String(out.etag || '');
    if (out.lastModified != null) out.lastModified = String(out.lastModified || '');
    if (out.sha256 != null) out.sha256 = String(out.sha256 || '');
    if (out.meta && typeof out.meta !== 'object') delete out.meta;
    return out;
  }

  function migrateLegacyCache() {
    const legacyRaw = safeParseJSON(GM_getValue(LEGACY_MANIFEST_CACHE, '{}'), null);
    if (!legacyRaw || typeof legacyRaw !== 'object' || Array.isArray(legacyRaw)) return null;
    const url = GM_getValue(STORAGE_MANIFEST_URL, '') || GM_getValue(LEGACY_MANIFEST_URL, '') || DEFAULT_MANIFEST_URL;
    const fetchedAt = parseInt(GM_getValue(LEGACY_MANIFEST_FETCH_AT, '0'), 10) || 0;
    const etag = GM_getValue(LEGACY_MANIFEST_ETAG, '') || '';
    const lastModified = GM_getValue(LEGACY_MANIFEST_LASTMOD, '') || '';
    return {
      [url]: sanitizeRecordForSave({
        url,
        resolvedUrl: legacyRaw.resolvedUrl || url,
        manifestVersion: legacyRaw.manifestVersion || '',
        updatedAt: legacyRaw.updatedAt || '',
        wallpapers: Array.isArray(legacyRaw.wallpapers) ? legacyRaw.wallpapers : [],
        raw: legacyRaw.raw || legacyRaw,
        fetchedAt,
        etag,
        lastModified,
      }, url),
    };
  }

  function loadAllManifestRecords() {
    let parsed = safeParseJSON(GM_getValue(STORAGE_MANIFEST_CACHE, '{}'), {});
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = {};
    if (!Object.keys(parsed).length) {
      const migrated = migrateLegacyCache();
      if (migrated) {
        saveAllManifestRecords(migrated);
        return Object.assign({}, migrated);
      }
    }
    return Object.assign({}, parsed);
  }

  function saveAllManifestRecords(map) {
    if (!map || typeof map !== 'object') return;
    const out = {};
    for (const [key, value] of Object.entries(map)) {
      const rec = sanitizeRecordForSave(value, key);
      if (!rec) continue;
      out[key] = rec;
    }
    try {
      GM_setValue(STORAGE_MANIFEST_CACHE, JSON.stringify(out));
    } catch (e) {
      error('マニフェストキャッシュの保存エラー', e);
    }
  }

  function upsertManifestRecord(primaryUrl, patch) {
    const key = primaryUrl || KB.getManifestUrl();
    const map = loadAllManifestRecords();
    const base = map[key] || { url: key, resolvedUrl: key, wallpapers: [] };
    const next = Object.assign({}, base, patch || {});
    next.url = key;
    if (!next.resolvedUrl) next.resolvedUrl = key;
    if (!Array.isArray(next.wallpapers)) next.wallpapers = [];
    if (next.fetchedAt == null) {
      next.fetchedAt = base.fetchedAt || 0;
    } else {
      next.fetchedAt = Number(next.fetchedAt) || 0;
    }
    map[key] = next;
    saveAllManifestRecords(map);
    return cloneRecord(next);
  }

  function timedFetch(input, init) {
    const controller = new AbortController();
    const opts = Object.assign({}, init || {}, { signal: controller.signal });
    if (!('cache' in opts)) opts.cache = 'no-store';
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    return fetch(input, opts).finally(() => clearTimeout(timer));
  }

  function validateManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') return false;
    if (typeof manifest.manifestVersion !== 'string') return false;
    if (typeof manifest.updatedAt !== 'string') return false;
    if (!Array.isArray(manifest.wallpapers)) return false;
    for (const w of manifest.wallpapers) {
      if (!w || typeof w !== 'object') return false;
      if (!Array.isArray(w.sources) || w.sources.length === 0) return false;
      for (const s of w.sources) {
        if (!s || typeof s !== 'object') return false;
        if (typeof s.provider !== 'string') return false;
        if (typeof s.id !== 'string') return false;
        if (typeof s.mediaType !== 'string') return false;
      }
    }
    return true;
  }

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

  function guessMediaTypeFromUrl(u) {
    if (!u) return '';
    try {
      const clean = String(u).split(/[?#]/)[0];
      const m = clean.match(/\.([a-z0-9]+)$/i);
      if (!m) return '';
      const ext = m[1].toLowerCase();
      if (ext === 'jpg' || ext === 'jpeg' || ext === 'jfif' || ext === 'pjpeg' || ext === 'pjp') return 'image/jpeg';
      if (ext === 'png') return 'image/png';
      if (ext === 'gif') return 'image/gif';
      if (ext === 'webp') return 'image/webp';
      if (ext === 'avif') return 'image/avif';
      if (ext === 'bmp') return 'image/bmp';
      if (ext === 'svg') return 'image/svg+xml';
      if (ext === 'mp4' || ext === 'm4v') return 'video/mp4';
      if (ext === 'mov') return 'video/quicktime';
      if (ext === 'webm') return 'video/webm';
      if (ext === 'ogv' || ext === 'ogg') return 'video/ogg';
      if (ext === 'mkv') return 'video/x-matroska';
      if (ext === 'avi') return 'video/x-msvideo';
    } catch (_) {}
    return '';
  }

  KB.isUseManifest = KB.isUseManifest || function isUseManifest() {
    return !!GM_getValue(STORAGE_USE_MANIFEST, true);
  };

  KB.setUseManifest = KB.setUseManifest || function setUseManifest(v) {
    GM_setValue(STORAGE_USE_MANIFEST, !!v);
  };

  KB.getManifestUrl = KB.getManifestUrl || function getManifestUrl() {
    const current = GM_getValue(STORAGE_MANIFEST_URL, '');
    if (current) return String(current);
    const legacy = GM_getValue(LEGACY_MANIFEST_URL, '');
    if (legacy) {
      GM_setValue(STORAGE_MANIFEST_URL, legacy);
      return String(legacy);
    }
    return DEFAULT_MANIFEST_URL;
  };

  KB.setManifestUrl = KB.setManifestUrl || function setManifestUrl(url) {
    const next = url ? String(url).trim() : DEFAULT_MANIFEST_URL;
    GM_setValue(STORAGE_MANIFEST_URL, next);
    upsertManifestRecord(next, { fetchedAt: 0 });
  };

  KB.loadManifestCache = KB.loadManifestCache || function loadManifestCache(arg) {
    const url = typeof arg === 'string' ? arg : (arg && arg.url) || KB.getManifestUrl();
    const map = loadAllManifestRecords();
    if (!map[url]) return {};
    return cloneRecord(map[url]);
  };

  KB.saveManifestCache = KB.saveManifestCache || function saveManifestCache(data, options) {
    const primaryUrl = (typeof options === 'string') ? options : (options && options.url) || KB.getManifestUrl();
    const patch = Object.assign({}, data || {});
    if (patch.wallpapers && !Array.isArray(patch.wallpapers)) delete patch.wallpapers;
    return upsertManifestRecord(primaryUrl, patch);
  };

  KB.getValidators = KB.getValidators || function getValidators(arg) {
    const rec = KB.loadManifestCache(arg);
    return {
      etag: rec.etag || '',
      lastmod: rec.lastModified || '',
    };
  };

  KB.saveValidators = KB.saveValidators || function saveValidators(etag, lastmod, arg) {
    const primaryUrl = (typeof arg === 'string') ? arg : (arg && arg.url) || KB.getManifestUrl();
    const patch = {};
    if (etag != null) patch.etag = String(etag || '');
    if (lastmod != null) patch.lastModified = String(lastmod || '');
    upsertManifestRecord(primaryUrl, patch);
  };

  KB.lastFetchedAt = KB.lastFetchedAt || function lastFetchedAt(arg) {
    const rec = KB.loadManifestCache(arg);
    return Number(rec.fetchedAt) || 0;
  };

  KB.setManifestFetchedAt = KB.setManifestFetchedAt || function setManifestFetchedAt(ts, arg) {
    const primaryUrl = (typeof arg === 'string') ? arg : (arg && arg.url) || KB.getManifestUrl();
    const value = Number(ts) || 0;
    upsertManifestRecord(primaryUrl, { fetchedAt: value });
  };

  KB.touchFetchTime = KB.touchFetchTime || function touchFetchTime(arg) {
    KB.setManifestFetchedAt(Date.now(), arg);
  };

  KB.shouldRefetchByTTL = KB.shouldRefetchByTTL || function shouldRefetchByTTL(options) {
    const ttl = options && Number.isFinite(options.ttl) ? options.ttl : MANIFEST_TTL_MS;
    const url = options && options.url ? options.url : KB.getManifestUrl();
    const fetchedAt = KB.lastFetchedAt(url);
    if (!fetchedAt) return true;
    return (Date.now() - fetchedAt) > ttl;
  };

  KB.invalidateManifest = KB.invalidateManifest || function invalidateManifest(arg) {
    const url = (typeof arg === 'string') ? arg : (arg && arg.url) || KB.getManifestUrl();
    const map = loadAllManifestRecords();
    if (!map[url]) return;
    map[url].fetchedAt = 0;
    saveAllManifestRecords(map);
  };

  KB.pickBestMediaSource = KB.pickBestMediaSource || function pickBestMediaSource(sources) {
    if (!Array.isArray(sources)) return null;
    const normalize = KB.normalizeUrl || normalizeUrlFallback;
    const preferred = sources.find((s) => typeof s?.mediaType === 'string' && (s.mediaType.startsWith('image/') || s.mediaType.startsWith('video/')))
                  || sources.find((s) => typeof s?.id === 'string');
    if (!preferred || typeof preferred.id !== 'string') return null;
    const url = normalize(preferred.id);
    const mediaType = typeof preferred.mediaType === 'string' && preferred.mediaType ? preferred.mediaType : guessMediaTypeFromUrl(preferred.id);
    return {
      url,
      mediaType,
      provider: preferred.provider || '',
      source: preferred,
    };
  };

  KB.normalizeFromManifestEntry = KB.normalizeFromManifestEntry || function normalizeFromManifestEntry(entry, defaultsStyle) {
    try {
      const picked = KB.pickBestMediaSource(entry.sources);
      if (!picked || !picked.url) return null;
      const url = picked.url;
      const style = Object.assign({}, defaultsStyle, entry.style || {});
      const out = {
        name: entry.id || entry.title || deriveNameFallback(url),
        url,
        mediaType: picked.mediaType || guessMediaTypeFromUrl(url) || 'image/jpeg',
      };
      if (style.backgroundSize) out.size = style.backgroundSize;
      if (style.backgroundPosition) out.position = style.backgroundPosition;
      if (style.opacity != null) {
        const n = parseFloat(style.opacity);
        if (!Number.isNaN(n)) out.opacity = n;
      }
      if (style.backgroundAttachment) out.attach = style.backgroundAttachment;
      if (style.mixBlendMode) out.blend = style.mixBlendMode;
      if (picked.provider) out.provider = picked.provider;
      if (picked.source) out.manifestSource = picked.source;
      return out;
    } catch (e) {
      warn('マニフェストエントリの正規化エラー', e);
      return null;
    }
  };

  function normalizeManifest(manifest) {
    const defaultsStyle = manifest && manifest.defaults && manifest.defaults.style ? manifest.defaults.style : {};
    const wallpapers = Array.isArray(manifest?.wallpapers) ? manifest.wallpapers : [];
    return wallpapers.map((w) => KB.normalizeFromManifestEntry(w, defaultsStyle)).filter(Boolean);
  }

  async function refreshManifestInternal(primaryUrl, record, fallbacks) {
    const tryUrls = uniqueUrls([primaryUrl, ...(fallbacks || [])]);
    let lastErr = null;
    for (const candidate of tryUrls) {
      const headers = {};
      if (record?.etag) headers['If-None-Match'] = record.etag;
      if (record?.lastModified) headers['If-Modified-Since'] = record.lastModified;
      for (let attempt = 0; attempt <= RETRIES; attempt++) {
        try {
          const res = await timedFetch(candidate, { headers });
          if (res.status === 304 && record && Array.isArray(record.wallpapers)) {
            const refreshed = Object.assign({}, record, {
              url: primaryUrl,
              resolvedUrl: record.resolvedUrl || candidate,
              fetchedAt: Date.now(),
            });
            return { record: refreshed, changed: false };
          }
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          const json = safeParseJSON(text, null);
          if (!json || typeof json !== 'object') throw new Error('invalid JSON payload');
          if (!validateManifest(json)) throw new Error('invalid manifest shape');
          const normalized = normalizeManifest(json);
          const etag = res.headers.get('ETag') || res.headers.get('etag') || '';
          const lastModified = res.headers.get('Last-Modified') || res.headers.get('last-modified') || '';
          return {
            record: {
              url: primaryUrl,
              resolvedUrl: candidate,
              manifestVersion: String(json.manifestVersion || ''),
              updatedAt: typeof json.updatedAt === 'string' ? json.updatedAt : String(json.updatedAt || ''),
              wallpapers: normalized,
              raw: json,
              fetchedAt: Date.now(),
              etag: etag || '',
              lastModified: lastModified || '',
            },
            changed: true,
          };
        } catch (err) {
          lastErr = err;
          if (attempt < RETRIES) {
            await delay(500 * Math.pow(2, attempt));
            continue;
          }
        }
      }
    }
    if (lastErr) {
      warn('Manifest refresh failed', { url: primaryUrl, error: lastErr?.message || lastErr });
    }
    return null;
  }

  function scheduleRefresh(primaryUrl, record, fallbacks) {
    if (REFRESH_PROMISES.has(primaryUrl)) return REFRESH_PROMISES.get(primaryUrl);
    const promise = refreshManifestInternal(primaryUrl, record, fallbacks)
      .finally(() => { REFRESH_PROMISES.delete(primaryUrl); });
    REFRESH_PROMISES.set(primaryUrl, promise);
    return promise;
  }

  KB.getManifest = KB.getManifest || async function getManifest(options) {
    const opts = options || {};
    const primaryUrl = opts.url ? String(opts.url) : KB.getManifestUrl();
    const fallbacks = Array.isArray(opts.fallbacks) ? opts.fallbacks : [];
    const awaitFresh = !!opts.awaitFresh;
    const force = !!opts.force;
    const bypassTTL = force || !!opts.bypassTTL;
    const ttl = Number.isFinite(opts.ttl) ? opts.ttl : MANIFEST_TTL_MS;

    const map = loadAllManifestRecords();
    const current = map[primaryUrl] || null;
    const immediate = current ? cloneRecord(current) : null;
    const fetchedAt = current && Number.isFinite(current.fetchedAt) ? current.fetchedAt : Number(current?.fetchedAt) || 0;
    const isFresh = !bypassTTL && fetchedAt && (Date.now() - fetchedAt) < ttl;
    const shouldRefresh = force || !current || !isFresh;

    const refreshPromise = shouldRefresh
      ? scheduleRefresh(primaryUrl, current, fallbacks).then((result) => {
          if (!result || !result.record) return immediate;
          const { record, changed } = result;
          const stored = sanitizeRecordForSave(record, primaryUrl);
          if (stored) {
            const latestMap = loadAllManifestRecords();
            latestMap[primaryUrl] = stored;
            saveAllManifestRecords(latestMap);
          }
          const cloned = cloneRecord(record);
          if (changed && typeof KB.onManifestUpdated === 'function') {
            try { KB.onManifestUpdated(cloned); } catch (_) {}
          }
          return cloned;
        }).catch(() => immediate)
      : Promise.resolve(immediate);

    if (awaitFresh || !immediate) {
      return refreshPromise;
    }

    refreshPromise.catch(() => {});
    return immediate;
  };

  KB.refreshManifest = KB.refreshManifest || function refreshManifest(force = false, options) {
    const opts = Object.assign({}, options || {}, {
      awaitFresh: force || !!(options && options.awaitFresh),
      force,
    });
    return KB.getManifest(opts);
  };

})(typeof window !== 'undefined' ? window : this);
