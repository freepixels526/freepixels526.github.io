(function(global){
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  function showDebugToast(msg){
    try {
      const id = 'kabegami-debug-toast';
      let div = document.getElementById(id);
      if (!div) {
        div = document.createElement('div');
        div.id = id;
        Object.assign(div.style, {
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 2147483647,
          background: 'rgba(0,0,0,0.8)',
          color: '#fff',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: 'monospace',
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.35)'
        });
        document.documentElement.appendChild(div);
      }
      div.textContent = msg;
      div.style.opacity = '1';
      clearTimeout(div._hideTimer);
      div._hideTimer = setTimeout(() => { div.style.opacity = '0'; }, 1500);
    } catch (_) {}
  }

  KB.showDebugToast = KB.showDebugToast || showDebugToast;

  KB.initDebugProbes = KB.initDebugProbes || function initDebugProbes(options){
    const { enabled = false, log = (() => {}), info = (() => {}) } = options || {};
    if (!enabled) return;

    const handleKeyDown = (e) => {
      if (!e.altKey) return;
      const tgt = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
      const msg = `Alt+${(e.key || '').toString()}  code=${e.code || ''}  tgt=${tgt}${e.isComposing ? '  (IME)' : ''}`;
      try { showDebugToast(msg); } catch (_) {}
      info('ALT keydown probe', {
        key: e.key,
        code: e.code,
        alt: e.altKey,
        shift: e.shiftKey,
        ctrl: e.ctrlKey,
        meta: e.metaKey,
        isComposing: e.isComposing,
        target: tgt
      });
    };

    const handleKeyUp = (e) => {
      if (!e.altKey && (e.key !== 'Alt')) return;
      const tgt = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
      const msg = `↑ keyup: ${(e.key || '').toString()}  code=${e.code || ''}`;
      try { showDebugToast(msg); } catch (_) {}
      info('ALT keyup probe', {
        key: e.key,
        code: e.code,
        alt: e.altKey,
        shift: e.shiftKey,
        ctrl: e.ctrlKey,
        meta: e.metaKey,
        isComposing: e.isComposing,
        target: tgt
      });
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true, passive: true });
    log('Debug probes initialised');
  };

})(typeof window !== 'undefined' ? window : this);
