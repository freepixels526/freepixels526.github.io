(function(global){
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  KB.initMenu = KB.initMenu || function initMenu(ctx) {
    if (typeof GM_registerMenuCommand !== 'function') return;

    const {
      openConfig = () => {},
      loadSites = () => [],
      saveSites = () => {},
      loadWallpapers = () => [],
      saveWallpapers = () => {},
      loadIndexMap = () => ({}),
      loadModeMap = () => ({}),
      loadStyleMap = () => ({}),
      loadAdapterMap = () => ({}),
      saveAdapterMap = () => {},
      saveModeMap = () => {},
      refreshManifest = () => Promise.resolve(),
      getManifestUrl = () => '',
      setManifestUrl = () => {},
      isUseManifest = () => true,
      setUseManifest = () => {},
      loadManifestCache = () => ({}),
      saveManifestCache = () => {},
      saveValidators = () => {},
      setManifestFetchedAt = () => {},
      lastFetchedAt = () => null,
      scheduleApply = () => {},
      storageKeys = {},
    } = ctx || {};

    const { etagKey = '', lastModifiedKey = '', fetchedAtKey = '' } = storageKeys;

    GM_registerMenuCommand('Kabegami 設定を開く', openConfig);

    GM_registerMenuCommand('Kabegami: このページを追加(デフォ壁紙)', () => {
      const host = location.host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = `https?:\\/\\/${host}\\/`;
      const list = loadSites();
      const defaultAdapter = (KB.MODE_DEFAULT_ADAPTER && KB.MODE_DEFAULT_ADAPTER['1']) || 'css-body-background';
      const item = { test: new RegExp(pattern), adapter: defaultAdapter };
      list.push(item);
      saveSites(list);
      alert('このページを追加しました（壁紙は一覧の先頭を使用）。');
      scheduleApply();
    });

    GM_registerMenuCommand('Kabegami: 壁紙URLを追加', () => {
      const url = prompt('追加する壁紙URLを入力してください');
      if (!url) return;
      const list = loadWallpapers();
      list.push(url);
      saveWallpapers(list);
      alert('壁紙を追加しました。');
      scheduleApply();
    });

    GM_registerMenuCommand('Kabegami: Manifest を更新', async () => {
      try {
        await refreshManifest(true);
        alert('Manifest を更新しました');
        scheduleApply();
      } catch (e) {
        alert('更新に失敗: ' + (e?.message || e));
      }
    });

    GM_registerMenuCommand('Kabegami: Manifest の URL を設定', async () => {
      const cur = getManifestUrl();
      const next = prompt('Manifest URL を入力してください', cur);
      if (!next) return;
      setManifestUrl(next);
      try {
        await refreshManifest(true);
        alert('URL を更新して取得しました');
        scheduleApply();
      } catch (e) {
        alert('取得に失敗: ' + (e?.message || e));
      }
    });

    GM_registerMenuCommand('Kabegami: Manifest を使う/使わないを切替', () => {
      const now = isUseManifest();
      setUseManifest(!now);
      alert('Manifest 使用: ' + (!now ? 'ON' : 'OFF'));
      scheduleApply();
    });

    GM_registerMenuCommand('Kabegami: 設定をエクスポート', () => {
      try {
        const manifestCache = loadManifestCache();
        const legacyFetchedAt = fetchedAtKey ? parseInt(GM_getValue(fetchedAtKey, '0'), 10) || 0 : 0;
        const legacyValidators = {
          etag: etagKey ? GM_getValue(etagKey, '') : '',
          lastmod: lastModifiedKey ? GM_getValue(lastModifiedKey, '') : '',
          fetchedAt: legacyFetchedAt,
        };
        const validators = {
          etag: manifestCache?.etag || legacyValidators.etag || '',
          lastmod: manifestCache?.lastModified || legacyValidators.lastmod || '',
          fetchedAt: manifestCache?.fetchedAt || legacyValidators.fetchedAt || lastFetchedAt() || 0,
        };
        const payload = {
          when: new Date().toISOString(),
          manifest: manifestCache,
          validators,
          prefs: {
            useManifest: isUseManifest(),
            manifestUrl: getManifestUrl(),
            sites: loadSites(),
            wallpapers: loadWallpapers(),
            indexMap: loadIndexMap(),
            modeMap: loadModeMap(),
            adapterMap: loadAdapterMap(),
            styleMap: loadStyleMap(),
          },
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        GM_download({ url, name: 'kabegami-backup.json', saveAs: true });
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (e) {
        alert('エクスポート失敗: ' + (e?.message || e));
      }
    });

    GM_registerMenuCommand('Kabegami: 設定をインポート', () => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = () => {
          const file = input.files && input.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const data = JSON.parse(String(reader.result || '{}'));
              if (data.manifest) saveManifestCache(data.manifest);
              if (data.validators) {
                saveValidators(data.validators.etag || '', data.validators.lastmod || '');
                if (data.validators.fetchedAt != null) {
                  if (typeof setManifestFetchedAt === 'function') {
                    setManifestFetchedAt(data.validators.fetchedAt);
                  } else if (fetchedAtKey) {
                    GM_setValue(fetchedAtKey, String(data.validators.fetchedAt));
                  }
                }
              }
              if (data.prefs) {
                setUseManifest(!!data.prefs.useManifest);
                if (data.prefs.manifestUrl) setManifestUrl(String(data.prefs.manifestUrl));
                if (data.prefs.sites) saveSites(data.prefs.sites);
                if (data.prefs.wallpapers) saveWallpapers(data.prefs.wallpapers);
                if (data.prefs.indexMap) saveIndexMap(data.prefs.indexMap);
                if (data.prefs.adapterMap) saveAdapterMap(data.prefs.adapterMap);
                if (data.prefs.modeMap) saveModeMap(data.prefs.modeMap);
                if (data.prefs.styleMap) saveStyleMap(data.prefs.styleMap);
              }
              alert('インポートしました。適用します。');
              scheduleApply();
            } catch (err) {
              alert('インポート失敗: ' + (err?.message || err));
            }
          };
          reader.readAsText(file);
        };
        input.click();
      } catch (e) {
        alert('インポート起動失敗: ' + (e?.message || e));
      }
    });
  };

})(typeof window !== 'undefined' ? window : this);
