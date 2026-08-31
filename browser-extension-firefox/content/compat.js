// Firefox 兼容层 — 将 browser.* Promise API 桥接为 chrome.* 回调风格
// 在 service_worker.js 之前加载，让后续代码无需修改直接运行

if (typeof globalThis.chrome === 'undefined' && typeof browser !== 'undefined') {
  globalThis.chrome = browser;
}

// Firefox 的 browser.* 是原生 Promise，chrome.* 是回调风格
// 统一封装为既支持回调又支持 Promise 的形式
(function polyfill() {
  if (typeof browser === 'undefined') return; // Chrome/Edge 不需要

  const wrap = (fn) => (...args) => {
    const last = args[args.length - 1];
    if (typeof last === 'function') {
      // 有回调：转换为 Promise 调用后执行回调
      fn(...args.slice(0, -1)).then(last).catch(last);
    } else {
      return fn(...args);
    }
  };

  // storage
  if (browser.storage?.local) {
    chrome.storage = chrome.storage || {};
    chrome.storage.local = {
      get: wrap(browser.storage.local.get.bind(browser.storage.local)),
      set: wrap(browser.storage.local.set.bind(browser.storage.local)),
    };
  }

  // tabs
  if (browser.tabs) {
    chrome.tabs = {
      query:  wrap(browser.tabs.query.bind(browser.tabs)),
      get:    wrap(browser.tabs.get.bind(browser.tabs)),
      create: wrap(browser.tabs.create.bind(browser.tabs)),
      update: wrap(browser.tabs.update.bind(browser.tabs)),
    };
  }

  // scripting
  if (browser.scripting) {
    chrome.scripting = {
      executeScript: wrap(browser.scripting.executeScript.bind(browser.scripting)),
    };
  }

  // downloads
  if (browser.downloads) {
    chrome.downloads = {
      download: wrap(browser.downloads.download.bind(browser.downloads)),
    };
  }

  // runtime
  if (browser.runtime) {
    chrome.runtime = chrome.runtime || {};
    chrome.runtime.sendMessage    = wrap(browser.runtime.sendMessage.bind(browser.runtime));
    chrome.runtime.onMessage      = browser.runtime.onMessage;
    chrome.runtime.onInstalled    = browser.runtime.onInstalled;
    chrome.runtime.getURL         = browser.runtime.getURL.bind(browser.runtime);
  }
})();
