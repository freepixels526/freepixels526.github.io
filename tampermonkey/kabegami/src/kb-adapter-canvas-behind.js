(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  if (typeof KB.createCanvasAdapterBase !== 'function') {
    throw new Error('kb-adapter-canvas-base.js must be loaded before kb-adapter-canvas-behind.js');
  }

  const ADAPTER_ID = 'canvas-overlay-behind';
  const LAYER_ID = 'kabegami-layer-canvas-behind';

  const clampBehindZIndex = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.min(value, -1);
    }
    return -2147483000;
  };

  KB.registerModeAdapter(ADAPTER_ID, () => KB.createCanvasAdapterBase({
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
        zIndex: String(-2147483000),
        transform: 'translate(0px, 0px)',
      },
    },
    resolveZIndex(state) {
      return clampBehindZIndex(state && state.eff ? state.eff.zIndex : undefined);
    },
    supportsScrollAttach: true,
  }));

})(typeof window !== 'undefined' ? window : this);
