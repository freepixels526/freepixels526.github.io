(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  const utils = KB.renderUtils || {};
  const {
    isVideoMedia,
    buildTransformString,
    setVideoSource,
    ensureLayerContainer,
    ensureMediaElement,
    disposeLayerContainer,
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

  const VALID_FITS = ['cover', 'contain', 'fill', 'none', 'scale-down'];

  KB.createFrontChannel = KB.createFrontChannel || function createFrontChannel() {
    const logger = (typeof KB.getLogger === 'function') ? KB.getLogger('channel:front') : null;
    const trace = (...args) => {
      if (logger && logger.trace) logger.trace(...args);
      else console.debug('[channel:front]', ...args);
    };
    if (logger && logger.info) logger.info('channel initialised');

    const STYLE_ID = 'kabegami-layer-front-style';
    if (!document.getElementById(STYLE_ID)) {
      const css = `#kabegami-layer-front{position:fixed;inset:0;pointer-events:none;overflow:visible;}`;
      const styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      styleEl.textContent = css;
      document.documentElement.appendChild(styleEl);
    }

    return {
      apply(state, options = {}) {
        const container = ensureLayerContainer('kabegami-layer-front', {
          position: 'fixed',
          inset: '0',
          pointerEvents: 'none',
          style: {
            overflow: 'visible',
          },
        });
        const visible = state.eff.visibility !== 'hidden';
        container.style.display = visible ? 'block' : 'none';
        container.style.zIndex = String(state.eff.zIndex != null ? state.eff.zIndex : 2147483000);

        const mediaEl = ensureMediaElement(container, state.mediaType);
        const baseSizeValue = (state.config.baseSize || '').toString().toLowerCase();
        mediaEl.style.objectFit = VALID_FITS.includes(baseSizeValue) ? baseSizeValue : 'cover';
        mediaEl.style.objectPosition = normalizeObjectPosition(state.config.basePosition || 'center center');
        mediaEl.style.opacity = String(state.eff.opacity);
        mediaEl.style.mixBlendMode = state.eff.blend || 'normal';
        mediaEl.style.filter = state.eff.filter || 'none';
        mediaEl.style.visibility = visible ? 'visible' : 'hidden';

        let effectiveStyle = state.style;
        const baseSizeScale = state.config.baseSizeScale;
        if (baseSizeScale && baseSizeScale !== 1) {
          effectiveStyle = Object.assign({}, state.style);
          const baseScale = effectiveStyle.scale != null ? effectiveStyle.scale : 1;
          effectiveStyle.scale = baseScale * baseSizeScale;
          if (effectiveStyle.scaleX != null) effectiveStyle.scaleX *= baseSizeScale;
          if (effectiveStyle.scaleY != null) effectiveStyle.scaleY *= baseSizeScale;
        }
        mediaEl.style.transformOrigin = state.style.transformOrigin || 'center center';
        mediaEl.style.transform = buildTransformString(effectiveStyle);

        if (!options.transformOnly) {
          if (isVideoMedia(state.mediaType)) {
            setVideoSource(mediaEl, state.resolvedUrl);
          } else if (mediaEl.dataset.src !== state.resolvedUrl) {
            mediaEl.dataset.src = state.resolvedUrl || '';
            mediaEl.src = state.resolvedUrl || '';
          }
        }
      },
      clear() {
        disposeLayerContainer('kabegami-layer-front');
      }
    };
  };

})(typeof window !== 'undefined' ? window : this);

