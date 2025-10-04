(function(global){
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  KB.initConfig = KB.initConfig || function initConfig(ctx) {
    const {
      DEFAULT_MANIFEST_URL = '',
      loadSites = () => [],
      saveSites = () => {},
      loadWallpapers = () => [],
      saveWallpapers = () => {},
      loadIndexMap = () => ({}),
      saveIndexMap = () => {},
      isUseManifest = () => true,
      setUseManifest = () => {},
      getManifestUrl = () => DEFAULT_MANIFEST_URL,
      setManifestUrl = () => {},
      getCurrentIndex = () => 0,
      setCurrentIndex = () => {},
      scheduleApply = () => {},
      setDebug = () => {},
    } = ctx || {};

    function openConfig() {
      if (typeof GM_config === 'undefined') {
        alert('GM_config が読み込めませんでした');
        return;
      }

      const fields = {
        debug: { label: 'デバッグログ', type: 'checkbox', default: true },
        sites: { label: 'カスタムサイト(JSON配列)', type: 'textarea', default: JSON.stringify(loadSites(), null, 2) },
        wallpapers: { label: '壁紙URL一覧(JSON配列)', type: 'textarea', default: JSON.stringify(loadWallpapers(), null, 2) },
        indexMap: { label: 'サイト→壁紙Index(JSONオブジェクト)', type: 'textarea', default: JSON.stringify(loadIndexMap(), null, 2) },
        useManifest: { label: 'Manifest を使用する', type: 'checkbox', default: isUseManifest() },
        manifestUrl: { label: 'Manifest URL', type: 'text', default: getManifestUrl() },
      };

      GM_config.init({
        id: 'KabegamiConfig',
        title: 'Kabegami 設定',
        fields,
        css: '.config_var { margin: 8px 0; } textarea { width: 100%; height: 240px; }',
        events: {
          save: function() {
            try {
              setDebug(!!GM_config.get('debug'));

              const sitesParsed = JSON.parse(GM_config.get('sites') || '[]');
              saveSites(sitesParsed);

              const wallpapersParsed = JSON.parse(GM_config.get('wallpapers') || '[]');
              saveWallpapers(wallpapersParsed);

              const indexMapParsed = JSON.parse(GM_config.get('indexMap') || '{}');
              saveIndexMap(indexMapParsed);

              setUseManifest(!!GM_config.get('useManifest'));
              const manifestUrl = String(GM_config.get('manifestUrl') || DEFAULT_MANIFEST_URL);
              setManifestUrl(manifestUrl);

              const cur = getCurrentIndex();
              const wallpapersNow = loadWallpapers();
              if (cur >= wallpapersNow.length) setCurrentIndex(0);

              alert('保存しました。ページに再適用します。');
              scheduleApply();
            } catch (e) {
              alert('JSON パースエラー: ' + e.message);
            }
          }
        }
      });

      GM_config.open();
    }

    return { openConfig };
  };

})(typeof window !== 'undefined' ? window : this);
