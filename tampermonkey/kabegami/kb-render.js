(function(global){
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  KB.initRenderer = KB.initRenderer || function initRenderer(ctx) {
    const {
      info = () => {},
      log = () => {},
      warn = () => {},
      DEFAULTS = {},
      IDS = {},
      ensureAddStyle = (css) => {
        const style = document.createElement('style');
        style.textContent = css;
        document.documentElement.appendChild(style);
      },
      getOrCreateStyle = (id) => {
        let el = document.getElementById(id);
        if (!el) {
          el = document.createElement('style');
          el.id = id;
          document.documentElement.appendChild(el);
        }
        return el;
      },
      replaceStyle = (id, css) => {
        const el = getOrCreateStyle(id);
        el.textContent = css;
      },
      currentWallpapers = () => [],
      getHostKey = () => (typeof location !== 'undefined' ? (location.host || 'unknown-host') : 'unknown-host'),
      getHostStyle = () => ({}),
      getCurrentIndex = () => 0,
      getBlobURLForImage = (url) => Promise.resolve(url),
      revokeCurrentBlob = () => {},
      setCurrentBlobURL = () => {},
      onAfterApply = () => {},
    } = ctx || {};

    const styleBodyId = IDS.styleBody || 'kabegami-style-body';
    const styleBeforeId = IDS.styleBefore || 'kabegami-style-before';
    const overlayId = IDS.overlay || 'kabegami-overlay';

    let lastRenderState = null;

    function clearAll() {
      log('全適用解除を開始');
      const byId = (id) => document.getElementById(id);
      for (const id of [styleBodyId, styleBeforeId]) {
        const el = byId(id);
        if (el) {
          el.remove();
          info('スタイルを削除しました', id);
        }
      }
      const ov = byId(overlayId);
      if (ov) {
        ov.remove();
        info('オーバーレイを削除しました');
      }
      document.documentElement.classList.remove('kabegami-has-before');
      log('全適用解除が完了しました');
    }

    function preloadImages(urls) {
      for (const u of urls) {
        try {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = u;
          (document.head || document.documentElement).appendChild(link);
          const img = new Image();
          img.src = u;
          if (img.decode) img.decode().catch(() => {});
        } catch (_) {}
      }
    }

    function warmUpAroundIndex(idx) {
      const list = currentWallpapers();
      if (!Array.isArray(list) || !list.length) return;
      const n = list.length;
      const get = (k) => {
        const entry = list[(k + n) % n] || {};
        return entry.url;
      };
      const urls = [get(idx), get(idx + 1), get(idx - 1)].filter(Boolean);
      urls.forEach((u) => {
        try { getBlobURLForImage(u).catch(() => {}); }
        catch (_) {}
      });
      preloadImages(urls);
    }

    function cssUrl(u) {
      return String(u || '').replace(/"/g, '\\"');
    }

    function computeSizeWithScale(base, scale) {
      if (!scale || !(scale > 0)) return base;
      let pct = 100;
      if (typeof base === 'string') {
        const m = base.trim().match(/^(\d+(?:\.\d+)?)%$/);
        if (m) {
          pct = parseFloat(m[1]);
        }
      }
      const scaled = Math.max(1, Math.min(1000, pct * scale));
      return scaled + '%';
    }

    function computePositionWithOffset(pos, dx = 0, dy = 0) {
      const map = { left: '0%', center: '50%', right: '100%', top: '0%', bottom: '100%' };
      let xs = '50%';
      let ys = '50%';
      if (typeof pos === 'string') {
        const parts = pos.trim().split(/\s+/);
        if (parts.length === 1) parts.push('50%');
        const xRaw = parts[0];
        const yRaw = parts[1];
        xs = map[xRaw] || xRaw;
        ys = map[yRaw] || yRaw;
      }
      const dxpx = dx ? ` + ${dx}px` : '';
      const dypx = dy ? ` + ${dy}px` : '';
      const x = dxpx ? `calc(${xs}${dxpx})` : xs;
      const y = dypx ? `calc(${ys}${dypx})` : ys;
      return `${x} ${y}`;
    }

    function applyMode1(state) {
      replaceStyle(styleBodyId,
        `body { background-image: url('${cssUrl(state.resolvedUrl)}') !important; ` +
        `background-size: ${state.effSize} !important; background-position: ${state.effPos} !important; ` +
        `background-repeat: no-repeat !important; background-attachment: ${state.attach} !important; }\n` +
        `body::before { content: none !important; }`);
      document.documentElement.classList.remove('kabegami-has-before');
    }

    function applyMode2(state) {
      replaceStyle(styleBeforeId,
        `body { position: relative !important; }\n` +
        `body::before { content: ""; position: fixed; inset: 0; background-image: url('${cssUrl(state.resolvedUrl)}'); ` +
        `background-size: ${state.effSize}; background-position: ${state.effPos}; background-repeat: no-repeat; ` +
        `background-attachment: ${state.attach}; opacity: ${state.effOpacity}; pointer-events: none; z-index: -1; }`);
      document.documentElement.classList.add('kabegami-has-before');
    }

    function applyMode3(state) {
      let ov = document.getElementById(overlayId);
      if (!ov) {
        ov = document.createElement('div');
        ov.id = overlayId;
        ov.setAttribute('aria-hidden', 'true');
        (document.body || document.documentElement).appendChild(ov);
      }
      Object.assign(ov.style, {
        position: state.attach === 'fixed' ? 'fixed' : 'absolute',
        inset: '0',
        backgroundImage: `url('${state.resolvedUrl}')`,
        backgroundSize: state.effSize,
        backgroundPosition: state.effPos,
        backgroundRepeat: 'no-repeat',
        pointerEvents: 'none',
        zIndex: String(state.zIndex ?? DEFAULTS.zIndex ?? 9999),
        opacity: String(state.effOpacity ?? DEFAULTS.opacity ?? 0.2),
        mixBlendMode: state.blend || '',
        willChange: 'opacity',
      });
      document.documentElement.classList.remove('kabegami-has-before');
    }

    async function applyWallpaper(cfg) {
      if (!cfg || !cfg.url) return;
      info('壁紙を適用', cfg);
      const { mode, url, opacity, size, position, attach, zIndex, blend } = cfg;

      const host = getHostKey();
      const style = getHostStyle(host) || {};
      const effOpacity = (style.opacity != null) ? style.opacity : (opacity ?? DEFAULTS.opacity);
      const effSize = computeSizeWithScale(size || DEFAULTS.size, style.scale);
      const effPos = computePositionWithOffset(position || DEFAULTS.position, style.dx, style.dy);
      const sourceUrl = url;

      const sameWallpaper = lastRenderState && lastRenderState.sourceUrl === sourceUrl;
      let resolvedUrl = sameWallpaper && lastRenderState?.resolvedUrl ? lastRenderState.resolvedUrl : null;

      if (!resolvedUrl) {
        if (!sameWallpaper) {
          revokeCurrentBlob();
        }
        try {
          resolvedUrl = await getBlobURLForImage(sourceUrl);
        } catch (e) {
          warn('Failed to resolve blob URL, fallback to original', e);
          resolvedUrl = sourceUrl;
        }
        if (!sameWallpaper) {
          setCurrentBlobURL(resolvedUrl);
        }
      }

      try { window.__kabegami_last_mode = mode; } catch (_) {}
      const nextState = {
        mode,
        sourceUrl,
        resolvedUrl,
        effOpacity,
        effSize,
        effPos,
        attach,
        zIndex,
        blend,
      };

      const sameMode = lastRenderState && lastRenderState.mode === mode;
      const sameSource = lastRenderState && lastRenderState.sourceUrl === sourceUrl;

      const applyAndRecord = () => {
        if (mode === 1) {
          applyMode1(nextState);
          log('モード1を適用しました');
        } else if (mode === 2) {
          applyMode2(nextState);
          log('モード2を適用しました');
        } else {
          applyMode3(nextState);
          log('モード3を適用しました');
        }
        lastRenderState = nextState;
      };

      if (!sameMode || !sameSource) {
        clearAll();
        ensureAddStyle('html, body { min-height: 100%; }');
        applyAndRecord();
      } else {
        applyAndRecord();
      }

      try { onAfterApply(cfg); } catch (_) {}

      const idx = getCurrentIndex();
      warmUpAroundIndex(idx);
    }

    return {
      clearAll,
      applyWallpaper,
    };
  };

})(typeof window !== 'undefined' ? window : this);
