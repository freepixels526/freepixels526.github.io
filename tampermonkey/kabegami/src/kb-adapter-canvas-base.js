(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  const utils = KB.renderUtils;
  if (!utils) {
    throw new Error('KB.renderUtils must be loaded before kb-adapter-canvas-base.js');
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
    getMediaNaturalSize,
  } = utils;

  const FALLBACK_PRESETS = [
    {
      id: 'none',
      profile: { baseFilter: 'none', passes: {} },
      defaults: {},
    },
    {
      id: 'softGlow',
      profile: { baseFilter: 'blur(4px) brightness(1.08) saturate(1.1)', passes: { softGlow: true } },
      defaults: { vignette: true },
    },
    {
      id: 'noir',
      profile: { baseFilter: 'grayscale(100%) contrast(1.28) brightness(0.92)', passes: { edgeGlow: true } },
      defaults: { vignette: true, grain: true },
    },
    {
      id: 'vibrant',
      profile: { baseFilter: 'saturate(1.35) contrast(1.12)', passes: { chromaticAberration: true } },
      defaults: { lightLeak: true, grain: true },
    },
  ];

  const EFFECT_PRESETS = (Array.isArray(KB.canvasEffectPresets) && KB.canvasEffectPresets.length)
    ? KB.canvasEffectPresets
    : FALLBACK_PRESETS;

  const PRESET_MAP = KB.canvasEffectPresetMap || EFFECT_PRESETS.reduce((acc, preset) => {
    if (!preset || !preset.id) return acc;
    acc[preset.id] = preset;
    if (preset.aliasOf) {
      acc[preset.aliasOf] = acc[preset.aliasOf] || preset;
    }
    return acc;
  }, {});

  const BASE_CANVAS_EFFECT_DEFAULTS = KB.canvasEffectDefaults || {
    preset: 'none',
    scanlines: false,
    grain: false,
    vignette: false,
    lightLeak: false,
    colorDrift: false,
    cursorGlow: false,
  };

  const DEFAULT_CANVAS_EFFECTS = Object.freeze(Object.assign({}, BASE_CANVAS_EFFECT_DEFAULTS));

  function getNaturalSize(source) {
    if (!source) return null;
    if (typeof getMediaNaturalSize === 'function') {
      try {
        const size = getMediaNaturalSize(source);
        if (size && size.width && size.height) {
          return size;
        }
      } catch (_) {
      }
    }
    const videoWidth = Number(source?.videoWidth);
    const videoHeight = Number(source?.videoHeight);
    if (videoWidth > 0 && videoHeight > 0) {
      return { width: videoWidth, height: videoHeight };
    }
    const naturalWidth = Number(source?.naturalWidth);
    const naturalHeight = Number(source?.naturalHeight);
    if (naturalWidth > 0 && naturalHeight > 0) {
      return { width: naturalWidth, height: naturalHeight };
    }
    const width = Number(source?.width);
    const height = Number(source?.height);
    if (width > 0 && height > 0) {
      return { width, height };
    }
    return null;
  }

  function resolvePresetEntry(id) {
    if (!id) return PRESET_MAP.none || PRESET_MAP['none'] || null;
    const entry = PRESET_MAP[id] || PRESET_MAP[id.trim ? id.trim() : id] || null;
    if (entry && entry.aliasOf && PRESET_MAP[entry.aliasOf]) {
      return PRESET_MAP[entry.aliasOf];
    }
    return entry || PRESET_MAP.none || PRESET_MAP['none'] || null;
  }

  function normalizeCanvasEffects(raw) {
    const base = Object.assign({}, DEFAULT_CANVAS_EFFECTS);
    const input = raw && typeof raw === 'object' ? raw : {};
    const requestedPreset = (typeof input.preset === 'string' && input.preset.trim())
      ? input.preset.trim()
      : base.preset;
    base.preset = resolvePresetEntry(requestedPreset) ? requestedPreset : base.preset;
    const flagKeys = ['scanlines', 'grain', 'vignette', 'lightLeak', 'colorDrift', 'cursorGlow'];
    for (const key of flagKeys) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        base[key] = !!input[key];
      }
    }
    const presetEntry = resolvePresetEntry(base.preset);
    if (presetEntry && presetEntry.defaults) {
      for (const [key, value] of Object.entries(presetEntry.defaults)) {
        if (key === 'preset') continue;
        if (Object.prototype.hasOwnProperty.call(input, key)) continue;
        base[key] = value;
      }
    }
    return base;
  }

  function ensureGrainCanvas(target, now) {
    if (!target) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      target = {
        canvas,
        ctx: canvas.getContext('2d'),
        updatedAt: 0,
      };
    }
    if (!target.ctx) {
      target.ctx = target.canvas.getContext('2d');
    }
    if (!target.updatedAt || (now - target.updatedAt) > 120) {
      const gctx = target.ctx;
      const imageData = gctx.createImageData(target.canvas.width, target.canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const shade = Math.floor(Math.random() * 255);
        data[i] = data[i + 1] = data[i + 2] = shade;
        data[i + 3] = 255;
      }
      gctx.putImageData(imageData, 0, 0);
      target.updatedAt = now;
    }
    return target;
  }

  function createPatternSafe(ctx, canvas) {
    try {
      return ctx.createPattern(canvas, 'repeat');
    } catch (_) {
      return null;
    }
  }

  function cloneLayerOptions(options = {}) {
    const clone = Object.assign({}, options);
    if (options.style && typeof options.style === 'object') {
      clone.style = Object.assign({}, options.style);
    }
    return clone;
  }

  function resolveZIndexDefault(state) {
    if (state && state.eff && state.eff.zIndex != null) {
      return state.eff.zIndex;
    }
    return 2147482800;
  }

  KB.createCanvasAdapterBase = function createCanvasAdapterBase(userConfig = {}) {
    const {
      adapterId = 'canvas-overlay',
      layerId,
      layerOptions = {},
      resolveZIndex = resolveZIndexDefault,
      supportsScrollAttach = false,
    } = userConfig;

    if (!layerId) {
      throw new Error(`createCanvasAdapterBase requires a layerId (adapter: ${adapterId})`);
    }

    const logger = (typeof KB.getLogger === 'function') ? KB.getLogger(`adapter:${adapterId}`) : null;
    const trace = (...args) => {
      if (logger && logger.trace) logger.trace(...args);
    };
    const warn = (...args) => {
      if (logger && logger.warn) logger.warn(...args);
      else console.warn(`[adapter:${adapterId}]`, ...args);
    };

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
    let scrollAttached = false;
    let currentEffects = normalizeCanvasEffects();
    let currentPresetEntry = resolvePresetEntry(currentEffects.preset);
    let grainState = null;
    let maskSurface = null;
    let pointerListenerActive = false;
    let manualRenderQueued = false;
    const pointerState = {
      active: false,
      clientX: 0,
      clientY: 0,
      movedAt: 0,
    };
    let isRendering = false;

    const HAVE_CURRENT_DATA = 2;

    const handlePointerMove = (event) => {
      if (!event) return;
      pointerState.active = true;
      pointerState.clientX = event.clientX;
      pointerState.clientY = event.clientY;
      pointerState.movedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      scheduleManualRender();
    };

    function updateCursorGlowTracking() {
      const shouldTrack = !!(currentEffects && currentEffects.cursorGlow);
      if (shouldTrack && !pointerListenerActive) {
        try {
          window.addEventListener('pointermove', handlePointerMove, { passive: true });
          pointerListenerActive = true;
        } catch (_) {}
      } else if (!shouldTrack && pointerListenerActive) {
        try {
          window.removeEventListener('pointermove', handlePointerMove);
        } catch (_) {}
        pointerListenerActive = false;
        pointerState.active = false;
      }
    }

    function updateEffectsFromState(state) {
      const next = normalizeCanvasEffects(state && state.style && state.style.canvasEffects);
      currentEffects = next;
      currentPresetEntry = resolvePresetEntry(next.preset);
      updateCursorGlowTracking();
    }

    function scheduleManualRender() {
      if (currentSource instanceof HTMLVideoElement && shouldRenderFrames()) {
        return;
      }
      if (manualRenderQueued) return;
      manualRenderQueued = true;
      requestAnimationFrame(() => {
        manualRenderQueued = false;
        renderFrame();
      });
    }

    function ensureHost() {
      if (!container || !container.isConnected) {
        container = ensureLayerContainer(layerId, cloneLayerOptions(layerOptions));
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

    function syncScrollOffsets() {
      if (!supportsScrollAttach) return;
      if (!container) return;
      const offsetX = window.pageXOffset || 0;
      const offsetY = window.pageYOffset || 0;
      container.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;
    }

    function ensureScrollListeners() {
      if (!supportsScrollAttach || scrollAttached) return;
      window.addEventListener('scroll', syncScrollOffsets, { passive: true });
      window.addEventListener('resize', syncScrollOffsets);
      scrollAttached = true;
      syncScrollOffsets();
    }

    function detachScrollListeners() {
      if (!supportsScrollAttach || !scrollAttached) return;
      scrollAttached = false;
      window.removeEventListener('scroll', syncScrollOffsets);
      window.removeEventListener('resize', syncScrollOffsets);
      if (container) container.style.transform = 'translate(0px, 0px)';
    }

    function handleScrollAttach(attachMode) {
      if (!supportsScrollAttach) return;
      const mode = (attachMode || '').toLowerCase();
      if (mode === 'scroll') ensureScrollListeners();
      else detachScrollListeners();
    }

    function updateVisibility(state) {
      if (!container || !surface || !surface.canvas) return;
      if (!state || !state.eff) return;
      const visible = state.eff.visibility !== 'hidden';
      const targetOpacity = clamp(state.eff.opacity != null ? state.eff.opacity : 1, 0, 1);
      container.style.display = visible ? 'block' : 'none';
      const zIndex = resolveZIndex(state);
      container.style.zIndex = String(zIndex);
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
      handleScrollAttach(state.eff.attach);
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

    function ensureAuxSurface(target, width, height, dpr, imageSmoothing = true) {
      if (!target || !target.canvas || !target.canvas.width || !target.canvas.height) {
        target = {
          canvas: document.createElement('canvas'),
          ctx: null,
          dpr: 1,
        };
        target.ctx = target.canvas.getContext('2d');
      }
      const pixelWidth = Math.max(1, Math.round(width * dpr));
      const pixelHeight = Math.max(1, Math.round(height * dpr));
      if (target.canvas.width !== pixelWidth || target.canvas.height !== pixelHeight) {
        target.canvas.width = pixelWidth;
        target.canvas.height = pixelHeight;
      }
      const ctx = target.ctx;
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, target.canvas.width, target.canvas.height);
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = !!imageSmoothing;
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      target.dpr = dpr;
      return target;
    }

    function applySoftGlowPass(ctx, width, height) {
      if (!currentSource) return;
      try {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.globalCompositeOperation = 'screen';
        ctx.filter = 'blur(24px) brightness(1.08)';
        ctx.drawImage(currentSource, 0, 0, width, height);
        ctx.restore();
      } catch (err) {
        warn('softGlow overlay failed', err);
      }
    }

    function applyEdgeGlowPass(ctx, width, height) {
      if (!currentSource) return;
      try {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.globalCompositeOperation = 'overlay';
        ctx.filter = 'blur(6px) contrast(1.6)';
        ctx.drawImage(currentSource, 0, 0, width, height);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.globalCompositeOperation = 'soft-light';
        ctx.filter = 'blur(18px)';
        ctx.drawImage(currentSource, 0, 0, width, height);
        ctx.restore();
      } catch (err) {
        warn('edge glow overlay failed', err);
      }
    }

    function applyChromaticAberrationPass(ctx, width, height) {
      if (!currentSource) return;
      const offset = Math.max(1, Math.round(Math.min(width, height) * 0.005));
      try {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.18;
        ctx.filter = 'hue-rotate(310deg)';
        ctx.drawImage(currentSource, -offset, 0, width, height);
        ctx.restore();

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.18;
        ctx.filter = 'hue-rotate(60deg)';
        ctx.drawImage(currentSource, offset, 0, width, height);
        ctx.restore();
      } catch (err) {
        warn('chromatic aberration pass failed', err);
      }
    }

    function applyFilmGrain(ctx, width, height, now) {
      grainState = ensureGrainCanvas(grainState, now);
      const pattern = createPatternSafe(ctx, grainState.canvas);
      if (!pattern) return;
      const jitter = (now * 0.00025) % 1;
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.12;
      ctx.translate(-width * jitter * 0.12, -height * (1 - jitter) * 0.12);
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width + width * 0.24, height + height * 0.24);
      ctx.restore();
    }

    function applyLightLeak(ctx, width, height, now, pulse) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const baseAlpha = pulse ? 0.38 : 0.32;
      const wave = pulse ? (0.65 + 0.35 * Math.sin(now / 600)) : 1;
      ctx.globalAlpha = baseAlpha * wave;
      const hue = (now / 25) % 360;
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, `hsla(${(hue + 350) % 360}, 82%, 65%, 0.0)`);
      gradient.addColorStop(0.25, `hsla(${(hue + 20) % 360}, 88%, 72%, 0.46)`);
      gradient.addColorStop(0.55, `hsla(${(hue + 120) % 360}, 85%, 60%, 0.18)`);
      gradient.addColorStop(1, `hsla(${(hue + 200) % 360}, 80%, 58%, 0.0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    function applyColorDrift(ctx, width, height, now, strength) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = strength;
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      const wave = Math.sin(now / 1500) * 0.1;
      gradient.addColorStop(0, `hsla(${(now / 20) % 360}, 95%, 64%, 0.0)`);
      gradient.addColorStop(0.4 + wave, `hsla(${(now / 18 + 70) % 360}, 92%, 68%, 0.45)`);
      gradient.addColorStop(0.75 - wave, `hsla(${(now / 15 + 210) % 360}, 90%, 62%, 0.38)`);
      gradient.addColorStop(1, `hsla(${(now / 16 + 280) % 360}, 88%, 58%, 0.05)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    function applyVignette(ctx, width, height) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const radius = Math.max(width, height);
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        radius * 0.35,
        width / 2,
        height / 2,
        radius * 0.75
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    function applyCursorGlow(ctx, width, height, now) {
      if (!currentEffects || !currentEffects.cursorGlow) return;
      if (!pointerState.active || !pointerState.movedAt) return;
      if (!surface || !surface.canvas || typeof surface.canvas.getBoundingClientRect !== 'function') return;
      const rect = surface.canvas.getBoundingClientRect();
      if (!rect || !rect.width || !rect.height) return;
      const relX = (pointerState.clientX - rect.left) / rect.width;
      const relY = (pointerState.clientY - rect.top) / rect.height;
      if (relX <= 0 || relX >= 1 || relY <= 0 || relY >= 1) return;
      const age = Math.max(0, Math.min(1, (now - pointerState.movedAt) / 1200));
      const alpha = 0.38 * (1 - age);
      if (alpha <= 0.01) return;
      const x = relX * width;
      const y = relY * height;
      const radius = Math.max(width, height) * 0.3;
      const gradient = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
      gradient.addColorStop(0.45, 'rgba(135, 206, 250, 0.38)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    function applyScanlines(ctx, width, height) {
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.globalAlpha = 0.18;
      const spacing = 4;
      for (let y = 0; y < height; y += spacing) {
        ctx.fillRect(0, y, width, 1);
      }
      ctx.restore();
    }

    function renderFrame() {
      if (isRendering) return;
      if (!surface || !surface.ctx || !currentSource) return;
      if (currentSource instanceof HTMLVideoElement && currentSource.readyState < HAVE_CURRENT_DATA) return;
      const naturalSize = getNaturalSize(currentSource) || currentNatural;
      if (!naturalSize || !naturalSize.width || !naturalSize.height) return;

      isRendering = true;
      try {
        const sizeChanged = !currentNatural
          || currentNatural.width !== naturalSize.width
          || currentNatural.height !== naturalSize.height;
        currentNatural = naturalSize;

        if (sizeChanged && currentState) {
          updateTransform(currentState);
        }

        const { width, height } = currentNatural;

        const dpr = getDevicePixelRatio();
        resizeCanvasSurface(surface, width, height, {
          devicePixelRatio: surface.dpr || dpr,
          imageSmoothing: true,
        });

        maskSurface = ensureAuxSurface(maskSurface, width, height, surface.dpr || dpr, false);

        const ctx = surface.ctx;
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);

        const effects = currentEffects || normalizeCanvasEffects();
        const presetEntry = currentPresetEntry || resolvePresetEntry(effects.preset);
        const profile = (presetEntry && presetEntry.profile) || {};
        const passes = profile.passes || {};
        const baseFilter = profile.baseFilter || 'none';
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

        try {
          ctx.save();
          ctx.filter = baseFilter;
          ctx.drawImage(currentSource, 0, 0, width, height);
          ctx.restore();
        } catch (err) {
          warn('drawImage failed', err);
        }

        if (maskSurface && maskSurface.ctx) {
          const maskCtx = maskSurface.ctx;
          maskCtx.save();
          maskCtx.filter = baseFilter;
          maskCtx.drawImage(currentSource, 0, 0, width, height);
          maskCtx.filter = 'none';
          maskCtx.restore();
        }

        if (passes.softGlow) applySoftGlowPass(ctx, width, height);
        if (passes.edgeGlow) applyEdgeGlowPass(ctx, width, height);
        if (passes.chromaticAberration) applyChromaticAberrationPass(ctx, width, height);

        const driftStrength = (passes.baseColorDrift ? 0.18 : 0) + (effects.colorDrift ? 0.22 : 0);
        if (driftStrength > 0) applyColorDrift(ctx, width, height, now, driftStrength);

        if (effects.lightLeak) {
          applyLightLeak(ctx, width, height, now, passes.lightLeakPulse === true);
        }

        if (effects.grain) {
          applyFilmGrain(ctx, width, height, now);
        }

        if (effects.vignette) {
          applyVignette(ctx, width, height);
        }

        applyCursorGlow(ctx, width, height, now);

        if (effects.scanlines) {
          applyScanlines(ctx, width, height);
        }

        if (maskSurface && maskSurface.canvas) {
          ctx.save();
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(maskSurface.canvas, 0, 0, width, height);
          ctx.restore();
        }
      } finally {
        isRendering = false;
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
      disposeLayerContainer(layerId);
      container = null;
      surface = null;
      rafId = null;
      isEffectivelyVisible = true;
      manualRenderQueued = false;
      isRendering = false;
      grainState = null;
      maskSurface = null;
      pointerState.active = false;
      pointerState.movedAt = 0;
      detachScrollListeners();
      if (pointerListenerActive) {
        try {
          window.removeEventListener('pointermove', handlePointerMove);
        } catch (_) {}
        pointerListenerActive = false;
      }
      currentEffects = normalizeCanvasEffects();
      currentPresetEntry = resolvePresetEntry(currentEffects.preset);
    }

    return {
      apply,
      update,
      teardown,
    };
  };

})(typeof window !== 'undefined' ? window : this);
