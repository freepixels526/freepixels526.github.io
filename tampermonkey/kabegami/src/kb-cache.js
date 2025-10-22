(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  const BLOB_CACHE_PREFS = KB.BLOB_CACHE_PREFS = KB.BLOB_CACHE_PREFS || {};

  const DEFAULT_DISABLED_HOSTS = ['github.com', 'gist.github.com', 'github.dev'];

  function asArray(maybe) {
    return Array.isArray(maybe) ? maybe : [];
  }

  function matchesHost(pattern, host) {
    if (!pattern || !host) return false;
    const normalized = pattern.trim().toLowerCase();
    const target = host.toLowerCase();
    if (!normalized) return false;
    if (normalized === '*') return true;
    if (normalized.startsWith('*.')) {
      const suffix = normalized.slice(2);
      return target === suffix || target.endsWith(`.${suffix}`);
    }
    if (normalized.startsWith('.')) {
      const suffix = normalized.slice(1);
      return target === suffix || target.endsWith(`.${suffix}`);
    }
    return target === normalized || target.endsWith(`.${normalized}`);
  }

  function shouldDisableBlobCache() {
    if (BLOB_CACHE_PREFS.enabled === true) return false;
    if (BLOB_CACHE_PREFS.enabled === false) return true;
    if (BLOB_CACHE_PREFS.disabled === true) return true;
    const host = (typeof location !== 'undefined' && (location.hostname || location.host)) || '';
    if (!host) return false;
    const enableList = asArray(BLOB_CACHE_PREFS.enableHosts);
    if (enableList.some((pattern) => matchesHost(pattern, host))) {
      return false;
    }
    const disableList = asArray(BLOB_CACHE_PREFS.disableHosts).length
      ? asArray(BLOB_CACHE_PREFS.disableHosts)
      : DEFAULT_DISABLED_HOSTS;
    return disableList.some((pattern) => matchesHost(pattern, host));
  }

  const BLOB_CACHE_DISABLED = shouldDisableBlobCache();

  const warn = KB.warn || ((...args) => console.warn('[Kabegami]', ...args));

  const IDB_NAME = KB.IDB_NAME || 'kabegami-cache';
  const IDB_VER = KB.IDB_VERSION || 1;
  const IDB_STORE = KB.IDB_STORE || 'images';

  let _idbPromise = null;
  const PENDING_FETCHES = new Map(); // key -> Promise<string>
  let _currentBlobURL = null;

  KB.openIDB = KB.openIDB || function openIDB() {
    if (_idbPromise) return _idbPromise;
    _idbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(IDB_NAME, IDB_VER);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            const store = db.createObjectStore(IDB_STORE, { keyPath: 'key' });
            store.createIndex('ts', 'ts');
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (e) {
        reject(e);
      }
    });
    return _idbPromise;
  };

  KB.idbGet = KB.idbGet || function idbGet(key) {
    return KB.openIDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const st = tx.objectStore(IDB_STORE);
      const rq = st.get(key);
      rq.onsuccess = () => resolve(rq.result || null);
      rq.onerror = () => reject(rq.error);
    }));
  };

  KB.idbPut = KB.idbPut || function idbPut(key, blob) {
    return KB.openIDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const st = tx.objectStore(IDB_STORE);
      const rq = st.put({ key, blob, ts: Date.now() });
      rq.onsuccess = () => resolve(true);
      rq.onerror = () => reject(rq.error);
    }));
  };

  KB.makeKey = KB.makeKey || function makeKey(url) {
    return 'v1|' + url;
  };

  KB.fetchBlob = KB.fetchBlob || function fetchBlob(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET', url, responseType: 'blob',
        onload: (res) => {
          try { resolve(res.response); } catch (e) { reject(e); }
        },
        onerror: (e) => reject(e)
      });
    });
  };

  KB.getBlobURLForMedia = KB.getBlobURLForMedia || async function getBlobURLForMedia(url) {
    if (!url) return null;
    if (BLOB_CACHE_DISABLED) return url;
    const key = KB.makeKey(url);
    if (PENDING_FETCHES.has(key)) return PENDING_FETCHES.get(key);
    const p = (async () => {
      try {
        const rec = await KB.idbGet(key);
        if (rec && rec.blob) {
          return URL.createObjectURL(rec.blob);
        }
        const blob = await KB.fetchBlob(url);
        await KB.idbPut(key, blob);
        return URL.createObjectURL(blob);
      } catch (e) {
        warn('画像キャッシュ取得失敗: fallback to URL', e);
        return url;
      } finally {
        PENDING_FETCHES.delete(key);
      }
    })();
    PENDING_FETCHES.set(key, p);
    return p;
  };

  KB.revokeCurrentBlob = KB.revokeCurrentBlob || function revokeCurrentBlob() {
    try {
      if (_currentBlobURL && _currentBlobURL.startsWith('blob:')) {
        URL.revokeObjectURL(_currentBlobURL);
      }
    } catch (_) {}
    _currentBlobURL = null;
  };

  KB.setCurrentBlobURL = KB.setCurrentBlobURL || function setCurrentBlobURL(url) {
    _currentBlobURL = url;
  };

  KB.getBlobURLForImage = KB.getBlobURLForImage || KB.getBlobURLForMedia;

})(typeof window !== 'undefined' ? window : this);
