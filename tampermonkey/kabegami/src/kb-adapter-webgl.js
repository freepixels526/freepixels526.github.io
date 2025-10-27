(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  if (typeof KB.createWebglAdapterBase !== 'function') {
    throw new Error('kb-adapter-webgl-base.js must be loaded before kb-adapter-webgl.js');
  }

  const ADAPTER_ID = 'webgl-overlay-front';
  const LAYER_ID = 'kabegami-layer-webgl-front';

  KB.registerModeAdapter(ADAPTER_ID, () => KB.createWebglAdapterBase({
    adapterId: ADAPTER_ID,
    layerId: LAYER_ID,
    layerOptions: {
      parent: () => (document.body || document.documentElement),
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      style: {
        overflow: 'visible',
        zIndex: '2147482800',
      },
    },
    resolveZIndex(state) {
      if (state && state.eff && state.eff.zIndex != null) return state.eff.zIndex;
      return 2147482800;
    },
    supportsScrollAttach: false,
  }));

})(typeof window !== 'undefined' ? window : this);
