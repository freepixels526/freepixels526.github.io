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
      saveIndexMap = () => {},
      loadModeMap = () => ({}),
      loadStyleMap = () => ({}),
      saveStyleMap = () => {},
      loadThemeMap = () => ({}),
      loadAdapterMap = () => ({}),
      saveAdapterMap = () => {},
      saveModeMap = () => {},
      saveThemeMap = () => {},
      getHostThemes = () => [],
      setHostThemes = () => {},
      updateHostThemes = () => {},
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

    const listThemeEffectsFn = (typeof KB.listThemeEffects === 'function') ? KB.listThemeEffects : (() => []);
    const normalizeThemeEntry = (typeof KB.normalizeThemeEntry === 'function') ? KB.normalizeThemeEntry : (entry) => entry;
    const ensureThemeId = (typeof KB.ensureThemeId === 'function') ? KB.ensureThemeId : (() => `theme-${Date.now()}`);

    const themeEffects = listThemeEffectsFn();
    const effectMap = themeEffects.reduce((acc, effect) => {
      acc[effect.id] = effect;
      return acc;
    }, {});
    const defaultEffectId = themeEffects[0]?.id || 'glass';

    const sanitizeHostInput = (value) => {
      const raw = (value || '').trim();
      if (!raw) return (location.host || 'unknown-host');
      try {
        const url = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`);
        return url.host || raw;
      } catch (_) {
        return raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '') || (location.host || 'unknown-host');
      }
    };

    const createThemeTemplate = () => normalizeThemeEntry({
      id: ensureThemeId(),
      selector: '',
      effect: defaultEffectId,
      includeDescendants: false,
      includeSubdomains: false,
      enabled: true,
      notes: '',
    });

    function openThemeManagerDialog(options = {}) {
      if (!themeEffects.length) {
        alert('テーマエフェクトが登録されていません。');
        return;
      }

      let currentHost = sanitizeHostInput(options.initialHost || location.host || 'unknown-host');
      let themes = getHostThemes(currentHost).map((item) => normalizeThemeEntry(item));
      let destroyed = false;

      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.45);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:32px;';

      const dialog = document.createElement('div');
      dialog.style.cssText = 'background:#f8fafc;color:#0f172a;min-width:540px;max-width:720px;max-height:100%;display:flex;flex-direction:column;border-radius:16px;box-shadow:0 24px 60px rgba(15,23,42,0.35);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(148,163,184,0.35);background:#e2e8f0;';
      const title = document.createElement('h2');
      title.textContent = 'エレメントテーマ管理';
      title.style.cssText = 'margin:0;font-size:16px;font-weight:600;';
      header.appendChild(title);
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.style.cssText = 'border:none;background:transparent;font-size:20px;line-height:1;cursor:pointer;color:#1e293b;';
      header.appendChild(closeBtn);
      dialog.appendChild(header);

      const body = document.createElement('div');
      body.style.cssText = 'flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:12px;';
      dialog.appendChild(body);

      const hostRow = document.createElement('div');
      hostRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;';
      const hostLabel = document.createElement('label');
      hostLabel.textContent = '対象ホスト';
      hostLabel.style.cssText = 'font-size:13px;font-weight:600;color:#0f172a;';
      hostLabel.htmlFor = 'kb-theme-manager-host';
      hostRow.appendChild(hostLabel);
      const hostInput = document.createElement('input');
      hostInput.id = 'kb-theme-manager-host';
      hostInput.type = 'text';
      hostInput.value = currentHost;
      hostInput.style.cssText = 'flex:1;min-width:200px;padding:8px 10px;border:1px solid rgba(148,163,184,0.6);border-radius:8px;background:#fff;color:#0f172a;';
      hostRow.appendChild(hostInput);
      const reloadBtn = document.createElement('button');
      reloadBtn.textContent = '読み込み';
      reloadBtn.style.cssText = 'padding:8px 14px;border-radius:8px;border:1px solid rgba(59,130,246,0.4);background:#3b82f6;color:#fff;font-weight:600;cursor:pointer;';
      hostRow.appendChild(reloadBtn);
      body.appendChild(hostRow);

      const actionsRow = document.createElement('div');
      actionsRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';
      const addBtn = document.createElement('button');
      addBtn.textContent = '＋ テーマを追加';
      addBtn.style.cssText = 'padding:8px 14px;border-radius:8px;border:1px solid rgba(14,116,144,0.4);background:#0ea5e9;color:#fff;font-weight:600;cursor:pointer;';
      actionsRow.appendChild(addBtn);
      body.appendChild(actionsRow);

      const listContainer = document.createElement('div');
      listContainer.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
      body.appendChild(listContainer);

      const footer = document.createElement('div');
      footer.style.cssText = 'display:flex;align-items:center;gap:12px;padding:16px 20px;border-top:1px solid rgba(148,163,184,0.35);background:#e2e8f0;';
      const statusLabel = document.createElement('div');
      statusLabel.style.cssText = 'flex:1;font-size:13px;';
      footer.appendChild(statusLabel);
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'キャンセル';
      cancelBtn.style.cssText = 'padding:8px 16px;border-radius:8px;border:1px solid rgba(100,116,139,0.6);background:#fff;color:#1e293b;font-weight:600;cursor:pointer;';
      footer.appendChild(cancelBtn);
      const saveBtn = document.createElement('button');
      saveBtn.textContent = '保存して適用';
      saveBtn.style.cssText = 'padding:8px 18px;border-radius:8px;border:1px solid rgba(22,163,74,0.5);background:#16a34a;color:#fff;font-weight:600;cursor:pointer;';
      footer.appendChild(saveBtn);
      dialog.appendChild(footer);

      function showStatus(message, tone = 'info') {
        statusLabel.textContent = message || '';
        if (!message) return;
        statusLabel.style.color = tone === 'error' ? '#b91c1c' : '#0f766e';
      }

      function destroy() {
        if (destroyed) return;
        destroyed = true;
        window.removeEventListener('keydown', onKeydown, true);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }

      function onKeydown(ev) {
        if (ev.key === 'Escape') {
          ev.preventDefault();
          destroy();
        }
      }

      const focusSelectorAfterRender = (themeId) => {
        if (!themeId) return;
        setTimeout(() => {
          const input = listContainer.querySelector(`input[data-theme-id="${themeId}"]`);
          if (input) input.focus();
        }, 0);
      };

      function clearChildren(node) {
        if (!node) return;
        while (node.firstChild) node.removeChild(node.firstChild);
      }

      function renderThemes(focusThemeId) {
        clearChildren(listContainer);
        if (!themes.length) {
          const empty = document.createElement('div');
          empty.textContent = 'このホストにはテーマがありません。「テーマを追加」を押して作成してください。';
          empty.style.cssText = 'padding:16px;border:1px dashed rgba(148,163,184,0.6);border-radius:10px;background:#fff;color:#475569;font-size:13px;';
          listContainer.appendChild(empty);
          return;
        }

        themes.forEach((theme) => {
          const card = document.createElement('div');
          card.style.cssText = 'border:1px solid rgba(148,163,184,0.55);border-radius:12px;background:#fff;padding:14px;display:flex;flex-direction:column;gap:10px;';

          const topRow = document.createElement('div');
          topRow.style.cssText = 'display:flex;align-items:center;gap:12px;';

          const enabledLabel = document.createElement('label');
          enabledLabel.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#0f172a;';
          const enabledInput = document.createElement('input');
          enabledInput.type = 'checkbox';
          enabledInput.checked = theme.enabled !== false;
          enabledInput.addEventListener('change', () => {
            theme.enabled = enabledInput.checked;
          });
          enabledLabel.appendChild(enabledInput);
          enabledLabel.appendChild(document.createTextNode('有効'));
          topRow.appendChild(enabledLabel);

          const effectSelect = document.createElement('select');
          effectSelect.style.cssText = 'flex:1;max-width:220px;padding:6px 8px;border-radius:8px;border:1px solid rgba(148,163,184,0.6);background:#f8fafc;';
          themeEffects.forEach((fx) => {
            const option = document.createElement('option');
            option.value = fx.id;
            option.textContent = `${fx.label} (${fx.id})`;
            effectSelect.appendChild(option);
          });
          effectSelect.value = theme.effect && effectMap[theme.effect] ? theme.effect : defaultEffectId;
          theme.effect = effectSelect.value;
          effectSelect.addEventListener('change', () => {
            theme.effect = effectSelect.value;
          });
          topRow.appendChild(effectSelect);

          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = '削除';
          deleteBtn.style.cssText = 'padding:6px 10px;border-radius:8px;border:1px solid rgba(185,28,28,0.5);background:#ef4444;color:#fff;font-weight:600;cursor:pointer;';
          deleteBtn.addEventListener('click', () => {
            if (!confirm('このテーマを削除しますか？')) return;
            themes = themes.filter((item) => item.id !== theme.id);
            renderThemes();
            showStatus('テーマを削除しました。', 'info');
          });
          topRow.appendChild(deleteBtn);

          card.appendChild(topRow);

          const selectorLabel = document.createElement('label');
          selectorLabel.style.cssText = 'display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#0f172a;';
          selectorLabel.textContent = 'CSSセレクター';
          const selectorInput = document.createElement('input');
          selectorInput.type = 'text';
          selectorInput.value = theme.selector || '';
          selectorInput.dataset.themeId = theme.id;
          selectorInput.style.cssText = 'padding:8px 10px;border-radius:8px;border:1px solid rgba(148,163,184,0.6);background:#fff;color:#0f172a;';
          selectorInput.addEventListener('input', () => {
            theme.selector = selectorInput.value;
          });
          selectorLabel.appendChild(selectorInput);
          card.appendChild(selectorLabel);

          const flagsRow = document.createElement('div');
          flagsRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;font-size:12px;font-weight:600;color:#0f172a;';

          const descLabel = document.createElement('label');
          descLabel.style.cssText = 'display:flex;align-items:center;gap:6px;';
          const descCheckbox = document.createElement('input');
          descCheckbox.type = 'checkbox';
          descCheckbox.checked = !!theme.includeDescendants;
          descCheckbox.addEventListener('change', () => {
            theme.includeDescendants = descCheckbox.checked;
          });
          descLabel.appendChild(descCheckbox);
          descLabel.appendChild(document.createTextNode('子孫にも適用'));
          flagsRow.appendChild(descLabel);

          const subLabel = document.createElement('label');
          subLabel.style.cssText = 'display:flex;align-items:center;gap:6px;';
          const subCheckbox = document.createElement('input');
          subCheckbox.type = 'checkbox';
          subCheckbox.checked = !!theme.includeSubdomains;
          subCheckbox.addEventListener('change', () => {
            theme.includeSubdomains = subCheckbox.checked;
          });
          subLabel.appendChild(subCheckbox);
          subLabel.appendChild(document.createTextNode('サブドメインにも適用'));
          flagsRow.appendChild(subLabel);

          card.appendChild(flagsRow);

          const notesLabel = document.createElement('label');
          notesLabel.style.cssText = 'display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#0f172a;';
          notesLabel.textContent = 'メモ (任意)';
          const notesInput = document.createElement('input');
          notesInput.type = 'text';
          notesInput.value = theme.notes || '';
          notesInput.style.cssText = 'padding:6px 10px;border-radius:8px;border:1px solid rgba(148,163,184,0.6);background:#fff;color:#0f172a;';
          notesInput.addEventListener('input', () => {
            theme.notes = notesInput.value;
          });
          notesLabel.appendChild(notesInput);
          card.appendChild(notesLabel);

          listContainer.appendChild(card);
        });

        focusSelectorAfterRender(focusThemeId);
      }

      function reloadThemesForHost() {
        currentHost = sanitizeHostInput(hostInput.value);
        hostInput.value = currentHost;
        themes = getHostThemes(currentHost).map((item) => normalizeThemeEntry(item));
        renderThemes();
        showStatus(`ホストを読み込みました: ${currentHost}`, 'info');
      }

      function addThemeCard() {
        const theme = createThemeTemplate();
        themes.push(theme);
        renderThemes(theme.id);
        showStatus('新しいテーマを追加しました。', 'info');
      }

      overlay.addEventListener('click', (ev) => {
        if (ev.target === overlay) destroy();
      });
      window.addEventListener('keydown', onKeydown, true);
      closeBtn.addEventListener('click', destroy);
      cancelBtn.addEventListener('click', destroy);
      reloadBtn.addEventListener('click', reloadThemesForHost);
      hostInput.addEventListener('change', reloadThemesForHost);
      addBtn.addEventListener('click', addThemeCard);

      saveBtn.addEventListener('click', () => {
        const normalized = themes
          .map((item) => normalizeThemeEntry(item))
          .filter((item) => item.selector && item.selector.trim());

        if (!normalized.length) {
          const confirmed = confirm('有効なセレクターがないため、すべてのテーマを削除しますか？');
          if (!confirmed) {
            showStatus('保存をキャンセルしました。', 'error');
            return;
          }
        }

        setHostThemes(currentHost, normalized);
        showStatus('テーマを保存しました。適用しています…', 'info');
        scheduleApply();
        setTimeout(() => destroy(), 150);
      });

      renderThemes();
      if (options.autoAdd) {
        addThemeCard();
      }
    }

    KB.openThemeManagerDialog = openThemeManagerDialog;

    GM_registerMenuCommand('Kabegami 設定を開く', openConfig);

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
            themeMap: loadThemeMap(),
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
                if (data.prefs.themeMap) saveThemeMap(data.prefs.themeMap);
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

    GM_registerMenuCommand('Kabegami: エレメントテーマ管理', () => {
      openThemeManagerDialog({ initialHost: location.host || 'unknown-host' });
    });

    GM_registerMenuCommand('Kabegami: エレメントテーマを追加', () => {
      openThemeManagerDialog({ initialHost: location.host || 'unknown-host', autoAdd: true });
    });
  };

})(typeof window !== 'undefined' ? window : this);
