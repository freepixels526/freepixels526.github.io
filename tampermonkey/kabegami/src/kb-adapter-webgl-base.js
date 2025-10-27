(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  const utils = KB.renderUtils;
  if (!utils) {
    throw new Error('KB.renderUtils must be loaded before kb-adapter-webgl-base.js');
  }

  const {
    clamp,
    buildTransformString,
    ensureLayerContainer,
    disposeLayerContainer,
    getViewportSize,
    normalizeObjectPosition,
    computeBaseScale,
    getDevicePixelRatio,
    isVideoMedia,
    ensureVideoDefaults,
    setVideoSource,
    disposeVideo,
    getMediaNaturalSize,
  } = utils;

  function detectWebglSupport() {
    if (typeof document === 'undefined') return false;
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      return !!gl;
    } catch (_) {
      return false;
    }
  }

  const HAS_WEBGL_SUPPORT = detectWebglSupport();

  const VERTEX_SRC = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  const FRAGMENT_SRC = `
    precision highp float;

    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform vec2 u_texelSize;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_visibility;
    uniform float u_opacity;
    uniform vec4 u_colorAdjustA;
    uniform vec4 u_colorAdjustB;
    uniform vec4 u_effectsPrimary;
    uniform vec4 u_effectsSecondary;
    uniform vec4 u_effectsTertiary;
    uniform vec4 u_effectsQuaternary;
    uniform vec2 u_cursor;
    uniform float u_cursorStrength;
    uniform float u_noiseSeed;

    float rand(vec2 co) {
      float t = dot(co, vec2(12.9898, 78.233));
      return fract(sin(t + u_noiseSeed) * 43758.5453);
    }

    vec3 applyColorAdjust(vec3 color, vec4 adjA, vec4 adjB) {
      float brightness = adjA.x;
      float contrast = adjA.y;
      float saturation = adjA.z;
      float grayscale = adjA.w;
      float sepia = adjB.x;
      float invertAmount = adjB.y;
      float hueShift = adjB.z;

      color *= brightness;

      color = (color - 0.5) * contrast + 0.5;

      float luma = dot(color, vec3(0.299, 0.587, 0.114));
      vec3 grayColor = vec3(luma);
      color = mix(color, grayColor, grayscale);

      vec3 intensity = vec3(dot(color, vec3(0.393, 0.769, 0.189)),
                            dot(color, vec3(0.349, 0.686, 0.168)),
                            dot(color, vec3(0.272, 0.534, 0.131)));
      color = mix(color, intensity, sepia);

      vec3 mid = vec3(0.5);
      color = mix(color, vec3(1.0) - color, invertAmount);

      float angle = hueShift;
      float s = sin(angle);
      float c = cos(angle);
      mat3 hue = mat3(
        0.299 + 0.701 * c + 0.168 * s, 0.587 - 0.587 * c + 0.330 * s, 0.114 - 0.114 * c - 0.497 * s,
        0.299 - 0.299 * c - 0.328 * s, 0.587 + 0.413 * c + 0.035 * s, 0.114 - 0.114 * c + 0.292 * s,
        0.299 - 0.300 * c + 1.250 * s, 0.587 - 0.588 * c - 1.050 * s, 0.114 + 0.886 * c - 0.203 * s
      );
      color = hue * color;

      vec3 saturationVec = mix(vec3(luma), color, saturation);
      color = mix(color, saturationVec, clamp(abs(saturation - 1.0), 0.0, 1.0));
      color = clamp(color, 0.0, 1.0);
      return color;
    }

    vec3 sampleBlur(vec2 uv, vec2 texel) {
      vec3 acc = vec3(0.0);
      acc += texture2D(u_image, uv + texel * vec2(-1.0, -1.0)).rgb * 0.0625;
      acc += texture2D(u_image, uv + texel * vec2( 0.0, -1.0)).rgb * 0.125;
      acc += texture2D(u_image, uv + texel * vec2( 1.0, -1.0)).rgb * 0.0625;
      acc += texture2D(u_image, uv + texel * vec2(-1.0,  0.0)).rgb * 0.125;
      acc += texture2D(u_image, uv).rgb * 0.25;
      acc += texture2D(u_image, uv + texel * vec2( 1.0,  0.0)).rgb * 0.125;
      acc += texture2D(u_image, uv + texel * vec2(-1.0,  1.0)).rgb * 0.0625;
      acc += texture2D(u_image, uv + texel * vec2( 0.0,  1.0)).rgb * 0.125;
      acc += texture2D(u_image, uv + texel * vec2( 1.0,  1.0)).rgb * 0.0625;
      return acc;
    }

    float edgeMagnitude(vec2 uv, vec2 texel) {
      float tl = texture2D(u_image, uv + texel * vec2(-1.0, -1.0)).r;
      float t  = texture2D(u_image, uv + texel * vec2( 0.0, -1.0)).r;
      float tr = texture2D(u_image, uv + texel * vec2( 1.0, -1.0)).r;
      float l  = texture2D(u_image, uv + texel * vec2(-1.0,  0.0)).r;
      float r  = texture2D(u_image, uv + texel * vec2( 1.0,  0.0)).r;
      float bl = texture2D(u_image, uv + texel * vec2(-1.0,  1.0)).r;
      float b  = texture2D(u_image, uv + texel * vec2( 0.0,  1.0)).r;
      float br = texture2D(u_image, uv + texel * vec2( 1.0,  1.0)).r;
      float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
      float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
      return sqrt(gx * gx + gy * gy);
    }

    vec3 applyChromatic(vec2 uv, vec2 texel, float strength, float time) {
      if (strength <= 0.0) return texture2D(u_image, uv).rgb;
      float angle = time * 0.15;
      vec2 dir = vec2(cos(angle), sin(angle));
      vec2 offset = dir * texel * (1.5 + sin(time * 0.08));
      float r = texture2D(u_image, uv + offset * strength).r;
      float g = texture2D(u_image, uv).g;
      float b = texture2D(u_image, uv - offset * strength).b;
      return vec3(r, g, b);
    }

    vec3 applyLightLeak(vec3 color, vec2 uv, float strength, float time, float pulseMode) {
      if (strength <= 0.0) return color;
      float basePulse = 0.5 + 0.5 * sin(time * 0.8);
      float dynamicPulse = 0.35 + 0.65 * sin(time * 1.2 + uv.y * 6.0);
      float blend = clamp(pulseMode, 0.0, 1.0);
      float pulse = mix(basePulse, dynamicPulse, blend);
      float gradient = smoothstep(0.0, 1.0, uv.x) * (0.8 + 0.2 * sin(time * 0.6 + uv.y * 3.0));
      vec3 leakColor = vec3(1.0, 0.6, 0.35) * gradient;
      return color + leakColor * strength * 0.35 * pulse;
    }

    vec3 applyColorDrift(vec3 color, vec2 uv, float strength, float time) {
      if (strength <= 0.0) return color;
      float drift = sin(time * 0.4 + uv.y * 6.2831) * 0.5 + 0.5;
      vec3 palette = vec3(
        0.6 + 0.4 * sin(time * 0.35 + uv.y * 4.0),
        0.5 + 0.5 * sin(time * 0.4 + uv.x * 3.6 + 1.5),
        0.45 + 0.55 * sin(time * 0.33 + uv.y * 5.2 + 3.0)
      );
      return mix(color, color * palette, strength * 0.35 * drift);
    }

    vec3 applyVignette(vec3 color, vec2 uv, float strength) {
      if (strength <= 0.0) return color;
      vec2 centered = uv - 0.5;
      float dist = dot(centered, centered);
      float vignette = smoothstep(0.85, 0.2, dist);
      return mix(color, color * vignette, strength * 0.72);
    }

    vec3 applyCursorGlow(vec3 color, vec2 uv, vec2 cursor, float strength) {
      if (strength <= 0.0) return color;
      vec2 delta = uv - cursor;
      float dist = length(delta);
      float glow = exp(-dist * 12.0) * strength;
      vec3 glowColor = vec3(0.45, 0.65, 1.0);
      return color + glowColor * glow * 0.6;
    }

    vec2 warpUv(vec2 uv, float time, float strength) {
      if (strength <= 0.0) return uv;
      float waveA = sin((uv.y + time * 0.05) * 8.0);
      float waveB = sin((uv.x - time * 0.08) * 10.0);
      float waveC = sin((uv.x + uv.y + time * 0.12) * 6.0);
      vec2 offset = vec2(waveA - waveC * 0.6, waveB + waveC * 0.6) * 0.012 * strength;
      return clamp(uv + offset, vec2(0.0), vec2(1.0));
    }

    vec3 applyAurora(vec3 color, vec2 uv, float time, float strength) {
      if (strength <= 0.0) return color;
      float sweep = sin(time * 0.45 + uv.x * 5.6 + uv.y * 3.2) * 0.5 + 0.5;
      float curtain = smoothstep(0.15, 0.85, sin(uv.y * 9.0 + time * 0.7) * 0.5 + 0.5);
      vec3 aurora = mix(vec3(0.1, 0.45, 0.9), vec3(0.8, 0.3, 0.9), sweep);
      float alpha = clamp((sweep * 0.6 + curtain * 0.4) * 0.45 * strength, 0.0, 0.55);
      return mix(color, color + aurora * alpha, strength);
    }

    vec3 applyPixelation(vec2 uv, float strength) {
      if (strength <= 0.0) return texture2D(u_image, uv).rgb;
      float block = mix(1.0, 8.0, clamp(strength, 0.0, 1.0));
      vec2 grid = max(vec2(1.0), u_resolution / (block * 6.0));
      vec2 snapped = floor(uv * grid) / grid;
      vec2 sampleUv = snapped + (0.5 / grid);
      return texture2D(u_image, clamp(sampleUv, vec2(0.0), vec2(1.0))).rgb;
    }

    vec3 applyCursorBloom(vec3 color, vec3 blurredColor, vec2 uv, vec2 cursor, float cursorStrength, float toggle) {
      if (toggle <= 0.0) return color;
      float dist = length(uv - cursor);
      float falloff = exp(-dist * 9.0);
      float intensity = clamp(cursorStrength * falloff * 1.35 * toggle, 0.0, 1.0);
      return mix(color, blurredColor, intensity);
    }

    void main() {
      vec2 texel = u_texelSize;
      vec2 warpedUv = warpUv(v_texCoord, u_time, u_effectsQuaternary.z);
      vec3 baseColor = texture2D(u_image, warpedUv).rgb;
      if (u_effectsQuaternary.x > 0.0) {
        baseColor = applyPixelation(warpedUv, u_effectsQuaternary.x);
      }
      vec3 blurred = sampleBlur(warpedUv, texel);
      vec3 strongBlur = sampleBlur(warpedUv, texel * 2.5);
      float softGlow = u_effectsPrimary.x;
      float edgeGlow = u_effectsPrimary.y;
      float chromatic = u_effectsPrimary.z;

      vec3 color = mix(baseColor, blurred, softGlow * 0.45);
      if (edgeGlow > 0.0) {
        float edge = edgeMagnitude(warpedUv, texel);
        color += vec3(edge) * 0.65 * edgeGlow;
      }

      color = mix(color, applyChromatic(warpedUv, texel, chromatic, u_time), chromatic * 0.6);

      color = applyColorAdjust(color, u_colorAdjustA, u_colorAdjustB);

      color = applyLightLeak(color, warpedUv, u_effectsSecondary.w, u_time, u_effectsSecondary.z);
      color = applyColorDrift(color, warpedUv, u_effectsSecondary.x, u_time);
      color = applyVignette(color, warpedUv, u_effectsSecondary.y);
      color = applyCursorGlow(color, warpedUv, u_cursor, u_cursorStrength * u_effectsTertiary.y);
      color = applyCursorBloom(color, strongBlur, warpedUv, u_cursor, u_cursorStrength, u_effectsQuaternary.y);
      color = applyAurora(color, warpedUv, u_time, u_effectsQuaternary.z);

      if (u_effectsTertiary.x > 0.0) {
        float noise = rand(warpedUv * u_resolution + u_time * 60.0);
        color += (noise - 0.5) * 0.18 * u_effectsTertiary.x;
      }

      if (u_effectsTertiary.z > 0.0) {
        float line = sin(warpedUv.y * u_resolution.y * 3.14159265);
        color *= 1.0 - 0.12 * (0.5 + 0.5 * line) * u_effectsTertiary.z;
      }

      color = clamp(color, 0.0, 1.0);
      float visibility = clamp(u_visibility, 0.0, 1.0);
      float opacity = clamp(u_opacity, 0.0, 1.0);
      gl_FragColor = vec4(color, visibility * opacity);
    }
  `;

  function parseFilterString(filter) {
    const defaults = {
      brightness: 1,
      contrast: 1,
      saturate: 1,
      grayscale: 0,
      sepia: 0,
      invert: 0,
      hue: 0,
      blur: 0,
    };
    if (!filter || typeof filter !== 'string' || filter === 'none') {
      return defaults;
    }
    const re = /([a-z-]+)\(([^)]+)\)/gi;
    let match = re.exec(filter);
    const parsed = Object.assign({}, defaults);
    while (match) {
      const key = match[1].toLowerCase();
      const raw = match[2].trim();
      const val = raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw);
      if (key === 'brightness' && Number.isFinite(val)) parsed.brightness = val;
      else if (key === 'contrast' && Number.isFinite(val)) parsed.contrast = val;
      else if (key === 'saturate' && Number.isFinite(val)) parsed.saturate = val;
      else if (key === 'grayscale' && Number.isFinite(val)) parsed.grayscale = clamp(val, 0, 1);
      else if (key === 'sepia' && Number.isFinite(val)) parsed.sepia = clamp(val, 0, 1);
      else if (key === 'invert' && Number.isFinite(val)) parsed.invert = clamp(val, 0, 1);
      else if (key === 'hue-rotate') {
        const deg = raw.endsWith('deg') ? parseFloat(raw) : (Number.isFinite(val) ? val : 0);
        parsed.hue = Number.isFinite(deg) ? deg * (Math.PI / 180) : parsed.hue;
      } else if (key === 'blur' && Number.isFinite(val)) {
        parsed.blur = Math.max(parsed.blur, val);
      }
      match = re.exec(filter);
    }
    return parsed;
  }

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`WebGL shader compile failed: ${info}`);
    }
    return shader;
  }

  function createProgram(gl, vertexSource, fragmentSource) {
    const program = gl.createProgram();
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error(`WebGL program link failed: ${info}`);
    }
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return program;
  }

  function computeCursorData(canvas, pointerState) {
    if (!canvas || !pointerState || !pointerState.active) {
      return { pos: [0.5, 0.5], strength: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return { pos: [0.5, 0.5], strength: 0 };
    const relX = (pointerState.clientX - rect.left) / rect.width;
    const relYRaw = (pointerState.clientY - rect.top) / rect.height;
    const relY = 1 - relYRaw;
    if (relX <= 0 || relX >= 1 || relYRaw <= 0 || relYRaw >= 1) {
      return { pos: [relX, relY], strength: 0 };
    }
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const age = Math.max(0, Math.min(1, (now - pointerState.movedAt) / 1200));
    return {
      pos: [relX, relY],
      strength: Math.max(0, 1 - age),
    };
  }

  KB.createWebglAdapterBase = function createWebglAdapterBase(userConfig = {}) {
    const {
      adapterId = 'webgl-overlay',
      layerId,
      layerOptions = {},
      resolveZIndex = (state) => (state && state.eff && state.eff.zIndex != null ? state.eff.zIndex : 2147482000),
      supportsScrollAttach = false,
    } = userConfig;

    if (!layerId) {
      throw new Error(`createWebglAdapterBase requires a layerId (adapter: ${adapterId})`);
    }

    if (!HAS_WEBGL_SUPPORT && typeof KB.createCanvasAdapterBase === 'function') {
      const fallbackOptions = Object.assign({}, userConfig, { adapterId: `${adapterId}:fallback` });
      return KB.createCanvasAdapterBase(fallbackOptions);
    }

    const logger = (typeof KB.getLogger === 'function') ? KB.getLogger(`adapter:${adapterId}`) : null;
    const trace = (...args) => {
      if (logger && logger.trace) logger.trace(...args);
    };
    const warn = (...args) => {
      if (logger && logger.warn) logger.warn(...args);
      else if (console && console.warn) console.warn(`[adapter:${adapterId}]`, ...args);
    };

    let container = null;
    let surface = null;
    let glState = null;
    let currentState = null;
    let currentSource = null;
    let currentNatural = null;
    let loadToken = 0;
    let videoEl = null;
    let videoHandlers = [];
    let rafId = null;
    let isEffectivelyVisible = true;
    let scrollAttached = false;
    let manualRenderQueued = false;
    let currentEffects = null;
    let currentPresetEntry = null;
    let pointerListenerActive = false;
    let pointerState = { active: false, clientX: 0, clientY: 0, movedAt: 0 };
    let textureInfo = { sourceId: null, isVideo: false };
    const noiseSeed = Math.random() * 1000;
    let fallbackAdapter = null;

    const HAVE_CURRENT_DATA = 2;

    const FALLBACK_PRESETS = [
      {
        id: 'none',
        profile: { baseFilter: 'none', passes: {} },
        defaults: {},
      },
    ];

    const EFFECT_PRESETS = (Array.isArray(KB.canvasEffectPresets) && KB.canvasEffectPresets.length)
      ? KB.canvasEffectPresets
      : FALLBACK_PRESETS;

    const PRESET_MAP = KB.canvasEffectPresetMap || EFFECT_PRESETS.reduce((acc, preset) => {
      if (!preset || !preset.id) return acc;
      acc[preset.id] = preset;
      if (preset.aliasOf) {
        acc[preset.aliasOf] = acc[preset.aliasOf] || preset;
      }
      return acc;
    }, {});

    const BASE_EFFECT_DEFAULTS = Object.assign({
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
    }, KB.canvasEffectDefaults || {});

    function normalizeEffects(raw) {
      const base = Object.assign({}, BASE_EFFECT_DEFAULTS);
      const input = raw && typeof raw === 'object' ? raw : {};
      if (typeof input.preset === 'string' && input.preset.trim()) {
        if (PRESET_MAP[input.preset.trim()]) base.preset = input.preset.trim();
      }
      const keys = ['scanlines', 'grain', 'vignette', 'lightLeak', 'colorDrift', 'cursorGlow', 'pixelate', 'cursorBloom', 'spectralWarp'];
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(input, key)) base[key] = !!input[key];
      }
      const preset = PRESET_MAP[base.preset];
      if (preset && preset.defaults) {
        for (const [key, value] of Object.entries(preset.defaults)) {
          if (key === 'preset') continue;
          if (Object.prototype.hasOwnProperty.call(input, key)) continue;
          base[key] = value;
        }
      }
      return base;
    }

    function ensureHost() {
      if (fallbackAdapter) return false;
      if (!container || !container.isConnected) {
        container = ensureLayerContainer(layerId, Object.assign({}, layerOptions));
      }
      if (!surface || !surface.canvas || !surface.canvas.isConnected) {
        surface = createSurface(container);
        glState = null;
      }
      if (!glState) {
        try {
          glState = initGl(surface);
        } catch (err) {
          warn('WebGL initialisation failed, falling back to canvas adapter', err);
          disposeSurface();
          if (typeof KB.createCanvasAdapterBase === 'function') {
            fallbackAdapter = KB.createCanvasAdapterBase(Object.assign({}, userConfig, {
              adapterId: `${adapterId}:fallback`,
            }));
            return false;
          }
          throw err;
        }
      }
      return true;
    }

    function createSurface(parent) {
      const canvas = document.createElement('canvas');
      canvas.className = 'kabegami-webgl-surface';
      Object.assign(canvas.style, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 'auto',
        height: 'auto',
        maxWidth: 'none',
        maxHeight: 'none',
        transform: 'translate(-50%, -50%)',
        transformOrigin: 'center center',
        pointerEvents: 'none',
        imageRendering: 'auto',
        willChange: 'transform, opacity',
      });
      canvas.setAttribute('aria-hidden', 'true');
      parent.appendChild(canvas);
      const contextOptions = {
        alpha: true,
        antialias: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
      };
      let gl = null;
      try {
        gl = canvas.getContext('webgl2', contextOptions);
      } catch (_) {}
      if (!gl) {
        try {
          gl = canvas.getContext('webgl', contextOptions) || canvas.getContext('experimental-webgl', contextOptions);
        } catch (_) {}
      }
      if (!gl) {
        parent.removeChild(canvas);
        throw new Error('WebGL context not available');
      }
      return { canvas, gl, contextType: gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl', dpr: 1 };
    }

    function disposeSurface() {
      if (surface && surface.canvas && surface.canvas.parentNode) {
        surface.canvas.parentNode.removeChild(surface.canvas);
      }
      surface = null;
      glState = null;
    }

    function initGl(surfaceObj) {
      const gl = surfaceObj.gl;
      const program = createProgram(gl, VERTEX_SRC, FRAGMENT_SRC);

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      const positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      const texCoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      const texCoords = new Float32Array([
        0, 0,
        1, 0,
        0, 1,
        0, 1,
        1, 0,
        1, 1,
      ]);
      gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

      const vao = gl.createVertexArray ? gl.createVertexArray() : null;
      if (vao && gl.bindVertexArray) {
        gl.bindVertexArray(vao);
      }

      gl.useProgram(program);
      const attribPosition = gl.getAttribLocation(program, 'a_position');
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(attribPosition);
      gl.vertexAttribPointer(attribPosition, 2, gl.FLOAT, false, 0, 0);

      const attribTexCoord = gl.getAttribLocation(program, 'a_texCoord');
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.enableVertexAttribArray(attribTexCoord);
      gl.vertexAttribPointer(attribTexCoord, 2, gl.FLOAT, false, 0, 0);

      if (vao && gl.bindVertexArray) {
        gl.bindVertexArray(null);
      }

      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, null);

      const uniforms = {
        image: gl.getUniformLocation(program, 'u_image'),
        texelSize: gl.getUniformLocation(program, 'u_texelSize'),
        resolution: gl.getUniformLocation(program, 'u_resolution'),
        time: gl.getUniformLocation(program, 'u_time'),
        visibility: gl.getUniformLocation(program, 'u_visibility'),
        opacity: gl.getUniformLocation(program, 'u_opacity'),
        colorAdjustA: gl.getUniformLocation(program, 'u_colorAdjustA'),
        colorAdjustB: gl.getUniformLocation(program, 'u_colorAdjustB'),
        effectsPrimary: gl.getUniformLocation(program, 'u_effectsPrimary'),
        effectsSecondary: gl.getUniformLocation(program, 'u_effectsSecondary'),
        effectsTertiary: gl.getUniformLocation(program, 'u_effectsTertiary'),
        effectsQuaternary: gl.getUniformLocation(program, 'u_effectsQuaternary'),
        cursor: gl.getUniformLocation(program, 'u_cursor'),
        cursorStrength: gl.getUniformLocation(program, 'u_cursorStrength'),
        noiseSeed: gl.getUniformLocation(program, 'u_noiseSeed'),
      };

      gl.useProgram(program);
      gl.uniform1i(uniforms.image, 0);
      gl.uniform1f(uniforms.noiseSeed, noiseSeed);

      return {
        gl,
        program,
        vao,
        buffers: {
          position: positionBuffer,
          texCoord: texCoordBuffer,
        },
        uniforms,
        texture,
      };
    }

    function detachVideoHandlers() {
      if (!videoEl || !videoHandlers.length) return;
      for (const { type, handler, options } of videoHandlers) {
        videoEl.removeEventListener(type, handler, options);
      }
      videoHandlers = [];
    }

    function ensureVideoElement() {
      ensureHost();
      if (videoEl && videoEl.isConnected) return videoEl;
      if (videoEl && videoEl.parentNode) {
        videoEl.parentNode.removeChild(videoEl);
      }
      const video = document.createElement('video');
      video.className = 'kabegami-webgl-video-source';
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      if (typeof ensureVideoDefaults === 'function') ensureVideoDefaults(video);
      Object.assign(video.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '1px',
        height: '1px',
        opacity: '0',
        pointerEvents: 'none',
        transform: 'translate(-10000px, -10000px)',
      });
      container.appendChild(video);
      videoEl = video;
      return videoEl;
    }

    function handlePointerMove(event) {
      if (!event) return;
      pointerState = {
        active: true,
        clientX: event.clientX,
        clientY: event.clientY,
        movedAt: (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(),
      };
      scheduleManualRender();
    }

    function updateCursorTracking() {
      const shouldTrack = !!(currentEffects && (currentEffects.cursorGlow || currentEffects.cursorBloom));
      if (shouldTrack && !pointerListenerActive) {
        try {
          window.addEventListener('pointermove', handlePointerMove, { passive: true });
          pointerListenerActive = true;
        } catch (_) {}
      } else if (!shouldTrack && pointerListenerActive) {
        try {
          window.removeEventListener('pointermove', handlePointerMove);
        } catch (_) {}
        pointerListenerActive = false;
        pointerState = { active: false, clientX: 0, clientY: 0, movedAt: 0 };
      }
    }

    function updateEffectsFromState(state) {
      const rawEffects = state && state.style
        ? (state.style.webglEffects ?? state.style.canvasEffects)
        : null;
      const effects = normalizeEffects(rawEffects);
      currentEffects = effects;
      currentPresetEntry = PRESET_MAP[effects.preset] || PRESET_MAP.none || FALLBACK_PRESETS[0];
      updateCursorTracking();
    }

    function scheduleManualRender() {
      if (currentSource instanceof HTMLVideoElement && shouldRenderFrames()) return;
      if (manualRenderQueued) return;
      manualRenderQueued = true;
      requestAnimationFrame(() => {
        manualRenderQueued = false;
        renderFrame();
      });
    }

    function syncScrollOffsets() {
      if (!supportsScrollAttach) return;
      if (!container) return;
      const offsetX = window.pageXOffset || 0;
      const offsetY = window.pageYOffset || 0;
      container.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;
    }

    function ensureScrollListeners() {
      if (!supportsScrollAttach || scrollAttached) return;
      window.addEventListener('scroll', syncScrollOffsets, { passive: true });
      window.addEventListener('resize', syncScrollOffsets);
      scrollAttached = true;
      syncScrollOffsets();
    }

    function detachScrollListeners() {
      if (!supportsScrollAttach || !scrollAttached) return;
      scrollAttached = false;
      window.removeEventListener('scroll', syncScrollOffsets);
      window.removeEventListener('resize', syncScrollOffsets);
      if (container) container.style.transform = 'translate(0px, 0px)';
    }

    function handleScrollAttach(mode) {
      if (!supportsScrollAttach) return;
      const attachMode = (mode || '').toLowerCase();
      if (attachMode === 'scroll') ensureScrollListeners();
      else detachScrollListeners();
    }

    function updateVisibility(state) {
      if (!container || !surface || !surface.canvas) return;
      if (!state || !state.eff) return;
      const visible = state.eff.visibility !== 'hidden';
      const targetOpacity = clamp(state.eff.opacity != null ? state.eff.opacity : 1, 0, 1);
      container.style.display = visible ? 'block' : 'none';
      const zIndex = resolveZIndex(state);
      container.style.zIndex = String(zIndex);
      surface.canvas.style.visibility = visible ? 'visible' : 'hidden';
      surface.canvas.style.opacity = String(targetOpacity);
      surface.canvas.style.mixBlendMode = state.eff.blend || 'normal';
      surface.canvas.style.filter = state.eff.filter || 'none';
      isEffectivelyVisible = visible && targetOpacity > 0;
      if (!isEffectivelyVisible) cancelRenderLoop();
      else if (shouldRenderFrames()) scheduleRenderLoop();
      handleScrollAttach(state.eff.attach);
    }

    function computePlacement(state, natural, viewport) {
      const effectiveStyle = Object.assign({}, state.style);
      const baseScale = computeBaseScale(state.config.baseSize, natural, viewport);
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

      return effectiveStyle;
    }

    function updateTransform(state) {
      if (!surface || !surface.canvas) return;
      if (!state || !state.style || !state.config) return;
      const viewport = getViewportSize();
      const natural = currentNatural || getMediaNaturalSize(currentSource);
      const effectiveStyle = natural
        ? computePlacement(state, natural, viewport)
        : Object.assign({}, state.style);

      surface.canvas.style.transformOrigin = state.style.transformOrigin || 'center center';
      surface.canvas.style.transform = `translate(-50%, -50%) ${buildTransformString(effectiveStyle)}`;
    }

    function ensureSurfaceSize(width, height) {
      if (!surface || !surface.canvas || !surface.gl) return;
      const canvas = surface.canvas;
      const gl = surface.gl;
      const dpr = getDevicePixelRatio();
      const cssWidth = Math.max(1, Math.floor(width || 1));
      const cssHeight = Math.max(1, Math.floor(height || 1));
      const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
      const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      if (canvas.style.width !== `${cssWidth}px`) canvas.style.width = `${cssWidth}px`;
      if (canvas.style.height !== `${cssHeight}px`) canvas.style.height = `${cssHeight}px`;
      surface.dpr = dpr;
      gl.viewport(0, 0, pixelWidth, pixelHeight);
    }

    function uploadTexture(source) {
      if (!glState || !glState.gl || !glState.texture) return;
      const gl = glState.gl;
      gl.bindTexture(gl.TEXTURE_2D, glState.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      } catch (err) {
        warn('Failed to upload texture', err);
      }
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    function shouldRenderFrames() {
      if (!isEffectivelyVisible) return false;
      if (!videoEl || !(currentSource instanceof HTMLVideoElement)) return false;
      if (videoEl.readyState < HAVE_CURRENT_DATA) return false;
      if (videoEl.paused || videoEl.ended) return false;
      return true;
    }

    function cancelRenderLoop() {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function scheduleRenderLoop() {
      if (rafId != null) return;
      if (!shouldRenderFrames()) return;
      rafId = requestAnimationFrame(renderLoop);
    }

    function renderLoop() {
      rafId = null;
      if (!shouldRenderFrames()) {
        cancelRenderLoop();
        return;
      }
      renderFrame();
      scheduleRenderLoop();
    }

    function attachVideoHandlers(token, resolveState) {
      if (!videoEl) return;
      detachVideoHandlers();
      const resolver = typeof resolveState === 'function' ? resolveState : () => resolveState;
      const add = (type, handler, options) => {
        const wrapped = (event) => {
          if (token !== loadToken) return;
          handler(resolver(), event);
        };
        videoEl.addEventListener(type, wrapped, options);
        videoHandlers.push({ type, handler: wrapped, options });
      };
      add('loadedmetadata', (state) => {
        if (!state) return;
        currentNatural = getMediaNaturalSize(videoEl) || currentNatural;
        onSourceReady(state, videoEl);
      });
      add('play', () => {
        if (shouldRenderFrames()) scheduleRenderLoop();
      });
      add('playing', () => {
        if (shouldRenderFrames()) scheduleRenderLoop();
      });
      add('pause', () => {
        cancelRenderLoop();
        renderFrame();
      });
      add('ended', () => {
        cancelRenderLoop();
        renderFrame();
      });
      add('timeupdate', () => {
        if (!shouldRenderFrames()) renderFrame();
      });
      add('emptied', () => {
        cancelRenderLoop();
      });
      add('error', () => {
        cancelRenderLoop();
        warn('Video playback error in webgl adapter');
      });
    }

    function prepareSource(state) {
      if (!state) return;
      const token = ++loadToken;
      currentSource = null;
      currentNatural = null;
      textureInfo = { sourceId: null, isVideo: false };
      const mediaType = state.mediaType || state.config.mediaType;
      if (isVideoMedia(mediaType)) {
        const video = ensureVideoElement();
        if (!video) return;
        const resolver = () => currentState || state;
        attachVideoHandlers(token, resolver);
        currentSource = video;
        currentNatural = getMediaNaturalSize(video) || null;
        try {
          setVideoSource(video, state.resolvedUrl, state.sourceUrl);
        } catch (err) {
          warn('Failed to set video source', err);
        }
        if (shouldRenderFrames()) scheduleRenderLoop();
      } else {
        const src = state.resolvedUrl || state.sourceUrl;
        if (!src) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => {
          if (token !== loadToken) return;
          const active = currentState || state;
          if (!active) return;
          onSourceReady(active, img);
        };
        img.onerror = (err) => {
          if (token !== loadToken) return;
          warn('Failed to load image for webgl adapter', err);
        };
        img.src = src;
      }
    }

    function onSourceReady(state, source) {
      currentSource = source;
      currentNatural = getMediaNaturalSize(source);
      trace('webgl source ready', currentNatural);
      updateTransform(state);
      renderFrame(true);
      if (source instanceof HTMLVideoElement) {
        if (shouldRenderFrames()) scheduleRenderLoop();
      }
    }

    function renderFrame(forceUpload = false) {
      if (!surface || !glState || !glState.gl || !currentSource || !currentState) return;
      const natural = currentNatural || getMediaNaturalSize(currentSource);
      if (!natural || !natural.width || !natural.height) return;

      ensureSurfaceSize(natural.width, natural.height);
      const gl = glState.gl;
      if (!gl) return;

      const sourceId = currentSource instanceof HTMLVideoElement ? 'video' : (currentSource.src || currentState.resolvedUrl || currentState.sourceUrl);
      const needsUpload = forceUpload || textureInfo.sourceId !== sourceId || currentSource instanceof HTMLVideoElement;
      if (needsUpload) {
        gl.bindTexture(gl.TEXTURE_2D, glState.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, currentSource);
          textureInfo = { sourceId, isVideo: currentSource instanceof HTMLVideoElement };
        } catch (err) {
          warn('texImage2D failed', err);
        }
      }

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (glState.vao && gl.bindVertexArray) {
        gl.bindVertexArray(glState.vao);
      } else {
        gl.bindBuffer(gl.ARRAY_BUFFER, glState.buffers.position);
        const posLoc = gl.getAttribLocation(glState.program, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, glState.buffers.texCoord);
        const texLoc = gl.getAttribLocation(glState.program, 'a_texCoord');
        gl.enableVertexAttribArray(texLoc);
        gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
      }

      gl.useProgram(glState.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, glState.texture);

      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : Date.now() / 1000;
      const effects = currentEffects || normalizeEffects();
      const profile = (currentPresetEntry && currentPresetEntry.profile) || {};
      const baseFilter = profile.baseFilter || 'none';
      const passes = profile.passes || {};
      const filterMeta = parseFilterString(baseFilter);

      const texelX = 1 / Math.max(1, natural.width);
      const texelY = 1 / Math.max(1, natural.height);
      if (glState.uniforms.texelSize) gl.uniform2f(glState.uniforms.texelSize, texelX, texelY);
      if (glState.uniforms.resolution) gl.uniform2f(glState.uniforms.resolution, gl.canvas.width, gl.canvas.height);
      if (glState.uniforms.time) gl.uniform1f(glState.uniforms.time, now);
      if (glState.uniforms.visibility) gl.uniform1f(glState.uniforms.visibility, isEffectivelyVisible ? 1 : 0);
      const targetOpacity = clamp(currentState.eff && currentState.eff.opacity != null ? currentState.eff.opacity : 1, 0, 1);
      if (glState.uniforms.opacity) gl.uniform1f(glState.uniforms.opacity, targetOpacity);

      if (glState.uniforms.colorAdjustA) {
        gl.uniform4f(glState.uniforms.colorAdjustA,
          filterMeta.brightness,
          filterMeta.contrast,
          filterMeta.saturate,
          filterMeta.grayscale
        );
      }
      if (glState.uniforms.colorAdjustB) {
        gl.uniform4f(glState.uniforms.colorAdjustB,
          filterMeta.sepia,
          filterMeta.invert,
          filterMeta.hue,
          filterMeta.blur
        );
      }
      if (glState.uniforms.effectsPrimary) {
        gl.uniform4f(glState.uniforms.effectsPrimary,
          passes.softGlow ? 1 : 0,
          passes.edgeGlow ? 1 : 0,
          passes.chromaticAberration ? 1 : 0,
          0
        );
      }
      const colorDriftStrength = Math.min(1, (passes.baseColorDrift ? 0.7 : 0) + (effects.colorDrift ? 1 : 0));
      const lightLeakStrength = Math.min(1, (effects.lightLeak ? 1 : 0) + (passes.lightLeakPulse ? 0.35 : 0));
      if (glState.uniforms.effectsSecondary) {
        gl.uniform4f(glState.uniforms.effectsSecondary,
          colorDriftStrength,
          effects.vignette ? 1 : 0,
          passes.lightLeakPulse ? 1 : 0,
          lightLeakStrength
        );
      }
      if (glState.uniforms.effectsTertiary) {
        gl.uniform4f(glState.uniforms.effectsTertiary,
          effects.grain ? 1 : 0,
          effects.cursorGlow ? 1 : 0,
          effects.scanlines ? 1 : 0,
          0
        );
      }
      if (glState.uniforms.effectsQuaternary) {
        gl.uniform4f(glState.uniforms.effectsQuaternary,
          effects.pixelate ? 1 : 0,
          effects.cursorBloom ? 1 : 0,
          effects.spectralWarp ? 1 : 0,
          0
        );
      }
      const cursor = computeCursorData(surface.canvas, pointerState);
      if (glState.uniforms.cursor) gl.uniform2f(glState.uniforms.cursor, cursor.pos[0], cursor.pos[1]);
      if (glState.uniforms.cursorStrength) gl.uniform1f(glState.uniforms.cursorStrength, cursor.strength);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (glState.vao && gl.bindVertexArray) {
        gl.bindVertexArray(null);
      }
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function apply(state, options = {}) {
      if (!state) return;
      const ok = ensureHost();
      if (fallbackAdapter) {
        fallbackAdapter.apply(state, options);
        return;
      }
      if (!ok) return;
      const previous = currentState;
      const sameSource = previous && previous.resolvedUrl === state.resolvedUrl;
      currentState = state;
      updateEffectsFromState(state);
      updateVisibility(state);
      const needsReload = options.full !== false || !sameSource || !currentSource;
      if (needsReload) {
        prepareSource(state);
      } else {
        currentNatural = getMediaNaturalSize(currentSource);
        updateTransform(state);
        renderFrame(true);
        if (currentSource instanceof HTMLVideoElement) {
          if (shouldRenderFrames()) scheduleRenderLoop();
        }
      }
    }

    function update(state) {
      if (!state) return;
      const ok = ensureHost();
      if (fallbackAdapter) {
        fallbackAdapter.update(state);
        return;
      }
      if (!ok) return;
      currentState = state;
      updateEffectsFromState(state);
      updateVisibility(state);
      updateTransform(state);
      if (currentSource instanceof HTMLVideoElement) {
        if (shouldRenderFrames()) scheduleRenderLoop();
        else renderFrame();
      } else {
        renderFrame();
      }
    }

    function teardown() {
      if (fallbackAdapter) {
        fallbackAdapter.teardown();
        fallbackAdapter = null;
        return;
      }
      cancelRenderLoop();
      detachVideoHandlers();
      if (videoEl) {
        try { videoEl.pause(); } catch (_) {}
        if (typeof disposeVideo === 'function') disposeVideo(videoEl);
        else if (videoEl.parentNode) videoEl.parentNode.removeChild(videoEl);
      }
      if (glState) {
        const { gl, buffers, texture, vao } = glState;
        if (gl) {
          if (texture) gl.deleteTexture(texture);
          if (buffers) {
            if (buffers.position) gl.deleteBuffer(buffers.position);
            if (buffers.texCoord) gl.deleteBuffer(buffers.texCoord);
          }
          if (vao && gl.deleteVertexArray) gl.deleteVertexArray(vao);
          if (glState.program) gl.deleteProgram(glState.program);
        }
      }
      currentState = null;
      currentSource = null;
      currentNatural = null;
      glState = null;
      textureInfo = { sourceId: null, isVideo: false };
      videoEl = null;
      loadToken += 1;
      manualRenderQueued = false;
      isEffectivelyVisible = true;
      pointerState = { active: false, clientX: 0, clientY: 0, movedAt: 0 };
      if (pointerListenerActive) {
        try {
          window.removeEventListener('pointermove', handlePointerMove);
        } catch (_) {}
        pointerListenerActive = false;
      }
      detachScrollListeners();
      disposeSurface();
      disposeLayerContainer(layerId);
    }

    return {
      apply,
      update,
      teardown,
    };
  };

})(typeof window !== 'undefined' ? window : this);
