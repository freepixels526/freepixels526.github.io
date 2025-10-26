(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  const utils = KB.renderUtils;
  if (!utils) {
    throw new Error('KB.renderUtils must be loaded before kb-adapter-canvas.js');
  }

  const {
    clamp,
    buildTransformString,
    ensureLayerContainer,
    disposeLayerContainer,
    ensureCanvasSurface,
    resizeCanvasSurface,
    disposeCanvasSurface,
    getViewportSize,
    normalizeObjectPosition,
    computeBaseScale,
    getDevicePixelRatio,
    isVideoMedia,
    ensureVideoDefaults,
    setVideoSource,
    disposeVideo,
  } = utils;

  const ADAPTER_ID = 'canvas-overlay-front';
  const LAYER_ID = 'kabegami-layer-canvas-front';

  const logger = (typeof KB.getLogger === 'function') ? KB.getLogger('adapter:canvas-front') : null;
  const trace = (...args) => {
    if (logger && logger.trace) logger.trace(...args);
  };
  const warn = (...args) => {
    if (logger && logger.warn) logger.warn(...args);
    else console.warn('[adapter:canvas-front]', ...args);
  };

  const DEFAULT_CANVAS_EFFECTS = Object.freeze({
    preset: 'none',
    scanlines: false,
  });

  function normalizeCanvasEffects(raw) {
    if (!raw || typeof raw !== 'object') {
      return Object.assign({}, DEFAULT_CANVAS_EFFECTS);
    }
    const preset = (typeof raw.preset === 'string' && raw.preset.trim()) ? raw.preset.trim() : DEFAULT_CANVAS_EFFECTS.preset;
    return {
      preset,
      scanlines: !!raw.scanlines,
    };
  }

  function filterForPreset(preset) {
    switch (preset) {
      case 'softGlow':
        return 'blur(4px) brightness(1.08) saturate(1.1)';
      case 'noir':
        return 'grayscale(100%) contrast(1.25)';
      case 'vibrant':
        return 'saturate(1.35) contrast(1.12)';
      default:
        return 'none';
    }
  }

  function computePlacement(state, natural, viewport) {
    const effectiveStyle = Object.assign({}, state.style);
    const baseScale = computeBaseScale(state.config.baseSize, natural, viewport);
    const uniformScale = effectiveStyle.scale != null ? effectiveStyle.scale : 1;
    effectiveStyle.scale = uniformScale * baseScale;
    if (effectiveStyle.scaleX != null) effectiveStyle.scaleX *= baseScale;
    if (effectiveStyle.scaleY != null) effectiveStyle.scaleY *= baseScale;

    if (natural && natural.width && natural.height) {
      const pos = normalizeObjectPosition(state.config.basePosition || 'center center').split(' ');
      const posX = parseFloat(pos[0]) / 100;
      const posY = parseFloat(pos[1]) / 100;
      const contentWidth = natural.width * baseScale;
      const contentHeight = natural.height * baseScale;
      const deltaX = (0.5 - posX) * (viewport.width - contentWidth);
      const deltaY = (0.5 - posY) * (viewport.height - contentHeight);
      const baseDx = Number(effectiveStyle.dx || 0);
      const baseDy = Number(effectiveStyle.dy || 0);
      effectiveStyle.dx = baseDx + deltaX;
      effectiveStyle.dy = baseDy + deltaY;
    }

    return effectiveStyle;
  }

  function getNaturalSize(source) {
    if (!source) return null;
    if (source instanceof HTMLVideoElement) {
      const width = source.videoWidth || 0;
      const height = source.videoHeight || 0;
      if (width && height) return { width, height };
    } else if (source instanceof HTMLImageElement) {
      const width = source.naturalWidth || source.width || 0;
      const height = source.naturalHeight || source.height || 0;
      if (width && height) return { width, height };
    }
    return null;
  }

  function createCanvasAdapter() {
    let container = null;
    let surface = null;
    let currentState = null;
    let currentSource = null;
    let currentNatural = null;
    let loadToken = 0;
    let videoEl = null;
    let videoHandlers = [];
    let rafId = null;
    let isEffectivelyVisible = true;
    let currentEffects = normalizeCanvasEffects();

    const HAVE_CURRENT_DATA = 2;

    function updateEffectsFromState(state) {
      currentEffects = normalizeCanvasEffects(state && state.style && state.style.canvasEffects);
    }

    function ensureHost() {
      if (!container || !container.isConnected) {
        container = ensureLayerContainer(LAYER_ID, {
          parent: () => (document.body || document.documentElement),
          position: 'fixed',
          inset: '0',
          pointerEvents: 'none',
          style: {
            overflow: 'visible',
            zIndex: '2147482800',
          },
        });
      }
      if (!surface || !surface.canvas || !surface.canvas.isConnected) {
        surface = ensureCanvasSurface(container, {
          className: 'kabegami-canvas-surface',
        });
      }
      return container;
    }

    function ensureVideoElement() {
      ensureHost();
      if (videoEl && videoEl.isConnected) return videoEl;
      if (videoEl && videoEl.parentNode) {
        videoEl.parentNode.removeChild(videoEl);
      }
      const video = document.createElement('video');
      video.className = 'kabegami-canvas-video-source';
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      if (typeof ensureVideoDefaults === 'function') ensureVideoDefaults(video);
      Object.assign(video.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '1px',
        height: '1px',
        opacity: '0',
        pointerEvents: 'none',
        transform: 'translate(-10000px, -10000px)',
      });
      container.appendChild(video);
      videoEl = video;
      return videoEl;
    }

    function detachVideoHandlers() {
      if (!videoEl || !videoHandlers.length) return;
      for (const { type, handler, options } of videoHandlers) {
        videoEl.removeEventListener(type, handler, options);
      }
      videoHandlers = [];
    }

    function shouldRenderFrames() {
      if (!isEffectivelyVisible) return false;
      if (!videoEl || !(currentSource instanceof HTMLVideoElement)) return false;
      if (videoEl.readyState < HAVE_CURRENT_DATA) return false;
      if (videoEl.paused || videoEl.ended) return false;
      return true;
    }

    function cancelRenderLoop() {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function scheduleRenderLoop() {
      if (rafId != null) return;
      if (!shouldRenderFrames()) return;
      rafId = requestAnimationFrame(renderLoop);
    }

    function renderLoop() {
      rafId = null;
      if (!shouldRenderFrames()) {
        cancelRenderLoop();
        return;
      }
      renderFrame();
      scheduleRenderLoop();
    }

    function attachVideoHandlers(token, resolveState) {
      if (!videoEl) return;
      detachVideoHandlers();
      const stateResolver = typeof resolveState === 'function' ? resolveState : () => resolveState;
      const add = (type, handler, options) => {
        const wrapped = (event) => {
          if (token !== loadToken) return;
          handler(stateResolver(), event);
        };
        videoEl.addEventListener(type, wrapped, options);
        videoHandlers.push({ type, handler: wrapped, options });
      };

      add('loadedmetadata', (state) => {
        if (!state) return;
        currentNatural = getNaturalSize(videoEl) || currentNatural;
        onSourceReady(state, videoEl);
      });

      add('loadeddata', (state) => {
        if (!state) return;
        renderFrame();
      });

      add('play', () => {
        if (shouldRenderFrames()) scheduleRenderLoop();
      });

      add('playing', () => {
        if (shouldRenderFrames()) scheduleRenderLoop();
      });

      add('pause', () => {
        cancelRenderLoop();
        renderFrame();
      });

      add('ended', () => {
        cancelRenderLoop();
        renderFrame();
      });

      add('timeupdate', () => {
        if (!shouldRenderFrames()) renderFrame();
      });

      add('emptied', () => {
        cancelRenderLoop();
      });

      add('error', () => {
        cancelRenderLoop();
        warn('Video playback error in canvas adapter');
      });
    }

    function updateVisibility(state) {
      if (!container || !surface || !surface.canvas) return;
      if (!state || !state.eff) return;
      const visible = state.eff.visibility !== 'hidden';
      const targetOpacity = clamp(state.eff.opacity != null ? state.eff.opacity : 1, 0, 1);
      container.style.display = visible ? 'block' : 'none';
      container.style.zIndex = String(state.eff.zIndex != null ? state.eff.zIndex : 2147482800);
      surface.canvas.style.visibility = visible ? 'visible' : 'hidden';
      surface.canvas.style.opacity = String(targetOpacity);
      surface.canvas.style.mixBlendMode = state.eff.blend || 'normal';
      surface.canvas.style.filter = state.eff.filter || 'none';

      isEffectivelyVisible = visible && targetOpacity > 0;
      if (!isEffectivelyVisible) {
        cancelRenderLoop();
      } else if (shouldRenderFrames()) {
        scheduleRenderLoop();
      }
    }

    function updateTransform(state) {
      if (!surface || !surface.canvas) return;
      if (!state || !state.style || !state.config) return;
      const viewport = getViewportSize();
      const natural = currentNatural || getNaturalSize(currentSource);
      const effectiveStyle = natural
        ? computePlacement(state, natural, viewport)
        : Object.assign({}, state.style);

      surface.canvas.style.transformOrigin = state.style.transformOrigin || 'center center';
      surface.canvas.style.transform = `translate(-50%, -50%) ${buildTransformString(effectiveStyle)}`;
    }

    function renderFrame() {
      if (!surface || !surface.ctx || !currentSource) return;
      if (currentSource instanceof HTMLVideoElement && currentSource.readyState < HAVE_CURRENT_DATA) return;
      const naturalSize = getNaturalSize(currentSource) || currentNatural;
      if (!naturalSize || !naturalSize.width || !naturalSize.height) return;

      const sizeChanged = !currentNatural
        || currentNatural.width !== naturalSize.width
        || currentNatural.height !== naturalSize.height;
      currentNatural = naturalSize;

      if (sizeChanged && currentState) {
        updateTransform(currentState);
      }

      const { width, height } = currentNatural;

      resizeCanvasSurface(surface, width, height, {
        devicePixelRatio: getDevicePixelRatio(),
        imageSmoothing: true,
      });

      const ctx = surface.ctx;
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      const effects = currentEffects || normalizeCanvasEffects();
      try {
        ctx.save();
        ctx.filter = filterForPreset(effects.preset);
        ctx.drawImage(currentSource, 0, 0, width, height);
        ctx.restore();
      } catch (err) {
        warn('drawImage failed', err);
      }

      // Apply a secondary bloom pass for the soft glow preset.
      if (effects.preset === 'softGlow') {
        try {
          ctx.save();
          ctx.globalAlpha = 0.22;
          ctx.filter = 'blur(24px) brightness(1.08)';
          ctx.drawImage(currentSource, 0, 0, width, height);
          ctx.restore();
        } catch (err) {
          warn('softGlow overlay failed', err);
        }
      }

      if (effects.scanlines) {
        try {
          ctx.save();
          ctx.fillStyle = '#0f172a';
          ctx.globalAlpha = 0.18;
          const spacing = 4;
          for (let y = 0; y < height; y += spacing) {
            ctx.fillRect(0, y, width, 1);
          }
          ctx.restore();
        } catch (err) {
          warn('scanlines overlay failed', err);
        }
      }
    }

    function onSourceReady(state, source) {
      currentSource = source;
      currentNatural = getNaturalSize(source);
      trace('source ready', currentNatural);
      updateTransform(state);
      renderFrame();
      if (source instanceof HTMLVideoElement) {
        if (shouldRenderFrames()) scheduleRenderLoop();
      }
    }

    function loadImage(state, token) {
      const src = state.resolvedUrl || state.sourceUrl;
      if (!src) {
        trace('no source url for canvas adapter');
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => {
        if (token !== loadToken) return;
        const activeState = currentState || state;
        if (!activeState) return;
        onSourceReady(activeState, img);
      };
      img.onerror = (err) => {
        if (token !== loadToken) return;
        warn('failed to load image for canvas adapter', err);
      };
      img.src = src;
    }

    function loadVideo(state, token) {
      const src = state.resolvedUrl || state.sourceUrl;
      if (!src) {
        trace('no source url for canvas adapter');
        return;
      }
      const video = ensureVideoElement();
      if (!video) return;
      video.crossOrigin = 'anonymous';
      if (typeof ensureVideoDefaults === 'function') ensureVideoDefaults(video);
      const resolveState = () => currentState || state;
      attachVideoHandlers(token, resolveState);
      currentSource = video;
      currentNatural = getNaturalSize(video) || null;
      try {
        setVideoSource(video, state.resolvedUrl, state.sourceUrl);
      } catch (err) {
        warn('failed to set video source for canvas adapter', err);
      }
    }

    function prepareSource(state) {
      const token = ++loadToken;
      cancelRenderLoop();
      detachVideoHandlers();
      if (videoEl) {
        try { videoEl.pause(); } catch (_) {}
      }
      currentSource = null;
      currentNatural = null;

      const hasUrl = state.resolvedUrl || state.sourceUrl;
      if (!hasUrl) {
        trace('no source url for canvas adapter');
        renderFrame();
        return;
      }

      if (typeof isVideoMedia === 'function' && isVideoMedia(state.mediaType)) {
        loadVideo(state, token);
        return;
      }

      loadImage(state, token);
    }

    function apply(state, options = {}) {
      if (!state) return;
      ensureHost();
      const previousState = currentState;
      const sameSource = previousState && previousState.resolvedUrl === state.resolvedUrl;
      currentState = state;
      updateEffectsFromState(state);
      updateVisibility(state);

      const needsReload = options.full !== false || !sameSource || !currentSource;
      if (needsReload) {
        prepareSource(state);
      } else {
        currentNatural = getNaturalSize(currentSource);
        updateTransform(state);
        renderFrame();
        if (currentSource instanceof HTMLVideoElement) {
          if (shouldRenderFrames()) scheduleRenderLoop();
        }
      }
    }

    function update(state) {
      if (!state) return;
      currentState = state;
      updateEffectsFromState(state);
      updateVisibility(state);
      updateTransform(state);
      if (currentSource instanceof HTMLVideoElement) {
        if (shouldRenderFrames()) scheduleRenderLoop();
        else renderFrame();
      }
    }

    function teardown() {
      cancelRenderLoop();
      detachVideoHandlers();
      if (videoEl) {
        try { videoEl.pause(); } catch (_) {}
        if (typeof disposeVideo === 'function') {
          disposeVideo(videoEl);
        } else if (videoEl.parentNode) {
          videoEl.parentNode.removeChild(videoEl);
        }
      }
      currentState = null;
      currentSource = null;
      currentNatural = null;
      videoEl = null;
      if (container) {
        disposeCanvasSurface(container);
      }
      disposeLayerContainer(LAYER_ID);
      container = null;
      surface = null;
      rafId = null;
      isEffectivelyVisible = true;
      currentEffects = normalizeCanvasEffects();
    }

    return {
      apply,
      update,
      teardown,
    };
  }

  KB.registerModeAdapter = KB.registerModeAdapter || function registerModeAdapter(name, factory) {
    const registry = KB.__kbModeAdapters = KB.__kbModeAdapters || new Map();
    if (!name || typeof factory !== 'function') return;
    registry.set(name, factory);
  };

  KB.registerModeAdapter(ADAPTER_ID, () => createCanvasAdapter());

})(typeof window !== 'undefined' ? window : this);
