(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  const utils = KB.renderUtils = KB.renderUtils || {};

  utils.cssUrl = utils.cssUrl || function cssUrl(u) {
    return String(u || '').replace(/"/g, '\\"');
  };

  utils.clamp = utils.clamp || function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  };

  utils.normalizeStyle = utils.normalizeStyle || function normalizeStyle(style) {
    const normalized = Object.assign({
      dx: 0,
      dy: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      rotate: 0,
      flipX: false,
      flipY: false,
      transformOrigin: 'center center',
    }, style || {});

    normalized.dx = Number(normalized.dx) || 0;
    normalized.dy = Number(normalized.dy) || 0;
    normalized.scale = normalized.scale != null ? Number(normalized.scale) || 1 : 1;
    normalized.scaleX = normalized.scaleX != null ? Number(normalized.scaleX) || 1 : 1;
    normalized.scaleY = normalized.scaleY != null ? Number(normalized.scaleY) || 1 : 1;
    normalized.rotate = normalized.rotate != null ? Number(normalized.rotate) || 0 : 0;
    normalized.flipX = !!normalized.flipX;
    normalized.flipY = !!normalized.flipY;
    normalized.opacity = normalized.opacity != null ? utils.clamp(Number(normalized.opacity) || 0, 0, 1) : undefined;
    if (normalized.blend === '') normalized.blend = undefined;
    if (!normalized.transformOrigin) normalized.transformOrigin = 'center center';
    return normalized;
  };

  utils.computeSizeWithScale = utils.computeSizeWithScale || function computeSizeWithScale(base, scale) {
    const effectiveScale = scale != null ? scale : 1;
    if (!effectiveScale || !(effectiveScale > 0)) return base;
    let pct = 100;
    if (typeof base === 'string') {
      const m = base.trim().match(/^(\d+(?:\.\d+)?)%$/);
      if (m) {
        pct = parseFloat(m[1]);
      }
    }
    const scaled = utils.clamp(pct * effectiveScale, 1, 1000);
    return scaled + '%';
  };

  utils.computePositionWithOffset = utils.computePositionWithOffset || function computePositionWithOffset(pos, dx = 0, dy = 0) {
    const map = { left: '0%', center: '50%', right: '100%', top: '0%', bottom: '100%' };
    let xs = '50%';
    let ys = '50%';
    if (typeof pos === 'string') {
      const parts = pos.trim().split(/\s+/);
      if (parts.length === 1) parts.push('50%');
      const xRaw = parts[0];
      const yRaw = parts[1];
      xs = map[xRaw] || xRaw;
      ys = map[yRaw] || yRaw;
    }
    const dxpx = dx ? ` + ${dx}px` : '';
    const dypx = dy ? ` + ${dy}px` : '';
    const x = dxpx ? `calc(${xs}${dxpx})` : xs;
    const y = dypx ? `calc(${ys}${dypx})` : ys;
    return `${x} ${y}`;
  };

  utils.buildTransformString = utils.buildTransformString || function buildTransformString(style) {
    const translate = `translate(${style.dx || 0}px, ${style.dy || 0}px)`;
    const rotate = style.rotate ? ` rotate(${style.rotate}deg)` : '';
    const baseScale = style.scale != null ? style.scale : 1;
    const flipScaleX = style.flipX ? -1 : 1;
    const flipScaleY = style.flipY ? -1 : 1;
    const sx = (style.scaleX != null ? style.scaleX : 1) * baseScale * flipScaleX;
    const sy = (style.scaleY != null ? style.scaleY : 1) * baseScale * flipScaleY;
    const scale = ` scale(${sx}, ${sy})`;
    return translate + rotate + scale;
  };

  utils.guessMediaTypeFromUrl = utils.guessMediaTypeFromUrl || function guessMediaTypeFromUrl(url) {
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
  };

  utils.resolveMediaType = utils.resolveMediaType || function resolveMediaType(explicit, url) {
    if (explicit && typeof explicit === 'string') return explicit;
    return utils.guessMediaTypeFromUrl(url) || 'image/jpeg';
  };

  utils.isVideoMedia = utils.isVideoMedia || function isVideoMedia(mediaType) {
    return typeof mediaType === 'string' && mediaType.toLowerCase().startsWith('video/');
  };

  utils.objectFitFromSize = utils.objectFitFromSize || function objectFitFromSize(size) {
    if (!size) return 'cover';
    const normalized = String(size).trim().toLowerCase();
    if (normalized === 'cover' || normalized === 'contain' || normalized === 'fill' || normalized === 'none' || normalized === 'scale-down') {
      return normalized;
    }
    if (normalized === 'auto') return 'contain';
    if (/^\d+(?:\.\d+)?%$/.test(normalized)) return 'fill';
    if (normalized.includes(' ')) {
      const parts = normalized.split(/\s+/);
      if (parts.every((p) => /^\d+(?:\.\d+)?%$/.test(p))) return 'fill';
    }
    return 'cover';
  };

  utils.ensureVideoDefaults = utils.ensureVideoDefaults || function ensureVideoDefaults(video) {
    if (!video) return;
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
  };

  utils.setVideoSource = utils.setVideoSource || function setVideoSource(video, src) {
    if (!video) return;
    if (video.dataset.src === src) {
      try {
        const maybe = video.play();
        if (maybe && typeof maybe.catch === 'function') maybe.catch(() => {});
      } catch (_) {}
      return;
    }
    try { video.pause(); } catch (_) {}
    try {
      video.removeAttribute('src');
      video.load();
    } catch (_) {}
    if (src) {
      video.src = src;
      video.dataset.src = src;
      try {
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (_) {}
    } else {
      video.dataset.src = '';
    }
  };

  utils.disposeVideo = utils.disposeVideo || function disposeVideo(video) {
    if (!video) return null;
    try { video.pause(); } catch (_) {}
    try {
      video.removeAttribute('src');
      video.load();
    } catch (_) {}
    if (video.parentNode) video.parentNode.removeChild(video);
    return null;
  };

  const LAYER_REGISTRY = utils.__layerRegistry = utils.__layerRegistry || new Map();

  utils.ensureLayerContainer = utils.ensureLayerContainer || function ensureLayerContainer(id, options = {}) {
    if (!id) throw new Error('ensureLayerContainer requires an id');
    let entry = LAYER_REGISTRY.get(id);
    if (entry && entry.el && entry.el.isConnected) return entry.el;

    const container = document.createElement(options.tagName || 'div');
    container.id = id;
    container.className = options.className || 'kabegami-layer';
    const style = Object.assign({
      position: options.position || 'fixed',
      inset: options.inset || '0',
      pointerEvents: options.pointerEvents || 'none',
      zIndex: options.zIndex != null ? String(options.zIndex) : '0',
      overflow: options.overflow || 'visible',
      transformOrigin: options.transformOrigin || 'center center',
      backfaceVisibility: 'hidden',
    }, options.style || {});
    Object.assign(container.style, style);

    const parent = typeof options.parent === 'function'
      ? options.parent()
      : (options.parent || document.documentElement);
    if (!parent || !parent.appendChild) throw new Error('ensureLayerContainer: invalid parent');

    const beforeNode = typeof options.before === 'function'
      ? options.before()
      : options.before;
    if (beforeNode && beforeNode.parentNode === parent) {
      parent.insertBefore(container, beforeNode);
    } else if (options.prepend && parent.firstChild) {
      parent.insertBefore(container, parent.firstChild);
    } else {
      parent.appendChild(container);
    }

    LAYER_REGISTRY.set(id, { el: container });
    return container;
  };

  utils.disposeLayerContainer = utils.disposeLayerContainer || function disposeLayerContainer(id) {
    const entry = LAYER_REGISTRY.get(id);
    if (!entry || !entry.el) return;
    try {
      if (entry.el.parentNode) entry.el.parentNode.removeChild(entry.el);
    } catch (_) {}
    LAYER_REGISTRY.delete(id);
  };

  utils.ensureMediaElement = utils.ensureMediaElement || function ensureMediaElement(container, mediaType, opts = {}) {
    if (!container) throw new Error('ensureMediaElement requires container');
    const desiredTag = utils.isVideoMedia(mediaType) ? 'video' : 'img';
    let el = container.__kbMediaEl;
    if (el && el.tagName.toLowerCase() !== desiredTag) {
      if (el.tagName.toLowerCase() === 'video') utils.disposeVideo(el);
      else if (el.parentNode) el.parentNode.removeChild(el);
      el = null;
    }
    if (!el) {
      el = document.createElement(desiredTag);
      el.className = opts.className || 'kabegami-media';
      Object.assign(el.style, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 'auto',
        height: 'auto',
        maxWidth: 'none',
        maxHeight: 'none',
        transformOrigin: 'center center',
        willChange: 'transform, opacity',
        pointerEvents: 'none',
      }, opts.style || {});
      el.setAttribute('aria-hidden', 'true');
      if (desiredTag === 'img') {
        el.draggable = false;
      } else {
        utils.ensureVideoDefaults(el);
      }
      container.appendChild(el);
      container.__kbMediaEl = el;
    }
    return el;
  };

  utils.disposeMediaElement = utils.disposeMediaElement || function disposeMediaElement(container) {
    if (!container || !container.__kbMediaEl) return;
    const el = container.__kbMediaEl;
    if (el.tagName.toLowerCase() === 'video') utils.disposeVideo(el);
    else if (el.parentNode) el.parentNode.removeChild(el);
    container.__kbMediaEl = null;
  };

  utils.getViewportSize = utils.getViewportSize || function getViewportSize() {
    const docEl = document.documentElement || {};
    const body = document.body || {};
    const width = window.innerWidth || docEl.clientWidth || body.clientWidth || 1920;
    const height = window.innerHeight || docEl.clientHeight || body.clientHeight || 1080;
    return { width, height };
  };

  utils.getMediaNaturalSize = utils.getMediaNaturalSize || function getMediaNaturalSize(mediaEl) {
    if (!mediaEl) return null;
    const tag = mediaEl.tagName ? mediaEl.tagName.toLowerCase() : '';
    if (tag === 'video') {
      const width = mediaEl.videoWidth;
      const height = mediaEl.videoHeight;
      if (width && height) return { width, height };
    } else if (tag === 'img') {
      const width = mediaEl.naturalWidth;
      const height = mediaEl.naturalHeight;
      if (width && height) return { width, height };
    }
    return null;
  };

  utils.computeBaseScale = utils.computeBaseScale || function computeBaseScale(baseSize, naturalSize, viewportSize) {
    const viewport = viewportSize || utils.getViewportSize();
    const natural = naturalSize;
    const sizeStr = (baseSize || '').toString().trim().toLowerCase();
    const vw = viewport.width;
    const vh = viewport.height;

    if (!natural || !natural.width || !natural.height) {
      if (sizeStr.endsWith('%')) {
        const percent = parseFloat(sizeStr);
        return Number.isFinite(percent) ? percent / 100 : 1;
      }
      return 1;
    }

    const ratioW = vw / natural.width;
    const ratioH = vh / natural.height;

    if (sizeStr === 'contain') return Math.min(ratioW, ratioH);
    if (sizeStr === 'auto') return 1;
    if (sizeStr.endsWith('%')) {
      const percent = parseFloat(sizeStr);
      if (!Number.isNaN(percent)) {
        const coverScale = Math.max(ratioW, ratioH);
        return (percent / 100) * coverScale;
      }
    }
    // Default to cover behaviour
    return Math.max(ratioW, ratioH);
  };

  utils.ensureMediaReady = utils.ensureMediaReady || function ensureMediaReady(mediaEl, callback) {
    if (!mediaEl || typeof callback !== 'function') return;
    const tag = mediaEl.tagName ? mediaEl.tagName.toLowerCase() : '';
    const natural = utils.getMediaNaturalSize(mediaEl);
    if (natural && natural.width && natural.height) {
      callback();
      return;
    }
    const eventName = tag === 'video' ? 'loadedmetadata' : 'load';
    const handler = () => {
      callback();
    };
    mediaEl.addEventListener(eventName, handler, { once: true });
  };

})(typeof window !== 'undefined' ? window : this);
