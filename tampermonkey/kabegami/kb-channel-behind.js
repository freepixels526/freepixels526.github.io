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
  const BODY_LAYER_ID = 'kabegami-layer-behind-body';
  const BEFORE_LAYER_ID = 'kabegami-layer-behind-before';

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

  const scrollLayers = new Set();
  let scrollHandlersAttached = false;

  function syncScrollOffsets() {
    const offsetX = window.pageXOffset || 0;
    const offsetY = window.pageYOffset || 0;
    scrollLayers.forEach((container) => {
      if (!container) return;
      container.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;
    });
  }

  function ensureScrollListeners() {
    if (scrollHandlersAttached) return;
    scrollHandlersAttached = true;
    window.addEventListener('scroll', syncScrollOffsets, { passive: true });
    window.addEventListener('resize', syncScrollOffsets);
  }

  function maybeDetachScrollListeners() {
    if (!scrollHandlersAttached || scrollLayers.size) return;
    scrollHandlersAttached = false;
    window.removeEventListener('scroll', syncScrollOffsets);
    window.removeEventListener('resize', syncScrollOffsets);
  }

  function attachScroll(container) {
    scrollLayers.add(container);
    ensureScrollListeners();
    syncScrollOffsets();
  }

  function detachScroll(container) {
    if (!container) return;
    scrollLayers.delete(container);
    container.style.transform = 'translate(0px, 0px)';
    maybeDetachScrollListeners();
  }

  let bodyLayerEnabled = false;

  function setBodyLayerState(enabled, ensureAddStyle) {
    if (enabled === bodyLayerEnabled) return;
    bodyLayerEnabled = enabled;
    if (enabled) {
      if (typeof ensureAddStyle === 'function') {
        ensureAddStyle('html.kabegami-body-layer-active, body.kabegami-body-layer-active { background: transparent !important; }');
      }
      document.documentElement.classList.add('kabegami-body-layer-active');
      document.body.classList.add('kabegami-body-layer-active');
    } else {
      document.documentElement.classList.remove('kabegami-body-layer-active');
      document.body.classList.remove('kabegami-body-layer-active');
    }
  }

  KB.createBehindChannel = KB.createBehindChannel || function createBehindChannel({ ensureAddStyle }) {
    const logger = (typeof KB.getLogger === 'function') ? KB.getLogger('channel:behind') : null;
    const trace = (...args) => {
      if (logger && logger.trace) logger.trace(...args);
      else console.debug('[channel:behind]', ...args);
    };
    if (logger && logger.info) logger.info('channel initialised');

    function applyState(state, options = {}) {
        const transformOnly = !!options.transformOnly;
        const mode = state.mode === 2 ? 2 : 1;
        const layerId = mode === 1 ? BODY_LAYER_ID : BEFORE_LAYER_ID;
        const container = ensureLayerContainer(layerId, {
          parent: () => {
            if (mode === 1) return (document.body || document.documentElement);
            return (document.documentElement || document.body || document.documentElement);
          },
          before: mode === 2 ? (() => {
            const body = document.body;
            return body && body.parentNode ? body : null;
          }) : undefined,
          prepend: mode === 2,
          position: 'fixed',
          inset: '0',
          pointerEvents: 'none',
          style: {
            width: '100vw',
            height: '100vh',
            overflow: 'visible',
          },
        });

        if (!options.__fromReady) {
          container.__kbLastState = state;
          container.__kbLastOptions = Object.assign({}, options);
        }

        const visible = state.eff.visibility !== 'hidden';
        container.style.display = visible ? 'block' : 'none';

        const attach = (state.eff.attach || 'fixed').toLowerCase();
        if (attach === 'scroll') {
          attachScroll(container);
        } else {
          detachScroll(container);
        }

        if (mode === 1) {
          setBodyLayerState(visible, ensureAddStyle);
          container.style.zIndex = String(state.eff.zIndex != null ? state.eff.zIndex : -2147483000);
        } else {
          container.style.zIndex = String(state.eff.zIndex != null ? state.eff.zIndex : -1);
        }

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

        if (!transformOnly) {
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
        const bodyContainer = document.getElementById(BODY_LAYER_ID);
        const beforeContainer = document.getElementById(BEFORE_LAYER_ID);
        if (bodyContainer) {
          detachScroll(bodyContainer);
          disposeLayerContainer(BODY_LAYER_ID);
        }
        if (beforeContainer) {
          detachScroll(beforeContainer);
          disposeLayerContainer(BEFORE_LAYER_ID);
        }
        setBodyLayerState(false);
      }
    };
  };

})(typeof window !== 'undefined' ? window : this);
