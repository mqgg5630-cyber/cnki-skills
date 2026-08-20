// CNKI Scholar Assistant - Popup Controller v1.1.1

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// review_engine_bundle.js 先于本文件加载（defer保证DOM就绪后再执行），
// 此时 window.ReviewEngine 已存在；若意外未加载则 generateReview 为 undefined，
// doGenerateReview 内会 fallback 到 background
let generateReview = null;
window.addEventListener('load', () => {
  generateReview = window.ReviewEngine?.generateReview || null;
});

let currentPage = 1;
let currentQuery = '';
let currentResults = [];
let library = [];
let settings = {};
let stats = { downloads: 0, saved: 0, reviews: 0 };
let reviewMode = 'local';

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadLibrary();
  setupTabs();
  setupSearch();
  setupLibrary();
  setupReview();
  setupAccount();
  // 账号检测独立运行，不 await，不阻塞 UI 初始化
  detectAccount();
});

// 带超时保护的 Promise 包装
function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// ─── Settings ─────────────────────────────────────────────────────────────────

async function loadSettings() {
  const data = await chrome.storage.local.get(['settings', 'stats', 'library']);
  settings = data.settings || {
    defaultFormat: 'pdf', autoRename: true, savePath: '',
    zoteroPort: 23119, accessMode: 'auto', orgName: '', orgCode: '',
    apiKey: '', aiModel: 'deepseek', reviewMode: 'local',
  };
  stats = data.stats || { downloads: 0, saved: 0, reviews: 0 };
  library = data.library || [];
  applySettings();
  updateStats();
}

function applySettings() {
  $('#defaultFormat').value = settings.defaultFormat || 'pdf';
  $('#autoRename').checked = settings.autoRename !== false;
  $('#savePath').value = settings.savePath || '';
  $('#zoteroPort').value = settings.zoteroPort || 23119;
  const r = $(`input[name="accessMode"][value="${settings.accessMode || 'auto'}"]`);
  if (r) r.checked = true;
  if (settings.accessMode === 'manual') $('#manualOrgInput')?.classList.remove('hidden');
  if ($('#orgName')) $('#orgName').value = settings.orgName || '';
  if ($('#orgCode')) $('#orgCode').value = settings.orgCode || '';
  reviewMode = settings.reviewMode || 'local';
  setReviewMode(reviewMode, false);
  if ($('#aiModel')) $('#aiModel').value = settings.aiModel || 'deepseek';
  if ($('#apiKeyInput')) $('#apiKeyInput').value = settings.apiKey || '';
}

async function saveSettings() {
  await chrome.storage.local.set({ settings, stats, library });
}

function updateStats() {
  $('#statDownloads').textContent = stats.downloads;
  $('#statSaved').textContent = stats.saved;
  $('#statReviews').textContent = stats.reviews;
}

async function loadLibrary() {
  const data = await chrome.storage.local.get('library');
  library = data.library || [];
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function setupTabs() {
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      $$('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      $('#tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'library') renderLibrary();
    });
  });
}

// ─── Account ──────────────────────────────────────────────────────────────────

async function detectAccount() {
  const dot = $('#statusDot'), text = $('#statusText');

  // 立刻显示默认态，防止停留在"检测账号..."
  dot.className = 'status-dot offline';
  text.textContent = '请打开知网';

  try {
    // ① 获取当前 tab，最多等 2 秒
    const tabs = await withTimeout(
      chrome.tabs.query({ active: true, currentWindow: true }),
      2000,
      []
    );
    const tab = tabs?.[0];

    if (!tab || !tab.url) {
      text.textContent = '无活动标签';
      return;
    }
    if (!tab.url.includes('cnki.net')) {
      text.textContent = '请打开知网';
      return;
    }

    // ② 知网页面：注入脚本检测，最多等 3 秒
    dot.className = 'status-dot';
    text.textContent = '知网已打开';

    const res = await withTimeout(
      chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractAccountInfo }),
      3000,
      null
    );
    applyAccountInfo(res?.[0]?.result ?? null);

  } catch (_) {
    // 任何意外都不卡死
    dot.className = 'status-dot offline';
    text.textContent = '请打开知网';
  }
}

function applyAccountInfo(info) {
  const dot = $('#statusDot'), text = $('#statusText');
  // info 为 null = 超时或脚本注入受限，显示中性状态，不报错
  if (!info) {
    dot.className = 'status-dot online';
    text.textContent = '知网已打开';
    return;
  }
  if (info.institution) {
    dot.className = 'status-dot institution';
    text.textContent = info.institution.slice(0, 8);
    $('#accountName').textContent = info.username || '机构用户';
    $('#accountOrg').textContent = info.institution;
    $('#accountType').textContent = '机构/IP认证';
  } else if (info.logged) {
    dot.className = 'status-dot online';
    text.textContent = info.username ? info.username.slice(0, 8) : '已登录';
    $('#accountName').textContent = info.username || '已登录用户';
    $('#accountOrg').textContent = '个人账号';
    $('#accountType').textContent = '标准用户';
  } else {
    dot.className = 'status-dot offline';
    text.textContent = '未登录';
    $('#accountName').textContent = '未登录';
    $('#accountOrg').textContent = '请先在知网登录';
    $('#accountType').textContent = '-';
  }
}

function extractAccountInfo() {
  try {
    const ipOrgEl = document.querySelector('.ip-area, #ip-name, .cur-org');
    const orgEl   = document.querySelector('.org-name, .institution-name, #ip-org, [class*="organ"]');
    const userEl  = document.querySelector('.header-person-name, .user-name, .personal-name');
    const institution = (ipOrgEl?.textContent?.trim() || orgEl?.textContent?.trim() || '').slice(0, 30);
    const username    = (userEl?.textContent?.trim() || '').slice(0, 20);

    // 知网登录按钮：显示"登录"文字说明未登录，显示用户名说明已登录
    const loginLink = document.querySelector('a[href*="login"], .login-btn, #LoginContent');
    const isNotLogged = loginLink && /登录|Login/i.test(loginLink.textContent || '');

    return {
      logged: !isNotLogged || !!institution || !!username,
      username,
      institution,
      accountType: institution ? '机构/IP认证' : ((!isNotLogged || username) ? '个人账号' : '未登录'),
    };
  } catch (e) {
    return { logged: false, username: '', institution: '', accountType: '检测异常' };
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────

function setupSearch() {
  $('#searchBtn').addEventListener('click', doSearch);
  $('#searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  $('#prevPage').addEventListener('click', () => { if (currentPage > 1) { currentPage--; searchCNKI(); } });
  $('#nextPage').addEventListener('click', () => { currentPage++; searchCNKI(); });
  $('#selectAllBtn').addEventListener('click', toggleSelectAll);
  $('#exportSelectedBtn').addEventListener('click', exportSelected);
  $('#downloadSelectedBtn').addEventListener('click', downloadSelected);
}

async function doSearch() {
  currentPage = 1;
  currentQuery = $('#searchInput').value.trim();
  if (!currentQuery) return;
  await searchCNKI();
}

async function searchCNKI() {
  const statusBar = $('#searchStatus');
  const resultsList = $('#resultsList');
  statusBar.className = 'status-bar';
  statusBar.textContent = `🔍 正在检索"${currentQuery}"...`;
  statusBar.classList.remove('hidden');
  resultsList.classList.add('hidden');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.runtime.sendMessage({
      type: 'SEARCH', query: currentQuery,
      field: $('#searchField').value, source: $('#sourceFilter').value,
      yearRange: $('#yearRange').value, page: currentPage, tabId: tab?.id,
    });
    if (response.error) { statusBar.className = 'status-bar error'; statusBar.textContent = '❌ ' + response.error; return; }
    currentResults = response.results || [];
    renderResults(response);
    statusBar.className = 'status-bar success';
    statusBar.textContent = `✅ 找到 ${response.total} 条结果（第${response.page}页）`;
    resultsList.classList.remove('hidden');
  } catch (err) {
    statusBar.className = 'status-bar error';
    statusBar.textContent = '❌ 检索失败：' + err.message;
  }
}

function renderResults(data) {
  const container = $('#papersContainer');
  container.innerHTML = '';
  container.className = 'papers-container';
  if (!data.results?.length) { container.innerHTML = '<div class="empty-state">📭 未找到相关文献</div>'; return; }
  $('#resultCount').textContent = `共 ${data.total} 条，当前页 ${data.results.length} 篇`;
  $('#pageInfo').textContent = `第 ${data.page} 页`;
  data.results.forEach((paper, idx) => {
    const card = document.createElement('div');
    card.className = 'paper-card';
    const isCore = paper.journal?.includes('核心') || paper.source?.includes('CSSCI') || paper.source?.includes('SCI');
    card.innerHTML = `
      <div class="paper-card-header">
        <input type="checkbox" class="paper-checkbox" data-idx="${idx}" />
        <div class="paper-title">${escHtml(paper.title)}${isCore ? '<span class="paper-badge core">核心</span>' : ''}</div>
      </div>
      <div class="paper-meta">
        <span class="meta-tag">👤 ${escHtml(paper.authors || '未知')}</span>
        <span class="meta-tag">📰 ${escHtml(paper.journal || '-')}</span>
        <span class="meta-tag">📅 ${paper.date || '-'}</span>
        ${paper.citations ? `<span class="meta-tag">🔗 被引${paper.citations}</span>` : ''}
      </div>
      <div class="paper-actions">
        <button class="sm-btn" data-action="detail" data-idx="${idx}">📋 详情</button>
        <button class="sm-btn" data-action="save" data-idx="${idx}">⭐ 收藏</button>
        <button class="sm-btn success" data-action="download" data-idx="${idx}">📄 PDF</button>
      </div>`;
    card.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (btn) {
        e.stopPropagation();
        const p = currentResults[btn.dataset.idx];
        if (btn.dataset.action === 'detail') showPaperDetail(p);
        else if (btn.dataset.action === 'save') savePaper(p);
        else if (btn.dataset.action === 'download') downloadPaper(p);
        return;
      }
      const cb = card.querySelector('.paper-checkbox');
      cb.checked = !cb.checked;
      card.classList.toggle('selected', cb.checked);
    });
    container.appendChild(card);
  });
}

function toggleSelectAll() {
  const cbs = $$('.paper-checkbox');
  const anyUnchecked = cbs.some(cb => !cb.checked);
  cbs.forEach(cb => { cb.checked = anyUnchecked; cb.closest('.paper-card').classList.toggle('selected', anyUnchecked); });
  $('#selectAllBtn').textContent = anyUnchecked ? '取消全选' : '全选';
}

async function exportSelected() {
  const sel = $$('.paper-checkbox:checked').map(cb => currentResults[cb.dataset.idx]);
  if (!sel.length) { showStatus('请先选择文献', 'error'); return; }
  await navigator.clipboard.writeText(sel.map((p, i) => `[${i+1}] ${p.authors}. ${p.title}[J]. ${p.journal}, ${p.date}.`).join('\n'));
  showStatus(`✅ 已复制 ${sel.length} 条 GB/T 7714 引用`, 'success');
}

async function downloadSelected() {
  const sel = $$('.paper-checkbox:checked').map(cb => currentResults[cb.dataset.idx]);
  if (!sel.length) { showStatus('请先选择文献', 'error'); return; }
  showStatus(`⏳ 开始下载 ${sel.length} 篇...`);
  for (const p of sel) { await downloadPaper(p); await sleep(800); }
}

async function showPaperDetail(paper) { if (paper.href) chrome.tabs.create({ url: paper.href }); }

async function savePaper(paper) {
  library = library.filter(p => p.href !== paper.href);
  library.unshift({ ...paper, savedAt: Date.now() });
  stats.saved = library.length;
  await saveSettings();
  showStatus('⭐ 已收藏：' + paper.title.slice(0, 20), 'success');
}

async function downloadPaper(paper) {
  if (!paper.href) { showStatus('❌ 无下载链接', 'error'); return; }
  const response = await chrome.runtime.sendMessage({
    type: 'DOWNLOAD', url: paper.href, title: paper.title,
    format: settings.defaultFormat || 'pdf', autoRename: settings.autoRename,
  });
  if (response?.status === 'ok') {
    stats.downloads++; await saveSettings(); updateStats();
    showStatus(`✅ 下载已触发：${paper.title.slice(0, 20)}`, 'success');
  } else {
    showStatus('❌ ' + (response?.error || '下载失败，请确认已登录知网'), 'error');
  }
}

// ─── Library ──────────────────────────────────────────────────────────────────

function setupLibrary() {
  $('#exportAllBtn').addEventListener('click', exportAllLibrary);
  $('#clearLibraryBtn').addEventListener('click', clearLibrary);
}

function renderLibrary() {
  const c = $('#libraryList');
  if (!library.length) { c.innerHTML = '<div class="empty-state">📂 文库为空</div>'; return; }
  c.innerHTML = '';
  library.forEach((paper, idx) => {
    const card = document.createElement('div');
    card.className = 'paper-card';
    card.innerHTML = `
      <div class="paper-title">${escHtml(paper.title)}</div>
      <div class="paper-meta"><span>👤 ${escHtml(paper.authors||'-')}</span><span>📰 ${escHtml(paper.journal||'-')}</span><span>📅 ${paper.date||'-'}</span></div>
      <div class="paper-actions">
        <button class="sm-btn success" data-action="dl">📄 PDF</button>
        <button class="sm-btn danger" data-action="rm">🗑 删除</button>
      </div>`;
    card.querySelector('[data-action="dl"]').addEventListener('click', () => downloadPaper(paper));
    card.querySelector('[data-action="rm"]').addEventListener('click', async () => {
      library.splice(idx, 1); stats.saved = library.length;
      await saveSettings(); updateStats(); renderLibrary();
    });
    c.appendChild(card);
  });
}

async function exportAllLibrary() {
  if (!library.length) return;
  await navigator.clipboard.writeText(library.map((p, i) => `[${i+1}] ${p.authors||''}. ${p.title}[J]. ${p.journal||''}, ${p.date||''}.`).join('\n'));
  showStatus(`✅ 已复制 ${library.length} 条引用`, 'success');
}

async function clearLibrary() {
  if (!confirm('确定清空文库吗？')) return;
  library = []; stats.saved = 0; await saveSettings(); updateStats(); renderLibrary();
}

// ─── Review Generator ─────────────────────────────────────────────────────────

const API_KEY_GUIDES = {
  deepseek: '<a href="https://platform.deepseek.com/api_keys" target="_blank">获取 DeepSeek Key →</a>',
  qwen:     '<a href="https://dashscope.aliyun.com/" target="_blank">获取通义千问 Key →</a>',
  openai:   '<a href="https://platform.openai.com/api-keys" target="_blank">获取 OpenAI Key →</a>',
  claude:   '<a href="https://console.anthropic.com/" target="_blank">获取 Claude Key →</a>',
  ollama:   '填入本地模型名，如 <code>qwen2.5:7b</code>，无需 Key',
};

function setupReview() {
  $$('.mode-card').forEach(card => card.addEventListener('click', () => setReviewMode(card.dataset.mode, true)));
  $('#freeAIProvider')?.addEventListener('change', function() {
    if ($('#ollamaTip')) $('#ollamaTip').style.display = this.value === 'ollama' ? 'block' : 'none';
  });
  $('#aiModel')?.addEventListener('change', updateApiKeyGuide);
  $('#toggleApiKey')?.addEventListener('click', () => {
    const inp = $('#apiKeyInput');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    $('#toggleApiKey').textContent = inp.type === 'password' ? '👁' : '🙈';
  });
  $('#generateReviewBtn').addEventListener('click', doGenerateReview);
  $('#copyReviewBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText($('#reviewContent').textContent);
    showStatus('✅ 综述已复制到剪贴板', 'success');
  });
  // ── Bug修复：下载交给 background 处理，避免 popup 的 blob URL 失效
  $('#downloadReviewBtn')?.addEventListener('click', downloadReviewAsFile);
  $('#downloadPdfReviewBtn')?.addEventListener('click', downloadReviewAsPrint);
}

function setReviewMode(mode, save = true) {
  reviewMode = mode;
  $$('.mode-card').forEach(c => c.classList.toggle('active', c.dataset.mode === mode));
  $('#freeAIOptions')?.classList.toggle('hidden', mode !== 'free_ai');
  $('#apiKeyOptions')?.classList.toggle('hidden', mode !== 'api_ai');
  if (save) { settings.reviewMode = mode; saveSettings(); }
  updateApiKeyGuide();
}

function updateApiKeyGuide() {
  const el = $('#apiKeyGuideLink');
  if (el) el.innerHTML = API_KEY_GUIDES[$('#aiModel')?.value || 'deepseek'] || '';
}

async function doGenerateReview() {
  const topic = $('#reviewTopic').value.trim();
  if (!topic) { showStatus('请输入综述主题', 'error'); return; }

  const count = parseInt($('#reviewPaperCount').value) || 20;
  const source = $('#reviewSource').value;
  const lang = $('#reviewLang').value;
  let mode = reviewMode, model = '', apiKey = '';

  if (mode === 'free_ai') {
    model = $('#freeAIProvider')?.value || 'hf';
  } else if (mode === 'api_ai') {
    model = $('#aiModel')?.value || 'deepseek';
    apiKey = $('#apiKeyInput')?.value.trim() || '';
    if (!apiKey) { showStatus('❌ 请填写 API Key', 'error'); return; }
    settings.aiModel = model; settings.apiKey = apiKey; await saveSettings();
  }

  $('#reviewProgress').classList.remove('hidden');
  $('#reviewOutput').classList.add('hidden');
  $('#generateReviewBtn').disabled = true;
  const modeLabel = { local: '🧠 本地NLP', free_ai: '🤖 免费AI', api_ai: `⚡ ${model}` };
  if ($('#progressMode')) $('#progressMode').textContent = modeLabel[mode] || mode;

  try {
    setProgress(10, `正在检索"${topic}"相关文献...`);

    // Step1: 检索
    const searchResp = await chrome.runtime.sendMessage({ type: 'SEARCH', query: topic, source, page: 1, count });
    if (searchResp.error) throw new Error(searchResp.error);
    const papers = searchResp.results?.slice(0, count) || [];
    if (!papers.length) throw new Error('未检索到文献，请检查关键词或知网连接');

    setProgress(35, `已获取 ${papers.length} 篇，提取摘要...`);

    // Step2: 获取摘要
    const absResp = await chrome.runtime.sendMessage({
      type: 'GET_ABSTRACTS',
      papers: papers.slice(0, mode === 'local' ? 20 : 12),
    });
    const enriched = absResp?.papers || papers;

    setProgress(60, '生成综述中...');

    // Step3: 生成 — 优先本地引擎，失败则走 background
    let result;
    if (typeof generateReview === 'function') {
      result = await generateReview({
        topic, papers: enriched, mode, model, apiKey, lang,
        onProgress: msg => setProgress(Math.min((parseInt($('#progressFill').style.width)||60) + 8, 90), msg),
      });
    } else {
      // fallback：交给 background service worker
      result = await chrome.runtime.sendMessage({ type: 'GENERATE_REVIEW', topic, papers: enriched, mode, model, apiKey, lang });
      if (result.error) throw new Error(result.error);
    }

    setProgress(100, '✅ 综述生成完成！');
    stats.reviews++; await saveSettings(); updateStats();

    $('#reviewTitle').textContent = `《${result.plan?.titleCn || topic}》综述`;
    $('#reviewContent').textContent = result.text;
    $('#reviewSourceBadge').textContent = result.source || mode;
    $('#reviewStats').textContent = `📊 文献 ${papers.length} 篇 · ${result.plan?.keywordsCn?.slice(0,4).join('、') || ''} · ${new Date().toLocaleDateString('zh-CN')}`;
    $('#reviewOutput').classList.remove('hidden');
    $('#reviewProgress').classList.add('hidden');

  } catch (err) {
    showStatus('❌ 生成失败：' + err.message, 'error');
    $('#reviewProgress').classList.add('hidden');
    setProgress(0, '');
  } finally {
    $('#generateReviewBtn').disabled = false;
  }
}

// ── Bug修复：把文件内容传给 background 再下载，避免 popup blob URL 跨上下文失效
async function downloadReviewAsFile() {
  const title = $('#reviewTitle').textContent.replace(/[\\/:*?"<>|]/g, '_');
  const content = $('#reviewContent').textContent;
  // 先把文本保存到 storage，background 取出来写文件
  await chrome.storage.local.set({ _pendingDownload: { title, content, type: 'txt' } });
  const resp = await chrome.runtime.sendMessage({ type: 'DOWNLOAD_REVIEW_FILE' });
  if (resp?.status === 'ok') {
    showStatus('✅ 文件已下载到默认下载目录', 'success');
  } else {
    // 降级：直接在 popup 内用 data URL 触发
    const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    chrome.downloads.download({ url: dataUrl, filename: title + '.txt' });
    showStatus('✅ 文件下载已触发', 'success');
  }
}

function downloadReviewAsPrint() {
  const title = $('#reviewTitle').textContent;
  const content = $('#reviewContent').textContent;
  const source = $('#reviewSourceBadge').textContent;
  // 用 data URL 打开新标签，避免 blob URL 跨 tab 失效
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<title>${escHtml(title)}</title>
<style>
body{font-family:'Microsoft YaHei',serif;font-size:12pt;max-width:800px;margin:40px auto;line-height:1.9;color:#212121;padding:0 20px}
h1{font-size:18pt;text-align:center;margin-bottom:6px;font-weight:700}
.meta{text-align:center;font-size:10pt;color:#757575;margin-bottom:20px}
pre{white-space:pre-wrap;font-family:inherit;font-size:11pt;line-height:1.9}
.noprint{display:flex;gap:8px;justify-content:center;margin:16px 0}
.noprint button{padding:8px 20px;border:none;border-radius:6px;cursor:pointer;font-size:13px;background:#1565c0;color:white}
@media print{.noprint{display:none!important}}
</style></head><body>
<h1>${escHtml(title)}</h1>
<div class="meta">来源：知网CNKI · ${escHtml(source)} · ${new Date().toLocaleDateString('zh-CN')}</div>
<div class="noprint"><button onclick="window.print()">🖨 打印 / 另存为PDF</button></div>
<hr/><pre>${escHtml(content)}</pre>
</body></html>`;
  // 用 data URL 而不是 blob URL，在新标签里安全有效
  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
  chrome.tabs.create({ url: dataUrl });
}

// ─── Account / Settings ───────────────────────────────────────────────────────

function setupAccount() {
  $$('input[name="accessMode"]').forEach(r => r.addEventListener('change', () => {
    if (r.value === 'manual') $('#manualOrgInput').classList.remove('hidden');
    else $('#manualOrgInput').classList.add('hidden');
  }));
  $('#saveSettingsBtn').addEventListener('click', async () => {
    settings.defaultFormat = $('#defaultFormat').value;
    settings.autoRename = $('#autoRename').checked;
    settings.savePath = $('#savePath').value;
    settings.zoteroPort = parseInt($('#zoteroPort').value);
    settings.accessMode = $('input[name="accessMode"]:checked')?.value || 'auto';
    settings.orgName = $('#orgName')?.value || '';
    settings.orgCode = $('#orgCode')?.value || '';
    await saveSettings();
    showStatus('✅ 设置已保存', 'success');
  });
  $('#testZoteroBtn').addEventListener('click', async () => {
    const port = parseInt($('#zoteroPort').value) || 23119;
    const el = $('#zoteroStatus');
    el.textContent = '⏳ 测试中...';
    try {
      const r = await fetch(`http://127.0.0.1:${port}/connector/ping`);
      if (r.ok || r.status === 405) {
        el.style.cssText = 'background:#e8f5e9;color:#2e7d32;padding:4px 8px;border-radius:4px';
        el.textContent = '✅ Zotero 连接成功！';
      } else throw new Error('HTTP ' + r.status);
    } catch {
      el.style.cssText = 'background:#ffebee;color:#c62828;padding:4px 8px;border-radius:4px';
      el.textContent = '❌ 无法连接 Zotero（请确保 Zotero 已启动）';
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setProgress(pct, text) {
  $('#progressFill').style.width = pct + '%';
  if (text !== undefined) $('#progressText').textContent = text;
}

function showStatus(msg, type = '') {
  const el = $('#searchStatus');
  el.className = 'status-bar' + (type ? ' ' + type : '');
  el.textContent = msg;
  el.classList.remove('hidden');
  if (type === 'success') setTimeout(() => el.classList.add('hidden'), 3000);
}

function escHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
