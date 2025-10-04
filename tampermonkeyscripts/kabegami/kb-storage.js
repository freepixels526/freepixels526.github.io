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
    MODE_MAP: 'kabegami_mode_map_v1',
    STYLE_MAP: 'kabegami_style_map_v1',
    SITES: 'kabegami_sites_v1',
  };

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

  KB.loadModeMap = KB.loadModeMap || function loadModeMap() {
    try { return JSON.parse(GM_getValue(STORAGE.MODE_MAP, '{}')) || {}; } catch (_) { return {}; }
  };

  KB.saveModeMap = KB.saveModeMap || function saveModeMap(map) {
    try { GM_setValue(STORAGE.MODE_MAP, JSON.stringify(map || {})); } catch (e) { error('モードマップの保存エラー', e); }
  };

  KB.getSavedMode = KB.getSavedMode || function getSavedMode(host = KB.getHostKey()) {
    const map = KB.loadModeMap();
    const m = map[host];
    return Number.isInteger(m) ? m : null;
  };

  KB.setSavedMode = KB.setSavedMode || function setSavedMode(host, mode) {
    const map = KB.loadModeMap();
    map[host] = mode;
    KB.saveModeMap(map);
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
    MODE_OVERRIDE[host] = mode;
  };
  KB.clearOverrideMode = KB.clearOverrideMode || function clearOverrideMode(host) {
    delete MODE_OVERRIDE[host];
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
