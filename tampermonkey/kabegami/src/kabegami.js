// ==UserScript==
// @name         カベガマー＋
// @namespace    https://tampermonkey.net/
// @version      0.1.0
// @description  サイト別の設定で壁紙を背景CSS/オーバーレイ/シャドウDOMなど複数のアダプタから選んで適用できます。
// @match        *://*/*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_download
// @grant        unsafeWindow
// @require      https://update.greasyfork.org/scripts/12228/GM_config.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-log.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-util.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-storage.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-cache.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-render-utils.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-channel-front.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-channel-behind.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-manifest.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-search.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-ui.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-config.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-sites.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-menu.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-render.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-hotkeys.js
// @require      https://raw.githubusercontent.com/freepixels526/freepixels526.github.io/refs/heads/shipin-nasi/tampermonkey/kabegami/kb-debug.js
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @connect      githubusercontent.com
// @connect      github.com
// @connect      lh3.googleusercontent.com
// @connect      i.imgur.com
// @connect      images.unsplash.com
// @connect      *
// ==/UserScript==

(function () {
  'use strict';

  // ===== Logger =====
  const LOG_NS = '[Kabegami]';
  let DEBUG = true;
  const targetConsole = (typeof unsafeWindow !== 'undefined' && unsafeWindow.console) ? unsafeWindow.console : console;
  const log = (...a) => DEBUG && targetConsole.log(LOG_NS, ...a);
  const info = (...a) => DEBUG && targetConsole.info(LOG_NS, ...a);
  const warn = (...a) => DEBUG && targetConsole.warn(LOG_NS, ...a);
  const error = (...a) => targetConsole.error(LOG_NS, ...a);
  const KB_NS = window.KB = window.KB || {};
  info('ユーザースクリプトを読み込みました');
  const initDebugProbes = (typeof KB_NS.initDebugProbes === 'function') ? KB_NS.initDebugProbes : () => {};
  const isTopWindow = window.top === window;
  info('コンテキスト', (isTopWindow ? 'top' : 'frame'), location.href);
  initDebugProbes({ enabled: DEBUG, log, info });

  if (!isTopWindow) {
    info('フレーム内のため処理をスキップします');
    return;
  }
  // Warm network paths early (document-start)
  (function preconnectHosts(){
    try {
      const hosts = [
        'https://lh3.googleusercontent.com',
        'https://raw.githubusercontent.com',
        'https://i.imgur.com',
        'https://images.unsplash.com',
        'https://pastebin.com'
      ];
      for (const h of hosts) {
        const a = document.createElement('link'); a.rel='dns-prefetch'; a.href=h;
        const b = document.createElement('link'); b.rel='preconnect'; b.href=h; b.crossOrigin='anonymous';
        (document.head || document.documentElement).append(a,b);
      }
    } catch(_){}
  })();

  /**
   * ============================
   * 設定（サイト別）
   * ============================
   * test: location.href にマッチする正規表現。
   * mode: 1=body背景 / 2=body::before / 3=オーバーレイ新要素
   * url:  壁紙画像のURL（必須）
   * opacity: 不透明度(0.0 - 1.0)。省略時は DEFAULTS.opacity
   * blend:   mix-blend-mode（例: 'multiply', 'screen' など）。未使用なら null
   * zIndex:  オーバーレイ用。省略時は DEFAULTS.zIndex
   * size:    'cover' | 'contain' | 'auto' など。省略時は DEFAULTS.size
   * position:'center center' など。省略時は DEFAULTS.position
   * attach:  'fixed' | 'scroll'。省略時は DEFAULTS.attach
   */
  // No built-in sample sites; user adds sites via menu/quick-add
  const BASE_SITES = [];

  // デフォルト設定（上書き可）
  const DEFAULTS = {
    opacity: 0.2,
    size: 'cover',
    position: 'center center',
    attach: 'fixed',
    zIndex: 9999,
    blend: null,
  };

  const IDS = {
    styleBody: 'kabegami-style-body',
    styleBefore: 'kabegami-style-before',
    overlay: 'kabegami-overlay',
  };

  let applyForLocation = null;
  let applyScheduled = false;
  let applyDeferred = false;
  let visibilitySuspended = false;

  const scheduleApply = (options = {}) => {
    const allowWhileHidden = !!options.allowWhileHidden;
    const isHidden = typeof document !== 'undefined' ? document.hidden : false;
    if (isHidden && !allowWhileHidden) {
      applyDeferred = true;
      return;
    }
    if (applyScheduled) return;
    applyDeferred = false;
    applyScheduled = true;
    Promise.resolve().then(() => {
      applyScheduled = false;
      try {
        if (typeof applyForLocation === 'function') applyForLocation();
      } catch (_) {}
    });
  };
  const prevManifestUpdatedHandler = typeof KB_NS.onManifestUpdated === 'function' ? KB_NS.onManifestUpdated : null;
  KB_NS.onManifestUpdated = function onManifestUpdated(manifest) {
    if (typeof prevManifestUpdatedHandler === 'function') {
      try { prevManifestUpdatedHandler(manifest); } catch (_) {}
    }
    try { scheduleApply(); } catch (_) {}
  };
  const STORAGE_MANIFEST_ETAG = 'kabegami_manifest_etag_v1';
  const STORAGE_MANIFEST_LASTMOD = 'kabegami_manifest_lastmod_v1';
  const STORAGE_MANIFEST_FETCH_AT = 'kabegami_manifest_fetched_at_v1';
  const DEFAULT_MANIFEST_URL = (KB_NS.DEFAULT_MANIFEST_URL || '').trim(); // ← デフォルトURLは空。メニューやURLパラメータ/貼り付け/ローカル読込で設定

  // --- Manifest override helpers (URL param / base64 / paste / local file) ---
  function getParam(name) {
    try {
      const u = new URL(location.href);
      return u.searchParams.get(name);
    } catch (_) { return null; }
  }

  // Allow: kb_manifest=<URL>, kb_manifest_data=<base64(JSON)>
  (function applyManifestParamOverride(){
    try {
      const u = getParam('kb_manifest');
      const dataParam = getParam('kb_manifest_data');
      if (u && typeof setManifestUrl === 'function' && typeof setUseManifest === 'function') {
        setManifestUrl(String(u));
        setUseManifest(true);
      }
      if (dataParam) {
        try {
          const jsonStr = atob(dataParam);
          const manifest = JSON.parse(jsonStr);
          if (manifest && typeof saveManifestCache === 'function') {
            saveManifestCache(manifest);
            if (typeof setManifestFetchedAt === 'function') setManifestFetchedAt(Date.now());
            if (typeof setUseManifest === 'function') setUseManifest(true);
          }
        } catch(e) { /* ignore */ }
      }
    } catch(_) {}
  })();

  // Local file loader
  async function promptLoadManifestFromLocalFile() {
    return new Promise((resolve) => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        document.documentElement.appendChild(input);
        input.onchange = () => {
          const file = input.files && input.files[0];
          if (!file) { input.remove(); return resolve(false); }
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const text = String(reader.result || '');
              const manifest = JSON.parse(text);
              if (manifest && typeof saveManifestCache === 'function') {
                saveManifestCache(manifest);
                if (typeof setManifestFetchedAt === 'function') setManifestFetchedAt(Date.now());
                if (typeof setUseManifest === 'function') setUseManifest(true);
                resolve(true);
              } else {
                resolve(false);
              }
            } catch(e) { alert('JSONとして読み込めませんでした: ' + e.message); resolve(false); }
            finally { input.remove(); }
          };
          reader.onerror = () => { alert('ファイル読み込みに失敗しました'); input.remove(); resolve(false); };
          reader.readAsText(file, 'utf-8');
        };
        input.click();
      } catch(_) { resolve(false); }
    });
  }

  // Menu: paste / URL / local-file
  try {
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('Kabegami: マニフェスト貼り付け(一時上書き)', async () => {
        try {
          const input = prompt('マニフェスト(JSON) を貼り付けてください');
          if (!input) return;
          const manifest = JSON.parse(input);
          if (manifest && typeof saveManifestCache === 'function') {
            saveManifestCache(manifest);
            if (typeof setManifestFetchedAt === 'function') setManifestFetchedAt(Date.now());
            if (typeof setUseManifest === 'function') setUseManifest(true);
            alert('マニフェストを上書きしました。ページを再読み込みします。');
            try { location.reload(); } catch(_) {}
          }
        } catch(e) {
          alert('JSONとして読み込めませんでした: ' + (e && e.message ? e.message : e));
        }
      });

      GM_registerMenuCommand('Kabegami: マニフェスト(ローカル)読み込み', async () => {
        const ok = await promptLoadManifestFromLocalFile();
        if (ok) {
          alert('ローカルファイルから読み込みました。ページを再読み込みします。');
          try { location.reload(); } catch(_) {}
        }
      });
    }
  } catch(_) {}
  // --- end helpers ---

  function bindKB(name) {
    if (typeof KB_NS[name] !== 'function') {
      return null;
    }
    return KB_NS[name].bind(KB_NS);
  }

  function requireKB(name, fallbackName) {
    const fn = bindKB(name);
    if (fn) return fn;
    if (fallbackName) {
      const fb = bindKB(fallbackName);
      if (fb) return fb;
    }
    throw new Error(`KB.${name} is not available${fallbackName ? ` (nor ${fallbackName})` : ''}. Ensure kb-manifest.js is @require'd before kabegami.js.`);
  }

  const isUseManifest = requireKB('isUseManifest');
  const setUseManifest = requireKB('setUseManifest');
  const getManifestUrl = requireKB('getManifestUrl');
  const setManifestUrl = requireKB('setManifestUrl');
  const loadManifestCache = requireKB('loadManifestCache');
  const saveManifestCache = requireKB('saveManifestCache');
  const refreshManifest = requireKB('refreshManifest');
  const getManifest = bindKB('getManifest') || ((opts = {}) => {
    const force = !!opts.force || !!opts.awaitFresh;
    return Promise.resolve(refreshManifest(force)).catch(() => loadManifestCache());
  });
  const saveValidators = requireKB('saveValidators');
  const lastFetchedAt = requireKB('lastFetchedAt');
  const setManifestFetchedAt = bindKB('setManifestFetchedAt') || bindKB('touchFetchTime') || (() => {});

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

  function normalizeWallpaper(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') {
      const url = normalizeUrl ? normalizeUrl(entry) : String(entry);
      const mediaType = guessMediaTypeFromUrl(url) || 'image/jpeg';
      return { url, mediaType };
    }
    if (typeof entry === 'object') {
      const out = Object.assign({}, entry);
      if (out.url) {
        out.url = normalizeUrl ? normalizeUrl(out.url) : String(out.url);
      }
      if (!out.mediaType) {
        out.mediaType = guessMediaTypeFromUrl(out.url) || 'image/jpeg';
      }
      return out;
    }
    return null;
  }

  function currentWallpapers() {
    let list = null;
    if (isUseManifest()) {
      const cache = loadManifestCache();
      if (Array.isArray(cache.wallpapers) && cache.wallpapers.length) {
        list = cache.wallpapers;
      } else {
        list = loadWallpapers();
      }
    } else {
      list = loadWallpapers();
    }
    if (!Array.isArray(list)) return [];
    return list.map((entry) => normalizeWallpaper(entry)).filter(Boolean);
  }

  // ===== Global wallpapers & per-site index =====
  KB_NS.DEFAULT_WALLPAPERS = KB_NS.DEFAULT_WALLPAPERS || [];

  let {
    loadWallpapers = () => [],
    saveWallpapers = () => {},
    loadIndexMap = () => ({}),
    saveIndexMap = () => {},
    loadModeMap = () => ({}),
    saveModeMap = () => {},
    loadStyleMap = () => ({}),
    saveStyleMap = () => {},
    loadThemeMap = () => ({}),
    saveThemeMap = () => {},
    getHostThemes = () => [],
    setHostThemes = () => {},
    updateHostThemes = () => [],
    loadAdapterMap = () => ({}),
    saveAdapterMap = () => {},
    getHostKey = () => (typeof location !== 'undefined' ? location.host || 'unknown-host' : 'unknown-host'),
    getHostStyle = () => ({}),
    updateHostStyle = () => {},
    getOverrideIndex = () => null,
    setOverrideIndex = () => {},
    clearOverrideIndex = () => {},
    getOverrideMode = () => null,
    setOverrideMode = () => {},
    clearOverrideMode = () => {},
    getSavedMode = () => null,
    setSavedMode = () => {},
    getOverrideAdapter = () => null,
    setOverrideAdapter = () => {},
    clearOverrideAdapter = () => {},
    getSavedAdapter = () => null,
    setSavedAdapter = () => {},
    loadSites = () => [],
    saveSites = () => {},
    getBlobURLForMedia = (url) => Promise.resolve(url),
    preloadMedia = () => Promise.resolve(),
    revokeCurrentBlob = () => {},
    setCurrentBlobURL = () => {},
    ensureAddStyle,
    replaceStyle,
    getOrCreateStyle,
    normalizeUrl,
  } = KB_NS;

  if (!ensureAddStyle) {
    ensureAddStyle = (css) => {
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
  }

  if (!getOrCreateStyle) {
    getOrCreateStyle = (id) => {
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement('style');
        el.id = id;
        document.documentElement.appendChild(el);
      }
      return el;
    };
  }

  if (!replaceStyle) {
    replaceStyle = (id, css) => {
      const el = getOrCreateStyle(id);
      el.textContent = css;
    };
  }

  if (!normalizeUrl) {
    normalizeUrl = (u) => {
      if (!u) return '';
      const s = String(u).trim();
      const match = s.match(/^url\((['"]?)(.*)\1\)$/);
      return match ? match[2] : s;
    };
  }

  KB_NS.ensureAddStyle = ensureAddStyle;
  KB_NS.getOrCreateStyle = getOrCreateStyle;
  KB_NS.replaceStyle = replaceStyle;
  KB_NS.normalizeUrl = normalizeUrl;
  KB_NS.IDS = IDS;

  const MODE_DEFAULT_ADAPTER = KB_NS.MODE_DEFAULT_ADAPTER = KB_NS.MODE_DEFAULT_ADAPTER || {};
  const DEFAULT_MODE_ADAPTER = {
    1: 'css-body-background',
    2: 'css-body-pseudo',
    3: 'overlay-front',
    4: 'overlay-behind',
    5: 'css-root-background',
    6: 'css-body-pseudo-behind',
    7: 'shadow-overlay-front',
    9: 'canvas-overlay-front',
  };
  for (const [modeKey, adapterId] of Object.entries(DEFAULT_MODE_ADAPTER)) {
    if (!Object.prototype.hasOwnProperty.call(MODE_DEFAULT_ADAPTER, modeKey)) {
      MODE_DEFAULT_ADAPTER[modeKey] = adapterId;
    }
  }

  const DEFAULT_SEQUENCE = [
    'css-body-background',
    'css-body-pseudo',
    'overlay-front',
    'canvas-overlay-front',
    'overlay-behind',
    'css-root-background',
    'css-body-pseudo-behind',
    'shadow-overlay-front',
  ];

  const baseSequence = Array.isArray(KB.MODE_ADAPTER_SEQUENCE) ? KB.MODE_ADAPTER_SEQUENCE : [];
  const currentSequence = Array.isArray(KB_NS.MODE_ADAPTER_SEQUENCE) ? KB_NS.MODE_ADAPTER_SEQUENCE : [];
  const mergedSequence = Array.from(new Set([...baseSequence, ...currentSequence, ...DEFAULT_SEQUENCE]));
  KB.MODE_ADAPTER_SEQUENCE = mergedSequence.slice();
  KB_NS.MODE_ADAPTER_SEQUENCE = mergedSequence.slice();

  const ADAPTER_DEFAULT_MODE = KB_NS.ADAPTER_DEFAULT_MODE = KB_NS.ADAPTER_DEFAULT_MODE || {};
  const DEFAULT_ADAPTER_MODE = {
    'css-body-background': 1,
    'css-body-pseudo': 2,
    'overlay-front': 3,
    'overlay-behind': 4,
    'css-root-background': 5,
    'css-body-pseudo-behind': 6,
    'shadow-overlay-front': 7,
    'canvas-overlay-front': 9,
  };
  for (const [adapterId, modeKey] of Object.entries(DEFAULT_ADAPTER_MODE)) {
    if (!Object.prototype.hasOwnProperty.call(ADAPTER_DEFAULT_MODE, adapterId)) {
      ADAPTER_DEFAULT_MODE[adapterId] = modeKey;
    }
  }

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

  function adapterFromMode(mode) {
    const numeric = Number(mode);
    if (Number.isFinite(numeric) && MODE_DEFAULT_ADAPTER[numeric]) {
      return MODE_DEFAULT_ADAPTER[numeric];
    }
    const fallbackMode = primaryModeKey();
    return MODE_DEFAULT_ADAPTER[fallbackMode] || 'overlay-behind';
  }

  function modeFromAdapter(adapter) {
    if (!adapter) return null;
    if (Object.prototype.hasOwnProperty.call(ADAPTER_DEFAULT_MODE, adapter)) {
      const mapped = Number(ADAPTER_DEFAULT_MODE[adapter]);
      return Number.isFinite(mapped) ? mapped : null;
    }
    for (const key of Object.keys(MODE_DEFAULT_ADAPTER)) {
      if (MODE_DEFAULT_ADAPTER[key] === adapter) {
        const num = Number(key);
        if (Number.isFinite(num)) return num;
      }
    }
    return null;
  }

  function fallbackAdapterId() {
    const seq = Array.isArray(KB.MODE_ADAPTER_SEQUENCE) ? KB.MODE_ADAPTER_SEQUENCE : [];
    if (seq.length) return seq[0];
    const fallbackMode = primaryModeKey();
    return MODE_DEFAULT_ADAPTER[fallbackMode] || 'css-body-background';
  }

  function resolveAdapter(host = getHostKey()) {
    const candidates = [];
    if (typeof getOverrideAdapter === 'function') candidates.push(getOverrideAdapter(host));
    if (typeof getSavedAdapter === 'function') candidates.push(getSavedAdapter(host));
    if (typeof DEFAULTS.adapter === 'string') candidates.push(DEFAULTS.adapter);
    if (Number.isFinite(DEFAULTS.mode)) candidates.push(adapterFromMode(DEFAULTS.mode));
    if (typeof window !== 'undefined' && window.__kabegami_last_adapter) {
      candidates.push(window.__kabegami_last_adapter);
    }

    const adapter = candidates.find((id) => typeof id === 'string' && id.trim()) || fallbackAdapterId();
    if (typeof window !== 'undefined') {
      try { window.__kabegami_last_adapter = adapter; } catch (_) {}
    }
    return adapter || 'css-body-background';
  }

  function resolveModeAndAdapter(host = getHostKey()) {
    const adapter = resolveAdapter(host);
    const mode = modeFromAdapter(adapter) ?? primaryModeKey();
    return { mode, adapter };
  }

  function getCurrentMode() {
    const { mode } = resolveModeAndAdapter();
    return mode;
  }

  function getCurrentAdapter() {
    const { adapter } = resolveModeAndAdapter();
    return adapter;
  }

  KB_NS.getCurrentMode = getCurrentMode;
  KB_NS.getCurrentAdapter = getCurrentAdapter;

  KB_NS.setOverrideMode = setOverrideMode;
  KB_NS.setOverrideAdapter = setOverrideAdapter;
  KB_NS.clearOverrideMode = clearOverrideMode;
  KB_NS.clearOverrideAdapter = clearOverrideAdapter;
  KB_NS.setSavedMode = setSavedMode;
  KB_NS.setSavedAdapter = setSavedAdapter;

  const siteApi = (typeof KB_NS.initSites === 'function') ? KB_NS.initSites({
    log,
    info,
    warn,
    DEFAULTS,
    baseSites: BASE_SITES,
    normalizeUrl,
    currentWallpapers,
    loadSites,
    loadIndexMap,
    getHostKey,
    getOverrideIndex,
    getOverrideMode,
    getSavedMode,
    getOverrideAdapter,
    getSavedAdapter,
  }) : null;

  if (siteApi) {
    KB_NS.sites = siteApi;
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent('kabegami:sites-ready', { detail: { sites: siteApi } }));
      } catch (_) {}
    }
  } else if (typeof KB_NS.sites === 'undefined') {
    KB_NS.sites = null;
  }

  const getSiteConfig = siteApi?.getSiteConfig ?? (() => ({ ...DEFAULTS }));
  const getAllSites = siteApi?.getAllSites ?? (() => [...BASE_SITES, ...(loadSites() || [])]);
  const registerSiteHandler = siteApi?.registerSiteHandler ?? (() => {});
  const getSiteHandler = siteApi?.getHandlerForHost ?? (() => null);

  KB_NS.registerSiteHandler = registerSiteHandler;
  KB_NS.getSiteHandler = getSiteHandler;

  function getCurrentIndex() {
    const host = getHostKey();
    const override = getOverrideIndex(host);
    if (Number.isInteger(override)) return override;
    const map = loadIndexMap();
    const idx = map[host];
    return Number.isInteger(idx) ? idx : 0;
  }

  function setCurrentIndex(next) {
    const map = loadIndexMap();
    map[getHostKey()] = next;
    saveIndexMap(map);
  }

  let hotkeysApi = null;

  const syncHotkeyOpacityBridge = (value) => {
    if (hotkeysApi && typeof hotkeysApi.syncOpacity === 'function') {
      try { hotkeysApi.syncOpacity(value); } catch (_) {}
    }
  };

  const uiApi = (typeof KB_NS.initUI === 'function') ? KB_NS.initUI({
    info,
    currentWallpapers,
    getCurrentIndex,
    setCurrentIndex,
    setOverrideIndex,
    clearOverrideIndex,
    getHostKey,
    getCurrentMode,
    getCurrentAdapter,
    setOverrideAdapter,
    setSavedAdapter,
    clearOverrideAdapter,
    getHostStyle,
    updateHostStyle,
    scheduleApply,
    applyTransform: (style) => renderApi?.updateTransform(style),
    bestMatchIndex: KB_NS.bestMatchIndex,
    syncHotkeyOpacity: syncHotkeyOpacityBridge,
  }) : null;

  const addRotateButton = uiApi?.addRotateButton ?? (() => {});
  const addSaveButton = uiApi?.addSaveButton ?? (() => {});
  const addModeButton = uiApi?.addModeButton ?? (() => {});
  const addAdjustButton = uiApi?.addAdjustButton ?? (() => {});
  const openSearchDialog = uiApi?.openSearchDialog ?? (() => {});
  const openCanvasEffectsPanel = uiApi?.openCanvasEffectsPanel ?? (() => {});
  const configApi = (typeof KB_NS.initConfig === 'function') ? KB_NS.initConfig({
    DEFAULT_MANIFEST_URL,
    loadSites,
    saveSites,
    loadWallpapers,
    saveWallpapers,
    loadIndexMap,
    saveIndexMap,
    isUseManifest,
    setUseManifest,
    getManifestUrl,
    setManifestUrl,
    getCurrentIndex,
    setCurrentIndex,
    scheduleApply,
    setDebug: (value) => { DEBUG = !!value; },
  }) : null;
  const openConfig = configApi?.openConfig ?? (() => {});
  hotkeysApi = (typeof KB_NS.initHotkeys === 'function') ? KB_NS.initHotkeys({
    info,
    log,
    currentWallpapers,
    getCurrentIndex,
    setCurrentIndex,
    setOverrideIndex,
    clearOverrideIndex,
    getHostKey,
    getCurrentMode,
    getCurrentAdapter,
    setOverrideAdapter,
    setSavedAdapter,
    clearOverrideAdapter,
    loadStyleMap,
    saveStyleMap,
    getHostStyle,
    updateHostStyle,
    scheduleApply,
    openConfig,
    refreshManifest,
    openSearchDialog,
    openCanvasEffectsPanel,
    getOrCreateStyle,
    replaceStyle,
    IDS,
    DEFAULTS,
    alertFn: (msg) => { try { alert(msg); } catch (_) {} },
    applyTransform: (style) => renderApi?.updateTransform(style),
  }) : null;

  const renderApi = (typeof KB_NS.initRenderer === 'function') ? KB_NS.initRenderer({
    info,
    log,
    warn,
    DEFAULTS,
    IDS,
    ensureAddStyle,
    replaceStyle,
    getOrCreateStyle,
    currentWallpapers,
    getHostKey,
    getHostStyle,
    getCurrentIndex,
    getBlobURLForMedia,
    preloadMedia,
    revokeCurrentBlob,
    setCurrentBlobURL,
    onAfterApply: (cfg) => { if (hotkeysApi) hotkeysApi.updateConfig(cfg); },
  }) : null;

  const clearAll = (renderApi && typeof renderApi.clearAll === 'function') ? renderApi.clearAll : () => {};
  const applyWallpaper = (renderApi && typeof renderApi.applyWallpaper === 'function') ? renderApi.applyWallpaper : () => {};
  const applyTransform = (style) => {
    if (!renderApi || typeof renderApi.updateTransform !== 'function') return;
    try { renderApi.updateTransform(style); } catch (_) {}
  };
  KB_NS.applyTransform = applyTransform;

  function suspendForVisibility() {
    if (visibilitySuspended) return;
    visibilitySuspended = true;
    applyDeferred = true;
    try {
      clearAll();
      info('タブ非表示のため壁紙を一時停止しました');
    } catch (e) {
      warn('visibility suspend failed', e);
    }
  }

  function resumeFromVisibility() {
    if (!visibilitySuspended && !applyDeferred) return;
    visibilitySuspended = false;
    scheduleApply();
    info('タブ再表示に伴い壁紙を再適用します');
  }

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        suspendForVisibility();
      } else {
        resumeFromVisibility();
      }
    }, { passive: true });
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('pageshow', (ev) => {
      const restoredFromCache = !!(ev && typeof ev.persisted === 'boolean' && ev.persisted);
      if (restoredFromCache) {
        // BFCache から復帰した場合も即再適用する
        visibilitySuspended = false;
        applyDeferred = true;
      }
      if (typeof document !== 'undefined' && !document.hidden) {
        resumeFromVisibility();
      }
    });
  }

  if (typeof KB_NS.initMenu === 'function') {
    KB_NS.initMenu({
      openConfig,
      loadSites,
      saveSites,
      loadWallpapers,
      saveWallpapers,
      loadIndexMap,
      saveIndexMap,
      loadModeMap,
      loadStyleMap,
      saveStyleMap,
      loadThemeMap,
      saveThemeMap,
      loadAdapterMap,
      saveAdapterMap,
      saveModeMap,
      getHostThemes,
      setHostThemes,
      updateHostThemes,
      refreshManifest,
      getManifestUrl,
      setManifestUrl,
      isUseManifest,
      setUseManifest,
      loadManifestCache,
      saveManifestCache,
      saveValidators,
      setManifestFetchedAt,
      lastFetchedAt,
      scheduleApply,
      storageKeys: {
        etagKey: STORAGE_MANIFEST_ETAG,
        lastModifiedKey: STORAGE_MANIFEST_LASTMOD,
        fetchedAtKey: STORAGE_MANIFEST_FETCH_AT,
      },
    });
  }

  // SPA 対応（URL変化を監視して再適用）
  function hookHistory() {
    applyForLocation = () => {
      info('applyForLocation triggered');
      const cfg = getSiteConfig();
      if (!cfg) { clearAll(); return; }
      // 非同期で body を待つ
        const host = getHostKey();
        const hostStyle = getHostStyle(host);
        onBodyReady(() => {
          const finalize = () => {
            try {
              if (typeof KB_NS.applyThemesForHost === 'function') {
                KB_NS.applyThemesForHost(host);
              }
            } catch (e) {
              warn('テーマ適用でエラー', e);
            }
            if (typeof cfg.handler === 'function') {
              try {
                cfg.handler({ reason: 'site-config', url: location.href, config: cfg });
              } catch (e) {
                warn('サイトハンドラの実行でエラー', e);
            }
          }
          try {
            KB_NS.sites?.runSiteHooks?.({
              reason: 'apply',
              url: location.href,
              host,
              siteConfig: cfg,
            });
          } catch (e) {
            warn('サイトフックの実行でエラー', e);
          }
        };

        let applyPromise;
        try {
          applyPromise = Promise.resolve(applyWallpaper(cfg, hostStyle));
        } catch (e) {
          applyPromise = Promise.reject(e);
        }
        applyPromise.catch(() => {}).finally(finalize);
      });
    };

    const pushState = history.pushState;
    history.pushState = function () {
      const ret = pushState.apply(this, arguments);
      scheduleApply();
      return ret;
    };
    window.addEventListener('popstate', applyForLocation);
    if (window.top === window) { addRotateButton(); addAdjustButton(); addModeButton(); addSaveButton(); }
    applyForLocation();
  }

  function onBodyReady(cb) {
    if (document.body) return cb();
    const obs = new MutationObserver(() => {
      if (document.body) { log('body ready'); obs.disconnect(); cb(); }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  // 起動
  // Try to refresh manifest on boot (non-blocking)
  if (isUseManifest()) {
    getManifest({ awaitFresh: false })
      .then(() => { try { scheduleApply(); } catch (_) {} })
      .catch(() => {});
  }
  info('boot');
  hookHistory();

})();
