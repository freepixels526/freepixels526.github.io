(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  const BASE_DEFAULTS = Object.freeze({
    preset: 'none',
    scanlines: false,
    grain: false,
    vignette: false,
    lightLeak: false,
    colorDrift: false,
    cursorGlow: false,
    pixelate: false,
    cursorBloom: false,
    spectralWarp: false,
  });

  const PRESETS = Object.freeze([
    Object.freeze({
      id: 'none',
      label: 'Original',
      genre: 'Baseline',
      description: 'Render the source without any canvas-side post processing.',
      profile: {
        baseFilter: 'none',
        passes: {},
      },
      defaults: {},
    }),
    Object.freeze({
      id: 'softGlow',
      label: 'Soft Glow',
      genre: 'High-Value',
      description: 'Dreamy bloom with a gentle vignette to anchor the subject.',
      profile: {
        baseFilter: 'blur(4px) brightness(1.08) saturate(1.1)',
        passes: { softGlow: true },
      },
      defaults: { vignette: true },
    }),
    Object.freeze({
      id: 'noirEtch',
      label: 'Noir Etch',
      genre: 'Real-Time Filters',
      description: 'Monochrome look with boosted edges and film grain.',
      profile: {
        baseFilter: 'grayscale(100%) contrast(1.38) brightness(0.88)',
        passes: { edgeGlow: true },
      },
      defaults: { vignette: true, grain: true },
    }),
    Object.freeze({
      id: 'neonPulse',
      label: 'Neon Pulse',
      genre: 'Hybrid Overlays',
      description: 'Chromatic fringes, animated light leaks, and subtle grain.',
      profile: {
        baseFilter: 'saturate(1.35) contrast(1.08)',
        passes: { chromaticAberration: true, lightLeakPulse: true },
      },
      defaults: { lightLeak: true, grain: true },
    }),
    Object.freeze({
      id: 'auroraDrift',
      label: 'Aurora Drift',
      genre: 'Dynamic Wash',
      description: 'Slowly shifting colour waves for atmospheric scenes.',
      profile: {
        baseFilter: 'saturate(1.22) contrast(1.04) brightness(1.02)',
        passes: { baseColorDrift: true },
      },
      defaults: { colorDrift: true },
    }),
    Object.freeze({
      id: 'cursorHalo',
      label: 'Cursor Halo',
      genre: 'Interactive',
      description: 'Interactive halo that reacts to cursor movement.',
      profile: {
        baseFilter: 'saturate(1.18) contrast(1.05)',
        passes: { },
      },
      defaults: { cursorGlow: true, vignette: true },
    }),
    // Legacy aliases preserved for backwards compatibility.
    Object.freeze({
      id: 'noir',
      aliasOf: 'noirEtch',
      hidden: true,
      profile: null,
      defaults: null,
    }),
    Object.freeze({
      id: 'vibrant',
      aliasOf: 'neonPulse',
      hidden: true,
      profile: null,
      defaults: null,
    }),
  ]);

  const PRESET_MAP = PRESETS.reduce((acc, preset) => {
    acc[preset.id] = preset;
    return acc;
  }, {});

  for (const preset of PRESETS) {
    if (preset && preset.aliasOf && PRESET_MAP[preset.aliasOf]) {
      PRESET_MAP[preset.id] = PRESET_MAP[preset.aliasOf];
    }
  }

  function defaultsForPreset(presetId) {
    const preset = PRESET_MAP[presetId];
    if (!preset) return Object.assign({}, BASE_DEFAULTS, { preset: 'none' });
    const defaults = Object.assign({}, BASE_DEFAULTS, preset.defaults || {});
    defaults.preset = presetId;
    return defaults;
  }

  KB.canvasEffectDefaults = BASE_DEFAULTS;
  KB.canvasEffectPresets = PRESETS;
  KB.canvasEffectPresetMap = PRESET_MAP;
  KB.getCanvasEffectDefaultsForPreset = function getCanvasEffectDefaultsForPreset(presetId) {
    return defaultsForPreset(presetId);
  };

})(typeof window !== 'undefined' ? window : this);
