// Theme effect registry and helpers
(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  let themeSignalController = null;

  function ensureThemeSignalController() {
    if (themeSignalController || typeof window === 'undefined' || typeof document === 'undefined') return;
    const docEl = document.documentElement || document.body;
    if (!docEl) return;

    const initVars = {
      '--sig-mx': '0.5',
      '--sig-my': '0.5',
      '--sig-mv': '0',
      '--sig-s-p': '0',
      '--sig-s-v': '0',
      '--sig-f-low': '0',
      '--sig-f-mid': '0',
      '--sig-f-high': '0'
    };
    for (const key in initVars) {
      if (Object.prototype.hasOwnProperty.call(initVars, key)) {
        docEl.style.setProperty(key, initVars[key]);
      }
    }

    const st = {
      mx: 0.5,
      my: 0.5,
      vx: 0,
      vy: 0,
      sp: 0,
      sv: 0,
      low: 0,
      mid: 0,
      high: 0
    };

    const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);
    const ewma = (prev, next, alpha = 0.15) => prev * (1 - alpha) + next * alpha;

    const handlePointerMove = (event) => {
      if (!event) return;
      const width = Math.max(1, window.innerWidth || 1);
      const height = Math.max(1, window.innerHeight || 1);
      const nx = event.clientX / width;
      const ny = event.clientY / height;
      st.vx = nx - st.mx;
      st.vy = ny - st.my;
      st.mx = nx;
      st.my = ny;
    };

    let lastScrollY = typeof window.scrollY === 'number' ? window.scrollY : 0;
    let lastTimestamp = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    const handleScroll = () => {
      const nowTs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const dt = Math.max(1, nowTs - lastTimestamp) / 1000;
      lastTimestamp = nowTs;
      const currentY = typeof window.scrollY === 'number' ? window.scrollY : 0;
      const dy = currentY - lastScrollY;
      lastScrollY = currentY;
      const maxScrollable = Math.max(1, (document.body?.scrollHeight || 1) - (window.innerHeight || 0));
      st.sp = clamp01(currentY / maxScrollable);
      const instantaneous = dy / dt;
      st.sv = ewma(st.sv, instantaneous, 0.25);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    const tick = () => {
      st.vx *= 0.9;
      st.vy *= 0.9;
      st.sv = ewma(st.sv, 0, 0.08);

      const mv = Math.hypot(st.vx, st.vy);
      const lowInput = Math.min(1, mv * 2.0);
      const midInput = Math.min(1, Math.abs(st.vx - st.vy) * 2.0);
      const highInput = Math.min(1, Math.abs(st.vx + st.vy) * 2.0);

      st.low = ewma(st.low, lowInput, 0.1);
      st.mid = ewma(st.mid, midInput, 0.1);
      st.high = ewma(st.high, highInput, 0.1);

      docEl.style.setProperty('--sig-mx', clamp01(st.mx).toFixed(3));
      docEl.style.setProperty('--sig-my', clamp01(st.my).toFixed(3));
      docEl.style.setProperty('--sig-mv', Math.min(1, mv * 4).toFixed(3));
      docEl.style.setProperty('--sig-s-p', clamp01(st.sp).toFixed(3));
      docEl.style.setProperty('--sig-s-v', Math.min(1, Math.abs(st.sv) / 800).toFixed(3));
      docEl.style.setProperty('--sig-f-low', clamp01(st.low).toFixed(3));
      docEl.style.setProperty('--sig-f-mid', clamp01(st.mid).toFixed(3));
      docEl.style.setProperty('--sig-f-high', clamp01(st.high).toFixed(3));

      themeSignalController.raf = window.requestAnimationFrame(tick);
    };

    themeSignalController = {
      docEl,
      pointerHandler: handlePointerMove,
      scrollHandler: handleScroll,
      raf: window.requestAnimationFrame(tick)
    };
  }

  KB.ensureThemeSignals = KB.ensureThemeSignals || ensureThemeSignalController;

  const withThemeSignals = (config) => {
    const clone = Object.assign({ ensure: ensureThemeSignalController }, config);
    if (Array.isArray(config.css)) {
      clone.css = config.css.slice();
    }
    if (Array.isArray(config.extra)) {
      clone.extra = Object.freeze(config.extra.slice());
    }
    return Object.freeze(clone);
  };

  const baseEffects = Object.freeze({
    glass: Object.freeze({
      id: 'glass',
      label: 'Glass Blur',
      description: '半透明のガラス調エフェクト (明るめ)',
      css: [
        'background-color: rgba(255, 255, 255, 0.22) !important',
        'backdrop-filter: blur(14px) saturate(160%) !important',
        '-webkit-backdrop-filter: blur(14px) saturate(160%) !important',
        'border-radius: 12px !important',
        'box-shadow: 0 12px 40px rgba(15, 23, 42, 0.24) !important',
        'color: inherit !important'
      ]
    }),
    darkGlass: Object.freeze({
      id: 'darkGlass',
      label: 'Dark Glass',
      description: '暗めのガラス調 (濃色背景 + 文字色補正)',
      css: [
        'background-color: rgba(15, 23, 42, 0.65) !important',
        'color: rgba(248, 250, 252, 0.94) !important',
        'backdrop-filter: blur(10px) saturate(160%) !important',
        '-webkit-backdrop-filter: blur(10px) saturate(160%) !important',
        'border-radius: 12px !important',
        'box-shadow: 0 10px 30px rgba(15, 23, 42, 0.35) !important'
      ]
    }),
    transparent: Object.freeze({
      id: 'transparent',
      label: 'Transparent',
      description: '完全に透過させるシンプルなスタイル',
      css: [
        'background-color: transparent !important',
        'background-image: none !important',
        'box-shadow: none !important',
        'border: none !important'
      ]
    }),
    softCard: Object.freeze({
      id: 'softCard',
      label: 'Soft Card',
      description: '淡いカード風 (ほんのり白背景 + 影)',
      css: [
        'background-color: rgba(255, 255, 255, 0.82) !important',
        'box-shadow: 0 8px 28px rgba(15, 23, 42, 0.18) !important',
        'border-radius: 14px !important',
        'border: 1px solid rgba(148, 163, 184, 0.35) !important'
      ]
    }),
    darkSoftCard: Object.freeze({
      id: 'darkSoftCard',
      label: 'Dark Soft Card',
      description: '濃紺のソフトカード。文字を淡く光らせます',
      css: [
        'background: linear-gradient(135deg, rgba(15,23,42,0.82), rgba(30,41,59,0.88)) !important',
        'color: rgba(226, 232, 240, 0.96) !important',
        'border-radius: 16px !important',
        'border: 1px solid rgba(148, 163, 184, 0.25) !important',
        'box-shadow: 0 12px 34px rgba(8, 47, 73, 0.45), 0 0 0 1px rgba(148, 163, 184, 0.25) inset !important',
        'backdrop-filter: blur(6px) saturate(120%) !important',
        '-webkit-backdrop-filter: blur(6px) saturate(120%) !important'
      ]
    }),
    holoGlow: Object.freeze({
      id: 'holoGlow',
      label: 'Hologram Glow',
      description: 'ホログラムっぽいグラデーションとネオン縁取り',
      css: [
        'background: linear-gradient(135deg, rgba(236, 72, 153, 0.28), rgba(14, 165, 233, 0.22)) !important',
        'border-radius: 18px !important',
        'border: 1px solid rgba(56, 189, 248, 0.55) !important',
        'box-shadow: 0 0 20px rgba(56, 189, 248, 0.45), 0 0 0 1px rgba(236, 72, 153, 0.35) inset !important',
        'color: rgba(248, 250, 252, 0.95) !important',
        'text-shadow: 0 0 6px rgba(236, 72, 153, 0.65) !important'
      ]
    }),
    vaporWave: Object.freeze({
      id: 'vaporWave',
      label: 'Vaporwave',
      description: '淡いネオンサンセット風グラデーション + ぼかし',
      css: [
        'background: linear-gradient(120deg, rgba(244, 114, 182, 0.78), rgba(129, 140, 248, 0.68)) !important',
        'border-radius: 24px !important',
        'border: 1px solid rgba(129, 140, 248, 0.35) !important',
        'box-shadow: 0 22px 44px rgba(99, 102, 241, 0.35) !important',
        'color: rgba(15, 23, 42, 0.92) !important',
        'backdrop-filter: blur(20px) saturate(150%) !important',
        '-webkit-backdrop-filter: blur(20px) saturate(150%) !important'
      ]
    }),
    blueprint: Object.freeze({
      id: 'blueprint',
      label: 'Blueprint Grid',
      description: 'ブループリント風のグリッドパターン + ホワイトテキスト',
      css: [
        'background-color: rgba(15, 118, 110, 0.82) !important',
        'background-image: linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px) !important',
        'background-size: 18px 18px !important',
        'color: rgba(236, 253, 245, 0.96) !important',
        'text-transform: uppercase !important',
        'letter-spacing: 0.08em !important',
        'border-radius: 12px !important',
        'box-shadow: 0 14px 28px rgba(13, 148, 136, 0.35) !important'
      ]
    }),
    retroTerminal: Object.freeze({
      id: 'retroTerminal',
      label: 'Retro Terminal',
      description: 'レトロPC風の暗緑背景 + モノスペース書体',
      css: [
        'background-color: rgba(12, 74, 110, 0.85) !important',
        'color: rgba(163, 230, 53, 0.92) !important',
        'font-family: "Fira Code", Menlo, Consolas, monospace !important',
        'letter-spacing: 0.06em !important',
        'text-shadow: 0 0 3px rgba(163, 230, 53, 0.75) !important',
        'border-radius: 10px !important',
        'box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2) inset, 0 12px 24px rgba(8, 47, 73, 0.45) !important'
      ]
    }),
    cosmic: Object.freeze({
      id: 'cosmic',
      label: 'Cosmic Dust',
      description: '宇宙塵のような粒子ノイズを重ねた漆黒スタイル',
      css: [
        'background-color: rgba(2, 6, 23, 0.96) !important',
        'background-image: radial-gradient(circle at top left, rgba(59, 130, 246, 0.28) 0%, transparent 55%), radial-gradient(circle at bottom right, rgba(236, 72, 153, 0.22) 0%, transparent 55%), url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\' viewBox=\'0 0 80 80\'%3E%3Ccircle cx=\'2\' cy=\'2\' r=\'2\' fill=\'rgba(255,255,255,0.16)\'/%3E%3C/svg%3E") !important',
        'background-size: auto, auto, 80px 80px !important',
        'color: rgba(248, 250, 252, 0.92) !important',
        'border-radius: 18px !important',
        'border: 1px solid rgba(59, 130, 246, 0.2) !important',
        'box-shadow: 0 18px 48px rgba(15, 23, 42, 0.6) !important'
      ]
    }),
    frostedIce: Object.freeze({
      id: 'frostedIce',
      label: 'Frosted Ice',
      description: '薄氷のような白銀グラデーションと強いぼかしで柔らかい印象に仕上げます。',
      css: [
        'background: linear-gradient(145deg, rgba(224, 244, 255, 0.65), rgba(167, 209, 235, 0.55)) !important',
        'backdrop-filter: blur(18px) saturate(140%) !important',
        '-webkit-backdrop-filter: blur(18px) saturate(140%) !important',
        'border: 1px solid rgba(226, 247, 255, 0.6) !important',
        'border-radius: 14px !important',
        'box-shadow: 0 18px 40px rgba(59, 130, 246, 0.16) !important',
        'color: rgba(15, 23, 42, 0.82) !important'
      ]
    }),
    stainedGlass: Object.freeze({
      id: 'stainedGlass',
      label: 'Stained Glass',
      description: '鮮やかなガラス片を組み合わせたステンドグラス風スタイル。',
      css: [
        'background-color: rgba(24, 24, 35, 0.65) !important',
        'background-image: radial-gradient(circle at 20% 20%, rgba(236, 72, 153, 0.55), transparent 55%), radial-gradient(circle at 80% 25%, rgba(59, 130, 246, 0.5), transparent 60%), radial-gradient(circle at 55% 75%, rgba(16, 185, 129, 0.45), transparent 58%), radial-gradient(circle at 15% 80%, rgba(249, 115, 22, 0.5), transparent 62%) !important',
        'background-blend-mode: screen, screen, screen, screen !important',
        'border: 2px solid rgba(17, 24, 39, 0.85) !important',
        'border-radius: 18px !important',
        'box-shadow: 0 12px 32px rgba(17, 24, 39, 0.45) !important',
        'color: rgba(243, 244, 246, 0.96) !important',
        'backdrop-filter: blur(6px) saturate(125%) !important',
        '-webkit-backdrop-filter: blur(6px) saturate(125%) !important'
      ]
    }),
    ribbedGlass: Object.freeze({
      id: 'ribbedGlass',
      label: 'Ribbed Glass',
      description: '凹凸のある曇りガラスをイメージした縦スリットのテクスチャ。',
      css: [
        'background-image: linear-gradient(90deg, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.08) 40%, rgba(255, 255, 255, 0.38) 80%), linear-gradient(135deg, rgba(148, 163, 184, 0.22), rgba(226, 232, 240, 0.2)) !important',
        'background-size: 16px 100%, cover !important',
        'background-color: rgba(241, 245, 249, 0.35) !important',
        'backdrop-filter: blur(8px) saturate(130%) !important',
        '-webkit-backdrop-filter: blur(8px) saturate(130%) !important',
        'border-radius: 16px !important',
        'border: 1px solid rgba(148, 163, 184, 0.4) !important',
        'box-shadow: 0 14px 36px rgba(71, 85, 105, 0.18) !important',
        'color: rgba(30, 41, 59, 0.88) !important'
      ]
    }),
    pebbledGlass: Object.freeze({
      id: 'pebbledGlass',
      label: 'Pebbled Glass',
      description: '粒状の揺らぎを重ねた曇りガラス風スタイル。',
      css: [
        'background-color: rgba(248, 250, 252, 0.38) !important',
        'background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\' viewBox=\'0 0 60 60\'%3E%3Cg fill=\'rgba(148,163,184,0.22)\'%3E%3Ccircle cx=\'8\' cy=\'7\' r=\'3\'/%3E%3Ccircle cx=\'30\' cy=\'22\' r=\'4\'/%3E%3Ccircle cx=\'48\' cy=\'15\' r=\'2.5\'/%3E%3Ccircle cx=\'18\' cy=\'38\' r=\'2.6\'/%3E%3Ccircle cx=\'42\' cy=\'45\' r=\'3.2\'/%3E%3Ccircle cx=\'10\' cy=\'52\' r=\'2.2\'/%3E%3C/g%3E%3C/svg%3E") !important',
        'background-size: 70px 70px !important',
        'backdrop-filter: blur(10px) saturate(135%) !important',
        '-webkit-backdrop-filter: blur(10px) saturate(135%) !important',
        'border-radius: 18px !important',
        'border: 1px solid rgba(203, 213, 225, 0.55) !important',
        'box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45), 0 14px 30px rgba(100, 116, 139, 0.22) !important',
        'color: rgba(15, 23, 42, 0.82) !important'
      ]
    }),
    marbledOnyx: Object.freeze({
      id: 'marbledOnyx',
      label: 'Marbled Onyx',
      description: '黒曜石のような深いグラデーションと光の筋を重ねた重厚な表情。',
      css: [
        'background: linear-gradient(135deg, rgba(12, 14, 18, 0.94), rgba(26, 31, 38, 0.9)) !important',
        'background-image: radial-gradient(circle at 20% 25%, rgba(99, 92, 75, 0.18), transparent 55%), radial-gradient(circle at 80% 60%, rgba(59, 130, 246, 0.14), transparent 58%) !important',
        'color: rgba(226, 232, 240, 0.9) !important',
        'border-radius: 20px !important',
        'border: 1px solid rgba(148, 163, 184, 0.25) !important',
        'box-shadow: 0 18px 42px rgba(8, 15, 26, 0.55) !important',
        'text-shadow: 0 0 14px rgba(59, 130, 246, 0.25) !important'
      ]
    }),
    motherOfPearl: Object.freeze({
      id: 'motherOfPearl',
      label: 'Mother of Pearl',
      description: '柔らかなパステルと干渉色のような輝きを重ねた優美なスタイル。',
      css: [
        'background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.72), rgba(248, 247, 255, 0.65)), linear-gradient(45deg, rgba(240, 171, 252, 0.35), rgba(125, 211, 252, 0.25), rgba(165, 243, 252, 0.35)) !important',
        'background-blend-mode: screen !important',
        'border-radius: 18px !important',
        'border: 1px solid rgba(244, 244, 255, 0.8) !important',
        'box-shadow: 0 12px 30px rgba(191, 219, 254, 0.4) !important',
        'color: rgba(30, 64, 175, 0.8) !important'
      ]
    }),
    vellumPaper: Object.freeze({
      id: 'vellumPaper',
      label: 'Vellum Paper',
      description: '紙の質感を再現した柔らかな半透明スタイル。',
      css: [
        'background-color: rgba(250, 249, 246, 0.9) !important',
        'background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\' viewBox=\'0 0 80 80\'%3E%3Crect width=\'80\' height=\'80\' fill=\'rgba(0,0,0,0.02)\'/%3E%3Ccircle cx=\'6\' cy=\'14\' r=\'0.9\' fill=\'rgba(35,35,35,0.04)\'/%3E%3Ccircle cx=\'54\' cy=\'44\' r=\'1.1\' fill=\'rgba(35,35,35,0.04)\'/%3E%3Ccircle cx=\'28\' cy=\'62\' r=\'0.8\' fill=\'rgba(35,35,35,0.04)\'/%3E%3C/svg%3E") !important',
        'background-size: 120px 120px !important',
        'border-radius: 12px !important',
        'border: 1px solid rgba(214, 211, 209, 0.8) !important',
        'box-shadow: 0 8px 22px rgba(15, 23, 42, 0.12) !important',
        'color: rgba(30, 41, 59, 0.88) !important'
      ]
    }),
    wovenFabric: Object.freeze({
      id: 'wovenFabric',
      label: 'Woven Fabric',
      description: '細かな織り模様と柔らかい陰影を持つファブリック調スタイル。',
      css: [
        'background-color: rgba(226, 232, 240, 0.92) !important',
        'background-image: repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.08) 0px, rgba(148, 163, 184, 0.08) 2px, transparent 2px, transparent 4px), repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.08) 0px, rgba(148, 163, 184, 0.08) 2px, transparent 2px, transparent 4px) !important',
        'border-radius: 16px !important',
        'border: 1px solid rgba(148, 163, 184, 0.35) !important',
        'box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5), 0 10px 26px rgba(71, 85, 105, 0.18) !important',
        'color: rgba(30, 41, 59, 0.9) !important'
      ]
    }),
    brushedMetal: Object.freeze({
      id: 'brushedMetal',
      label: 'Brushed Metal',
      description: '金属のヘアライン仕上げをイメージしたクールな面処理。',
      css: [
        'background-image: linear-gradient(90deg, rgba(203, 213, 225, 0.18) 0%, rgba(148, 163, 184, 0.28) 15%, rgba(203, 213, 225, 0.18) 30%), linear-gradient(135deg, rgba(226, 232, 240, 0.85), rgba(148, 163, 184, 0.8)) !important',
        'background-size: 14px 100%, cover !important',
        'color: rgba(30, 41, 59, 0.85) !important',
        'border-radius: 14px !important',
        'border: 1px solid rgba(148, 163, 184, 0.5) !important',
        'box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35), 0 14px 30px rgba(15, 23, 42, 0.28) !important',
        'text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4) !important'
      ]
    }),
    carbonFiber: Object.freeze({
      id: 'carbonFiber',
      label: 'Carbon Fiber',
      description: 'カーボン調の編み込みパターンで近未来的な質感を演出します。',
      css: [
        'background-color: #0f172a !important',
        'background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 2px, transparent 2px, transparent 6px), repeating-linear-gradient(135deg, rgba(15,23,42,0.45) 0px, rgba(15,23,42,0.45) 3px, transparent 3px, transparent 6px) !important',
        'background-blend-mode: multiply !important',
        'border-radius: 14px !important',
        'border: 1px solid rgba(30, 48, 80, 0.7) !important',
        'box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), 0 14px 32px rgba(8, 15, 26, 0.6) !important',
        'color: rgba(191, 219, 254, 0.92) !important'
      ]
    }),
    neonAcrylic: Object.freeze({
      id: 'neonAcrylic',
      label: 'Neon Acrylic',
      description: 'アクリル板にネオンの縁取りを加えた鮮烈なカードデザイン。',
      css: [
        'background: linear-gradient(120deg, rgba(59, 130, 246, 0.28), rgba(244, 114, 182, 0.28)) !important',
        'backdrop-filter: blur(12px) saturate(160%) !important',
        '-webkit-backdrop-filter: blur(12px) saturate(160%) !important',
        'border-radius: 20px !important',
        'border: 1px solid rgba(56, 189, 248, 0.45) !important',
        'box-shadow: 0 0 24px rgba(56, 189, 248, 0.45), 0 0 0 2px rgba(244, 114, 182, 0.35) inset !important',
        'color: rgba(248, 250, 252, 0.95) !important',
        'text-shadow: 0 0 10px rgba(56, 189, 248, 0.6) !important'
      ]
    }),
    butterflyWeave: withThemeSignals({
      id: 'butterflyWeave',
      label: 'Butterfly Weave',
      description: 'バタフライ段で交差する光帯の織り模様。',
      css: [
        'position: relative !important',
        'overflow: hidden !important',
        'background: radial-gradient(120% 140% at 50% 10%, rgba(59,130,246,0.10), rgba(15,23,42,0.50)) !important',
        'border-radius: 18px !important',
        'border: 1px solid rgba(148,163,184,0.30) !important',
        'box-shadow: 0 16px 40px rgba(2,6,23,0.45) !important',
        'color: rgba(241,245,249,0.95) !important'
      ],
      extra: [
        ({ selectors, normalized }) => {
          const safe = normalized.id.replace(/[^a-zA-Z0-9_-]/g, '_');
          const pseudo = selectors.map((s) => `${s}::before`).join(',\n');
          return `${pseudo} {
  content: '';
  position: absolute;
  inset: -20%;
  background:
    repeating-linear-gradient(calc(20deg + (var(--sig-mx, .5) * 30deg)),
      rgba(56,189,248,0.12) 0 8px, transparent 8px 16px),
    repeating-linear-gradient(calc(-20deg - (var(--sig-my, .5) * 30deg)),
      rgba(236,72,153,0.10) 0 10px, transparent 10px 20px);
  mix-blend-mode: screen;
  filter: blur(calc(6px + 10px * var(--sig-mv, 0)));
  opacity: calc(.45 + .35 * var(--sig-s-p, 0));
  animation: weave-bfly-${safe} 18s ease-in-out infinite;
  pointer-events: none;
}
@keyframes weave-bfly-${safe} {
  0% { transform: rotate(0deg) scale(1.10); }
  25% { transform: rotate(6deg) scale(1.05); }
  50% { transform: rotate(-4deg) scale(1.12); }
  75% { transform: rotate(5deg) scale(1.06); }
  100% { transform: rotate(0deg) scale(1.10); }
}`;
        }
      ]
    }),
    hadamardVeil: withThemeSignals({
      id: 'hadamardVeil',
      label: 'Hadamard Veil',
      description: 'ハダマード干渉の薄いベールが羽のように揺れる。',
      css: [
        'position: relative !important',
        'overflow: hidden !important',
        'border-radius: 16px !important',
        'border: 1px solid rgba(148,163,184,0.28) !important',
        'background-color: rgba(2,6,23,0.70) !important',
        'color: rgba(248,250,252,0.92) !important'
      ],
      extra: [
        ({ selectors, normalized }) => {
          const safe = normalized.id.replace(/[^a-zA-Z0-9_-]/g, '_');
          const pseudo = selectors.map((s) => `${s}::after`).join(',\n');
          return `${pseudo} {
  content: '';
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(120% 80% at 20% 30%, rgba(59,130,246, calc(.08 + .6 * var(--sig-f-low, 0))), transparent 60%),
    radial-gradient(120% 80% at 80% 70%, rgba(236,72,153, calc(.06 + .6 * var(--sig-f-high, 0))), transparent 60%);
  mix-blend-mode: screen;
  filter: blur(calc(10px + 14px * var(--sig-f-mid, 0)));
  opacity: calc(.35 + .4 * (var(--sig-f-low, 0) * .6 + var(--sig-f-high, 0) * .4));
  animation: veil-hadamard-${safe} 14s ease-in-out infinite alternate;
  pointer-events: none;
}
@keyframes veil-hadamard-${safe} {
  0% { transform: rotate(0deg) translate(0%, 0%); }
  50% { transform: rotate(4deg) translate(3%, -2%); }
  100% { transform: rotate(-3deg) translate(-2%, 3%); }
}`;
        }
      ]
    }),
    bitonicGrid: withThemeSignals({
      id: 'bitonicGrid',
      label: 'Bitonic Grid',
      description: 'ビトニックソートの段で位相が入れ替わる設計図グリッド。',
      css: [
        'background-image: linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px) !important',
        'background-size: calc(14px + 10px * (1 + var(--sig-s-p, 0))) calc(14px + 10px * (1 + var(--sig-s-p, 0))) !important',
        'background-position: calc(10px * sin(var(--sig-s-p, 0) * 3.1415)) calc(8px * cos(var(--sig-s-p, 0) * 3.1415)) !important',
        'background-color: rgba(15, 118, 110, 0.78) !important',
        'border-radius: 14px !important',
        'border: 1px solid rgba(148, 163, 184, 0.35) !important',
        'box-shadow: 0 14px 28px rgba(13, 148, 136, 0.30) !important',
        'color: rgba(236, 253, 245, 0.95) !important'
      ],
      extra: [
        ({ selectors }) => `${selectors.join(',\n')} {
  box-shadow: 0 10px calc(24px + 10px * min(1, abs(var(--sig-s-v, 0)))) rgba(15, 23, 42, 0.25) !important;
}`
      ]
    }),
    quantumRipple: withThemeSignals({
      id: 'quantumRipple',
      label: 'Quantum Ripple',
      description: '2^k段で倍化するクリック波紋。干渉で縁が際立つ。',
      css: [
        'position: relative !important',
        'overflow: hidden !important',
        'background: linear-gradient(135deg, rgba(59, 130, 246, 0.16), rgba(236, 72, 153, 0.16)) !important',
        'border-radius: 16px !important',
        'border: 1px solid rgba(148,163,184,0.35) !important',
        'box-shadow: 0 12px 30px rgba(15,23,42,0.35) !important',
        'transition: transform 0.18s ease !important',
        'color: rgba(15,23,42,0.9) !important'
      ],
      extra: [
        ({ selectors, normalized }) => {
          const safe = normalized.id.replace(/[^a-zA-Z0-9_-]/g, '_');
          const pseudo = selectors.map((s) => `${s}::after`).join(',\n');
          const activeSel = selectors.map((s) => `${s}:active`).join(',\n');
          const activePseudo = selectors.map((s) => `${s}:active::after`).join(',\n');
          return `${pseudo} {
  content: '';
  position: absolute;
  left: calc(var(--sig-mx, .5) * 100%);
  top: calc(var(--sig-my, .5) * 100%);
  width: 12px;
  height: 12px;
  transform: translate(-50%, -50%) scale(0);
  background:
    radial-gradient(circle, rgba(56,189,248,0.45) 0%, rgba(56,189,248,0) 60%),
    radial-gradient(circle, rgba(236,72,153,0.35) 0%, rgba(236,72,153,0) 60%),
    radial-gradient(circle, rgba(165,243,252,0.30) 0%, rgba(165,243,252,0) 60%);
  filter: blur(1px);
  opacity: 0;
  pointer-events: none;
  transition: transform 0.55s ease, opacity 0.55s ease;
}

${activeSel} {
  transform: scale(0.985);
}

${activePseudo} {
  transform: translate(-50%, -50%) scale(18);
  opacity: 0.45;
  animation: qr-bfly-${safe} 0.9s ease-out 1;
}

@keyframes qr-bfly-${safe} {
  0% { filter: blur(0px); }
  50% { filter: blur(2px); }
  100% { filter: blur(0.5px); }
}`;
        }
      ]
    }),
    karatsubaSplit: withThemeSignals({
      id: 'karatsubaSplit',
      label: 'Karatsuba Split',
      description: '2分割×再帰の“掛け合わせ”を光と角丸で可視化。',
      css: [
        'position: relative !important',
        'background: linear-gradient(90deg, rgba(59,130,246,0.18), rgba(59,130,246,0.08)), linear-gradient(0deg, rgba(236,72,153,0.16), rgba(236,72,153,0.06)), radial-gradient(120% 100% at 50% 0%, rgba(165,243,252,0.18), rgba(2,6,23,0.6)) !important',
        'border-radius: calc(12px + 8px * var(--ks-depth, 0.3)) !important',
        'border: 1px solid rgba(148, 163, 184, 0.35) !important',
        'box-shadow: 0 14px calc(28px + 12px * var(--sig-mv, 0)) rgba(15,23,42,0.35) !important',
        'color: rgba(241,245,249,0.95) !important'
      ],
      extra: [
        ({ selectors }) => `${selectors.join(',\n')} {
  --ks-depth: calc(0.3 + 0.7 * var(--sig-s-p, 0));
}`
      ]
    }),
    auroraCascade: withThemeSignals({
      id: 'auroraCascade',
      label: 'Aurora Cascade',
      description: 'ゆらめくオーロラがランダムに流れる幻想的なライトショー。',
      css: [
        'position: relative !important',
        'overflow: hidden !important',
        'color: rgba(248, 250, 252, 0.96) !important',
        'background: radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.22), transparent 60%), radial-gradient(circle at 80% 60%, rgba(236, 72, 153, 0.2), transparent 58%), rgba(15, 23, 42, 0.45) !important',
        'border-radius: 20px !important',
        'border: 1px solid rgba(148, 163, 184, 0.28) !important',
        'box-shadow: 0 16px 36px rgba(30, 64, 175, 0.28) !important',
        'backdrop-filter: blur(12px) saturate(140%) !important',
        '-webkit-backdrop-filter: blur(12px) saturate(140%) !important'
      ],
      extra: [
        ({ selectors, normalized }) => {
          const pseudoSel = selectors.map((s) => `${s}::before`).join(',\n');
          const safe = normalized.id.replace(/[^a-zA-Z0-9_-]/g, '_');
          return `${pseudoSel} {
  content: '';
  position: absolute;
  inset: -30%;
  background: conic-gradient(from 0deg, rgba(59, 130, 246, 0.32), rgba(236, 72, 153, 0.28), rgba(165, 243, 252, 0.26), rgba(236, 72, 153, 0.28), rgba(59, 130, 246, 0.32));
  filter: blur(42px);
  opacity: 0.75;
  animation: aurora-shift-${safe} 18s ease-in-out infinite alternate;
  pointer-events: none;
}

@keyframes aurora-shift-${safe} {
  0% { transform: translate(-10%, -8%) rotate(0deg) scale(1.1); }
  25% { transform: translate(8%, -4%) rotate(12deg) scale(1.05); opacity: 0.85; }
  50% { transform: translate(12%, 6%) rotate(-6deg) scale(1.15); opacity: 0.7; }
  75% { transform: translate(-6%, 10%) rotate(8deg) scale(1.08); opacity: 0.9; }
  100% { transform: translate(-12%, -6%) rotate(-4deg) scale(1.2); opacity: 0.75; }
}`;
        }
      ]
    }),
    nebulaFlicker: withThemeSignals({
      id: 'nebulaFlicker',
      label: 'Nebula Flicker',
      description: '星雲の微光がランダムに瞬く幻想的なスタイル。',
      css: [
        'position: relative !important',
        'overflow: hidden !important',
        'color: rgba(240, 249, 255, 0.92) !important',
        'background: radial-gradient(circle at 15% 20%, rgba(147, 197, 253, 0.35), transparent 58%), radial-gradient(circle at 70% 75%, rgba(217, 119, 6, 0.28), transparent 60%), rgba(15, 23, 42, 0.8) !important',
        'border-radius: 18px !important',
        'border: 1px solid rgba(96, 165, 250, 0.25) !important',
        'box-shadow: 0 16px 40px rgba(17, 24, 39, 0.55) !important'
      ],
      extra: [
        ({ selectors, normalized }) => {
          const pseudoSel = selectors.map((s) => `${s}::after`).join(',\n');
          const safe = normalized.id.replace(/[^a-zA-Z0-9_-]/g, '_');
          return `${pseudoSel} {
  content: '';
  position: absolute;
  inset: -10%;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0) 60%);
  background-size: 140px 140px;
  background-position: 0 0;
  mix-blend-mode: screen;
  opacity: 0.45;
  animation: nebula-flicker-${safe} 6s steps(10, end) infinite;
  pointer-events: none;
}

@keyframes nebula-flicker-${safe} {
  0% { background-position: 0 0; opacity: 0.35; }
  20% { background-position: -60px 80px; opacity: 0.55; }
  40% { background-position: 90px -70px; opacity: 0.28; }
  60% { background-position: -120px 10px; opacity: 0.6; }
  80% { background-position: 80px 60px; opacity: 0.32; }
  100% { background-position: 0 0; opacity: 0.45; }
}`;
        }
      ]
    }),
    glitchPulse: withThemeSignals({
      id: 'glitchPulse',
      label: 'Glitch Pulse',
      description: 'グリッチ風のラインが秩序なく流れるサイバースタイル。',
      css: [
        'position: relative !important',
        'overflow: hidden !important',
        'background: rgba(15, 23, 42, 0.88) !important',
        'color: rgba(226, 232, 240, 0.92) !important',
        'border-radius: 16px !important',
        'border: 1px solid rgba(59, 130, 246, 0.35) !important',
        'box-shadow: 0 18px 36px rgba(15, 23, 42, 0.5) !important'
      ],
      extra: [
        ({ selectors, normalized }) => {
          const pseudoSel = selectors.map((s) => `${s}::before`).join(',\n');
          const safe = normalized.id.replace(/[^a-zA-Z0-9_-]/g, '_');
          return `${pseudoSel} {
  content: '';
  position: absolute;
  inset: -15% 0;
  background-image: repeating-linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0px, rgba(59, 130, 246, 0.2) 4px, transparent 4px, transparent 8px),
    repeating-linear-gradient(0deg, rgba(236, 72, 153, 0.18) 0px, rgba(236, 72, 153, 0.18) 3px, transparent 3px, transparent 6px);
  mix-blend-mode: screen;
  opacity: 0.4;
  animation: glitch-scan-${safe} 3.6s steps(12, end) infinite;
  pointer-events: none;
}

@keyframes glitch-scan-${safe} {
  0% { transform: translateY(-10%); opacity: 0.3; }
  25% { transform: translateY(12%); opacity: 0.55; }
  50% { transform: translateY(-5%); opacity: 0.35; }
  75% { transform: translateY(18%); opacity: 0.6; }
  100% { transform: translateY(-10%); opacity: 0.4; }
}`;
        }
      ]
    }),
    hoverLumen: Object.freeze({
      id: 'hoverLumen',
      label: 'Hover Lumen',
      description: 'ホバーすると柔らかな光が広がるインタラクティブカード。',
      css: [
        'background: linear-gradient(135deg, rgba(241, 245, 249, 0.85), rgba(226, 232, 240, 0.85)) !important',
        'border-radius: 16px !important',
        'border: 1px solid rgba(148, 163, 184, 0.45) !important',
        'box-shadow: 0 10px 24px rgba(100, 116, 139, 0.22) !important',
        'color: rgba(30, 41, 59, 0.9) !important',
        'transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease !important'
      ],
      extra: Object.freeze([
        ({ selectors }) => {
          const hoverSel = selectors.map((s) => `${s}:hover`).join(',\n');
          const focusSel = selectors.map((s) => `${s}:focus, ${s}:focus-visible`).join(',\n');
          return `${hoverSel} {
  transform: translateY(-4px) scale(1.01);
  box-shadow: 0 18px 32px rgba(59, 130, 246, 0.28);
  border-color: rgba(59, 130, 246, 0.45);
}

${focusSel} {
  outline: none !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35), 0 12px 26px rgba(59, 130, 246, 0.25);
  border-color: rgba(59, 130, 246, 0.5);
}`;
        }
      ])
    }),
    focusBeacon: Object.freeze({
      id: 'focusBeacon',
      label: 'Focus Beacon',
      description: 'キーボードフォーカス時にやわらかな光が点灯するアクセシブルデザイン。',
      css: [
        'background: rgba(15, 23, 42, 0.82) !important',
        'color: rgba(226, 232, 240, 0.94) !important',
        'border-radius: 14px !important',
        'border: 1px solid rgba(148, 163, 184, 0.35) !important',
        'box-shadow: 0 10px 28px rgba(15, 23, 42, 0.45) !important',
        'transition: box-shadow 0.2s ease, transform 0.2s ease !important'
      ],
      extra: Object.freeze([
        ({ selectors }) => {
          const focusWithinSel = selectors.map((s) => `${s}:focus-within, ${s}:focus-visible`).join(',\n');
          return `${focusWithinSel} {
  outline: none !important;
  box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.45), 0 16px 36px rgba(245, 158, 11, 0.35);
  transform: translateY(-2px);
}`;
        }
      ])
    }),
    pressRipple: Object.freeze({
      id: 'pressRipple',
      label: 'Press Ripple',
      description: 'クリック時に波紋が広がるシンプルなインタラクション。',
      css: [
        'position: relative !important',
        'overflow: hidden !important',
        'background: linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(59, 130, 246, 0.28)) !important',
        'color: rgba(15, 23, 42, 0.9) !important',
        'border-radius: 14px !important',
        'border: 1px solid rgba(59, 130, 246, 0.35) !important',
        'transition: transform 0.18s ease, box-shadow 0.18s ease !important'
      ],
      extra: Object.freeze([
        ({ selectors }) => {
          const pseudoSel = selectors.map((s) => `${s}::after`).join(',\n');
          const activeSel = selectors.map((s) => `${s}:active`).join(',\n');
          return `${pseudoSel} {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0) 70%);
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  pointer-events: none;
  transition: transform 0.45s ease, opacity 0.45s ease;
}

${activeSel} {
  transform: scale(0.98);
  box-shadow: 0 12px 24px rgba(59, 130, 246, 0.25);
}

${selectors.map((s) => `${s}:active::after`).join(',\n')} {
  transform: translate(-50%, -50%) scale(12);
  opacity: 0.4;
}`;
        }
      ])
    })
  });

  const EFFECTS = Object.freeze(Object.assign({}, KB.THEME_EFFECTS || {}, baseEffects));

  KB.THEME_EFFECTS = EFFECTS;

  KB.getThemeEffect = KB.getThemeEffect || function getThemeEffect(effectId) {
    if (!effectId) return null;
    return EFFECTS[effectId] || null;
  };

  KB.listThemeEffects = KB.listThemeEffects || function listThemeEffects() {
    return Object.values(EFFECTS);
  };

  function ensureThemeId() {
    return `theme-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  KB.ensureThemeId = KB.ensureThemeId || ensureThemeId;

  function toClassList(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((value) => String(value || '').trim()).filter(Boolean);
    }
    if (typeof raw === 'string') {
      return raw.split(/\s+/).map((v) => v.trim()).filter(Boolean);
    }
    return [];
  }

  function normalizeOpacity(value) {
    if (value == null) return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    const clamped = Math.min(Math.max(num, 0), 1);
    return clamped;
  }

  function normalizeDescendantDepth(value) {
    if (value == null || value === '') return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    const int = Math.floor(num);
    return int > 0 ? int : null;
  }

  KB.normalizeThemeEntry = KB.normalizeThemeEntry || function normalizeThemeEntry(raw = {}) {
    const selector = typeof raw.selector === 'string' ? raw.selector.trim() : '';
    const effect = (typeof raw.effect === 'string' && EFFECTS[raw.effect]) ? raw.effect : 'glass';
    const classesToRemove = toClassList(raw.classesToRemove || raw.removeClasses);
    const customOpacity = normalizeOpacity(
      raw.customOpacity != null ? raw.customOpacity : raw.opacity
    );
    const depthRaw = raw.descendantDepth ?? raw.maxDescendantDepth ?? raw.descendantLimit ?? null;
    const entry = {
      id: (typeof raw.id === 'string' && raw.id.trim()) ? raw.id.trim() : ensureThemeId(),
      selector,
      effect,
      includeDescendants: !!raw.includeDescendants,
      includeSubdomains: !!raw.includeSubdomains,
      enabled: raw.enabled !== false,
      classesToRemove,
      customOpacity,
      stripInlineBackground: raw.stripInlineBackground === true,
      notes: typeof raw.notes === 'string' ? raw.notes : '',
      descendantDepth: normalizeDescendantDepth(depthRaw)
    };
    return entry;
  };

  KB.computeThemeSelectors = KB.computeThemeSelectors || function computeThemeSelectors(entry) {
    if (!entry || !entry.selector) return [];
    const base = entry.selector.trim();
    if (!base) return [];
    const selectors = [base];
    if (entry.includeDescendants) {
      const depth = Number.isInteger(entry.descendantDepth) && entry.descendantDepth > 0
        ? entry.descendantDepth
        : null;
      if (depth == null) {
        selectors.push(`${base} *`);
      } else {
        let chain = base;
        for (let level = 0; level < depth; level += 1) {
          chain = `${chain} > *`;
          selectors.push(chain);
        }
      }
    }
    return selectors;
  };

  KB.buildThemeCssBlock = KB.buildThemeCssBlock || function buildThemeCssBlock(entry, effectOverride) {
    const normalized = KB.normalizeThemeEntry(entry);
    const effect = effectOverride || KB.getThemeEffect(normalized.effect);
    if (!effect || !normalized.selector) return '';
    const selectors = KB.computeThemeSelectors(normalized);
    if (!selectors.length) return '';
    const baseLines = Array.isArray(effect.css) ? effect.css.slice() : String(effect.css || '').split(/;\s*\n?/).filter(Boolean);
    if (!baseLines.length) return '';
    if (normalized.customOpacity != null) {
      baseLines.push(`opacity: ${normalized.customOpacity} !important`);
    }
    const body = baseLines.join(';\n  ');
    const blocks = [`${selectors.join(',\n')} {\n  ${body};\n}`];
    if (Array.isArray(effect.extra)) {
      for (const extra of effect.extra) {
        let block = null;
        if (typeof extra === 'function') {
          try {
            block = extra({ selectors, normalized, effect });
          } catch (_) {
            block = null;
          }
        } else if (typeof extra === 'string') {
          block = extra;
        }
        if (block && typeof block === 'string' && block.trim()) {
          blocks.push(block.trim());
        }
      }
    }
    return blocks.join('\n\n');
  };

  function hostVariants(host) {
    const list = [];
    if (!host) return list;
    const parts = host.split('.');
    for (let i = 0; i < parts.length; i += 1) {
      const candidate = parts.slice(i).join('.');
      if (!candidate) continue;
      if (i === 0 || candidate.includes('.')) list.push(candidate);
    }
    return list;
  }

  const THEME_STYLE_ID = 'kabegami-theme-styles';

  KB.collectEffectiveThemes = KB.collectEffectiveThemes || function collectEffectiveThemes(host = KB.getHostKey()) {
    const variants = hostVariants(host);
    if (!variants.length) return [];
    const collected = [];
    const seen = new Set();
    for (const variant of variants) {
      const isExact = variant === host;
      const themes = (typeof KB.getHostThemes === 'function') ? KB.getHostThemes(variant) : [];
      if (!Array.isArray(themes) || !themes.length) continue;
      for (const rawTheme of themes) {
        const theme = KB.normalizeThemeEntry(rawTheme);
        if (!theme.enabled) continue;
        if (!isExact && !theme.includeSubdomains) continue;
        if (!theme.selector) continue;
        const key = `${variant}::${theme.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(Object.assign({ sourceHost: variant }, theme));
      }
    }
    return collected;
  };

  KB.buildThemeStylesFromList = KB.buildThemeStylesFromList || function buildThemeStylesFromList(themes = []) {
    if (!Array.isArray(themes) || !themes.length) return '';
    const blocks = [];
    for (const theme of themes) {
      const effect = KB.getThemeEffect(theme.effect);
      if (!effect) continue;
      if (typeof effect.ensure === 'function') {
        try {
          effect.ensure();
        } catch (_) {
        }
      }
      const block = KB.buildThemeCssBlock(theme, effect);
      if (!block) continue;
      const header = `/* theme:${theme.id} host:${theme.sourceHost}${theme.includeSubdomains ? ' (subdomains)' : ''} selector:${theme.selector} */`;
      blocks.push(`${header}\n${block}`);
    }
    return blocks.join('\n\n');
  };

  KB.buildThemeStylesForHost = KB.buildThemeStylesForHost || function buildThemeStylesForHost(host = KB.getHostKey()) {
    const themes = KB.collectEffectiveThemes(host);
    return KB.buildThemeStylesFromList(themes);
  };

  KB.applyThemeCleanups = KB.applyThemeCleanups || function applyThemeCleanups(themes = []) {
    if (!Array.isArray(themes) || !themes.length) return;
    const doc = (typeof document !== 'undefined') ? document : null;
    if (!doc) return;

    const nodeOps = new Map();
    for (const theme of themes) {
      if (!theme) continue;
      const selectors = KB.computeThemeSelectors(theme);
      const requiresBackgroundStrip = theme.stripInlineBackground === true;
      const classesToRemove = Array.isArray(theme.classesToRemove) ? theme.classesToRemove.filter(Boolean) : [];
      if (!selectors.length) continue;
      if (!requiresBackgroundStrip && !classesToRemove.length) continue;
      for (const selector of selectors) {
        if (!selector) continue;
        try {
          const nodeList = doc.querySelectorAll(selector);
          for (const node of nodeList) {
            if (!node || node.nodeType !== 1) continue;
            const existing = nodeOps.get(node) || { stripBackground: false, classes: new Set() };
            if (requiresBackgroundStrip) existing.stripBackground = true;
            if (classesToRemove.length && node.classList) {
              for (const cls of classesToRemove) existing.classes.add(cls);
            }
            nodeOps.set(node, existing);
          }
        } catch (_) {}
      }
    }

    if (!nodeOps.size) return;

    const scrub = () => {
      const backgroundProps = ['background', 'background-color', 'background-image'];
      for (const [el, ops] of nodeOps.entries()) {
        const style = el?.style;
        if (ops.stripBackground && style) {
          let removed = false;
          for (const prop of backgroundProps) {
            if (style.getPropertyValue(prop)) {
              style.removeProperty(prop);
              removed = true;
            }
          }
          if (removed) {
            const attr = el.getAttribute('style');
            if (!attr || !attr.trim()) {
              el.removeAttribute('style');
            }
          }
        }
        if (ops.classes.size && el.classList) {
          ops.classes.forEach((cls) => el.classList.remove(cls));
        }
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(scrub);
    } else {
      scrub();
    }
  };

  KB.applyThemesForHost = KB.applyThemesForHost || function applyThemesForHost(host = KB.getHostKey()) {
    if (typeof KB.replaceStyle !== 'function') return;
    const themes = KB.collectEffectiveThemes(host);
    const css = KB.buildThemeStylesFromList(themes);
    if (css && css.trim()) {
      KB.replaceStyle(THEME_STYLE_ID, `/* Kabegami Element Themes */\n${css}\n`);
    } else {
      KB.replaceStyle(THEME_STYLE_ID, '');
    }
    KB.applyThemeCleanups(themes);
  };

  KB.clearAppliedThemes = KB.clearAppliedThemes || function clearAppliedThemes() {
    if (typeof KB.replaceStyle !== 'function') return;
    KB.replaceStyle(THEME_STYLE_ID, '');
  };

})(typeof window !== 'undefined' ? window : this);
