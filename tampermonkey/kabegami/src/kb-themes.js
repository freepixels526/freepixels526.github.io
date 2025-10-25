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
