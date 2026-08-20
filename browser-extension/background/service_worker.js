// CNKI Scholar Assistant - Background Service Worker
// Handles search, download, and abstract fetching

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SEARCH') {
    handleSearch(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true; // async
  }
  if (msg.type === 'DOWNLOAD') {
    handleDownload(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'GET_ABSTRACTS') {
    handleGetAbstracts(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'INJECT_TOOLBAR') {
    injectToolbar(msg.tabId).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
});

// ─── Search ───────────────────────────────────────────────────────────────────

async function handleSearch({ query, field = 'SU', source = '', yearRange = '', page = 1, tabId }) {
  // Build CNKI search URL
  const params = new URLSearchParams({
    querytext: encodeURIComponent(query),
    select: field,
    ...(source ? { dbcode: getDbCode(source) } : {}),
    ...(yearRange ? { year: yearRange } : {}),
  });

  // Use the active CNKI tab or find one
  let targetTab = null;
  if (tabId) {
    try { targetTab = await chrome.tabs.get(tabId); } catch {}
  }
  if (!targetTab || !targetTab.url?.includes('cnki.net')) {
    const tabs = await chrome.tabs.query({ url: '*://*.cnki.net/*' });
    targetTab = tabs[0] || null;
  }

  if (!targetTab) {
    // Open a new CNKI tab
    targetTab = await chrome.tabs.create({ url: 'https://kns.cnki.net/kns8s/search', active: false });
    await sleep(2000);
  }

  // Execute search on the tab
  const result = await chrome.scripting.executeScript({
    target: { tabId: targetTab.id },
    func: performSearch,
    args: [query, field, source, yearRange, page],
  });

  return result?.[0]?.result || { error: '检索失败', results: [] };
}

function performSearch(query, field, source, yearRange, page) {
  return new Promise(async (resolve) => {
    try {
      // Build search URL directly
      const baseUrl = 'https://kns.cnki.net/kns8s/search';
      const fieldMap = { SU: '主题', TI: '题名', AU: '作者', AB: '摘要', KY: '关键词' };

      // Navigate to search page
      if (!window.location.href.includes('kns8s')) {
        window.location.href = baseUrl;
        resolve({ error: '正在导航到检索页，请重试' });
        return;
      }

      // Fill search input
      const waitForEl = (sel, timeout = 8000) => new Promise((res, rej) => {
        const t0 = Date.now();
        const check = () => {
          const el = document.querySelector(sel);
          if (el) return res(el);
          if (Date.now() - t0 > timeout) return rej(new Error('超时: ' + sel));
          setTimeout(check, 200);
        };
        check();
      });

      const input = await waitForEl('input.search-input, #txt_search');
      input.value = query;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Click search button
      const btn = document.querySelector('input.search-btn, .search-btn, button[type="submit"]');
      if (btn) btn.click();
      else input.form?.submit();

      // Wait for results
      await new Promise((res, rej) => {
        let n = 0;
        const check = () => {
          const hasResults = document.querySelector('.result-table-list tbody tr');
          const hasCount = document.body.innerText.includes('条结果') || document.body.innerText.includes('篇文献');
          if (hasResults || hasCount) return res();
          if (++n > 40) return rej(new Error('等待结果超时'));
          setTimeout(check, 500);
        };
        check();
      });

      // Check captcha
      const cap = document.querySelector('#tcaptcha_transform_dy');
      if (cap && cap.getBoundingClientRect().top >= 0) {
        resolve({ error: '⚠️ 出现验证码，请手动完成滑块验证后重试' });
        return;
      }

      // Extract results
      const rows = document.querySelectorAll('.result-table-list tbody tr');
      const checkboxes = document.querySelectorAll('.result-table-list tbody input.cbItem');

      const results = Array.from(rows).map((row, i) => {
        const titleLink = row.querySelector('td.name a.fz14');
        const authors = Array.from(row.querySelectorAll('td.author a')).map(a => a.innerText?.trim()).filter(Boolean);
        const journal = row.querySelector('td.source a')?.innerText?.trim() || '';
        const date = row.querySelector('td.date')?.innerText?.trim() || '';
        const citations = row.querySelector('td.quote')?.innerText?.trim() || '0';
        const downloads = row.querySelector('td.download')?.innerText?.trim() || '0';
        return {
          n: i + 1,
          title: titleLink?.innerText?.trim() || '',
          href: titleLink?.href || '',
          exportId: checkboxes[i]?.value || '',
          authors: authors.join('; '),
          journal,
          date,
          citations,
          downloads,
        };
      }).filter(r => r.title);

      const totalEl = document.querySelector('.pagerTitleCell');
      const total = totalEl?.innerText?.match(/[\d,，]+/)?.[0]?.replace(/[,，]/g, '') || String(results.length);
      const pageEl = document.querySelector('.countPageMark');
      const pageInfo = pageEl?.innerText || '1/1';

      resolve({ results, total, page: pageInfo, query });

    } catch (err) {
      resolve({ error: err.message, results: [] });
    }
  });
}

// ─── Download ─────────────────────────────────────────────────────────────────

async function handleDownload({ url, title, format = 'pdf', autoRename }) {
  const tabs = await chrome.tabs.query({ url: '*://*.cnki.net/*' });
  if (!tabs.length) return { error: '未找到知网标签页，请先打开知网' };

  const tab = tabs[0];

  // Navigate to paper detail
  await chrome.tabs.update(tab.id, { url });
  await sleep(2500);

  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: triggerDownload,
    args: [format],
  });

  return result?.[0]?.result || { error: '下载脚本执行失败' };
}

function triggerDownload(format) {
  return new Promise(async (resolve) => {
    try {
      const waitForEl = (sel, timeout = 8000) => new Promise((res, rej) => {
        const t0 = Date.now();
        const check = () => {
          const el = document.querySelector(sel);
          if (el) return res(el);
          if (Date.now() - t0 > timeout) return rej(new Error('timeout: ' + sel));
          setTimeout(check, 300);
        };
        check();
      });

      await waitForEl('.brief h1, .doc-top h1, #chTitle');

      // Captcha check
      const cap = document.querySelector('#tcaptcha_transform_dy');
      if (cap && cap.getBoundingClientRect().top >= 0) {
        resolve({ error: '出现验证码，请手动完成后重试' });
        return;
      }

      // Login check
      const notLogged = document.querySelector('.downloadlink.icon-notlogged, [class*="notlogged"]');
      if (notLogged) {
        resolve({ error: '请先登录知网账号才能下载' });
        return;
      }

      const title = document.querySelector('.brief h1, #chTitle')?.innerText?.trim()
        ?.replace(/\s*网络首发\s*$/, '') || '论文';

      const pdfLink = document.querySelector('#pdfDown, .btn-dlpdf a, a[href*=".pdf"]');
      const cajLink = document.querySelector('#cajDown, .btn-dlcaj a');

      if (format === 'pdf' && pdfLink) { pdfLink.click(); resolve({ status: 'ok', format: 'PDF', title }); }
      else if (format === 'caj' && cajLink) { cajLink.click(); resolve({ status: 'ok', format: 'CAJ', title }); }
      else if (pdfLink) { pdfLink.click(); resolve({ status: 'ok', format: 'PDF', title }); }
      else if (cajLink) { cajLink.click(); resolve({ status: 'ok', format: 'CAJ', title }); }
      else resolve({ error: '未找到下载按钮（可能无权限或未登录）' });

    } catch (err) {
      resolve({ error: err.message });
    }
  });
}

// ─── Get Abstracts ────────────────────────────────────────────────────────────

async function handleGetAbstracts({ papers }) {
  const result = [];
  for (const paper of papers.slice(0, 10)) {
    if (!paper.href) { result.push(paper); continue; }
    try {
      const tabs = await chrome.tabs.query({ url: '*://*.cnki.net/*' });
      if (!tabs.length) { result.push(paper); continue; }
      const tab = tabs[0];
      await chrome.tabs.update(tab.id, { url: paper.href });
      await sleep(1800);

      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractAbstract,
      });
      const info = res?.[0]?.result;
      result.push({ ...paper, ...(info || {}) });
    } catch { result.push(paper); }
    await sleep(500);
  }
  return { papers: result };
}

function extractAbstract() {
  const abstract = document.querySelector('#ChDivSummary, .abstract-text, [name="abstract"]')?.innerText?.trim()
    || document.querySelector('meta[name="abstract"]')?.content || '';
  const keywords = Array.from(document.querySelectorAll('.keywords a, .keyword a')).map(a => a.innerText?.trim()).filter(Boolean).join('; ');
  const doi = document.querySelector('a[href*="doi.org"]')?.href || document.querySelector('.doi')?.innerText?.trim() || '';
  return { abstract, keywords, doi };
}

// ─── Inject Toolbar (content script trigger) ────────────────────────────────

async function injectToolbar(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content/content.js'],
  });
  return { status: 'ok' };
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function getDbCode(source) {
  const map = { 'SCI': 'SCISF', 'EI': 'EIAF', 'CSSCI': 'CSSCI', '北大核心': 'PKU', 'CSCD': 'CSCD' };
  return map[source] || '';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Tab install listener ─────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log('[CNKI Assistant] Extension installed');
});
