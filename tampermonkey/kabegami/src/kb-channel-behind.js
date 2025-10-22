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
    cssUrl,
  } = utils;

  const ADAPTER_BEHAVIORS = {
    'css-body-background': { type: 'css', layer: 'body', zIndex: -2147483000 },
    'css-body-pseudo': { type: 'css', layer: 'pseudo', zIndex: -1 },
    'css-root-background': { type: 'css', layer: 'root', zIndex: -2147483000 },
    'css-body-pseudo-behind': { type: 'css', layer: 'pseudo-behind', zIndex: -2147483000 },
    'overlay-behind': { type: 'overlay', layer: 'behind', zIndex: -2147483000 },
  };
  const MIN_BEHIND_Z = -2147483000;
  const clampBehindZIndex = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.min(value, -1);
    }
    return MIN_BEHIND_Z;
  };

  const CSS_LAYER_ID = 'kabegami-layer-css';
  const BACK_LAYER_ID = 'kabegami-overlay-behind';

  function ensureCssStyle(id) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      (document.head || document.documentElement || document.body).appendChild(el);
    }
    return el;
  }

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

  function setBodyLayerState(enabled, ensureAddStyle) {
    const className = 'kabegami-body-layer-active';
    const html = document.documentElement;
    const body = document.body;

    const apply = (target, flag) => {
      if (!target) return;
      if (flag) target.classList.add(className);
      else target.classList.remove(className);
    };

    apply(html, enabled);
    if (body) apply(body, enabled);

    if (enabled && typeof ensureAddStyle === 'function') {
      ensureAddStyle('html.kabegami-body-layer-active, body.kabegami-body-layer-active { background: transparent !important; }');
    }
  }

  KB.createBehindChannel = KB.createBehindChannel || function createBehindChannel({ ensureAddStyle }) {
    const logger = (typeof KB.getLogger === 'function') ? KB.getLogger('channel:behind') : null;
    const trace = (...args) => {
      if (logger && logger.trace) logger.trace(...args);
      else console.debug('[channel:behind]', ...args);
    };
    if (logger && logger.info) logger.info('channel initialised');

    const scrollLayers = new Set();
    let scrollHandlersAttached = false;

    const attachScroll = (container) => {
      scrollLayers.add(container);
      ensureScrollListeners();
      syncScrollOffsets();
    };

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

    const detachScroll = (container) => {
      if (!container) return;
      scrollLayers.delete(container);
      container.style.transform = 'translate(0px, 0px)';
      maybeDetachScrollListeners();
    };

    function applyCssLayer(state) {
      const config = ADAPTER_BEHAVIORS[state.adapterId] || { type: 'css', layer: 'body' };
      const layer = config.layer;
      const css = [];

      const url = state.resolvedUrl || state.sourceUrl || '';
      const image = url ? `url("${cssUrl ? cssUrl(url) : url}")` : 'none';
      const size = state.eff.size || 'cover';
      const position = state.eff.position || 'center center';
      const repeat = 'no-repeat';
      const attach = (state.eff.attach || 'fixed').toLowerCase();
      const opacity = state.eff.opacity != null ? state.eff.opacity : 1;
      const blend = state.eff.blend || 'normal';
      const filter = state.eff.filter || 'none';
      const visibility = state.eff.visibility === 'hidden';
      const hiddenRule = visibility || opacity === 0;

      const baseRule = {
        body: `body { background-image: ${hiddenRule ? 'none' : image} !important; background-size: ${size} !important; background-position: ${position} !important; background-repeat: ${repeat} !important; background-attachment: ${attach} !important; background-color: transparent !important; }`,
        root: `html, body { background-image: ${hiddenRule ? 'none' : image} !important; background-size: ${size} !important; background-position: ${position} !important; background-repeat: ${repeat} !important; background-attachment: ${attach} !important; background-color: transparent !important; }`,
        pseudo: `html::before { content:""; position:${attach === 'scroll' ? 'absolute' : 'fixed'}; inset:0; pointer-events:none; display:${hiddenRule ? 'none' : 'block'}; z-index:${config.zIndex ?? -1}; background-image:${image}; background-size:${size}; background-position:${position}; background-repeat:${repeat}; background-attachment:${attach}; opacity:${opacity}; mix-blend-mode:${blend}; filter:${filter}; transform:${state.eff.transform || 'none'}; transform-origin:${state.style.transformOrigin || 'center center'}; }`,
        'pseudo-behind': `html::before { content:""; position:${attach === 'scroll' ? 'absolute' : 'fixed'}; inset:0; pointer-events:none; display:${hiddenRule ? 'none' : 'block'}; z-index:${config.zIndex ?? -2147483000}; background-image:${image}; background-size:${size}; background-position:${position}; background-repeat:${repeat}; background-attachment:${attach}; opacity:${opacity}; mix-blend-mode:${blend}; filter:${filter}; transform:${state.eff.transform || 'none'}; transform-origin:${state.style.transformOrigin || 'center center'}; }`,
      };

      if (layer === 'body' || layer === 'root') {
        css.push(baseRule[layer] || baseRule.body);
      } else {
        css.push(baseRule[layer] || baseRule.pseudo);
      }

      ensureCssStyle(CSS_LAYER_ID).textContent = css.join('\n');
      setBodyLayerState(!hiddenRule && (layer === 'body' || layer === 'root'), ensureAddStyle);
    }

    function clearCssLayer() {
      const styleEl = document.getElementById(CSS_LAYER_ID);
      if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      setBodyLayerState(false);
    }

    function applyOverlay(state, options = {}) {
      const transformOnly = !!options.transformOnly;
      const container = ensureLayerContainer(BACK_LAYER_ID, {
        parent: () => (document.body || document.documentElement),
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
      container.style.zIndex = String(clampBehindZIndex(state.eff.zIndex));

      const attach = (state.eff.attach || 'fixed').toLowerCase();
      if (attach === 'scroll') attachScroll(container);
      else detachScroll(container);

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
          applyOverlay(snap, Object.assign({}, container.__kbLastOptions || {}, { transformOnly: true, __fromReady: true }));
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
          setVideoSource(mediaEl, state.resolvedUrl, state.sourceUrl);
        } else if (mediaEl.dataset.src !== state.resolvedUrl) {
          mediaEl.dataset.src = state.resolvedUrl || '';
          mediaEl.src = state.resolvedUrl || '';
        }
      }
    }

    function teardownOverlay() {
      const container = document.getElementById(BACK_LAYER_ID);
      if (container) {
        detachScroll(container);
        disposeLayerContainer(BACK_LAYER_ID);
      }
    }

    function applyState(state, options = {}) {
      const behavior = ADAPTER_BEHAVIORS[state.adapterId] || { type: 'overlay' };
      trace('apply behind state', state.adapterId, behavior);

      if (behavior.type === 'css') {
        applyCssLayer(state);
        teardownOverlay();
        return;
      }

      applyOverlay(state, options);
      clearCssLayer();
    }

    return {
      apply: applyState,
      clear() {
        clearCssLayer();
        teardownOverlay();
        setBodyLayerState(false);
      },
    };
  };

})(typeof window !== 'undefined' ? window : this);
