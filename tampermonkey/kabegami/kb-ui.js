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
    } = ctx || {};

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
    let modeButtonEl = null;

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
      el.innerHTML = '';
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

    function openOpacitySlider() {
      const host = getHostKey();
      const cur = getHostStyle(host);
      const el = ensurePopover('kabegami-pop-opacity');
      el.innerHTML = '';
      const label = document.createElement('div');
      label.textContent = 'Opacity';
      label.style.marginBottom = '4px';
      const range = document.createElement('input');
      range.type = 'range';
      range.min = '0';
      range.max = '1';
      range.step = '0.01';
      range.value = String(cur.opacity ?? 0.2);
      const value = document.createElement('div');
      value.textContent = String(range.value);
      range.addEventListener('input', () => {
        const v = parseFloat(range.value);
        value.textContent = String(v);
        updateHostStyle({ opacity: v }, host);
        applyTransform(getHostStyle(host));
      });
      el.append(label, range, value);
    }

    function openSizeSlider() {
      const host = getHostKey();
      const cur = getHostStyle(host);
      const el = ensurePopover('kabegami-pop-size');
      el.innerHTML = '';
      const label = document.createElement('div');
      label.textContent = 'Size scale (0.2x – 3.0x)';
      label.style.marginBottom = '4px';
      const range = document.createElement('input');
      range.type = 'range';
      range.min = '0.2';
      range.max = '3';
      range.step = '0.01';
      range.value = String(cur.scale ?? 1);
      const value = document.createElement('div');
      value.textContent = range.value + 'x';
      range.addEventListener('input', () => {
        const v = Math.max(0.2, Math.min(3, parseFloat(range.value)));
        value.textContent = v.toFixed(2) + 'x';
        updateHostStyle({ scale: v }, host);
        applyTransform(getHostStyle(host));
      });
      el.append(label, range, value);
    }

    function openOffsetPad() {
      const host = getHostKey();
      const cur = getHostStyle(host);
      const el = ensurePopover('kabegami-pop-offset');
      el.innerHTML = '';
      const label = document.createElement('div');
      label.textContent = 'Offset (dx, dy) [-1000px..1000px]';
      label.style.marginBottom = '6px';
      const pad = document.createElement('div');
      Object.assign(pad.style, {
        width: '200px',
        height: '200px',
        background: '#f5f5f5',
        border: '1px solid #aaa',
        position: 'relative',
        cursor: 'crosshair'
      });
      const cross = document.createElement('div');
      Object.assign(cross.style, {
        position: 'absolute',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: '#007bff',
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)'
      });
      pad.appendChild(cross);
      const infoEl = document.createElement('div');
      infoEl.style.marginTop = '6px';
      let dx = cur.dx ?? 0;
      let dy = cur.dy ?? 0;
      const toPx = (v) => Math.round(((v + 1000) / 2000) * 200);
      const fromPx = (p) => Math.round((p / 200) * 2000 - 1000);
      const updateCross = () => {
        cross.style.left = toPx(dx) + 'px';
        cross.style.top = toPx(dy) + 'px';
        infoEl.textContent = `dx=${dx}px, dy=${dy}px`;
      };
      updateCross();
      const setFromEvent = (ev) => {
        const rect = pad.getBoundingClientRect();
        const x = Math.max(0, Math.min(200, ev.clientX - rect.left));
        const y = Math.max(0, Math.min(200, ev.clientY - rect.top));
        dx = fromPx(x);
        dy = fromPx(y);
        updateCross();
        updateHostStyle({ dx, dy }, host);
        applyTransform(getHostStyle(host));
      };
      const onMove = (ev) => { setFromEvent(ev); };
      pad.addEventListener('mousedown', (ev) => {
        setFromEvent(ev);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', () => {
          window.removeEventListener('mousemove', onMove);
        }, { once: true });
      });
      el.append(label, pad, infoEl);
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
      const existing = document.getElementById(btnId);
      if (existing) {
        modeButtonEl = existing;
        updateModeIndicator(existing, getCurrentMode(), getCurrentAdapter());
        return;
      }
      const btn = document.createElement('button');
      btn.id = btnId;
      btn.title = 'アダプタ';
      btn.textContent = '';
      Object.assign(btn.style, { position: 'fixed', left: '78px', bottom: '10px' });
      styleCircleButton(btn, '#27ae60');
      updateModeIndicator(btn, getCurrentMode(), getCurrentAdapter());
      modeButtonEl = btn;
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

    function refreshModeIndicator() {
      if (!modeButtonEl) return;
      updateModeIndicator(modeButtonEl, getCurrentMode(), getCurrentAdapter());
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
      ensurePopover,
      ensureModeIndicator,
      updateModeIndicator,
      refreshModeIndicator,
      styleCircleButton,
    };

    KB.UI = Object.assign(KB.UI || {}, api);
    return api;
  };

})(typeof window !== 'undefined' ? window : this);
