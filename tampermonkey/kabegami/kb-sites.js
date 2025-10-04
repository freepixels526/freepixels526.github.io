(function(global){
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

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
    } = ctx || {};

    const handlersByHost = new Map();
    const handlersByPattern = [];

    function normalizeWallpaperEntry(entry) {
      if (!entry) return null;
      if (typeof entry === 'string') {
        return { url: normalizeUrl(entry) };
      }
      if (typeof entry === 'object') {
        const out = { url: normalizeUrl(entry.url) };
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
      const savedMode = getSavedMode(hostKey);
      const resolvedMode = Number.isInteger(overrideMode)
        ? overrideMode
        : (Number.isInteger(savedMode) ? savedMode : (Number.isInteger(merged.mode) ? merged.mode : 1));
      merged.mode = Math.max(1, Math.min(3, resolvedMode));

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
            info('設定にマッチしました', { test: String(cfg.test), mode: merged.mode, url: merged.url });
            return merged;
          }
        } catch (e) {
          warn('不正な正規表現', cfg.test, e);
        }
      }

      const fallback = mergeWithWallpaperConfig({}, hostKey);
      fallback.handler = resolveHandler(hostKey, href);
      info('マッチなしのためデフォルト適用', { mode: fallback.mode, url: fallback.url });
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
