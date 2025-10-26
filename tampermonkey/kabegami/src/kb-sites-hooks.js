// kb-sites-hooks.js (diagnostics-only)
(function () {
  const NS = '[KB:google-hook]';
  const now = () => new Date().toISOString();
  const url = location.href;
  const matchRe = /^https:\/\/(?:www\.)?google\.[^/]+\/search(?:[/?#]|$)/;

  // ----- basic load-time context
  console.groupCollapsed(`${NS} file loaded`);
  console.log(`${NS}`, 'time:', now());
  console.log(`${NS}`, 'location:', url);
  console.log(`${NS}`, 'document.readyState:', document.readyState);
  console.log(`${NS}`, 'URL matches pattern?', matchRe.test(url), 'pattern =', matchRe);
  console.log(`${NS}`, 'KB present?', typeof window.KB !== 'undefined');
  console.log(
    `${NS}`,
    'KB.sites present?', !!window.KB?.sites,
    'addSiteHook type:', typeof window.KB?.sites?.addSiteHook,
    'runSiteHooks type:', typeof window.KB?.sites?.runSiteHooks
  );
  if (typeof GM_info !== 'undefined') {
    try {
      console.log(`${NS}`, 'Tampermonkey script:', GM_info.script?.name, GM_info.script?.version);
    } catch {}
  }
  console.groupEnd();

  // ----- observe SPA navigation signals (non-invasive)
  window.addEventListener('popstate', () => {
    console.log(`${NS}`, 'popstate observed → url now:', location.href);
  });
  window.addEventListener('hashchange', (e) => {
    console.log(`${NS}`, 'hashchange observed:', e.oldURL, '→', e.newURL);
  });
  document.addEventListener('DOMContentLoaded', () => {
    console.log(`${NS}`, 'DOMContentLoaded → url:', location.href);
  });

  function wrapRunSiteHooks(sites) {
    if (!sites || typeof sites.runSiteHooks !== 'function' || sites.__runSiteHooksWrapped) return;
    const orig = sites.runSiteHooks.bind(sites);
    sites.runSiteHooks = function wrappedRunSiteHooks(args = {}) {
      const u = args?.url || location.href;
      console.groupCollapsed(`${NS} runSiteHooks() called`);
      console.log(`${NS}`, 'time:', now());
      console.log(`${NS}`, 'reason:', args?.reason);
      console.log(`${NS}`, 'arg url:', args?.url);
      console.log(`${NS}`, 'current url:', location.href);
      console.log(`${NS}`, 'pattern matches arg?', matchRe.test(u || ''));
      console.log(`${NS}`, 'pattern matches current?', matchRe.test(location.href));
      console.groupEnd();
      return orig(args);
    };
    sites.__runSiteHooksWrapped = true;
    console.log(`${NS}`, 'runSiteHooks wrapped for diagnostics');
  }

  // ----- the actual hook (wrapped for diagnostics)
  function applyGoogleGlass(cfg) {
    console.groupCollapsed(`${NS} HOOK INVOKED`);
    console.log(`${NS}`, 'time:', now());
    console.log(`${NS}`, 'cfg.reason:', cfg?.reason);
    console.log(`${NS}`, 'cfg.url:', cfg?.url);
    console.log(`${NS}`, 'current url:', location.href);
    console.log(`${NS}`, 'regex match at call-time?', matchRe.test(cfg?.url || location.href));
    console.trace(`${NS} hook call stack (for trace)`);
    console.groupEnd();

    // Strip only the background-related inline styles so our glass CSS wins.
    const centerCol = document.getElementById('center_col');
    if (centerCol?.style) {
      let removed = false;
      const props = ['background-color', 'background-image'];
      for (const prop of props) {
        if (centerCol.style.getPropertyValue(prop)) {
          centerCol.style.removeProperty(prop);
          removed = true;
        }
      }
      if (removed && !centerCol.getAttribute('style')?.trim()) {
        centerCol.removeAttribute('style');
      }
    }

    // (Normal behavior: inject style when the hook actually runs)
    let el = document.getElementById('kb-google-center-col-transparent');
    if (!el) {
      console.log(`${NS}`, 'injecting style node');
      el = document.createElement('style');
      el.id = 'kb-google-center-col-transparent';
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = `
      /* frosted glass */
      #center_col {
        background-color: rgba(255, 255, 255, 0.22) !important;
        backdrop-filter: blur(14px) saturate(160%);
        -webkit-backdrop-filter: blur(14px) saturate(160%);
        border-radius: 8px;
      }
      #center_col * {
        background-color: transparent !important;
        box-shadow: none !important;
      }
    `;
  }

  let hookRegistered = false;
  let waitLogged = false;

  function registerHook(sites) {
    if (!sites || hookRegistered) return;
    wrapRunSiteHooks(sites);
    if (typeof sites.addSiteHook !== 'function') {
      console.warn(`${NS}`, 'sites.addSiteHook missing — diagnostics only');
      return;
    }
    sites.addSiteHook(
      matchRe,
      (ctx = {}) => applyGoogleGlass(ctx),
      { id: 'google-center-col', once: true, priority: 10 }
    );
    hookRegistered = true;
    console.log(`${NS}`, 'hook registered via KB.sites.addSiteHook');
    if (typeof sites.runSiteHooks === 'function') {
      try {
        sites.runSiteHooks({ reason: 'init', url: location.href });
      } catch (e) {
        console.warn(`${NS}`, 'runSiteHooks during init failed', e);
      }
    }
  }

  function waitForSites(attempt = 0) {
    const sites = window.KB?.sites;
    if (sites && typeof sites.addSiteHook === 'function') {
      registerHook(sites);
      return;
    }
    if (!waitLogged) {
      console.log(`${NS}`, 'waiting for KB.sites to become available…');
      waitLogged = true;
    }
    if (attempt >= 40) {
      console.warn(`${NS}`, 'KB.sites.addSiteHook still unavailable after waiting; giving up');
      return;
    }
    setTimeout(() => waitForSites(attempt + 1), 250);
  }

  waitForSites();

  if (typeof window !== 'undefined') {
    window.addEventListener('kabegami:sites-ready', (ev) => {
      const detailSites = ev?.detail?.sites;
      registerHook(detailSites || window.KB?.sites);
    });
  }
})();
