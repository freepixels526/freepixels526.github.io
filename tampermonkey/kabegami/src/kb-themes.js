// Theme effect registry and helpers
(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  const baseEffects = Object.freeze({
    glass: Object.freeze({
      id: 'glass',
      label: 'Glass Blur',
      description: '半透明のガラス調エフェクト (明るめ)',
      css: [
        'background: none !important',
        'background-color: transparent !important',
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
        'background: none !important',
        'background-color: transparent !important',
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
        'background: none !important',
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
        'background: none !important',
        'background-color: transparent !important',
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
        'background: none !important',
        'background-color: transparent !important',
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
        'background: none !important',
        'background-color: transparent !important',
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
        'background: none !important',
        'background-color: transparent !important',
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
        'background: none !important',
        'background-color: transparent !important',
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
        'background: none !important',
        'background-color: transparent !important',
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
        'background: none !important',
        'background-color: transparent !important',
        'background-color: rgba(2, 6, 23, 0.96) !important',
        'background-image: radial-gradient(circle at top left, rgba(59, 130, 246, 0.28) 0%, transparent 55%), radial-gradient(circle at bottom right, rgba(236, 72, 153, 0.22) 0%, transparent 55%), url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\' viewBox=\'0 0 80 80\'%3E%3Ccircle cx=\'2\' cy=\'2\' r=\'2\' fill=\'rgba(255,255,255,0.16)\'/%3E%3C/svg%3E") !important',
        'background-size: auto, auto, 80px 80px !important',
        'color: rgba(248, 250, 252, 0.92) !important',
        'border-radius: 18px !important',
        'border: 1px solid rgba(59, 130, 246, 0.2) !important',
        'box-shadow: 0 18px 48px rgba(15, 23, 42, 0.6) !important'
      ]
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

  KB.normalizeThemeEntry = KB.normalizeThemeEntry || function normalizeThemeEntry(raw = {}) {
    const selector = typeof raw.selector === 'string' ? raw.selector.trim() : '';
    const effect = (typeof raw.effect === 'string' && EFFECTS[raw.effect]) ? raw.effect : 'glass';
    const entry = {
      id: (typeof raw.id === 'string' && raw.id.trim()) ? raw.id.trim() : ensureThemeId(),
      selector,
      effect,
      includeDescendants: !!raw.includeDescendants,
      includeSubdomains: !!raw.includeSubdomains,
      enabled: raw.enabled !== false,
      notes: typeof raw.notes === 'string' ? raw.notes : ''
    };
    return entry;
  };

  KB.computeThemeSelectors = KB.computeThemeSelectors || function computeThemeSelectors(entry) {
    if (!entry || !entry.selector) return [];
    const base = entry.selector.trim();
    if (!base) return [];
    const selectors = [base];
    if (entry.includeDescendants) {
      selectors.push(`${base} *`);
    }
    return selectors;
  };

  KB.buildThemeCssBlock = KB.buildThemeCssBlock || function buildThemeCssBlock(entry, effectOverride) {
    const normalized = KB.normalizeThemeEntry(entry);
    const effect = effectOverride || KB.getThemeEffect(normalized.effect);
    if (!effect || !normalized.selector) return '';
    const selectors = KB.computeThemeSelectors(normalized);
    if (!selectors.length) return '';
    const body = Array.isArray(effect.css) ? effect.css.join(';\n  ') : String(effect.css || '');
    if (!body.trim()) return '';
    return `${selectors.join(',\n')} {\n  ${body};\n}`;
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

  KB.buildThemeStylesForHost = KB.buildThemeStylesForHost || function buildThemeStylesForHost(host = KB.getHostKey()) {
    const themes = KB.collectEffectiveThemes(host);
    if (!themes.length) return '';
    const blocks = [];
    for (const theme of themes) {
      const effect = KB.getThemeEffect(theme.effect);
      if (!effect) continue;
      const block = KB.buildThemeCssBlock(theme, effect);
      if (!block) continue;
      const header = `/* theme:${theme.id} host:${theme.sourceHost}${theme.includeSubdomains ? ' (subdomains)' : ''} selector:${theme.selector} */`;
      blocks.push(`${header}\n${block}`);
    }
    return blocks.join('\n\n');
  };

  KB.applyThemesForHost = KB.applyThemesForHost || function applyThemesForHost(host = KB.getHostKey()) {
    if (typeof KB.replaceStyle !== 'function') return;
    const css = KB.buildThemeStylesForHost(host);
    if (css && css.trim()) {
      KB.replaceStyle(THEME_STYLE_ID, `/* Kabegami Element Themes */\n${css}\n`);
    } else {
      KB.replaceStyle(THEME_STYLE_ID, '');
    }
  };

  KB.clearAppliedThemes = KB.clearAppliedThemes || function clearAppliedThemes() {
    if (typeof KB.replaceStyle !== 'function') return;
    KB.replaceStyle(THEME_STYLE_ID, '');
  };

})(typeof window !== 'undefined' ? window : this);
