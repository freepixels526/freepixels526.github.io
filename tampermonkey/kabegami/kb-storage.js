(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  const warn = KB.warn || ((...args) => console.warn('[Kabegami]', ...args));
  const error = KB.error || ((...args) => console.error('[Kabegami]', ...args));
  const info = KB.info || ((...args) => console.info('[Kabegami]', ...args));

  const STORAGE = {
    WALLPAPERS: 'kabegami_wallpapers_v1',
    WALLPAPERS_VER: 'kabegami_wallpapers_ver_v1',
    INDEX_MAP: 'kabegami_index_map_v1',
    ADAPTER_MAP: 'kabegami_adapter_map_v1',
    STYLE_MAP: 'kabegami_style_map_v1',
    SITES: 'kabegami_sites_v1',
  };

  const LEGACY_MODE_MAP_KEY = 'kabegami_mode_map_v1';

  KB.STORAGE_KEYS = Object.assign({}, KB.STORAGE_KEYS || {}, STORAGE);
  KB.DEFAULT_WALLPAPERS = KB.DEFAULT_WALLPAPERS || [];

  function wallpapersFallback() {
    const arr = KB.DEFAULT_WALLPAPERS;
    return Array.isArray(arr) && arr.length ? arr : [];
  }

  KB.loadWallpapers = KB.loadWallpapers || function loadWallpapers() {
    try {
      const raw = GM_getValue(STORAGE.WALLPAPERS, JSON.stringify(wallpapersFallback()));
      const arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.length ? arr : wallpapersFallback();
    } catch (e) {
      warn('壁紙リストの読み込みエラー', e);
      return wallpapersFallback();
    }
  };

  KB.saveWallpapers = KB.saveWallpapers || function saveWallpapers(arr) {
    try {
      const serialized = JSON.stringify(arr || []);
      GM_setValue(STORAGE.WALLPAPERS, serialized);
      const newUserVer = String(Date.now());
      GM_setValue(STORAGE.WALLPAPERS_VER, newUserVer);
      if (typeof KB.loadManifestCache === 'function' && typeof KB.sweepObsoleteIdbKeys === 'function') {
        let manifestVer = null;
        try {
          const cache = KB.loadManifestCache();
          manifestVer = cache && (cache.manifestVersion || (cache.updatedAt ? String(cache.updatedAt) : ''));
        } catch (_) {}
        Promise.resolve(KB.sweepObsoleteIdbKeys(manifestVer || null, newUserVer))
          .catch((sweepErr) => warn('IDB sweep (wallpapers) failed', sweepErr));
      }
    } catch (e) {
      error('壁紙リストの保存エラー', e);
    }
  };

  KB.loadIndexMap = KB.loadIndexMap || function loadIndexMap() {
    try { return JSON.parse(GM_getValue(STORAGE.INDEX_MAP, '{}')) || {}; } catch (_) { return {}; }
  };

  KB.saveIndexMap = KB.saveIndexMap || function saveIndexMap(map) {
    try { GM_setValue(STORAGE.INDEX_MAP, JSON.stringify(map || {})); } catch (e) { error('インデックスマップの保存エラー', e); }
  };

  KB.loadAdapterMap = KB.loadAdapterMap || function loadAdapterMap() {
    try { return JSON.parse(GM_getValue(STORAGE.ADAPTER_MAP, '{}')) || {}; } catch (_) { return {}; }
  };

  KB.saveAdapterMap = KB.saveAdapterMap || function saveAdapterMap(map) {
    try { GM_setValue(STORAGE.ADAPTER_MAP, JSON.stringify(map || {})); }
    catch (e) { error('アダプターマップの保存エラー', e); }
  };

  KB.getSavedAdapter = KB.getSavedAdapter || function getSavedAdapter(host = KB.getHostKey()) {
    const map = KB.loadAdapterMap();
    const id = map[host];
    return (typeof id === 'string' && id.trim()) ? id : null;
  };

  KB.setSavedAdapter = KB.setSavedAdapter || function setSavedAdapter(host, adapterId) {
    const map = KB.loadAdapterMap();
    if (adapterId && typeof adapterId === 'string') {
      map[host] = adapterId;
    } else {
      delete map[host];
    }
    KB.saveAdapterMap(map);
  };

  function adapterForMode(mode) {
    const catalog = KB.MODE_DEFAULT_ADAPTER || {};
    const key = String(mode);
    return catalog[key] || null;
  }

  function modeForAdapter(adapter) {
    if (!adapter) return null;
    const catalog = KB.ADAPTER_DEFAULT_MODE || {};
    if (Object.prototype.hasOwnProperty.call(catalog, adapter)) {
      const numeric = Number(catalog[adapter]);
      return Number.isFinite(numeric) ? numeric : null;
    }
    const reverse = KB.MODE_DEFAULT_ADAPTER || {};
    for (const [modeKey, adapterId] of Object.entries(reverse)) {
      if (adapterId === adapter) {
        const numeric = Number(modeKey);
        if (Number.isFinite(numeric)) return numeric;
      }
    }
    return null;
  }

  function migrateLegacyModeMap() {
    if (typeof GM_getValue !== 'function') return;
    let legacy = {};
    try {
      legacy = JSON.parse(GM_getValue(LEGACY_MODE_MAP_KEY, '{}')) || {};
    } catch (_) {
      legacy = {};
    }
    if (!legacy || typeof legacy !== 'object') return;
    const adapterMap = KB.loadAdapterMap();
    let changed = false;
    for (const [host, mode] of Object.entries(legacy)) {
      const adapterId = adapterForMode(mode);
      if (adapterId && adapterMap[host] !== adapterId) {
        adapterMap[host] = adapterId;
        changed = true;
      }
    }
    if (changed) {
      KB.saveAdapterMap(adapterMap);
    }
    if (typeof GM_setValue === 'function') {
      try { GM_setValue(LEGACY_MODE_MAP_KEY, '{}'); } catch (_) {}
    }
  }

  migrateLegacyModeMap();

  KB.loadModeMap = KB.loadModeMap || function loadModeMap() {
    const adapterMap = KB.loadAdapterMap();
    const out = {};
    for (const [host, adapterId] of Object.entries(adapterMap)) {
      const mode = modeForAdapter(adapterId);
      if (Number.isFinite(mode)) {
        out[host] = mode;
      }
    }
    return out;
  };

  KB.saveModeMap = KB.saveModeMap || function saveModeMap(map) {
    const adapterMap = KB.loadAdapterMap();
    let changed = false;
    if (map && typeof map === 'object') {
      for (const [host, mode] of Object.entries(map)) {
        const adapterId = adapterForMode(mode);
        if (adapterId) {
          if (adapterMap[host] !== adapterId) {
            adapterMap[host] = adapterId;
            changed = true;
          }
        }
      }
    }
    if (changed) {
      KB.saveAdapterMap(adapterMap);
    }
    if (typeof GM_setValue === 'function') {
      try { GM_setValue(LEGACY_MODE_MAP_KEY, '{}'); } catch (_) {}
    }
  };

  KB.getSavedMode = KB.getSavedMode || function getSavedMode(host = KB.getHostKey()) {
    const adapterId = KB.getSavedAdapter(host);
    const mode = modeForAdapter(adapterId);
    return Number.isFinite(mode) ? mode : null;
  };

  KB.setSavedMode = KB.setSavedMode || function setSavedMode(host, mode) {
    const map = KB.loadAdapterMap();
    const adapterId = adapterForMode(mode);
    if (adapterId) {
      map[host] = adapterId;
    } else {
      delete map[host];
    }
    KB.saveAdapterMap(map);
  };

  KB.loadStyleMap = KB.loadStyleMap || function loadStyleMap() {
    try { return JSON.parse(GM_getValue(STORAGE.STYLE_MAP, '{}')) || {}; } catch (_) { return {}; }
  };

  KB.saveStyleMap = KB.saveStyleMap || function saveStyleMap(map) {
    try { GM_setValue(STORAGE.STYLE_MAP, JSON.stringify(map || {})); } catch (e) { error('スタイルマップの保存エラー', e); }
  };

  KB.getHostKey = KB.getHostKey || function getHostKey() {
    return location.host || 'unknown-host';
  };

  KB.getHostStyle = KB.getHostStyle || function getHostStyle(host = KB.getHostKey()) {
    const map = KB.loadStyleMap();
    return map[host] || {};
  };

  KB.updateHostStyle = KB.updateHostStyle || function updateHostStyle(partial, host = KB.getHostKey()) {
    const map = KB.loadStyleMap();
    const cur = map[host] || {};
    map[host] = Object.assign({}, cur, partial);
    KB.saveStyleMap(map);
  };

  const INDEX_OVERRIDE = {};
  KB.getOverrideIndex = KB.getOverrideIndex || function getOverrideIndex(host = KB.getHostKey()) {
    const v = INDEX_OVERRIDE[host];
    return Number.isInteger(v) ? v : null;
  };
  KB.setOverrideIndex = KB.setOverrideIndex || function setOverrideIndex(host, idx) {
    INDEX_OVERRIDE[host] = idx;
  };
  KB.clearOverrideIndex = KB.clearOverrideIndex || function clearOverrideIndex(host) {
    delete INDEX_OVERRIDE[host];
  };

  const MODE_OVERRIDE = {};
  KB.getOverrideMode = KB.getOverrideMode || function getOverrideMode(host = KB.getHostKey()) {
    const m = MODE_OVERRIDE[host];
    return Number.isInteger(m) ? m : null;
  };
  KB.setOverrideMode = KB.setOverrideMode || function setOverrideMode(host, mode) {
    if (Number.isInteger(mode)) {
      MODE_OVERRIDE[host] = mode;
    } else {
      delete MODE_OVERRIDE[host];
    }
  };
  KB.clearOverrideMode = KB.clearOverrideMode || function clearOverrideMode(host) {
    delete MODE_OVERRIDE[host];
  };

  const ADAPTER_OVERRIDE = {};
  KB.getOverrideAdapter = KB.getOverrideAdapter || function getOverrideAdapter(host = KB.getHostKey()) {
    const id = ADAPTER_OVERRIDE[host];
    return (typeof id === 'string' && id.trim()) ? id : null;
  };
  KB.setOverrideAdapter = KB.setOverrideAdapter || function setOverrideAdapter(host, adapterId) {
    if (adapterId && typeof adapterId === 'string') {
      ADAPTER_OVERRIDE[host] = adapterId;
    } else {
      delete ADAPTER_OVERRIDE[host];
    }
  };
  KB.clearOverrideAdapter = KB.clearOverrideAdapter || function clearOverrideAdapter(host) {
    delete ADAPTER_OVERRIDE[host];
  };

  KB.loadSites = KB.loadSites || function loadSites() {
    try {
      const raw = GM_getValue(STORAGE.SITES, '[]');
      const arr = JSON.parse(raw);
      info('サイト一覧を読み込みました', arr);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      error('loadSites error', e);
      return [];
    }
  };

  KB.saveSites = KB.saveSites || function saveSites(list) {
    try {
      GM_setValue(STORAGE.SITES, JSON.stringify(list || []));
      info('サイト一覧を保存しました', list);
    } catch (e) {
      error('saveSites error', e);
    }
  };

})(typeof window !== 'undefined' ? window : this);
