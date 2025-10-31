(function(global){
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  KB.initUI = function initUI(ctx) {
    const {
      info = (() => {}),
      currentWallpapers = (() => []),
      getCurrentIndex = (() => 0),
      setCurrentIndex = (() => {}),
      setOverrideIndex = (() => {}),
      clearOverrideIndex = (() => {}),
      getHostKey = (() => (location.host || 'unknown-host')),
      getCurrentMode = (() => 1),
      getCurrentAdapter = (() => null),
      setOverrideAdapter = (() => {}),
      setSavedAdapter = (() => {}),
      clearOverrideAdapter = (() => {}),
      getHostStyle = (() => ({})),
      updateHostStyle = (() => {}),
      scheduleApply = (() => {}),
      applyTransform = (() => {}),
      bestMatchIndex = null,
      syncHotkeyOpacity = (() => {}),
    } = ctx || {};

    const uiConstants = KB.UI_CONSTANTS || {};
    const ADJUST_PANEL = uiConstants.adjustPanel || (uiConstants.__defaults && uiConstants.__defaults.adjustPanel);
    if (!ADJUST_PANEL) {
      throw new Error('Kabegami adjust panel constants are not initialised');
    }

    const RAW_CANVAS_PRESETS = (Array.isArray(KB.canvasEffectPresets) && KB.canvasEffectPresets.length)
      ? KB.canvasEffectPresets
      : [
          { id: 'none', label: 'Original', description: 'Draw the wallpaper without post-processing.' },
          { id: 'softGlow', label: 'Soft Glow', description: 'Slight blur with extra brightness for a dreamy look.', defaults: { vignette: true } },
          { id: 'noir', label: 'Noir', description: 'High-contrast black and white finish.', defaults: { vignette: true } },
          { id: 'vibrant', label: 'Vibrant', description: 'Boost saturation and contrast for vivid colours.', defaults: { lightLeak: true } },
        ];

    const PRESET_MAP = KB.canvasEffectPresetMap || RAW_CANVAS_PRESETS.reduce((acc, preset) => {
      if (!preset || !preset.id) return acc;
      acc[preset.id] = preset;
      if (preset.aliasOf && RAW_CANVAS_PRESETS.find((p) => p.id === preset.aliasOf)) {
        acc[preset.id] = RAW_CANVAS_PRESETS.find((p) => p.id === preset.aliasOf);
      }
      return acc;
    }, {});

    const PRESET_DEFAULTS = RAW_CANVAS_PRESETS.reduce((acc, preset) => {
      if (!preset || !preset.id) return acc;
      acc[preset.id] = Object.assign({}, preset.defaults || {});
      return acc;
    }, {});

    const DEFAULT_CANVAS_EFFECTS = Object.freeze(Object.assign({
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
    }, KB.canvasEffectDefaults || {}));

    const CANVAS_EFFECT_PRESETS = Object.freeze(
      RAW_CANVAS_PRESETS
        .filter((preset) => !preset || preset.hidden !== true)
        .map((preset) => Object.freeze({
          id: preset.id,
          label: preset.label || preset.id,
          description: preset.description || '',
          genre: preset.genre || '',
        }))
    );

    function resolvePresetEntry(id) {
      const fallback = PRESET_MAP[DEFAULT_CANVAS_EFFECTS.preset] || null;
      if (!id) return fallback;
      const entry = PRESET_MAP[id];
      if (!entry) return fallback;
      if (entry.aliasOf && PRESET_MAP[entry.aliasOf]) {
        return PRESET_MAP[entry.aliasOf];
      }
      return entry;
    }

    function buildStateWithPresetDefaults(raw) {
      const base = Object.assign({}, DEFAULT_CANVAS_EFFECTS, raw || {});
      const entry = resolvePresetEntry(base.preset);
      if (entry && entry.id && entry.id !== base.preset) {
        base.preset = entry.id;
      }
      const defaults = (entry && PRESET_DEFAULTS[entry.id]) || {};
      for (const [key, value] of Object.entries(defaults)) {
        if (!raw || !Object.prototype.hasOwnProperty.call(raw, key)) {
          base[key] = value;
        }
      }
      return base;
    }

    function getPresetDefaults(id) {
      const entry = resolvePresetEntry(id);
      const defaults = Object.assign({}, DEFAULT_CANVAS_EFFECTS, entry ? PRESET_DEFAULTS[entry.id] || {} : {});
      defaults.preset = entry ? entry.id : DEFAULT_CANVAS_EFFECTS.preset;
      return defaults;
    }

    // Trusted Types friendly: clear children without touching innerHTML
    function clearNode(el) {
      if (!el) return;
      while (el.firstChild) el.removeChild(el.firstChild);
    }

    function styleCircleButton(btn, bgColor) {
      Object.assign(btn.style, {
        position: btn.style.position || 'fixed',
        zIndex: '2147483647',
        width: '24px',
        height: '24px',
        lineHeight: '24px',
        textAlign: 'center',
        borderRadius: '50%',
        border: 'none',
        background: bgColor,
        cursor: 'pointer',
        fontSize: '0',
        opacity: '0.3',
        padding: '0',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.15) inset'
      });
      btn.addEventListener('mouseenter', () => btn.style.opacity = '0.6');
      btn.addEventListener('mouseleave', () => btn.style.opacity = '0.3');
    }

    const MODE_INDICATOR_TIER_SIZE = 4;

    function ensureModeIndicator(btn) {
      let ind = btn.querySelector('.kabegami-mode-ind');
      if (!ind) {
        ind = document.createElement('span');
        ind.className = 'kabegami-mode-ind';
        Object.assign(ind.style, {
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '18px',
          height: '18px',
          transform: 'translate(-50%, -50%)',
          transformOrigin: 'center center',
          pointerEvents: 'none',
          display: 'block'
        });
        btn.style.position = 'fixed';
        btn.style.display = 'inline-block';
        btn.appendChild(ind);
      }
      return ind;
    }

    function updateModeIndicator(btn, mode, adapter) {
      const ind = ensureModeIndicator(btn);
      const sequence = Array.isArray(KB.MODE_ADAPTER_SEQUENCE) && KB.MODE_ADAPTER_SEQUENCE.length
        ? KB.MODE_ADAPTER_SEQUENCE
        : Object.values(KB.MODE_DEFAULT_ADAPTER || {});
      const tierSize = MODE_INDICATOR_TIER_SIZE > 0 ? MODE_INDICATOR_TIER_SIZE : 4;
      let position = 0;
      if (adapter) {
        const idx = sequence.indexOf(adapter);
        if (idx >= 0) position = idx;
      } else if (Number.isFinite(mode)) {
        position = Math.max(0, Number(mode) - 1);
      }
      const tier = Math.floor(position / tierSize);
      const offset = position % tierSize;
      const rotation = tierSize ? (offset * 360) / tierSize : 0;
      ind.style.transform = 'translate(-50%, -50%) rotate(' + rotation + 'deg)';

      const desiredLines = Math.max(1, tier + 1);
      const spacing = 4;

      while (ind.children.length > desiredLines) {
        ind.removeChild(ind.lastChild);
      }
      while (ind.children.length < desiredLines) {
        const line = document.createElement('span');
        line.className = 'kabegami-mode-line';
        Object.assign(line.style, {
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '14px',
          height: '2px',
          background: '#fff',
          borderRadius: '1px',
          transformOrigin: 'center center',
          pointerEvents: 'none'
        });
        ind.appendChild(line);
      }

      const middle = (desiredLines - 1) / 2;
      Array.from(ind.children).forEach((line, idx) => {
        const delta = (idx - middle) * spacing;
        line.style.transform = 'translate(-50%, -50%) translateY(' + delta + 'px)';
        line.style.opacity = String(1 - Math.abs(delta) / (spacing * desiredLines * 0.75));
      });
    }

    function ensurePopover(id) {
      let el = document.getElementById(id);
      if (el) return el;
      el = document.createElement('div');
      el.id = id;
      Object.assign(el.style, {
        position: 'fixed', left: '10px', bottom: '46px', zIndex: '2147483647',
        padding: '8px', background: '#fff', border: '1px solid #888', borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      });
      document.documentElement.appendChild(el);
      const close = (ev) => {
        if (!el.contains(ev.target) && ev.target.id !== 'kabegami-adjust-btn') {
          el.remove();
          document.removeEventListener('mousedown', close, true);
          document.removeEventListener('keydown', onEsc, true);
        }
      };
      const onEsc = (ev) => {
        if (ev.key === 'Escape') {
          el.remove();
          document.removeEventListener('mousedown', close, true);
          document.removeEventListener('keydown', onEsc, true);
        }
      };
      setTimeout(() => {
        document.addEventListener('mousedown', close, true);
        document.addEventListener('keydown', onEsc, true);
      }, 0);
      return el;
    }

    function openSearchDialog() {
      const el = ensurePopover('kabegami-pop-search');
      clearNode(el);
      const label = document.createElement('div');
      label.textContent = 'Search wallpaper by name';
      label.style.marginBottom = '6px';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Type name and press Enter';
      input.style.width = '220px';
      input.style.padding = '6px 8px';
      input.style.border = '1px solid #aaa';
      input.style.borderRadius = '4px';
      input.style.fontSize = '12px';
      input.autocomplete = 'off';
      const hint = document.createElement('div');
      hint.style.fontSize = '11px';
      hint.style.color = '#666';
      hint.style.marginTop = '6px';
      hint.textContent = 'Enter: jump / Esc: close';

      el.append(label, input, hint);
      input.focus();

      const close = () => {
        try { document.removeEventListener('keydown', onKey, true); } catch (_) {}
        el.remove();
      };

      const onKey = (ev) => {
        if (ev.key === 'Enter') {
          const q = input.value.trim();
          if (!q || typeof bestMatchIndex !== 'function') return;
          const idx = bestMatchIndex(q, currentWallpapers());
          if (idx != null && idx >= 0) {
            setOverrideIndex(getHostKey(), idx);
            info('search (override) -> index', idx, 'query=', q);
            scheduleApply();
          } else {
            alert('一致する壁紙が見つかりませんでした');
          }
          close();
        } else if (ev.key === 'Escape') {
          close();
        }
      };
      document.addEventListener('keydown', onKey, true);
    }

    function openAdjustPanel(initialFocus = 'opacity') {
      const host = getHostKey();
      const defaults = KB.DEFAULTS || {};
      const px = (value) => `${value}px`;

      const runtimeDefaults = Object.assign({}, ADJUST_PANEL.defaults || {});
      const defaultOpacity = Number(defaults.opacity);
      if (Number.isFinite(defaultOpacity)) {
        runtimeDefaults.opacity = defaultOpacity;
      }

      const currentStyle = getHostStyle(host) || {};
      const cur = Object.assign({}, runtimeDefaults, currentStyle);

      const el = ensurePopover('kabegami-pop-adjust');
      clearNode(el);
      Object.assign(el.style, {
        width: px(ADJUST_PANEL.width),
        display: 'flex',
        flexDirection: 'column',
        gap: px(ADJUST_PANEL.containerGap),
      });

      const title = document.createElement('div');
      title.textContent = 'Kabegami Adjustments';
      Object.assign(title.style, {
        fontWeight: String(ADJUST_PANEL.titleFontWeight),
        fontSize: px(ADJUST_PANEL.titleFontSize),
      });
      el.appendChild(title);

      const sliders = {};

      const getPrecision = (value, fallback) => {
        const numeric = Number(value);
        if (Number.isInteger(numeric) && numeric >= 0) return numeric;
        return fallback;
      };

      const clampToRange = (val, range, fallback) => {
        const min = Math.min(range.min, range.max);
        const max = Math.max(range.min, range.max);
        const numeric = Number(val);
        if (Number.isFinite(numeric)) {
          return Math.min(max, Math.max(min, numeric));
        }
        const fallbackNumeric = Number(fallback);
        if (Number.isFinite(fallbackNumeric)) {
          return Math.min(max, Math.max(min, fallbackNumeric));
        }
        return min;
      };

      const opacityRange = ADJUST_PANEL.ranges.opacity;
      const scaleRange = ADJUST_PANEL.ranges.scale;
      const offsetRange = ADJUST_PANEL.ranges.offset;
      const opacityPrecision = getPrecision(ADJUST_PANEL.opacityPrecision, 2);
      const scalePrecision = getPrecision(ADJUST_PANEL.scalePrecision, 2);

      const clampOpacityValue = (val) => clampToRange(val, opacityRange, runtimeDefaults.opacity);
      const clampScaleValue = (val) => clampToRange(val, scaleRange, runtimeDefaults.scale);
      const clampOffsetValue = (axis, val) => clampToRange(val, offsetRange, runtimeDefaults[axis]);

      const createSliderRow = (labelText, input, valueEl) => {
        const row = document.createElement('div');
        Object.assign(row.style, {
          display: 'flex',
          flexDirection: 'column',
          gap: px(ADJUST_PANEL.rowGap),
        });
        const label = document.createElement('label');
        label.textContent = labelText;
        Object.assign(label.style, {
          fontSize: px(ADJUST_PANEL.labelFontSize),
          fontWeight: String(ADJUST_PANEL.labelFontWeight),
        });
        const inputRow = document.createElement('div');
        Object.assign(inputRow.style, {
          display: 'flex',
          alignItems: 'center',
          gap: px(ADJUST_PANEL.inlineGap),
        });
        input.style.flex = '1';
        if (valueEl) {
          Object.assign(valueEl.style, {
            fontFeatureSettings: "'tnum'",
            minWidth: px(ADJUST_PANEL.valueMinWidth),
            textAlign: 'right',
          });
          inputRow.append(input, valueEl);
        } else {
          inputRow.appendChild(input);
        }
        row.append(label, inputRow);
        return row;
      };

      const opacitySlider = document.createElement('input');
      opacitySlider.type = 'range';
      opacitySlider.min = String(opacityRange.min);
      opacitySlider.max = String(opacityRange.max);
      opacitySlider.step = String(opacityRange.step);
      opacitySlider.value = String(clampOpacityValue(cur.opacity));
      const opacityValue = document.createElement('span');
      const updateOpacity = (value) => {
        const numeric = clampOpacityValue(value);
        opacityValue.textContent = numeric.toFixed(opacityPrecision);
        updateHostStyle({ opacity: numeric }, host);
        applyTransform(getHostStyle(host));
        syncHotkeyOpacity(numeric);
      };
      updateOpacity(opacitySlider.value);
      opacitySlider.addEventListener('input', () => updateOpacity(opacitySlider.value));
      el.appendChild(createSliderRow('Opacity', opacitySlider, opacityValue));
      sliders.opacity = opacitySlider;

      const scaleSlider = document.createElement('input');
      scaleSlider.type = 'range';
      scaleSlider.min = String(scaleRange.min);
      scaleSlider.max = String(scaleRange.max);
      scaleSlider.step = String(scaleRange.step);
      scaleSlider.value = String(clampScaleValue(cur.scale));
      const scaleValue = document.createElement('span');
      const updateScale = (value) => {
        const numeric = clampScaleValue(value);
        scaleValue.textContent = numeric.toFixed(scalePrecision) + 'x';
        updateHostStyle({ scale: numeric }, host);
        applyTransform(getHostStyle(host));
      };
      updateScale(scaleSlider.value);
      scaleSlider.addEventListener('input', () => updateScale(scaleSlider.value));
      el.appendChild(createSliderRow('Scale', scaleSlider, scaleValue));
      sliders.scale = scaleSlider;

      const makeAxisControls = (axis) => {
        const row = document.createElement('div');
        Object.assign(row.style, {
          display: 'flex',
          flexDirection: 'column',
          gap: px(ADJUST_PANEL.rowGap),
        });
        const label = document.createElement('label');
        label.textContent = axis === 'dx' ? 'Horizontal offset' : 'Vertical offset';
        Object.assign(label.style, {
          fontSize: px(ADJUST_PANEL.labelFontSize),
          fontWeight: String(ADJUST_PANEL.labelFontWeight),
        });
        const controls = document.createElement('div');
        Object.assign(controls.style, {
          display: 'flex',
          alignItems: 'center',
          gap: px(ADJUST_PANEL.inlineGap),
        });
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = String(offsetRange.min);
        slider.max = String(offsetRange.max);
        slider.step = String(offsetRange.step);
        slider.style.flex = '1';
        const numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.min = slider.min;
        numberInput.max = slider.max;
        numberInput.step = slider.step;
        Object.assign(numberInput.style, { width: px(ADJUST_PANEL.numberInputWidth) });
        slider.__kbPairInput = numberInput;
        const updateOffset = (value) => {
          const numeric = clampOffsetValue(axis, value);
          slider.value = String(numeric);
          numberInput.value = String(numeric);
          const patch = {};
          patch[axis] = numeric;
          updateHostStyle(patch, host);
          applyTransform(getHostStyle(host));
        };
        slider.addEventListener('input', () => updateOffset(slider.value));
        numberInput.addEventListener('input', () => updateOffset(numberInput.value));
        const initial = clampOffsetValue(axis, cur[axis]);
        slider.value = String(initial);
        numberInput.value = String(initial);
        controls.append(slider, numberInput);
        row.append(label, controls);
        sliders[axis] = slider;
        return row;
      };

      const offsetWrapper = document.createElement('div');
      Object.assign(offsetWrapper.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: px(ADJUST_PANEL.offsetWrapperGap),
      });
      offsetWrapper.append(makeAxisControls('dx'), makeAxisControls('dy'));
      el.appendChild(offsetWrapper);

      const buttonsRow = document.createElement('div');
      Object.assign(buttonsRow.style, {
        display: 'flex',
        justifyContent: 'space-between',
        gap: px(ADJUST_PANEL.buttonsGap),
        marginTop: px(ADJUST_PANEL.buttonsMarginTop),
      });
      const resetBtn = document.createElement('button');
      resetBtn.textContent = 'Reset';
      Object.assign(resetBtn.style, { flex: '1', padding: `${px(ADJUST_PANEL.buttonPaddingY)} 0` });
      resetBtn.addEventListener('click', () => {
        const resetValues = {
          opacity: clampOpacityValue(runtimeDefaults.opacity),
          scale: clampScaleValue(runtimeDefaults.scale),
          dx: clampOffsetValue('dx', runtimeDefaults.dx),
          dy: clampOffsetValue('dy', runtimeDefaults.dy),
        };
        updateHostStyle(resetValues, host);
        applyTransform(getHostStyle(host));
        syncHotkeyOpacity(resetValues.opacity);
        opacitySlider.value = String(resetValues.opacity);
        scaleSlider.value = String(resetValues.scale);
        updateOpacity(resetValues.opacity);
        updateScale(resetValues.scale);
        updateOffsetValue('dx', resetValues.dx);
        updateOffsetValue('dy', resetValues.dy);
      });
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      Object.assign(closeBtn.style, { flex: '1', padding: `${px(ADJUST_PANEL.buttonPaddingY)} 0` });
      closeBtn.addEventListener('click', () => el.remove());
      buttonsRow.append(resetBtn, closeBtn);
      el.appendChild(buttonsRow);

      function updateOffsetValue(axis, value) {
        const sliderEl = sliders[axis];
        if (!sliderEl) return;
        const numeric = clampOffsetValue(axis, value);
        sliderEl.value = String(numeric);
        const pairInput = sliderEl.__kbPairInput;
        if (pairInput && pairInput.tagName === 'INPUT') {
          pairInput.value = String(numeric);
        }
      }

      const focusTarget = {
        opacity: opacitySlider,
        scale: scaleSlider,
        dx: sliders.dx,
        dy: sliders.dy,
        offset: sliders.dx,
      }[initialFocus];
      if (focusTarget) {
        setTimeout(() => focusTarget.focus(), 0);
      }
    }

    function openCanvasEffectsPanel() {
      const adapter = (typeof getCurrentAdapter === 'function') ? getCurrentAdapter() : null;
      const adapterId = (typeof adapter === 'string') ? adapter : '';
      const isCanvas = adapterId.startsWith('canvas-');
      const isWebgl = adapterId.startsWith('webgl-');
      if (!isCanvas && !isWebgl) {
        return;
      }

      const host = getHostKey();
      const hostStyle = getHostStyle(host) || {};
      const effectsKey = isWebgl ? 'webglEffects' : 'canvasEffects';
      const fallbackKey = isWebgl ? 'canvasEffects' : 'webglEffects';
      let effectsState = buildStateWithPresetDefaults(
        hostStyle[effectsKey] || hostStyle[fallbackKey] || {}
      );

      const el = ensurePopover('kabegami-pop-effects');
      clearNode(el);
      const panelWidth = isWebgl ? '320px' : '280px';
      Object.assign(el.style, {
        width: panelWidth,
        right: '10px',
        left: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxHeight: '480px',
        overflowY: 'auto',
        paddingRight: '6px',
      });

      const title = document.createElement('div');
      const effectLabel = isWebgl ? 'WebGL' : 'Canvas';
      title.textContent = 'Canvas Effects';
      title.textContent = `${effectLabel} Effects`;
      Object.assign(title.style, {
        fontWeight: '600',
        fontSize: '14px',
        color: '#0f172a',
      });
      el.appendChild(title);

      const subtitle = document.createElement('div');
      subtitle.textContent = 'Choose a preset or overlay for the canvas renderer.';
      subtitle.textContent = isWebgl
        ? 'Choose a preset or overlay for the WebGL renderer.'
        : 'Choose a preset or overlay for the canvas renderer.';
      Object.assign(subtitle.style, {
        fontSize: '11px',
        color: '#475569',
        lineHeight: '1.4',
      });
      el.appendChild(subtitle);

      const presetContainer = document.createElement('div');
      Object.assign(presetContainer.style, {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '8px',
      });
      el.appendChild(presetContainer);

      const presetButtons = new Map();
      const toggleButtons = new Map();

      const statusLine = document.createElement('div');
      Object.assign(statusLine.style, {
        fontSize: '11px',
        color: '#1e293b',
        paddingTop: '2px',
        minHeight: '36px',
        lineHeight: '1.4',
      });
      el.appendChild(statusLine);

      const toggleContainer = document.createElement('div');
      Object.assign(toggleContainer.style, {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
      });
      el.appendChild(toggleContainer);

      const TOGGLE_DEFINITIONS = [
        { key: 'scanlines', label: 'Scanlines overlay', shortLabel: 'Scanlines' },
        { key: 'vignette', label: 'Vignette corners', shortLabel: 'Vignette' },
        { key: 'grain', label: 'Film grain', shortLabel: 'Grain' },
        { key: 'lightLeak', label: 'Light leak glow', shortLabel: 'Light leak' },
        { key: 'colorDrift', label: 'Aurora wash', shortLabel: 'Aurora' },
        { key: 'cursorGlow', label: 'Cursor halo', shortLabel: 'Cursor halo' },
      ];
      if (isWebgl) {
        TOGGLE_DEFINITIONS.push(
          { key: 'pixelate', label: 'Pixel mosaic', shortLabel: 'Pixelate' },
          { key: 'cursorBloom', label: 'Cursor bloom blur', shortLabel: 'Cursor bloom' },
          { key: 'spectralWarp', label: 'Spectral warp', shortLabel: 'Spectral warp' },
        );
      }

      const canonicalPresetId = (id) => {
        const entry = resolvePresetEntry(id);
        return entry ? entry.id : id;
      };

      const descriptions = new Map(CANVAS_EFFECT_PRESETS.map((preset) => [preset.id, preset.description]));

      TOGGLE_DEFINITIONS.forEach((toggle) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = toggle.label;
        btn.dataset.toggle = toggle.key;
        btn.addEventListener('click', () => {
          effectsState = Object.assign({}, effectsState, { [toggle.key]: !effectsState[toggle.key] });
          persistEffects();
          render();
        });
        toggleContainer.appendChild(btn);
        toggleButtons.set(toggle.key, btn);
      });

      const textEffectsHeading = document.createElement('div');
      textEffectsHeading.textContent = 'Text effects (coming soon)';
      Object.assign(textEffectsHeading.style, {
        fontSize: '11px',
        fontWeight: '600',
        color: '#334155'
      });
      el.appendChild(textEffectsHeading);

      const textEffectsRow = document.createElement('div');
      Object.assign(textEffectsRow.style, {
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap'
      });
      const textEffectButtons = [
        { label: 'Font styling', hint: 'Font styling controls are not available yet.' },
        { label: 'Highlight & outline', hint: 'Highlight controls are not available yet.' }
      ];
      textEffectButtons.forEach((config) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = config.label;
        btn.disabled = true;
        btn.title = config.hint;
        Object.assign(btn.style, {
          padding: '6px 10px',
          borderRadius: '8px',
          border: '1px solid rgba(148,163,184,0.4)',
          background: '#f8fafc',
          color: '#94a3b8',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'not-allowed'
        });
        textEffectsRow.appendChild(btn);
      });
      el.appendChild(textEffectsRow);

      CANVAS_EFFECT_PRESETS.forEach((preset) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.preset = preset.id;
        btn.title = preset.description;
        btn.textContent = '';
        const labelEl = document.createElement('span');
        labelEl.textContent = preset.label;
        Object.assign(labelEl.style, {
          fontWeight: '600',
          fontSize: '12px',
          color: 'inherit',
        });
        btn.appendChild(labelEl);
        if (preset.genre) {
          const genreEl = document.createElement('span');
          genreEl.textContent = preset.genre;
          Object.assign(genreEl.style, {
            fontSize: '10px',
            color: 'rgba(71, 85, 105, 0.9)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          });
          btn.appendChild(genreEl);
        }
        btn.addEventListener('click', () => {
          if (canonicalPresetId(effectsState.preset) === canonicalPresetId(preset.id)) return;
          effectsState = Object.assign({}, getPresetDefaults(preset.id));
          persistEffects();
          render();
        });
        presetContainer.appendChild(btn);
        presetButtons.set(preset.id, btn);
      });

      const footer = document.createElement('div');
      Object.assign(footer.style, {
        display: 'flex',
        gap: '8px',
        marginTop: '4px',
      });
      el.appendChild(footer);

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.textContent = 'Reset';
      Object.assign(resetBtn.style, {
        flex: '0 0 auto',
        padding: '6px 12px',
        border: '1px solid rgba(148,163,184,0.6)',
        borderRadius: '8px',
        background: '#fff',
        color: '#0f172a',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
      });
      footer.appendChild(resetBtn);

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = 'Close';
      Object.assign(closeBtn.style, {
        flex: '1',
        padding: '6px 12px',
        border: '1px solid rgba(59,130,246,0.5)',
        borderRadius: '8px',
        background: '#3b82f6',
        color: '#fff',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
      });
      footer.appendChild(closeBtn);

      function stylePresetButton(btn, active) {
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        Object.assign(btn.style, {
          padding: '10px 12px',
          borderRadius: '10px',
          border: active ? '1px solid #2563eb' : '1px solid rgba(148,163,184,0.6)',
          background: active ? '#2563eb' : '#fff',
          color: active ? '#fff' : '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '4px',
          cursor: 'pointer',
          boxShadow: active ? '0 4px 10px rgba(37,99,235,0.35)' : 'none',
          transition: 'background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
          transform: active ? 'translateY(-1px)' : 'translateY(0)',
          minHeight: '58px',
          fontSize: '12px',
          textAlign: 'left',
          lineHeight: '1.3',
        });
      }

      function styleToggleButton(btn, active) {
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        Object.assign(btn.style, {
          padding: '6px 10px',
          borderRadius: '8px',
          border: active ? '1px solid #0f172a' : '1px solid rgba(148,163,184,0.6)',
          background: active ? 'rgba(15,23,42,0.9)' : '#fff',
          color: active ? '#f8fafc' : '#0f172a',
          fontWeight: '600',
          fontSize: '12px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'background 0.15s ease, color 0.15s ease',
          boxShadow: active ? '0 0 0 1px rgba(15,23,42,0.35)' : 'none',
          flex: '1 1 calc(50% - 6px)',
          minWidth: '0',
        });
      }

      resetBtn.addEventListener('click', () => {
        const isDefault = canonicalPresetId(effectsState.preset) === DEFAULT_CANVAS_EFFECTS.preset
          && TOGGLE_DEFINITIONS.every((toggle) => !!effectsState[toggle.key] === !!DEFAULT_CANVAS_EFFECTS[toggle.key]);
        if (isDefault) return;
        effectsState = Object.assign({}, DEFAULT_CANVAS_EFFECTS);
        persistEffects();
        render();
      });

      closeBtn.addEventListener('click', () => {
        el.remove();
      });

      function persistEffects() {
        const entry = resolvePresetEntry(effectsState.preset);
        const presetId = entry ? entry.id : effectsState.preset;
        const presetDefaults = (entry && PRESET_DEFAULTS[presetId]) || {};
        const payload = { preset: presetId };
        TOGGLE_DEFINITIONS.forEach((toggle) => {
          const value = !!effectsState[toggle.key];
          const defaultValue = Object.prototype.hasOwnProperty.call(presetDefaults, toggle.key)
            ? !!presetDefaults[toggle.key]
            : !!DEFAULT_CANVAS_EFFECTS[toggle.key];
          if (value !== defaultValue) {
            payload[toggle.key] = value;
          }
        });
        const shouldRemove = payload.preset === DEFAULT_CANVAS_EFFECTS.preset && Object.keys(payload).length === 1;
        const patch = shouldRemove ? { [effectsKey]: undefined } : { [effectsKey]: payload };
        // Persist alongside other style adjustments so exports/imports capture it.
        updateHostStyle(patch, host);
        scheduleApply({ allowWhileHidden: true });
        info(`${effectLabel} effects updated`, Object.assign({ host }, payload));
        effectsState = buildStateWithPresetDefaults(payload);
      }

      function render() {
        const activeEntry = resolvePresetEntry(effectsState.preset);
        const activePresetId = activeEntry ? activeEntry.id : effectsState.preset;
        presetButtons.forEach((btn, id) => {
          stylePresetButton(btn, canonicalPresetId(id) === activePresetId);
        });
        toggleButtons.forEach((btn, key) => {
          styleToggleButton(btn, !!effectsState[key]);
        });
        const descSource = activeEntry || {};
        const desc = descSource.description || descriptions.get(activePresetId) || '';
        const genreLabel = descSource.genre ? `[${descSource.genre}] ` : '';
        const activeToggles = TOGGLE_DEFINITIONS
          .filter((toggle) => !!effectsState[toggle.key])
          .map((toggle) => toggle.shortLabel);
        const extras = activeToggles.length ? ` Active overlays: ${activeToggles.join(', ')}.` : '';
        const rendererHint = isWebgl ? ' (GPU/WebGL)' : ' (Canvas)';
        statusLine.textContent = `${genreLabel}${desc}${extras}${rendererHint}`;
      }

      render();
    }

    function openOpacitySlider() {
      openAdjustPanel('opacity');
    }

    function openSizeSlider() {
      openAdjustPanel('scale');
    }

    function openOffsetPad() {
      openAdjustPanel('offset');
    }

    function scheduleApplyNow() {
      scheduleApply();
    }

    function addRotateButton() {
      if (window.top !== window) return;
      const btnId = 'kabegami-rotate-btn';
      if (document.getElementById(btnId)) return;
      const btn = document.createElement('button');
      btn.id = btnId;
      btn.title = '回転';
      btn.textContent = '';
      Object.assign(btn.style, { position: 'fixed', left: '10px', bottom: '10px' });
      styleCircleButton(btn, '#e74c3c');
      btn.addEventListener('click', (e) => {
        if (e.ctrlKey || e.metaKey) {
          openSearchDialog();
          return;
        }
        const wallpapers = currentWallpapers();
        if (!wallpapers.length) return;
        const dir = e.shiftKey ? -1 : 1;
        let idx = getCurrentIndex();
        idx = (idx + dir + wallpapers.length) % wallpapers.length;
        setOverrideIndex(getHostKey(), idx);
        info('rotate click (override) -> index', idx);
        scheduleApplyNow();
      });
      document.documentElement.appendChild(btn);
    }

    function addSaveButton() {
      if (window.top !== window) return;
      const btnId = 'kabegami-save-btn';
      if (document.getElementById(btnId)) return;
      const btn = document.createElement('button');
      btn.id = btnId;
      btn.title = '現在の壁紙インデックスを保存';
      btn.textContent = '';
      Object.assign(btn.style, { position: 'fixed', right: '10px', bottom: '10px' });
      styleCircleButton(btn, '#3498db');
      btn.addEventListener('click', () => {
        const host = getHostKey();
        const idx = getCurrentIndex();
        const mode = getCurrentMode();
        const adapter = typeof getCurrentAdapter === 'function' ? getCurrentAdapter() : null;

        setCurrentIndex(idx);
        if (adapter && setSavedAdapter) setSavedAdapter(host, adapter);

        clearOverrideIndex(host);
        if (typeof clearOverrideAdapter === 'function') clearOverrideAdapter(host);

        const labels = KB.MODE_ADAPTER_LABELS || {};
        const adapterLabel = adapter ? (labels[adapter] || adapter) : 'なし';
        info('saved (persisted) wallpaper index', { host, idx, mode, adapter, adapterLabel });
        try { alert(`保存しました: ${host} → #${idx} (モード=${mode}, アダプタ=${adapterLabel})`); } catch (_) {}
        scheduleApplyNow();
      });
      document.documentElement.appendChild(btn);
    }

    function addModeButton() {
      if (window.top !== window) return;
      const btnId = 'kabegami-mode-btn';
      if (document.getElementById(btnId)) return;
      const btn = document.createElement('button');
      btn.id = btnId;
      btn.title = 'アダプタ';
      btn.textContent = '';
      Object.assign(btn.style, { position: 'fixed', left: '78px', bottom: '10px' });
      styleCircleButton(btn, '#27ae60');
      updateModeIndicator(btn, getCurrentMode(), getCurrentAdapter());
      btn.addEventListener('click', () => {
        const host = getHostKey();
        const sequence = Array.isArray(KB.MODE_ADAPTER_SEQUENCE) && KB.MODE_ADAPTER_SEQUENCE.length
          ? KB.MODE_ADAPTER_SEQUENCE
          : Object.values(KB.MODE_DEFAULT_ADAPTER || {});
        const currentAdapter = typeof getCurrentAdapter === 'function' ? getCurrentAdapter() : null;
        let idx = sequence.indexOf(currentAdapter);
        if (idx < 0) idx = 0;
        const nextAdapter = sequence.length ? sequence[(idx + 1) % sequence.length] : currentAdapter;
        if (nextAdapter && typeof setOverrideAdapter === 'function') {
          setOverrideAdapter(host, nextAdapter);
          info('mode cycled (adapter)', { host, adapter: nextAdapter });
        }
        const updatedMode = getCurrentMode();
        const updatedAdapter = typeof getCurrentAdapter === 'function' ? getCurrentAdapter() : null;
        updateModeIndicator(btn, updatedMode, updatedAdapter);
        scheduleApplyNow();
      });
      document.documentElement.appendChild(btn);
    }

    function addAdjustButton() {
      if (window.top !== window) return;
      const btnId = 'kabegami-adjust-btn';
      if (document.getElementById(btnId)) return;
      const btn = document.createElement('button');
      btn.id = btnId;
      btn.title = 'スタイル調整';
      btn.textContent = '';
      Object.assign(btn.style, { position: 'fixed', left: '44px', bottom: '10px' });
      styleCircleButton(btn, '#222');
      btn.addEventListener('click', (e) => {
        if (e.shiftKey) { openOffsetPad(); return; }
        if (e.ctrlKey || e.metaKey) { openSizeSlider(); return; }
        openOpacitySlider();
      });
      document.documentElement.appendChild(btn);
    }

    const api = {
      addRotateButton,
      addSaveButton,
      addModeButton,
      addAdjustButton,
      openSearchDialog,
      openOpacitySlider,
      openSizeSlider,
      openOffsetPad,
      openCanvasEffectsPanel,
      ensurePopover,
      ensureModeIndicator,
      updateModeIndicator,
      styleCircleButton,
    };

    KB.UI = Object.assign(KB.UI || {}, api);
    return api;
  };

})(typeof window !== 'undefined' ? window : this);
