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
    let currentPresetEntry = resolvePresetEntry(currentEffects.preset);
    let grainCanvas = null;
    let grainLastUpdated = 0;
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

    function handlePointerMove(event) {
      if (!event) return;
      pointerState.active = true;
      pointerState.clientX = event.clientX;
      pointerState.clientY = event.clientY;
      pointerState.movedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      scheduleManualRender();
    }

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

    function ensureGrainCanvas(now) {
      if (!grainCanvas) {
        const size = 128;
        grainCanvas = document.createElement('canvas');
        grainCanvas.width = size;
        grainCanvas.height = size;
      }
      const gctx = grainCanvas.getContext('2d');
      if (!gctx) return null;
      if (!grainLastUpdated || (now - grainLastUpdated) > 120) {
        const imageData = gctx.createImageData(grainCanvas.width, grainCanvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const shade = Math.floor(Math.random() * 255);
          data[i] = data[i + 1] = data[i + 2] = shade;
          data[i + 3] = 255;
        }
        gctx.putImageData(imageData, 0, 0);
        grainLastUpdated = now;
      }
      return grainCanvas;
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
      const canvas = ensureGrainCanvas(now);
      if (!canvas) return;
      let pattern = null;
      try {
        pattern = ctx.createPattern(canvas, 'repeat');
      } catch (_) {
        pattern = null;
      }
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
        devicePixelRatio: dpr,
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
      disposeLayerContainer(LAYER_ID);
      container = null;
      surface = null;
      rafId = null;
      isEffectivelyVisible = true;
      manualRenderQueued = false;
      isRendering = false;
      grainCanvas = null;
      grainLastUpdated = 0;
      pointerState.active = false;
      pointerState.movedAt = 0;
      maskSurface = null;
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
  }

  KB.registerModeAdapter = KB.registerModeAdapter || function registerModeAdapter(name, factory) {
    const registry = KB.__kbModeAdapters = KB.__kbModeAdapters || new Map();
    if (!name || typeof factory !== 'function') return;
    registry.set(name, factory);
  };

  KB.registerModeAdapter(ADAPTER_ID, () => createCanvasAdapter());

})(typeof window !== 'undefined' ? window : this);
