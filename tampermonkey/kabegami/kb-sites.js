(function(global){
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  const MODE_DEFAULT_ADAPTER = KB.MODE_DEFAULT_ADAPTER = KB.MODE_DEFAULT_ADAPTER || {};
  Object.assign(MODE_DEFAULT_ADAPTER, {
    1: 'css-root-background',
    2: 'css-body-pseudo-behind',
    3: 'overlay-front',
    4: 'shadow-overlay-front',
  });

  const ADAPTER_DEFAULT_MODE = KB.ADAPTER_DEFAULT_MODE = KB.ADAPTER_DEFAULT_MODE || {};
  Object.assign(ADAPTER_DEFAULT_MODE, {
    'css-root-background': 1,
    'css-body-pseudo-behind': 2,
    'css-body-background': 1,
    'css-body-pseudo': 2,
    'overlay-front': 3,
    'overlay-behind': 1,
    'shadow-overlay-front': 4,
  });

  function sortedModeKeys() {
    return Object.keys(MODE_DEFAULT_ADAPTER)
      .map((key) => Number(key))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
  }

  function primaryModeKey() {
    const keys = sortedModeKeys();
    return keys.length ? keys[0] : 1;
  }

  const FRONT_ADAPTERS = new Set(['overlay-front', 'shadow-overlay-front']);

  function layerForAdapter(adapter, mode) {
    if (adapter && FRONT_ADAPTERS.has(adapter)) return 'front';
    if (adapter && adapter.indexOf('overlay') === -1) {
      // CSS backgrounds default behind
      return 'behind';
    }
    const numericMode = Number(mode);
    if (FRONT_ADAPTERS.has(MODE_DEFAULT_ADAPTER[numericMode])) return 'front';
    if (numericMode === 3 || numericMode === 4) return 'front';
    return 'behind';
  }

  KB.initSites = KB.initSites || function initSites(ctx) {
    const {
      log = () => {},
      info = () => {},
      warn = () => {},
      DEFAULTS = {},
      baseSites = [],
      normalizeUrl = (u) => String(u || ''),
      currentWallpapers = () => [],
      loadSites = () => [],
      loadIndexMap = () => ({}),
      getHostKey = () => (typeof location !== 'undefined' ? location.host || 'unknown-host' : 'unknown-host'),
      getOverrideIndex = () => null,
      getOverrideMode = () => null,
      getSavedMode = () => null,
      getOverrideAdapter = () => null,
      getSavedAdapter = () => null,
    } = ctx || {};

    const adapterForMode = (mode) => {
      const numeric = Number(mode);
      if (Number.isFinite(numeric) && MODE_DEFAULT_ADAPTER[numeric]) {
        return MODE_DEFAULT_ADAPTER[numeric];
      }
      const fallbackMode = primaryModeKey();
      return MODE_DEFAULT_ADAPTER[fallbackMode] || 'overlay-behind';
    };

    const modeForAdapter = (adapter) => {
      if (!adapter) return null;
      if (Object.prototype.hasOwnProperty.call(ADAPTER_DEFAULT_MODE, adapter)) {
        const mapped = Number(ADAPTER_DEFAULT_MODE[adapter]);
        return Number.isFinite(mapped) ? mapped : null;
      }
      return null;
    };

    const handlersByHost = new Map();
    const handlersByPattern = [];

    function guessMediaType(url) {
      if (!url) return '';
      try {
        const clean = String(url).split(/[?#]/)[0];
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

    function normalizeWallpaperEntry(entry) {
      if (!entry) return null;
      if (typeof entry === 'string') {
        const url = normalizeUrl(entry);
        return { url, mediaType: guessMediaType(url) || 'image/jpeg' };
      }
      if (typeof entry === 'object') {
        const out = { url: normalizeUrl(entry.url) };
        if (entry.mediaType) out.mediaType = entry.mediaType;
        else out.mediaType = guessMediaType(out.url) || 'image/jpeg';
        if (entry.size) out.size = entry.size;
        if (entry.position) out.position = entry.position;
        if (entry.attach) out.attach = entry.attach;
        if (entry.blend) out.blend = entry.blend;
        if (entry.zIndex != null) out.zIndex = entry.zIndex;
        if (entry.opacity != null) {
          const n = parseFloat(entry.opacity);
          if (!Number.isNaN(n)) out.opacity = n;
        }
        return out;
      }
      return null;
    }

    function allSites() {
      const user = loadSites() || [];
      const merged = [...baseSites, ...user];
      log('全サイトを統合しました 件数=', merged.length);
      return merged;
    }

    function mergeWithWallpaperConfig(config, hostKey) {
      const merged = { ...DEFAULTS, ...config };

      const overrideMode = getOverrideMode(hostKey);
      const overrideAdapter = getOverrideAdapter(hostKey);
      const savedMode = getSavedMode(hostKey);
      const savedAdapter = getSavedAdapter(hostKey);

      let resolvedMode = Number.isInteger(overrideMode) ? overrideMode : null;
      let resolvedAdapter = overrideAdapter || null;

      if (!resolvedMode && resolvedAdapter) {
        const inferred = modeForAdapter(resolvedAdapter);
        if (Number.isFinite(inferred)) resolvedMode = inferred;
      }

      if (!resolvedAdapter && savedAdapter) {
        resolvedAdapter = savedAdapter;
      }

      if (!resolvedMode && Number.isInteger(savedMode)) {
        resolvedMode = savedMode;
      }

      if (!resolvedAdapter && Number.isInteger(savedMode)) {
        resolvedAdapter = adapterForMode(savedMode);
      }

      if (!resolvedMode && Number.isInteger(merged.mode)) {
        resolvedMode = merged.mode;
      }

      if (!resolvedAdapter && typeof merged.adapter === 'string' && merged.adapter) {
        resolvedAdapter = merged.adapter;
      }

      resolvedMode = Number(resolvedMode);

      if (!resolvedMode && resolvedAdapter) {
        const inferred = modeForAdapter(resolvedAdapter);
        if (Number.isFinite(inferred)) resolvedMode = inferred;
      }

      if (!Number.isFinite(resolvedMode)) {
        resolvedMode = primaryModeKey();
      }
      const modeKeys = sortedModeKeys();
      if (!modeKeys.includes(resolvedMode)) {
        const next = modeKeys.find((m) => m > resolvedMode);
        resolvedMode = next != null ? next : primaryModeKey();
      }

      if (!resolvedAdapter) {
        resolvedAdapter = adapterForMode(resolvedMode);
      }

      merged.mode = resolvedMode;
      merged.adapter = resolvedAdapter;
      merged.layer = merged.layer || layerForAdapter(resolvedAdapter, resolvedMode);

      const wallpapers = currentWallpapers();
      const indexMap = loadIndexMap() || {};
      const overrideIdx = getOverrideIndex(hostKey);
      const baseIdx = Object.prototype.hasOwnProperty.call(indexMap, hostKey) ? indexMap[hostKey] : 0;
      const pickIdx = Number.isInteger(overrideIdx) ? overrideIdx : baseIdx;
      const safeIdx = Math.max(0, Math.min(wallpapers.length - 1, Number.isInteger(pickIdx) ? pickIdx : 0));
      const fragment = normalizeWallpaperEntry(wallpapers[safeIdx]);
      if (fragment) Object.assign(merged, fragment);
      return merged;
    }

    function resolveHandler(hostKey, href) {
      if (handlersByHost.has(hostKey)) return handlersByHost.get(hostKey);
      for (const { test, handler } of handlersByPattern) {
        try {
          if (test.test(href)) return handler;
        } catch (_) {}
      }
      return null;
    }

    function resolveSiteConfig(href = (typeof location !== 'undefined' ? location.href : '')) {
      info('サイト設定を取得', href);
      const hostKey = getHostKey();

      for (const cfg of allSites()) {
        try {
          if (cfg.test && new RegExp(cfg.test).test ? new RegExp(cfg.test).test(href) : (cfg.test?.test && cfg.test.test(href))) {
            const merged = mergeWithWallpaperConfig(cfg, hostKey);
            merged.handler = resolveHandler(hostKey, href);
            info('設定にマッチしました', { test: String(cfg.test), mode: merged.mode, adapter: merged.adapter, url: merged.url });
            return merged;
          }
        } catch (e) {
          warn('不正な正規表現', cfg.test, e);
        }
      }

      const fallback = mergeWithWallpaperConfig({}, hostKey);
      fallback.handler = resolveHandler(hostKey, href);
      info('マッチなしのためデフォルト適用', { mode: fallback.mode, adapter: fallback.adapter, url: fallback.url });
      return fallback;
    }

    function registerSiteHandler(match, handler) {
      if (!match || typeof handler !== 'function') return;
      if (typeof match === 'string') {
        handlersByHost.set(match, handler);
      } else if (match instanceof RegExp) {
        handlersByPattern.push({ test: match, handler });
      } else if (Array.isArray(match)) {
        match.forEach((m) => registerSiteHandler(m, handler));
      }
    }

    function getHandlerForHost(host) {
      return handlersByHost.get(host) || null;
    }

    return {
      getSiteConfig: resolveSiteConfig,
      getAllSites: allSites,
      registerSiteHandler,
      getHandlerForHost,
    };
  };

})(typeof window !== 'undefined' ? window : this);
