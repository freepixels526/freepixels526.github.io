(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  const utils = KB.renderUtils || {};
  const {
    cssUrl,
    isVideoMedia,
    buildTransformString,
    ensureVideoDefaults,
    setVideoSource,
    disposeVideo,
  } = utils;

  function normalizeObjectPosition(basePos) {
    const normalized = (basePos || '').toString().toLowerCase();
    let x = '50%';
    let y = '50%';
    if (normalized.includes('left')) x = '0%';
    else if (normalized.includes('right')) x = '100%';
    if (normalized.includes('top')) y = '0%';
    else if (normalized.includes('bottom')) y = '100%';
    return `${x} ${y}`;
  }

  KB.createFrontChannel = KB.createFrontChannel || function createFrontChannel() {
    const logger = (typeof KB.getLogger === 'function') ? KB.getLogger('channel:front') : null;
    const trace = (...args) => {
      if (logger && logger.trace) logger.trace(...args);
      else console.debug('[channel:front]', ...args);
    };
    if (logger && logger.info) logger.info('channel initialised');

    const STYLE_ID = 'kabegami-layer-front-style';
    if (!document.getElementById(STYLE_ID)) {
      const css = `:root {\n  --kabegami-front-image: none;\n  --kabegami-front-size: cover;\n  --kabegami-front-position: center center;\n  --kabegami-front-opacity: 1;\n  --kabegami-front-blend: normal;\n  --kabegami-front-origin: center center;\n  --kabegami-front-transform: none;\n  --kabegami-front-filter: none;\n  --kabegami-front-z-index: 2147483000;\n}\n#kabegami-layer-front {\n  position: fixed;\n  inset: 0;\n  pointer-events: none;\n  background-repeat: no-repeat;\n  background-image: var(--kabegami-front-image);\n  background-size: var(--kabegami-front-size);\n  background-position: var(--kabegami-front-position);\n  opacity: var(--kabegami-front-opacity);\n  mix-blend-mode: var(--kabegami-front-blend);\n  transform-origin: var(--kabegami-front-origin);\n  transform: var(--kabegami-front-transform);\n  filter: var(--kabegami-front-filter);\n  z-index: var(--kabegami-front-z-index);\n}\n`;
      const styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      styleEl.textContent = css;
      document.documentElement.appendChild(styleEl);
    }

    let overlay = null;
    let videoEl = null;
    const rootStyle = document.documentElement.style;
    const FRONT_PROPS = [
      '--kabegami-front-image',
      '--kabegami-front-size',
      '--kabegami-front-position',
      '--kabegami-front-opacity',
      '--kabegami-front-blend',
      '--kabegami-front-origin',
      '--kabegami-front-transform',
      '--kabegami-front-filter',
      '--kabegami-front-z-index',
    ];

    function ensureOverlay() {
      if (!overlay) {
        overlay = document.getElementById('kabegami-layer-front');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'kabegami-layer-front';
          overlay.style.pointerEvents = 'none';
          document.documentElement.appendChild(overlay);
        }
      }
      return overlay;
    }

    function setProp(name, value) {
      if (value == null || value === '') rootStyle.removeProperty(name);
      else rootStyle.setProperty(name, value);
    }

    function ensureVideoElement() {
      trace('ensureVideoElement:start');
      const host = ensureOverlay();
      if (videoEl && !host.contains(videoEl)) {
        trace('ensureVideoElement:existingDetached -> dispose');
        videoEl = disposeVideo(videoEl);
      }
      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.id = 'kabegami-layer-front-video';
        ensureVideoDefaults(videoEl);
        Object.assign(videoEl.style, {
          position: 'absolute',
          inset: '0',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: '0',
          objectFit: 'cover',
          objectPosition: '50% 50%',
          display: 'block',
        });
        host.appendChild(videoEl);
        trace('ensureVideoElement:created');
      }
      trace('ensureVideoElement:return', !!videoEl, videoEl ? videoEl.tagName : null);
      return videoEl;
    }

    return {
      apply(state, options = {}) {
        trace('apply:start', {
          layer: 'front',
          mediaType: state.mediaType,
          visibility: state.eff.visibility,
          url: state.sourceUrl,
          transformOnly: !!options.transformOnly,
        });
        const el = ensureOverlay();
        trace('apply:resolvedOverlay', !!el, el ? el.id : null);
        const isVideo = isVideoMedia(state.mediaType);
        trace('apply:mediaDecision', { isVideo, mediaType: state.mediaType });
        if (!options.transformOnly) {
          if (isVideo) {
            setProp('--kabegami-front-image', 'none');
            trace('apply -> video branch');
            const vid = ensureVideoElement();
            setVideoSource(vid, state.resolvedUrl);
          } else {
            if (videoEl) {
              trace('apply -> dispose existing video element');
              videoEl = disposeVideo(videoEl);
            }
            setProp('--kabegami-front-image', `url("${cssUrl(state.resolvedUrl)}")`);
          }
        }
        if (!isVideo) {
          const baseSize = state.config.baseSize || 'cover';
          setProp('--kabegami-front-size', baseSize);
          setProp('--kabegami-front-position', state.eff.position);
        } else {
          setProp('--kabegami-front-size', 'auto');
          setProp('--kabegami-front-position', 'center center');
        }
        setProp('--kabegami-front-opacity', isVideo ? '1' : String(state.eff.opacity));
        setProp('--kabegami-front-blend', isVideo ? 'normal' : (state.eff.blend || 'normal'));
        setProp('--kabegami-front-filter', isVideo ? 'none' : (state.eff.filter || 'none'));
        setProp('--kabegami-front-z-index', String(state.eff.zIndex != null ? state.eff.zIndex : 2147483000));
        if (isVideo) {
          setProp('--kabegami-front-origin', 'center center');
          setProp('--kabegami-front-transform', 'none');
        } else {
          setProp('--kabegami-front-origin', state.style.transformOrigin || 'center center');
          setProp('--kabegami-front-transform', buildTransformString(state.style));
        }
        const visible = state.eff.visibility !== 'hidden';
        el.style.display = visible ? 'block' : 'none';
        if (isVideo) {
          const vid = ensureVideoElement();
          const validFits = ['cover', 'contain', 'fill', 'none', 'scale-down'];
          const baseSizeValue = (state.config.baseSize || '').toString().toLowerCase();
          vid.style.objectFit = validFits.includes(baseSizeValue) ? baseSizeValue : 'cover';
          vid.style.objectPosition = normalizeObjectPosition(state.config.basePosition || 'center center');

          let effectiveStyle = state.style;
          const baseSizeScale = state.config.baseSizeScale;
          if (baseSizeScale && baseSizeScale !== 1) {
            effectiveStyle = Object.assign({}, state.style);
            const baseScale = effectiveStyle.scale != null ? effectiveStyle.scale : 1;
            effectiveStyle.scale = baseScale * baseSizeScale;
            if (effectiveStyle.scaleX != null) effectiveStyle.scaleX *= baseSizeScale;
            if (effectiveStyle.scaleY != null) effectiveStyle.scaleY *= baseSizeScale;
          }
          vid.style.display = visible ? 'block' : 'none';
          vid.style.opacity = String(state.eff.opacity);
          vid.style.mixBlendMode = state.eff.blend || 'normal';
          vid.style.filter = state.eff.filter || 'none';
          vid.style.transformOrigin = state.style.transformOrigin || 'center center';
          vid.style.transform = buildTransformString(effectiveStyle);
          trace('apply -> video updated', { display: vid.style.display, src: vid.dataset ? vid.dataset.src : vid.src });
        } else {
          trace('apply -> image updated', { display: el.style.display, cssImage: state.resolvedUrl });
        }
      },
      clear() {
        trace('clear');
        videoEl = disposeVideo(videoEl);
        if (overlay) {
          overlay.remove();
          overlay = null;
        }
        FRONT_PROPS.forEach((p) => rootStyle.removeProperty(p));
      }
    };
  };

})(typeof window !== 'undefined' ? window : this);
