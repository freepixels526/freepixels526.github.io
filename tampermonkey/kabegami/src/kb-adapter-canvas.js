(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  if (typeof KB.createCanvasAdapterBase !== 'function') {
    throw new Error('kb-adapter-canvas-base.js must be loaded before kb-adapter-canvas.js');
  }

  const ADAPTER_ID = 'canvas-overlay-front';
  const LAYER_ID = 'kabegami-layer-canvas-front';

  KB.registerModeAdapter(ADAPTER_ID, () => KB.createCanvasAdapterBase({
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
