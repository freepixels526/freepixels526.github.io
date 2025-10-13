(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

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
  } = utils;

  const createFrontChannel = typeof KB.createFrontChannel === 'function' ? KB.createFrontChannel : null;
  const createBehindChannel = typeof KB.createBehindChannel === 'function' ? KB.createBehindChannel : null;
  if (!createFrontChannel || !createBehindChannel) {
    throw new Error('Renderer channel modules are missing (kb-channel-front.js / kb-channel-behind.js)');
  }

  function buildState(config, style, resolvedUrl, mediaType) {
    const layer = config.layer || (config.mode === 3 ? 'front' : 'behind');
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

    const frontChannel = createFrontChannel({ ensureAddStyle });
    const behindChannel = createBehindChannel({ ensureAddStyle });

    const channels = {
      front: frontChannel,
      behind: behindChannel,
    };

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
        warn('Failed to resolve blob URL, fallback to source url', e);
        return sourceUrl;
      }
    }

    function cleanupLayer(layer) {
      const channel = channels[layer];
      if (channel && channel.clear) channel.clear();
    }

    function applyChannel(state, options = {}) {
      const channel = channels[state.config.layer];
      if (!channel || !channel.apply) return;
      channel.apply(state, options);
    }

    async function applyWallpaper(cfg, style = {}) {
      if (!cfg || !cfg.url) return;
      const layer = cfg.layer || (cfg.mode === 3 ? 'front' : 'behind');
      const styleNorm = normalizeStyle(style);
      const sameLayer = lastState && lastState.config.layer === layer;
      const sameSource = sameLayer && lastState && lastState.sourceUrl === cfg.url;
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

      if (!sameLayer && lastState) {
        cleanupLayer(lastState.config.layer);
      }

      applyChannel(state, { full: !sameSource });
      lastState = state;

      try { onAfterApply(cfg); } catch (_) {}

      const idx = getCurrentIndex();
      warmUpAroundIndex(idx);
      return state;
    }

    function updateTransform(styleUpdates = {}) {
      if (!lastState) return;
      const mergedStyle = Object.assign({}, lastState.style, styleUpdates);
      const normalizedStyle = normalizeStyle(mergedStyle);
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

      lastState = Object.assign({}, updatedState);
      applyChannel(updatedState, { transformOnly: true });
    }

    function clearAll() {
      cleanupLayer('front');
      cleanupLayer('behind');
      lastState = null;
      revokeCurrentBlob();
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

