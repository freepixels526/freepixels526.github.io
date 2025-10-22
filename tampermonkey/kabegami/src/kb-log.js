(function (global) {
  'use strict';

  const root = global || (typeof window !== 'undefined' ? window : this);
  const KB = root.KB = root.KB || {};

  if (KB.getLogger) return;

  const LEVELS = ['trace', 'debug', 'info', 'warn', 'error'];
  const CONSOLE_FALLBACK = {
    trace: (...args) => console.log(...args),
    debug: (...args) => console.log(...args),
    info: (...args) => console.info(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
  };

  const listeners = new Set();

  function addListener(fn) {
    if (typeof fn === 'function') listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function emit(level, namespace, args) {
    const ts = new Date().toISOString();
    const payload = { level, namespace, timestamp: ts, args };
    for (const fn of listeners) {
      try { fn(payload); } catch (_) {}
    }
    const consoleMethod = console[level] ? console[level].bind(console) : CONSOLE_FALLBACK[level];
    consoleMethod(`[Kabegami][${level.toUpperCase()}][${namespace}]`, ...args);
  }

  function makeLogger(namespace) {
    const ns = namespace || 'main';
    const logger = {};
    for (const level of LEVELS) {
      logger[level] = (...args) => emit(level, ns, args);
    }
    return logger;
  }

  KB.addLogListener = addListener;
  KB.getLogger = makeLogger;
  KB.log = makeLogger('main');

})(typeof window !== 'undefined' ? window : this);

