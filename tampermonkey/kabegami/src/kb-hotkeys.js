(function(global){
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  KB.initHotkeys = KB.initHotkeys || function initHotkeys(ctx) {
    const {
      info = () => {},
      log = () => {},
      currentWallpapers = () => [],
      getCurrentIndex = () => 0,
      setCurrentIndex = () => {},
      setOverrideIndex = () => {},
      clearOverrideIndex = () => {},
      getHostKey = () => (typeof location !== 'undefined' ? (location.host || 'unknown-host') : 'unknown-host'),
      getCurrentMode = () => 1,
      getCurrentAdapter = () => null,
      setOverrideAdapter = () => {},
      setSavedAdapter = () => {},
      clearOverrideAdapter = () => {},
      loadStyleMap = () => ({}),
      saveStyleMap = () => {},
      getHostStyle = () => ({}),
      updateHostStyle = () => {},
      scheduleApply = () => {},
      openConfig = () => {},
      refreshManifest = () => Promise.resolve(),
      openSearchDialog = () => {},
      getOrCreateStyle = () => document.createElement('style'),
      replaceStyle = () => {},
      IDS = {},
      DEFAULTS = {},
      alertFn = (msg) => { try { alert(msg); } catch (_) {} },
      hotkeys = null,
      applyTransform = () => {},
    } = ctx || {};

    const HOTKEYS = hotkeys || { toggle: { altKey: true, key: 'b' } };

    let listenersAttached = false;
    let currentOpacity = DEFAULTS.opacity ?? 0.2;

    function setCurrentOpacity(value) {
      const numeric = Math.max(0, Math.min(1, Number(value) || 0));
      currentOpacity = numeric;
    }

    function updateFromConfig(cfg) {
      const host = getHostKey();
      const hostStyle = getHostStyle(host);
      const nextOpacity = (hostStyle.opacity != null)
        ? hostStyle.opacity
        : (cfg && cfg.opacity != null ? cfg.opacity : (DEFAULTS.opacity ?? 0.2));
      setCurrentOpacity(nextOpacity);
    }

    function rotateWallpaper(dir) {
      const wallpapers = currentWallpapers();
      if (!Array.isArray(wallpapers) || !wallpapers.length) return;
      let idx = getCurrentIndex();
      idx = (idx + dir + wallpapers.length) % wallpapers.length;
      setOverrideIndex(getHostKey(), idx);
      info('hotkey rotate -> index', idx);
      scheduleApply();
    }

    function cycleAdapter() {
      const host = getHostKey();
      const sequence = Array.isArray(KB.MODE_ADAPTER_SEQUENCE) && KB.MODE_ADAPTER_SEQUENCE.length
        ? KB.MODE_ADAPTER_SEQUENCE
        : [];
      if (!sequence.length) return;
      const currentAdapter = typeof getCurrentAdapter === 'function' ? getCurrentAdapter() : null;
      let idx = sequence.indexOf(currentAdapter);
      if (idx < 0) idx = 0;
      const nextAdapter = sequence[(idx + 1) % sequence.length];
      if (nextAdapter && typeof setOverrideAdapter === 'function') {
        setOverrideAdapter(host, nextAdapter);
        info('hotkey cycle adapter ->', nextAdapter);
      }
      scheduleApply();
    }

    function quickSave() {
      const host = getHostKey();
      const idx = getCurrentIndex();
      const mode = getCurrentMode();
      const adapter = typeof getCurrentAdapter === 'function' ? getCurrentAdapter() : null;

      setCurrentIndex(idx);
      if (adapter && setSavedAdapter) setSavedAdapter(host, adapter);

      clearOverrideIndex(host);
      if (typeof clearOverrideAdapter === 'function') {
        clearOverrideAdapter(host);
      }

      const labels = (KB.MODE_ADAPTER_LABELS || {});
      const adapterLabel = adapter ? (labels[adapter] || adapter) : 'なし';
      info('hotkey saved index', { host, idx, mode, adapter, adapterLabel });
      alertFn(`保存しました: ${host} → #${idx} (モード=${mode}, アダプタ=${adapterLabel})`);
      scheduleApply();
    }

    function resetAdjustments() {
      const host = getHostKey();
      const map = loadStyleMap();
      delete map[host];
      saveStyleMap(map);
      info('hotkey reset adjustments for', host);
      applyTransform(getHostStyle(host));
    }

    function handleOpacity(delta, mode) {
      const base = currentOpacity ?? (DEFAULTS.opacity ?? 0.2);
      setCurrentOpacity(base + delta);
      updateHostStyle({ opacity: currentOpacity }, getHostKey());
      info('adjustOpacity (hotkey) mode', mode, 'new opacity', currentOpacity);
      const hostStyle = getHostStyle(getHostKey());
      applyTransform(hostStyle);
    }

    function toggleVisibility(mode) {
      const host = getHostKey();
      const stored = Object.assign({}, getHostStyle(host));
      const currentVisibility = (stored.visibility === 'hidden') ? 'hidden' : 'visible';
      const nextVisibility = currentVisibility === 'hidden' ? 'visible' : 'hidden';
      updateHostStyle({ visibility: nextVisibility }, host);
      info('toggleVisibility', { mode, nextVisibility });
      stored.visibility = nextVisibility;
      applyTransform(stored);
    }

    function isEditableTarget(t) {
      if (!t) return false;
      const tag = (t.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return true;
      if (t.isContentEditable) return true;
      try {
        const rootNode = t.getRootNode && t.getRootNode();
        if (rootNode && rootNode.host && rootNode.host.isContentEditable) return true;
      } catch (_) {}
      return false;
    }

    const onKeyDown = (e) => {
      if (e.defaultPrevented) return;
      if (e.isComposing) return;
      if (isEditableTarget(e.target)) return;

      const code = e.code;
      const mode = getCurrentMode();
      const isAltOnly = e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (code === 'Digit1') {
          e.preventDefault();
          handleOpacity(e.shiftKey ? -0.01 : -0.05, mode);
          return;
        }
        if (code === 'Digit2') {
          e.preventDefault();
          handleOpacity(e.shiftKey ? 0.01 : 0.05, mode);
          return;
        }
      }

      if (isAltOnly) {
        if (code === 'Period') {
          e.preventDefault();
          rotateWallpaper(+1);
          return;
        }
        if (code === 'Comma') {
          e.preventDefault();
          rotateWallpaper(-1);
          return;
        }
        if (code === 'Digit3') {
          e.preventDefault();
          cycleAdapter();
          return;
        }
        if (code === 'Digit4') {
          e.preventDefault();
          quickSave();
          return;
        }
        if (code === 'Digit5') {
          e.preventDefault();
          try { openConfig(); } catch (_) {}
          return;
        }
        if (code === 'Digit6') {
          e.preventDefault();
          try {
            Promise.resolve(refreshManifest(true)).then(() => scheduleApply());
          } catch (_) {}
          return;
        }
        if (code === 'Digit7') {
          e.preventDefault();
          toggleVisibility(mode);
          return;
        }
        if (code === 'Digit0') {
          e.preventDefault();
          resetAdjustments();
          return;
        }
        if (code === 'Slash') {
          e.preventDefault();
          try { openSearchDialog(); } catch (_) {}
          return;
        }
      }
    };

    const onKeyUp = (e) => {
      if (e.isComposing) return;
      if (isEditableTarget(e.target)) return;
      const toggleConfig = HOTKEYS.toggle || {};
      const key = (e.key || '').toLowerCase();
      const expectedKey = String(toggleConfig.key || 'b').toLowerCase();
      if (key !== expectedKey) return;

      if (toggleConfig.altKey && !e.altKey) return;
      if (toggleConfig.ctrlKey && !e.ctrlKey) return;
      if (toggleConfig.metaKey && !e.metaKey) return;
      if (toggleConfig.shiftKey && !e.shiftKey) return;

      toggleVisibility(getCurrentMode());
    };

    function attachListeners() {
      if (listenersAttached) return;
      window.addEventListener('keydown', onKeyDown, { passive: false, capture: true });
      window.addEventListener('keyup', onKeyUp, { passive: false, capture: true });
      listenersAttached = true;
      log('Hotkeys initialised');
    }

    function detachListeners() {
      if (!listenersAttached) return;
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('keyup', onKeyUp, { capture: true });
      listenersAttached = false;
    }

    return {
      updateConfig(cfg) {
        updateFromConfig(cfg);
        attachListeners();
      },
      syncOpacity(value) {
        setCurrentOpacity(value);
      },
      dispose() {
        detachListeners();
      }
    };
  };

})(typeof window !== 'undefined' ? window : this);
