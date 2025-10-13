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
    ensureMediaReady,
    getViewportSize,
    getMediaNaturalSize,
    computeBaseScale,
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
      const css = `#kabegami-layer-front{position:fixed;inset:0;pointer-events:none;overflow:visible;}`;
      const styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      styleEl.textContent = css;
      document.documentElement.appendChild(styleEl);
    }

    function applyState(state, options = {}) {
      const container = ensureLayerContainer('kabegami-layer-front', {
        parent: () => (document.body || document.documentElement),
        position: 'fixed',
        inset: '0',
        pointerEvents: 'none',
        style: {
          overflow: 'visible',
        },
      });

      if (!options.__fromReady) {
        container.__kbLastState = state;
        container.__kbLastOptions = Object.assign({}, options);
      }

      const visible = state.eff.visibility !== 'hidden';
      container.style.display = visible ? 'block' : 'none';
      container.style.zIndex = String(state.eff.zIndex != null ? state.eff.zIndex : 2147483000);

      const mediaEl = ensureMediaElement(container, state.mediaType);
      mediaEl.style.visibility = visible ? 'visible' : 'hidden';
      mediaEl.style.opacity = String(state.eff.opacity);
      mediaEl.style.mixBlendMode = state.eff.blend || 'normal';
      mediaEl.style.filter = state.eff.filter || 'none';

      const natural = getMediaNaturalSize(mediaEl);
      if (!options.__fromReady && (!natural || !natural.width || !natural.height)) {
        ensureMediaReady(mediaEl, () => {
          const snap = container.__kbLastState;
          if (!snap) return;
          applyState(snap, Object.assign({}, container.__kbLastOptions || {}, { transformOnly: true, __fromReady: true }));
        });
      }
      const viewport = getViewportSize();
      const baseScale = computeBaseScale(state.config.baseSize, natural, viewport);

      const effectiveStyle = Object.assign({}, state.style);
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

      mediaEl.style.transformOrigin = state.style.transformOrigin || 'center center';
      mediaEl.style.transform = `translate(-50%, -50%) ${buildTransformString(effectiveStyle)}`;

      if (!options.transformOnly) {
        if (isVideoMedia(state.mediaType)) {
          setVideoSource(mediaEl, state.resolvedUrl);
        } else if (mediaEl.dataset.src !== state.resolvedUrl) {
          mediaEl.dataset.src = state.resolvedUrl || '';
          mediaEl.src = state.resolvedUrl || '';
        }
      }
    }

    return {
      apply: applyState,
      clear() {
        disposeLayerContainer('kabegami-layer-front');
      }
    };
  };

})(typeof window !== 'undefined' ? window : this);
