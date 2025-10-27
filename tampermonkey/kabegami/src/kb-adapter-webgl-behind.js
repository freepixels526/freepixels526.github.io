(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  if (typeof KB.createWebglAdapterBase !== 'function') {
    throw new Error('kb-adapter-webgl-base.js must be loaded before kb-adapter-webgl-behind.js');
  }

  const ADAPTER_ID = 'webgl-overlay-behind';
  const LAYER_ID = 'kabegami-layer-webgl-behind';

  const clampBehindZIndex = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.min(value, -1);
    }
    return -2147483200;
  };

  KB.registerModeAdapter(ADAPTER_ID, () => KB.createWebglAdapterBase({
    adapterId: ADAPTER_ID,
    layerId: LAYER_ID,
    layerOptions: {
      parent: () => (document.body || document.documentElement),
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      style: {
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        zIndex: String(-2147483200),
        transform: 'translate(0px, 0px)',
      },
    },
    resolveZIndex(state) {
      return clampBehindZIndex(state && state.eff ? state.eff.zIndex : undefined);
    },
    supportsScrollAttach: true,
  }));

})(typeof window !== 'undefined' ? window : this);
