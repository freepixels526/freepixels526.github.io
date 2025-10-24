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

  // ----- optional: log whenever KB.sites.runSiteHooks is called
  (() => {
    const KB = window.KB;
    const sites = KB?.sites;
    if (!sites || typeof sites.runSiteHooks !== 'function') return;

    if (!sites.__runSiteHooksWrapped) {
      const orig = sites.runSiteHooks.bind(sites);
      sites.runSiteHooks = function wrappedRunSiteHooks(args = {}) {
        const u = args?.url || location.href;
        console.groupCollapsed(`${NS} runSiteHooks() called`);
        console.log(`${NS}`, 'time:', now());
        console.log(`${NS}`, 'reason:', args?.reason);
        console.log(`${NS}`, 'arg url:', args?.url);
        console.log(`${NS}`, 'current url:', location.href);
        console.log(`${NS}`, 'pattern matches current?', matchRe.test(location.href));
        console.groupEnd();
        return orig(args);
      };
      sites.__runSiteHooksWrapped = true;
      console.log(`${NS}`, 'runSiteHooks wrapped for diagnostics');
    }
  })();

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

  // ----- register with the registry if available (no fallback, no retries)
  if (window.KB?.sites?.addSiteHook) {
    window.KB.sites.addSiteHook(
      matchRe,
      applyGoogleGlass,
      { id: 'google-center-col', once: true, priority: 10 }
    );
    console.log(`${NS}`, 'hook registered via KB.sites.addSiteHook');
  } else {
    // Do not retry or queue: purely diagnostic
    console.warn(
      `${NS}`,
      'KB.sites.addSiteHook NOT available at load-time — check load order / bootstrap'
    );
  }
})();