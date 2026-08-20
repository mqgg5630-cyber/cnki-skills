// CNKI Scholar Assistant - Popup Controller (Firefox MV2)
// 综述引擎通过 review_engine_bundle.js 全局挂载，无需 import
const { generateReview, planTopic } = window.ReviewEngine || {};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

let currentPage = 1;
let currentQuery = '';
let currentResults = [];
let library = [];
let settings = {};
let stats = { downloads: 0, saved: 0, reviews: 0 };

// 当前综述模式
let reviewMode = 'local'; // 'local' | 'free_ai' | 'api_ai'

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadLibrary();
  setupTabs();
  setupSearch();
  setupLibrary();
  setupReview();
  setupAccount();
  detectAccount();
});

// ─── Settings / Storage ──────────────────────────────────────────────────────

async function loadSettings() {
  const data = await chrome.storage.local.get(['settings', 'stats', 'library']);
  settings = data.settings || {
    defaultFormat: 'pdf',
    autoRename: true,
    savePath: '',
    zoteroPort: 23119,
    accessMode: 'auto',
    orgName: '',
    orgCode: '',
    apiKey: '',
    aiModel: 'deepseek',
    reviewMode: 'local',
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
  const modeRadio = $('input[name="accessMode"][value="' + (settings.accessMode || 'auto') + '"]');
  if (modeRadio) modeRadio.checked = true;
  if (settings.accessMode === 'manual') $('#manualOrgInput')?.classList.remove('hidden');
  if ($('#orgName')) $('#orgName').value = settings.orgName || '';
  if ($('#orgCode')) $('#orgCode').value = settings.orgCode || '';

  // 恢复综述模式
  reviewMode = settings.reviewMode || 'local';
  setReviewMode(reviewMode, false); // false = 不保存

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

// ─── Account Detection ───────────────────────────────────────────────────────

async function detectAccount() {
  const dot = $('#statusDot');
  const text = $('#statusText');
  dot.className = 'status-dot';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url?.includes('cnki.net')) {
      text.textContent = '请打开知网';
      dot.classList.add('offline');
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractAccountInfo,
    });

    const info = results?.[0]?.result;
    if (info?.logged) {
      if (info.institution) {
        dot.classList.add('institution');
        text.textContent = info.institution.slice(0, 8);
      } else {
        dot.classList.add('online');
        text.textContent = info.username || '已登录';
      }
      $('#accountName').textContent = info.username || '已登录用户';
      $('#accountOrg').textContent = info.institution || '个人账号';
      $('#accountType').textContent = info.accountType || '标准用户';
    } else {
      dot.classList.add('offline');
      text.textContent = '未登录';
      $('#accountName').textContent = '未登录';
      $('#accountOrg').textContent = '请先在知网登录';
      $('#accountType').textContent = '-';
    }
  } catch (e) {
    dot.classList.add('offline');
    text.textContent = '检测失败';
  }
}

function extractAccountInfo() {
  const userEl = document.querySelector('.header-person-name, .user-name, #LoginContent, .personal-name, [class*="user-info"]');
  const orgEl = document.querySelector('.org-name, .institution-name, #ip-org, [class*="organ"], .ip-area-name');
  const loginBtn = document.querySelector('#LoginContent, a[href*="login"], .login-btn');
  const isLoginPage = !!loginBtn && (loginBtn.textContent?.includes('登录') || loginBtn.textContent?.includes('Login'));
  const userInfo = document.querySelector('.my-account, .user-login, .header-login-area');
  const logged = !isLoginPage || !!userInfo?.querySelector('[class*="name"]');
  const ipOrgEl = document.querySelector('.ip-area, #ip-name, .cur-org');
  const institution = ipOrgEl?.textContent?.trim() || orgEl?.textContent?.trim() || '';
  const username = userEl?.textContent?.trim() || '';
  return {
    logged: logged || !!institution,
    username: username || (institution ? '机构用户' : ''),
    institution,
    accountType: institution ? '机构/IP认证' : (logged ? '个人账号' : '未登录'),
  };
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
      type: 'SEARCH',
      query: currentQuery,
      field: $('#searchField').value,
      source: $('#sourceFilter').value,
      yearRange: $('#yearRange').value,
      page: currentPage,
      tabId: tab?.id,
    });

    if (response.error) {
      statusBar.className = 'status-bar error';
      statusBar.textContent = '❌ ' + response.error;
      return;
    }

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

  if (!data.results?.length) {
    container.innerHTML = '<div class="empty-state">📭 未找到相关文献</div>';
    return;
  }

  $('#resultCount').textContent = `共 ${data.total} 条，当前页 ${data.results.length} 篇`;
  $('#pageInfo').textContent = `第 ${data.page} 页`;

  data.results.forEach((paper, idx) => {
    const card = document.createElement('div');
    card.className = 'paper-card';
    card.dataset.idx = idx;
    const isCore = paper.journal && (paper.journal.includes('核心') || paper.source?.includes('CSSCI') || paper.source?.includes('SCI'));
    card.innerHTML = `
      <div class="paper-card-header">
        <input type="checkbox" class="paper-checkbox" data-idx="${idx}" />
        <div class="paper-title">${escHtml(paper.title)}${isCore ? '<span class="paper-badge core">核心</span>' : ''}</div>
      </div>
      <div class="paper-meta">
        <span class="meta-tag">👤 ${escHtml(paper.authors || '未知作者')}</span>
        <span class="meta-tag">📰 ${escHtml(paper.journal || '-')}</span>
        <span class="meta-tag">📅 ${paper.date || '-'}</span>
        ${paper.citations ? `<span class="meta-tag">🔗 被引${paper.citations}</span>` : ''}
        ${paper.downloads ? `<span class="meta-tag">⬇ ${paper.downloads}</span>` : ''}
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
  const checkboxes = $$('.paper-checkbox');
  const anyUnchecked = checkboxes.some(cb => !cb.checked);
  checkboxes.forEach(cb => {
    cb.checked = anyUnchecked;
    cb.closest('.paper-card').classList.toggle('selected', anyUnchecked);
  });
  $('#selectAllBtn').textContent = anyUnchecked ? '取消全选' : '全选';
}

async function exportSelected() {
  const selected = $$('.paper-checkbox:checked').map(cb => currentResults[cb.dataset.idx]);
  if (!selected.length) { showStatus('请先选择文献', 'error'); return; }
  const citation = selected.map((p, i) => `[${i+1}] ${p.authors}. ${p.title}[J]. ${p.journal}, ${p.date}.`).join('\n');
  await navigator.clipboard.writeText(citation);
  showStatus(`✅ 已复制 ${selected.length} 条 GB/T 7714 引用`, 'success');
}

async function downloadSelected() {
  const selected = $$('.paper-checkbox:checked').map(cb => currentResults[cb.dataset.idx]);
  if (!selected.length) { showStatus('请先选择文献', 'error'); return; }
  showStatus(`⏳ 开始下载 ${selected.length} 篇文献...`);
  for (const paper of selected) { await downloadPaper(paper); await sleep(800); }
}

// ─── Paper Actions ────────────────────────────────────────────────────────────

async function showPaperDetail(paper) {
  if (!paper.href) return;
  chrome.tabs.create({ url: paper.href });
}

async function savePaper(paper) {
  library = library.filter(p => p.href !== paper.href);
  library.unshift({ ...paper, savedAt: Date.now() });
  stats.saved = library.length;
  await saveSettings();
  showStatus('⭐ 已收藏：' + paper.title.slice(0, 20) + '...', 'success');
}

async function downloadPaper(paper) {
  if (!paper.href) { showStatus('❌ 无下载链接', 'error'); return; }
  const response = await chrome.runtime.sendMessage({
    type: 'DOWNLOAD',
    url: paper.href,
    title: paper.title,
    format: settings.defaultFormat || 'pdf',
    autoRename: settings.autoRename,
  });
  if (response?.status === 'ok') {
    stats.downloads++;
    await saveSettings();
    updateStats();
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
  const container = $('#libraryList');
  if (!library.length) {
    container.innerHTML = '<div class="empty-state">📂 文库为空，请先在检索页面收藏文献</div>';
    return;
  }
  container.innerHTML = '';
  library.forEach((paper, idx) => {
    const card = document.createElement('div');
    card.className = 'paper-card';
    card.innerHTML = `
      <div class="paper-title">${escHtml(paper.title)}</div>
      <div class="paper-meta">
        <span>👤 ${escHtml(paper.authors || '-')}</span>
        <span>📰 ${escHtml(paper.journal || '-')}</span>
        <span>📅 ${paper.date || '-'}</span>
      </div>
      <div class="paper-actions">
        <button class="sm-btn success" data-action="dl" data-idx="${idx}">📄 PDF</button>
        <button class="sm-btn danger" data-action="rm" data-idx="${idx}">🗑 删除</button>
      </div>`;
    card.querySelector('[data-action="dl"]').addEventListener('click', () => downloadPaper(paper));
    card.querySelector('[data-action="rm"]').addEventListener('click', async () => {
      library.splice(idx, 1);
      stats.saved = library.length;
      await saveSettings();
      updateStats();
      renderLibrary();
    });
    container.appendChild(card);
  });
}

async function exportAllLibrary() {
  if (!library.length) return;
  const citation = library.map((p, i) => `[${i+1}] ${p.authors || ''}. ${p.title}[J]. ${p.journal || ''}, ${p.date || ''}.`).join('\n');
  await navigator.clipboard.writeText(citation);
  showStatus(`✅ 已复制 ${library.length} 条引用到剪贴板`, 'success');
}

async function clearLibrary() {
  if (!confirm('确定清空文库吗？')) return;
  library = [];
  stats.saved = 0;
  await saveSettings();
  updateStats();
  renderLibrary();
}

// ─── Review Generator — 双模式 ───────────────────────────────────────────────

const API_KEY_GUIDES = {
  deepseek: '<a href="https://platform.deepseek.com/api_keys" target="_blank">获取DeepSeek Key（免费额度）→</a>',
  qwen: '<a href="https://dashscope.aliyun.com/" target="_blank">获取通义千问Key（免费额度）→</a>',
  openai: '<a href="https://platform.openai.com/api-keys" target="_blank">获取OpenAI Key →</a>',
  claude: '<a href="https://console.anthropic.com/" target="_blank">获取Claude Key →</a>',
  ollama: '输入本地Ollama模型名，如 <code>qwen2.5:7b</code>，无需Key',
};

function setupReview() {
  // 模式卡片切换
  $$('.mode-card').forEach(card => {
    card.addEventListener('click', () => setReviewMode(card.dataset.mode, true));
  });

  // 免费AI子选项
  $('#freeAIProvider')?.addEventListener('change', function() {
    const ollamaTip = $('#ollamaTip');
    if (ollamaTip) ollamaTip.style.display = this.value === 'ollama' ? 'block' : 'none';
  });

  // API模型切换 → 更新Key指引
  $('#aiModel')?.addEventListener('change', updateApiKeyGuide);

  // 显示/隐藏API Key
  $('#toggleApiKey')?.addEventListener('click', () => {
    const input = $('#apiKeyInput');
    input.type = input.type === 'password' ? 'text' : 'password';
    $('#toggleApiKey').textContent = input.type === 'password' ? '👁' : '🙈';
  });

  // 生成按钮
  $('#generateReviewBtn').addEventListener('click', doGenerateReview);

  // 输出操作
  $('#copyReviewBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText($('#reviewContent').textContent);
    showStatus('✅ 综述已复制到剪贴板', 'success');
  });
  $('#downloadReviewBtn')?.addEventListener('click', downloadReviewAsRTF);
  $('#downloadPdfReviewBtn')?.addEventListener('click', downloadReviewAsPrint);
}

function setReviewMode(mode, save = true) {
  reviewMode = mode;

  // 更新卡片选中状态
  $$('.mode-card').forEach(c => c.classList.toggle('active', c.dataset.mode === mode));

  // 显示/隐藏子选项
  const freeOpts = $('#freeAIOptions');
  const apiOpts = $('#apiKeyOptions');
  if (freeOpts) freeOpts.classList.toggle('hidden', mode !== 'free_ai');
  if (apiOpts) apiOpts.classList.toggle('hidden', mode !== 'api_ai');

  if (save) {
    settings.reviewMode = mode;
    saveSettings();
  }

  updateApiKeyGuide();
}

function updateApiKeyGuide() {
  const model = $('#aiModel')?.value || 'deepseek';
  const el = $('#apiKeyGuideLink');
  if (el) el.innerHTML = API_KEY_GUIDES[model] || '';
}

async function doGenerateReview() {
  const topic = $('#reviewTopic').value.trim();
  if (!topic) { showStatus('请输入综述主题', 'error'); return; }

  const count = parseInt($('#reviewPaperCount').value) || 20;
  const source = $('#reviewSource').value;
  const lang = $('#reviewLang').value;

  // 根据模式决定具体配置
  let mode = reviewMode;
  let model = '';
  let apiKey = '';

  if (mode === 'free_ai') {
    model = $('#freeAIProvider')?.value || 'hf';
  } else if (mode === 'api_ai') {
    model = $('#aiModel')?.value || 'deepseek';
    apiKey = $('#apiKeyInput')?.value.trim() || '';
    if (!apiKey) {
      showStatus('❌ API Key模式需要填写API Key', 'error');
      return;
    }
    // 保存Key
    settings.aiModel = model;
    settings.apiKey = apiKey;
    await saveSettings();
  }

  $('#reviewProgress').classList.remove('hidden');
  $('#reviewOutput').classList.add('hidden');
  $('#generateReviewBtn').disabled = true;

  const progressMode = $('#progressMode');
  const modeLabels = { local: '🧠 本地NLP模式', free_ai: '🤖 免费AI增强', api_ai: `⚡ ${model} API` };
  if (progressMode) progressMode.textContent = modeLabels[mode] || mode;

  try {
    setProgress(10, `正在检索"${topic}"相关文献...`);

    // Step 1: 检索知网
    const searchResp = await chrome.runtime.sendMessage({
      type: 'SEARCH',
      query: topic,
      source,
      page: 1,
      count,
    });

    if (searchResp.error) throw new Error(searchResp.error);
    const papers = searchResp.results?.slice(0, count) || [];
    if (!papers.length) throw new Error('未检索到文献，请换个关键词或检查知网连接');

    setProgress(35, `已获取 ${papers.length} 篇文献，提取摘要中...`);

    // Step 2: 获取摘要（本地NLP需要摘要；AI模式也会提升质量）
    const abstractsResp = await chrome.runtime.sendMessage({
      type: 'GET_ABSTRACTS',
      papers: papers.slice(0, Math.min(papers.length, mode === 'local' ? 20 : 12)),
    });
    const enrichedPapers = abstractsResp?.papers || papers;

    setProgress(60, '正在生成综述...');

    // Step 3: 调用统一综述引擎
    const result = await generateReview({
      topic,
      papers: enrichedPapers,
      mode,
      model,
      apiKey,
      lang,
      onProgress: (msg) => {
        const cur = parseInt($('#progressFill').style.width) || 60;
        setProgress(Math.min(cur + 8, 90), msg);
      },
    });

    setProgress(100, '✅ 综述生成完成！');

    stats.reviews++;
    await saveSettings();
    updateStats();

    // 显示结果
    $('#reviewTitle').textContent = `《${result.plan?.titleCn || topic}》综述`;
    $('#reviewContent').textContent = result.text;
    $('#reviewSourceBadge').textContent = result.source || mode;
    $('#reviewStats').textContent = `📊 文献 ${papers.length} 篇 · 关键词 ${result.plan?.keywordsCn?.slice(0,4).join('、') || ''} · ${new Date().toLocaleDateString('zh-CN')}`;

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

function downloadReviewAsRTF() {
  const title = $('#reviewTitle').textContent;
  const content = $('#reviewContent').textContent;
  const rtf = `{\\rtf1\\ansi\\ansicpg936\\deff0\n{\\fonttbl{\\f0\\fswiss Microsoft YaHei;}{\\f1\\froman SimSun;}}\n\\f0\\fs24\\lang2052\n{\\b\\fs32 ${escRtf(title)}\\par}\\par\n${escRtf(content).replace(/\n/g, '\\par\n')}\n}`;
  const blob = new Blob([rtf], { type: 'application/rtf' });
  chrome.downloads.download({ url: URL.createObjectURL(blob), filename: title + '.rtf' });
}

function downloadReviewAsPrint() {
  const title = $('#reviewTitle').textContent;
  const content = $('#reviewContent').textContent;
  const source = $('#reviewSourceBadge').textContent;
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>${escHtml(title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC&display=swap');
  body{font-family:'Noto Serif SC','Microsoft YaHei',serif;font-size:12pt;max-width:800px;margin:40px auto;line-height:1.9;color:#212121;padding:0 20px}
  h1{font-size:18pt;text-align:center;margin-bottom:6px;font-weight:700}
  .meta{text-align:center;font-size:10pt;color:#757575;margin-bottom:20px}
  pre{white-space:pre-wrap;font-family:inherit;font-size:11pt;line-height:1.9}
  .noprint{display:flex;gap:8px;justify-content:center;margin:16px 0}
  .noprint button{padding:8px 20px;border:none;border-radius:6px;cursor:pointer;font-size:13px}
  .print-btn{background:#1565c0;color:white} .close-btn{background:#f5f5f5}
  @media print{.noprint{display:none!important}}
</style>
</head>
<body>
<h1>${escHtml(title)}</h1>
<div class="meta">来源：中国知网CNKI · 生成方式：${escHtml(source)} · ${new Date().toLocaleDateString('zh-CN')}</div>
<div class="noprint">
  <button class="print-btn" onclick="window.print()">🖨 打印 / 另存为PDF</button>
  <button class="close-btn" onclick="window.close()">✕ 关闭</button>
</div>
<hr/>
<pre>${escHtml(content)}</pre>
</body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  chrome.tabs.create({ url: URL.createObjectURL(blob) });
}

// ─── Account / Settings ───────────────────────────────────────────────────────

function setupAccount() {
  $$('input[name="accessMode"]').forEach(r => {
    r.addEventListener('change', () => {
      if (r.value === 'manual') $('#manualOrgInput').classList.remove('hidden');
      else $('#manualOrgInput').classList.add('hidden');
    });
  });

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

  $('#testZoteroBtn').addEventListener('click', testZoteroConnection);
}

async function testZoteroConnection() {
  const port = parseInt($('#zoteroPort').value) || 23119;
  const statusEl = $('#zoteroStatus');
  statusEl.textContent = '⏳ 测试中...';
  try {
    const resp = await fetch(`http://127.0.0.1:${port}/connector/ping`);
    if (resp.ok || resp.status === 405) {
      statusEl.style.cssText = 'background:#e8f5e9;color:#2e7d32;padding:4px 8px;border-radius:4px';
      statusEl.textContent = '✅ Zotero 连接成功！';
    } else throw new Error('HTTP ' + resp.status);
  } catch (e) {
    statusEl.style.cssText = 'background:#ffebee;color:#c62828;padding:4px 8px;border-radius:4px';
    statusEl.textContent = '❌ 无法连接 Zotero（请确保 Zotero 已启动）';
  }
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

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escRtf(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
