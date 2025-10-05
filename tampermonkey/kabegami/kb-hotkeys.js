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
      setOverrideMode = () => {},
      setSavedMode = () => {},
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
    } = ctx || {};

    const HOTKEYS = hotkeys || { toggle: { altKey: true, key: 'b' } };

    let listenersAttached = false;
    let currentOpacity = DEFAULTS.opacity ?? 0.2;

    const overlayId = IDS.overlay || 'kabegami-overlay';
    const styleBodyId = IDS.styleBody || 'kabegami-style-body';
    const styleBeforeId = IDS.styleBefore || 'kabegami-style-before';

    function updateFromConfig(cfg) {
      const host = getHostKey();
      const hostStyle = getHostStyle(host);
      const nextOpacity = (hostStyle.opacity != null)
        ? hostStyle.opacity
        : (cfg && cfg.opacity != null ? cfg.opacity : (DEFAULTS.opacity ?? 0.2));
      currentOpacity = Math.max(0, Math.min(1, Number(nextOpacity) || 0));
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

    function cycleMode() {
      const host = getHostKey();
      let mode = getCurrentMode();
      mode = (mode % 3) + 1;
      setOverrideMode(host, mode);
      info('hotkey cycle mode ->', mode);
      scheduleApply();
    }

    function quickSave() {
      const host = getHostKey();
      const idx = getCurrentIndex();
      setCurrentIndex(idx);
      clearOverrideIndex(host);
      const mode = getCurrentMode();
      setSavedMode(host, mode);
      info('hotkey saved index+mode', { host, idx, mode });
      alertFn(`保存しました: ${host} → #${idx} (モード=${mode})`);
      scheduleApply();
    }

    function resetAdjustments() {
      const host = getHostKey();
      const map = loadStyleMap();
      delete map[host];
      saveStyleMap(map);
      info('hotkey reset adjustments for', host);
      scheduleApply();
    }

    function handleOpacity(delta, mode) {
      const base = currentOpacity ?? (DEFAULTS.opacity ?? 0.2);
      currentOpacity = Math.max(0, Math.min(1, base + delta));
      updateHostStyle({ opacity: currentOpacity }, getHostKey());
      info('adjustOpacity (hotkey) mode', mode, 'new opacity', currentOpacity);
      if (mode === 3) {
        const ov = document.getElementById(overlayId);
        if (ov) ov.style.opacity = String(currentOpacity);
      }
      scheduleApply();
    }

    function toggleVisibility(mode) {
      info('toggleVisibility mode', mode);
      if (mode === 1) {
        const hidden = document.documentElement.classList.toggle('kabegami-hidden');
        info('mode 1 visibility toggled:', hidden);
        const css = hidden ? 'background-image: none !important;' : '';
        replaceStyle(styleBodyId, `body { ${css} }`);
      } else if (mode === 2) {
        const style = getOrCreateStyle(styleBeforeId);
        const isHidden = style.getAttribute('data-hidden') === '1';
        if (isHidden) {
          style.textContent = style.textContent.replace(
            /body::before \{[^}]*opacity:[^;]*;?/,
            (m) => m.replace(/opacity:[^;]*/, 'opacity: ' + currentOpacity)
          );
          style.setAttribute('data-hidden', '0');
          info('mode 2 visibility toggled: visible');
        } else {
          style.textContent = style.textContent.replace(
            /body::before \{/,
            'body::before { opacity: 0 !important; '
          );
          style.setAttribute('data-hidden', '1');
          info('mode 2 visibility toggled: hidden');
        }
      } else {
        const ov = document.getElementById(overlayId);
        if (!ov) return;
        ov.style.display = (ov.style.display === 'none') ? 'block' : 'none';
        info('mode 3 visibility toggled:', ov.style.display);
        if (ov.style.display !== 'none') scheduleApply();
      }
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
          cycleMode();
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
      dispose() {
        detachListeners();
      }
    };
  };

})(typeof window !== 'undefined' ? window : this);
