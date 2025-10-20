(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  const adapterRegistry = KB.__kbModeAdapters = KB.__kbModeAdapters || new Map();

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

  const MODE_ADAPTER_LABELS = KB.MODE_ADAPTER_LABELS = KB.MODE_ADAPTER_LABELS || {};
  Object.assign(MODE_ADAPTER_LABELS, {
    'css-root-background': 'Root Background (CSS)',
    'css-body-pseudo-behind': 'Body ::before Behind',
    'css-body-background': 'Body Background (CSS)',
    'css-body-pseudo': 'Body ::before Layer',
    'overlay-behind': 'Behind Overlay Layer',
    'overlay-front': 'Front Overlay Layer',
    'shadow-overlay-front': 'Shadow Overlay Front',
  });

  const DEFAULT_ADAPTER_SEQUENCE = [
    'css-root-background',
    'css-body-pseudo-behind',
    'css-body-background',
    'css-body-pseudo',
    'overlay-behind',
    'overlay-front',
    'shadow-overlay-front',
  ];
  KB.MODE_ADAPTER_SEQUENCE = Array.from(new Set([
    ...(Array.isArray(KB.MODE_ADAPTER_SEQUENCE) ? KB.MODE_ADAPTER_SEQUENCE : []),
    ...DEFAULT_ADAPTER_SEQUENCE,
  ]));

  KB.registerModeAdapter = KB.registerModeAdapter || function registerModeAdapter(name, factory) {
    if (!name || typeof factory !== 'function') return;
    adapterRegistry.set(name, factory);
  };

  KB.unregisterModeAdapter = KB.unregisterModeAdapter || function unregisterModeAdapter(name) {
    adapterRegistry.delete(name);
  };

  KB.listModeAdapters = KB.listModeAdapters || function listModeAdapters() {
    return Array.from(adapterRegistry.keys());
  };

  KB.getModeAdapterFactory = KB.getModeAdapterFactory || function getModeAdapterFactory(name) {
    return adapterRegistry.get(name) || null;
  };

  const utils = KB.renderUtils;
  if (!utils) {
    throw new Error('KB.renderUtils must be loaded before kb-render.js');
  }

  const {
    normalizeStyle,
    computeSizeWithScale,
    computePositionWithOffset,
    buildTransformString,
    resolveMediaType,
    clamp,
    objectFitFromSize,
    isVideoMedia,
    setVideoSource,
    ensureVideoDefaults,
    disposeVideo,
  } = utils;


  const createFrontChannel = typeof KB.createFrontChannel === 'function' ? KB.createFrontChannel : null;
  const createBehindChannel = typeof KB.createBehindChannel === 'function' ? KB.createBehindChannel : null;
  if (!createFrontChannel || !createBehindChannel) {
    throw new Error('Renderer channel modules are missing (kb-channel-front.js / kb-channel-behind.js)');
  }

  function buildState(config, style, resolvedUrl, mediaType) {
    const layer = config.layer || ((config.mode === 3 || config.mode === 4) ? 'front' : 'behind');
    const basePosition = config.position || config.basePosition || 'center center';
    const baseSize = config.size || config.baseSize || 'cover';
    const baseOpacity = config.opacity != null ? config.opacity : config.baseOpacity != null ? config.baseOpacity : 1;
    const baseBlend = config.blend != null ? config.blend : config.baseBlend || null;
    const attach = config.attach || config.baseAttach || 'fixed';
    const zIndex = config.zIndex != null ? config.zIndex : config.baseZIndex != null ? config.baseZIndex : 9999;
    const baseFilter = config.filter != null ? config.filter : config.baseFilter || null;

    const effSize = computeSizeWithScale(baseSize, style.scale);
    const effPosition = computePositionWithOffset(basePosition, style.dx, style.dy);
    const effOpacity = clamp(style.opacity != null ? style.opacity : baseOpacity, 0, 1);
    const transform = buildTransformString(style);
    const effFilter = style.filter != null ? style.filter : baseFilter;
    const resolvedMediaType = resolveMediaType(config.mediaType || mediaType, resolvedUrl || config.url);
    return {
      config: {
        mode: config.mode,
        layer,
        sourceUrl: config.url,
        basePosition,
        baseSize,
        baseOpacity,
        baseBlend,
        attach,
        zIndex,
        mediaType: resolvedMediaType,
        baseFilter,
      },
      style,
      eff: {
        size: effSize,
        position: effPosition,
        opacity: effOpacity,
        blend: style.blend != null ? style.blend : baseBlend,
        attach,
        zIndex,
        transform,
        visibility: style.visibility || 'visible',
        filter: effFilter,
      },
      mode: config.mode,
      layer,
      sourceUrl: config.url,
      resolvedUrl,
      mediaType: resolvedMediaType,
    };
  }

  KB.initRenderer = KB.initRenderer || function initRenderer(ctx) {
    const {
      info = () => {},
      log = () => {},
      warn = () => {},
      DEFAULTS = {},
      IDS = {},
      ensureAddStyle = (css) => {
        const style = document.createElement('style');
        style.textContent = css;
        document.documentElement.appendChild(style);
      },
      replaceStyle = () => {},
      getOrCreateStyle = () => document.createElement('style'),
      getHostKey = () => (typeof location !== 'undefined' ? (location.host || 'unknown-host') : 'unknown-host'),
      currentWallpapers = () => [],
      getCurrentIndex = () => 0,
      getBlobURLForMedia = (url) => Promise.resolve(url),
      revokeCurrentBlob = () => {},
      setCurrentBlobURL = () => {},
      onAfterApply = () => {},
      warmNeighbors = true,
    } = ctx || {};

    const styleBodyId = IDS.styleBody || 'kabegami-style-body';
    const styleBeforeId = IDS.styleBefore || 'kabegami-style-before';

    const logger = (typeof KB.getLogger === 'function') ? KB.getLogger('renderer') : null;
    const logTrace = (...args) => {
      if (logger && logger.trace) logger.trace(...args);
      else console.debug('[renderer]', ...args);
    };
    const logInfo = (...args) => {
      if (logger && logger.info) logger.info(...args);
      else console.info('[renderer]', ...args);
    };
    const logWarn = (...args) => {
      if (logger && logger.warn) logger.warn(...args);
      else console.warn('[renderer]', ...args);
    };
    logInfo('initRenderer invoked');

    const frontChannel = createFrontChannel({ ensureAddStyle });
    const behindChannel = createBehindChannel({ ensureAddStyle });
    logTrace('channels created', { front: !!frontChannel, behind: !!behindChannel });

    if (!KB.getModeAdapterFactory('overlay-front')) {
      KB.registerModeAdapter('overlay-front', () => {
        const channel = frontChannel;
        return {
          apply(state, options = {}) {
            channel.apply(state, options);
          },
          update(state, options = {}) {
            channel.apply(state, Object.assign({ transformOnly: true }, options));
          },
          teardown() {
            channel.clear();
          },
        };
      });
    }

    if (!KB.getModeAdapterFactory('overlay-behind')) {
      KB.registerModeAdapter('overlay-behind', () => {
        const channel = behindChannel;
        return {
          apply(state, options = {}) {
            channel.apply(state, options);
          },
          update(state, options = {}) {
            channel.apply(state, Object.assign({ transformOnly: true }, options));
          },
          teardown() {
            channel.clear();
          },
        };
      });
    }

    if (!KB.getModeAdapterFactory('css-body-background')) {
      KB.registerModeAdapter('css-body-background', () => {
        const STYLE_ID = 'kabegami-adapter-body-background';
        function ensureStyleElement() {
          let el = document.getElementById(STYLE_ID);
          if (!el) {
            el = document.createElement('style');
            el.id = STYLE_ID;
            el.setAttribute('data-kb-adapter', 'body-background');
            (document.head || document.documentElement || document.body).appendChild(el);
          }
          return el;
        }

        function buildCss(state) {
          const visibility = state.eff.visibility === 'hidden' ? 'none' : 'block';
          const opacity = state.eff.opacity != null ? state.eff.opacity : 1;
          const url = state.resolvedUrl || state.sourceUrl || '';
          const image = url ? `url("${utils.cssUrl ? utils.cssUrl(url) : url}")` : 'none';
          const blend = state.eff.blend || 'normal';
          const filter = state.eff.filter || 'none';
          const attach = (state.eff.attach || 'fixed').toLowerCase();
          const repeat = 'no-repeat';
          const size = state.eff.size || 'cover';
          const position = state.eff.position || 'center center';
          const transform = state.eff.transform && state.eff.transform.trim() ? state.eff.transform : 'none';
          return `html::after{content:"";position:${attach === 'scroll' ? 'absolute' : 'fixed'};inset:0;pointer-events:none;display:${visibility};z-index:${state.eff.zIndex != null ? state.eff.zIndex : -2147483000};background-image:${image};background-size:${size};background-position:${position};background-repeat:${repeat};background-attachment:${attach};opacity:${opacity};mix-blend-mode:${blend};filter:${filter};transform:${transform};transform-origin:center center;}
html,body{background-color:transparent !important;}`;
        }

        return {
          apply(state) {
            const el = ensureStyleElement();
            el.textContent = buildCss(state);
          },
          update(state) {
            const el = ensureStyleElement();
            el.textContent = buildCss(state);
          },
          teardown() {
            const el = document.getElementById(STYLE_ID);
            if (el && el.parentNode) el.parentNode.removeChild(el);
          },
        };
      });
    }

    if (!KB.getModeAdapterFactory('css-root-background')) {
      KB.registerModeAdapter('css-root-background', () => {
        const STYLE_ID = 'kabegami-adapter-root-background';
        function ensureStyleElement() {
          let el = document.getElementById(STYLE_ID);
          if (!el) {
            el = document.createElement('style');
            el.id = STYLE_ID;
            el.setAttribute('data-kb-adapter', 'root-background');
            (document.head || document.documentElement || document.body).appendChild(el);
          }
          return el;
        }

        function buildCss(state) {
          const url = state.resolvedUrl || state.sourceUrl || '';
          const image = url ? `url("${utils.cssUrl ? utils.cssUrl(url) : url}")` : 'none';
          const size = state.eff.size || 'cover';
          const position = state.eff.position || 'center center';
          const repeat = 'no-repeat';
          const attach = (state.eff.attach || 'fixed').toLowerCase();
          const blend = state.eff.blend || 'normal';
          const visibility = state.eff.visibility === 'hidden';
          const attachment = attach === 'scroll' ? 'scroll' : 'fixed';
          const blendRule = blend && blend !== 'normal' ? `background-blend-mode: ${blend} !important;` : '';
          const imageRule = visibility ? 'none' : image;
          return `html, body { background-image: ${imageRule} !important; background-size: ${size} !important; background-position: ${position} !important; background-repeat: ${repeat} !important; background-attachment: ${attachment} !important; background-color: transparent !important; ${blendRule} }
`;
        }

        return {
          apply(state) {
            const el = ensureStyleElement();
            el.textContent = buildCss(state);
          },
          update(state) {
            const el = ensureStyleElement();
            el.textContent = buildCss(state);
          },
          teardown() {
            const el = document.getElementById(STYLE_ID);
            if (el && el.parentNode) el.parentNode.removeChild(el);
          },
        };
      });
    }

    if (!KB.getModeAdapterFactory('css-body-pseudo-behind')) {
      KB.registerModeAdapter('css-body-pseudo-behind', () => {
        const STYLE_ID = 'kabegami-adapter-body-pseudo-behind';
        function ensureStyleElement() {
          let el = document.getElementById(STYLE_ID);
          if (!el) {
            el = document.createElement('style');
            el.id = STYLE_ID;
            el.setAttribute('data-kb-adapter', 'body-pseudo-behind');
            (document.head || document.documentElement || document.body).appendChild(el);
          }
          return el;
        }

        function buildCss(state) {
          const visibility = state.eff.visibility === 'hidden' ? 'none' : 'block';
          const opacity = state.eff.opacity != null ? state.eff.opacity : 1;
          const url = state.resolvedUrl || state.sourceUrl || '';
          const image = url ? `url("${utils.cssUrl ? utils.cssUrl(url) : url}")` : 'none';
          const blend = state.eff.blend || 'normal';
          const filter = state.eff.filter || 'none';
          const attach = (state.eff.attach || 'fixed').toLowerCase();
          const repeat = 'no-repeat';
          const size = state.eff.size || 'cover';
          const position = state.eff.position || 'center center';
          const transform = state.eff.transform && state.eff.transform.trim() ? state.eff.transform : 'none';
          const basePosition = attach === 'scroll' ? 'absolute' : 'fixed';
          const zIndex = state.eff.zIndex != null ? state.eff.zIndex : -2147483000;
          const opacityClamp = Math.max(0, Math.min(1, opacity));
          const hidden = visibility === 'none' || opacityClamp === 0;
          return `html, body { position: relative !important; }
html::before{content:"";position:${basePosition};inset:0;pointer-events:none;display:${hidden ? 'none' : 'block'};z-index:${zIndex};background-image:${image};background-size:${size};background-position:${position};background-repeat:${repeat};background-attachment:${attach};opacity:${opacityClamp};mix-blend-mode:${blend};filter:${filter};transform:${transform};transform-origin:center center;}
`; 
        }

        return {
          apply(state) {
            const el = ensureStyleElement();
            el.textContent = buildCss(state);
          },
          update(state) {
            const el = ensureStyleElement();
            el.textContent = buildCss(state);
          },
          teardown() {
            const el = document.getElementById(STYLE_ID);
            if (el && el.parentNode) el.parentNode.removeChild(el);
          },
        };
      });
    }

    if (!KB.getModeAdapterFactory('css-body-pseudo')) {
      KB.registerModeAdapter('css-body-pseudo', () => {
        const STYLE_ID = 'kabegami-adapter-body-pseudo';
        function ensureStyleElement() {
          let el = document.getElementById(STYLE_ID);
          if (!el) {
            el = document.createElement('style');
            el.id = STYLE_ID;
            el.setAttribute('data-kb-adapter', 'body-pseudo');
            (document.head || document.documentElement || document.body).appendChild(el);
          }
          return el;
        }

        function buildCss(state) {
          const visibility = state.eff.visibility === 'hidden' ? 'none' : 'block';
          const opacity = state.eff.opacity != null ? state.eff.opacity : 1;
          const url = state.resolvedUrl || state.sourceUrl || '';
          const image = url ? `url("${utils.cssUrl ? utils.cssUrl(url) : url}")` : 'none';
          const blend = state.eff.blend || 'normal';
          const filter = state.eff.filter || 'none';
          const attach = (state.eff.attach || 'fixed').toLowerCase();
          const repeat = 'no-repeat';
          const size = state.eff.size || 'cover';
          const position = state.eff.position || 'center center';
          const transform = state.eff.transform && state.eff.transform.trim() ? state.eff.transform : 'none';
          const basePosition = attach === 'scroll' ? 'absolute' : 'fixed';
          const zIndex = state.eff.zIndex != null ? state.eff.zIndex : -1;
          return `html::before{content:"";position:${basePosition};inset:0;pointer-events:none;display:${visibility};z-index:${zIndex};background-image:${image};background-size:${size};background-position:${position};background-repeat:${repeat};background-attachment:${attach};opacity:${opacity};mix-blend-mode:${blend};filter:${filter};transform:${transform};transform-origin:center center;}`;
        }

        return {
          apply(state) {
            const el = ensureStyleElement();
            el.textContent = buildCss(state);
          },
          update(state) {
            const el = ensureStyleElement();
            el.textContent = buildCss(state);
          },
          teardown() {
            const el = document.getElementById(STYLE_ID);
            if (el && el.parentNode) el.parentNode.removeChild(el);
          },
        };
      });
    }

    if (!KB.getModeAdapterFactory('shadow-overlay-front')) {
      KB.registerModeAdapter('shadow-overlay-front', () => {
        const HOST_ID = 'kabegami-shadow-overlay-front';
        let host = null;
        let shadowRoot = null;
        let styleNode = null;
        let wrapper = null;

        function ensureWrapper() {
          if (!host || !host.isConnected) {
            host = document.getElementById(HOST_ID);
            if (!host) {
              host = document.createElement('div');
              host.id = HOST_ID;
              Object.assign(host.style, {
                position: 'fixed',
                inset: '0',
                pointerEvents: 'none',
                zIndex: '2147482000',
                overflow: 'visible',
              });
              (document.body || document.documentElement).appendChild(host);
            }
          }
          if (!shadowRoot || shadowRoot.host !== host) {
            shadowRoot = host.shadowRoot || host.attachShadow({ mode: 'open' });
          }
          if (!styleNode || !styleNode.isConnected) {
            styleNode = document.createElement('style');
            styleNode.textContent = `:host{all:initial;}
.kabegami-shadow-wrapper{position:relative;width:100%;height:100%;overflow:visible;}
.kabegami-shadow-wrapper img,
.kabegami-shadow-wrapper video{position:absolute;top:50%;left:50%;transform-origin:center center;pointer-events:none;max-width:none;max-height:none;}
`;
            shadowRoot.appendChild(styleNode);
          }
          if (!wrapper || !wrapper.isConnected) {
            wrapper = shadowRoot.querySelector('.kabegami-shadow-wrapper');
            if (!wrapper) {
              wrapper = document.createElement('div');
              wrapper.className = 'kabegami-shadow-wrapper';
              shadowRoot.appendChild(wrapper);
            }
          }
          return wrapper;
        }

        function ensureMediaElement(state) {
          const mount = ensureWrapper();
          const desiredTag = isVideoMedia && isVideoMedia(state.mediaType) ? 'video' : 'img';
          let media = mount.__kbMedia;
          if (media && media.tagName.toLowerCase() !== desiredTag) {
            if (media.tagName.toLowerCase() === 'video' && disposeVideo) disposeVideo(media);
            else if (media.parentNode) media.parentNode.removeChild(media);
            media = null;
          }
          if (!media) {
            media = document.createElement(desiredTag);
            media.className = 'kabegami-shadow-media';
            media.setAttribute('aria-hidden', 'true');
            if (desiredTag === 'video' && ensureVideoDefaults) ensureVideoDefaults(media);
            mount.appendChild(media);
            mount.__kbMedia = media;
          }
          return media;
        }

        function applyState(state) {
          const mount = ensureWrapper();
          const media = ensureMediaElement(state);
          const opacity = clamp(state.eff.opacity != null ? state.eff.opacity : 1, 0, 1);
          const hidden = state.eff.visibility === 'hidden' || opacity === 0;
          if (host) {
            host.style.display = hidden ? 'none' : 'block';
            host.style.zIndex = String(state.eff.zIndex != null ? state.eff.zIndex : 2147482000);
          }

          media.style.opacity = String(opacity);
          media.style.visibility = hidden ? 'hidden' : 'visible';
          media.style.mixBlendMode = state.eff.blend || 'normal';
          media.style.filter = state.eff.filter || 'none';
          const baseTransform = state.eff.transform ? ` ${state.eff.transform}` : '';
          media.style.transform = `translate(-50%, -50%)${baseTransform}`;
          media.style.transformOrigin = state.style.transformOrigin || 'center center';
          media.style.width = '100%';
          media.style.height = '100%';
          const fit = objectFitFromSize ? objectFitFromSize(state.config.baseSize) : 'cover';
          media.style.objectFit = fit;

          if (isVideoMedia && isVideoMedia(state.mediaType) && setVideoSource) {
            setVideoSource(media, state.resolvedUrl, state.sourceUrl);
          } else if (media.dataset.src !== state.resolvedUrl) {
            media.dataset.src = state.resolvedUrl || '';
            media.src = state.resolvedUrl || '';
          }
        }

        function teardown() {
          if (wrapper && wrapper.__kbMedia) {
            const media = wrapper.__kbMedia;
            if (media.tagName && media.tagName.toLowerCase() === 'video' && disposeVideo) {
              disposeVideo(media);
            } else if (media.parentNode) {
              media.parentNode.removeChild(media);
            }
            wrapper.__kbMedia = null;
          }
          if (styleNode && styleNode.parentNode) styleNode.parentNode.removeChild(styleNode);
          styleNode = null;
          wrapper = null;
          shadowRoot = null;
          if (host && host.parentNode) host.parentNode.removeChild(host);
          host = null;
        }

        return {
          apply(state) {
            applyState(state);
          },
          update(state) {
            applyState(state);
          },
          teardown,
        };
      });
    }

    const adapterInstances = new Map();

    const adapterFactoryContext = {
      ensureAddStyle,
      replaceStyle,
      getOrCreateStyle,
      log: logTrace,
      info: logInfo,
      warn: logWarn,
    };

    function ensureAdapterInstance(adapterId) {
      if (!adapterId) return null;
      if (adapterInstances.has(adapterId)) return adapterInstances.get(adapterId);
      const factory = KB.getModeAdapterFactory(adapterId);
      if (typeof factory !== 'function') {
        logWarn('No adapter factory registered', adapterId);
        return null;
      }
      let instance = null;
      try {
        instance = factory(adapterFactoryContext);
      } catch (e) {
        logWarn('Adapter factory threw', adapterId, e);
        instance = null;
      }
      if (instance) {
        adapterInstances.set(adapterId, instance);
      }
      return instance || null;
    }

    function teardownAdapter(adapterId) {
      if (!adapterId) return;
      const adapter = adapterInstances.get(adapterId);
      if (adapter && typeof adapter.teardown === 'function') {
        try { adapter.teardown(); }
        catch (e) { logWarn('Adapter teardown failed', adapterId, e); }
      }
      adapterInstances.delete(adapterId);
    }

    let lastState = null;

    function warmUpAroundIndex(idx) {
      if (!warmNeighbors) return;
      const list = currentWallpapers();
      if (!Array.isArray(list) || !list.length) return;
      const n = list.length;
      const urls = [list[idx % n], list[(idx + 1) % n], list[(idx + n - 1) % n]]
        .map((entry) => entry && entry.url)
        .filter(Boolean);
      urls.forEach((u) => {
        try { getBlobURLForMedia(u).catch(() => {}); } catch (_) {}
      });
    }

    async function resolveUrl(sourceUrl, sameSource) {
      if (!sourceUrl) return null;
      if (sameSource && lastState && lastState.resolvedUrl) {
        return lastState.resolvedUrl;
      }
      if (!sameSource) {
        revokeCurrentBlob();
      }
      try {
        const resolved = await getBlobURLForMedia(sourceUrl);
        if (!sameSource) {
          setCurrentBlobURL(resolved);
        }
        return resolved;
      } catch (e) {
        logWarn('resolveUrl: blob failed, fallback to source', e);
        return sourceUrl;
      }
    }

    async function applyWallpaper(cfg, style = {}) {
      if (!cfg || !cfg.url) return;
      const layer = cfg.layer || ((cfg.mode === 3 || cfg.mode === 4) ? 'front' : 'behind');
      const styleNorm = normalizeStyle(style);
      const adapterId = resolveAdapterId(cfg);
      const adapter = ensureAdapterInstance(adapterId);
      if (!adapter) {
        logWarn('applyWallpaper: missing adapter', adapterId, cfg);
        return;
      }
      const sameAdapter = lastState && lastState.adapterId === adapterId;
      const sameSource = sameAdapter && lastState && lastState.sourceUrl === cfg.url;
      logTrace('applyWallpaper', { url: cfg.url, layer, mode: cfg.mode, adapterId, sameAdapter, sameSource, mediaType: cfg.mediaType });
      const resolvedUrl = await resolveUrl(cfg.url, sameSource);
      const effectiveMediaType = resolveMediaType(cfg.mediaType, cfg.url);

      const state = buildState({
        mode: cfg.mode,
        layer,
        url: cfg.url,
        position: cfg.position ?? DEFAULTS.position,
        size: cfg.size ?? DEFAULTS.size,
        opacity: cfg.opacity != null ? cfg.opacity : DEFAULTS.opacity,
        blend: cfg.blend != null ? cfg.blend : DEFAULTS.blend,
        attach: cfg.attach ?? DEFAULTS.attach,
        zIndex: cfg.zIndex != null ? cfg.zIndex : DEFAULTS.zIndex,
        mediaType: effectiveMediaType,
        filter: cfg.filter != null ? cfg.filter : DEFAULTS.filter,
      }, styleNorm, resolvedUrl, effectiveMediaType);

      state.adapterId = adapterId;
      state.adapterMeta = { options: { full: !sameSource } };

      if (!sameAdapter && lastState) {
        teardownAdapter(lastState.adapterId);
      }

      adapter.apply(state, state.adapterMeta.options);
      lastState = state;

      try { onAfterApply(cfg); } catch (_) {}

      const idx = getCurrentIndex();
      warmUpAroundIndex(idx);
      return state;
    }

    function updateTransform(styleUpdates = {}) {
      if (!lastState) return;
      const adapterId = lastState.adapterId;
      const adapter = ensureAdapterInstance(adapterId);
      if (!adapter || typeof adapter.update !== 'function') return;
      const mergedStyle = Object.assign({}, lastState.style, styleUpdates);
      const normalizedStyle = normalizeStyle(mergedStyle);
      logTrace('updateTransform', { updates: styleUpdates, merged: normalizedStyle, lastMediaType: lastState.mediaType });
      const updatedState = buildState({
        mode: lastState.mode,
        layer: lastState.config.layer,
        url: lastState.sourceUrl,
        position: lastState.config.basePosition,
        size: lastState.config.baseSize,
        opacity: lastState.config.baseOpacity,
        blend: lastState.config.baseBlend,
        attach: lastState.config.attach,
        zIndex: lastState.config.zIndex,
        mediaType: lastState.mediaType,
        filter: lastState.config.baseFilter,
      }, normalizedStyle, lastState.resolvedUrl, lastState.mediaType);

      updatedState.adapterId = adapterId;
      updatedState.adapterMeta = lastState.adapterMeta;

      adapter.update(updatedState, { transformOnly: true });
      lastState = Object.assign({}, updatedState);
    }

    function clearAll() {
      Array.from(adapterInstances.keys()).forEach((adapterId) => {
        try { teardownAdapter(adapterId); }
        catch (e) { logWarn('Adapter teardown (clearAll) failed', adapterId, e); }
      });
      lastState = null;
      revokeCurrentBlob();
    }

    function resolveAdapterId(cfg) {
      const DEFAULT_ADAPTER = 'overlay-behind';
      if (!cfg) return DEFAULT_ADAPTER;

      const candidates = [];

      if (cfg.adapterId) candidates.push(cfg.adapterId);
      if (cfg.adapter) candidates.push(cfg.adapter);

      const mode = Number(cfg.mode);
      if (Number.isFinite(mode) && MODE_DEFAULT_ADAPTER[mode]) {
        candidates.push(MODE_DEFAULT_ADAPTER[mode]);
      }

      if (cfg.layer === 'front') {
        candidates.push('overlay-front');
        candidates.push('shadow-overlay-front');
      } else if (cfg.layer === 'behind') {
        candidates.push('overlay-behind');
      }

      candidates.push(DEFAULT_ADAPTER);

      for (const adapterId of candidates) {
        if (!adapterId) continue;
        if (KB.getModeAdapterFactory(adapterId)) {
          return adapterId;
        }
      }
      return DEFAULT_ADAPTER;
    }

    return {
      applyWallpaper,
      updateTransform,
      clearAll,
      styleBodyId,
      styleBeforeId,
    };
  };

})(typeof window !== 'undefined' ? window : this);
