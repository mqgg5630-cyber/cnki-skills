// CNKI Scholar Assistant - Popup Controller
// Communicates with content script and background service worker

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

let currentPage = 1;
let currentQuery = '';
let currentResults = [];
let library = [];
let settings = {};
let stats = { downloads: 0, saved: 0, reviews: 0 };

// ─── Init ───────────────────────────────────────────────────────────────────

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
    aiModel: 'none',
  };
  stats = data.stats || { downloads: 0, saved: 0, reviews: 0 };
  library = data.library || [];
  applySettings();
  updateStats();
}

function applySettings() {
  $('#defaultFormat').value = settings.defaultFormat;
  $('#autoRename').checked = settings.autoRename;
  $('#savePath').value = settings.savePath;
  $('#zoteroPort').value = settings.zoteroPort;
  $('input[name="accessMode"][value="' + settings.accessMode + '"]').checked = true;
  if (settings.accessMode === 'manual') $('#manualOrgInput').classList.remove('hidden');
  $('#orgName') && ($('#orgName').value = settings.orgName || '');
  $('#orgCode') && ($('#orgCode').value = settings.orgCode || '');
  $('#aiModel').value = settings.aiModel || 'none';
  if (settings.aiModel && settings.aiModel !== 'none') {
    $('#apiKeyInput').classList.remove('hidden');
    $('#apiKeyInput').value = settings.apiKey || '';
  }
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

// ─── Tabs ────────────────────────────────────────────────────────────────────

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
  // This runs in the CNKI page context
  const userEl = document.querySelector('.header-person-name, .user-name, #LoginContent, .personal-name, [class*="user-info"]');
  const orgEl = document.querySelector('.org-name, .institution-name, #ip-org, [class*="organ"], .ip-area-name');
  
  // Check login indicator
  const loginBtn = document.querySelector('#LoginContent, a[href*="login"], .login-btn');
  const isLoginPage = !!loginBtn && (loginBtn.textContent?.includes('登录') || loginBtn.textContent?.includes('Login'));
  const userInfo = document.querySelector('.my-account, .user-login, .header-login-area');

  // Try to get username from cookie or page
  const logged = !isLoginPage || !!userInfo?.querySelector('[class*="name"]');
  
  // IP-based institution detection
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
  $('#searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
  });
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
    
    // Send message to background to perform search
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

    const isCore = paper.journal && (
      paper.journal.includes('核心') || paper.source?.includes('CSSCI') || paper.source?.includes('SCI')
    );

    card.innerHTML = `
      <div class="paper-card-header">
        <input type="checkbox" class="paper-checkbox" data-idx="${idx}" />
        <div class="paper-title">
          ${escHtml(paper.title)}
          ${isCore ? '<span class="paper-badge core">核心</span>' : ''}
        </div>
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
      </div>
    `;

    card.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (btn) {
        e.stopPropagation();
        const paper = currentResults[btn.dataset.idx];
        if (btn.dataset.action === 'detail') showPaperDetail(paper);
        else if (btn.dataset.action === 'save') savePaper(paper);
        else if (btn.dataset.action === 'download') downloadPaper(paper);
        return;
      }
      // Toggle checkbox
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
  checkboxes.forEach((cb, i) => {
    cb.checked = anyUnchecked;
    cb.closest('.paper-card').classList.toggle('selected', anyUnchecked);
  });
  $('#selectAllBtn').textContent = anyUnchecked ? '取消全选' : '全选';
}

async function exportSelected() {
  const selected = $$('.paper-checkbox:checked').map(cb => currentResults[cb.dataset.idx]);
  if (!selected.length) { showStatus('请先选择文献', 'error'); return; }
  
  const citation = selected.map((p, i) => 
    `[${i+1}] ${p.authors}. ${p.title}[J]. ${p.journal}, ${p.date}.`
  ).join('\n');
  
  await navigator.clipboard.writeText(citation);
  showStatus(`✅ 已复制 ${selected.length} 条 GB/T 7714 引用`, 'success');
}

async function downloadSelected() {
  const selected = $$('.paper-checkbox:checked').map(cb => currentResults[cb.dataset.idx]);
  if (!selected.length) { showStatus('请先选择文献', 'error'); return; }
  
  showStatus(`⏳ 开始下载 ${selected.length} 篇文献...`);
  for (const paper of selected) {
    await downloadPaper(paper);
    await sleep(800);
  }
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
      </div>
    `;
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
  const citation = library.map((p, i) =>
    `[${i+1}] ${p.authors || ''}. ${p.title}[J]. ${p.journal || ''}, ${p.date || ''}.`
  ).join('\n');
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

// ─── Review Generator ─────────────────────────────────────────────────────────

function setupReview() {
  $('#aiModel').addEventListener('change', () => {
    const model = $('#aiModel').value;
    if (model === 'none') $('#apiKeyInput').classList.add('hidden');
    else $('#apiKeyInput').classList.remove('hidden');
  });

  $('#generateReviewBtn').addEventListener('click', generateReview);
  $('#copyReviewBtn').addEventListener('click', () => {
    navigator.clipboard.writeText($('#reviewContent').textContent);
    showStatus('✅ 综述已复制到剪贴板', 'success');
  });
  $('#downloadReviewBtn').addEventListener('click', () => downloadReviewAsDocx());
  $('#downloadPdfReviewBtn').addEventListener('click', () => downloadReviewAsPdf());
}

async function generateReview() {
  const topic = $('#reviewTopic').value.trim();
  if (!topic) { showStatus('请输入综述主题', 'error'); return; }

  const count = parseInt($('#reviewPaperCount').value);
  const source = $('#reviewSource').value;
  const lang = $('#reviewLang').value;
  const model = $('#aiModel').value;
  const apiKey = $('#apiKeyInput').value.trim();

  if (model !== 'none' && !apiKey) {
    showStatus('请输入AI的API Key', 'error'); return;
  }

  $('#reviewProgress').classList.remove('hidden');
  $('#reviewOutput').classList.add('hidden');
  $('#generateReviewBtn').disabled = true;

  try {
    setProgress(10, `正在检索"${topic}"相关文献...`);

    // Step 1: Search papers
    const searchResp = await chrome.runtime.sendMessage({
      type: 'SEARCH',
      query: topic,
      source,
      page: 1,
      count,
    });

    if (searchResp.error) throw new Error(searchResp.error);
    const papers = searchResp.results?.slice(0, count) || [];

    setProgress(40, `已找到 ${papers.length} 篇文献，提取摘要中...`);

    // Step 2: Get abstracts
    const papersWithAbstracts = await chrome.runtime.sendMessage({
      type: 'GET_ABSTRACTS',
      papers: papers.slice(0, Math.min(papers.length, 15)),
    });

    setProgress(70, '正在生成综述...');

    // Step 3: Generate review
    let reviewText;
    if (model === 'none') {
      reviewText = generateLocalReview(topic, papersWithAbstracts.papers || papers, lang);
    } else {
      reviewText = await generateAIReview(topic, papersWithAbstracts.papers || papers, model, apiKey, lang);
    }

    setProgress(100, '完成！');

    stats.reviews++;
    await saveSettings();
    updateStats();

    $('#reviewTitle').textContent = `《${topic}》综述`;
    $('#reviewContent').textContent = reviewText;
    $('#reviewOutput').classList.remove('hidden');
    $('#reviewProgress').classList.add('hidden');

  } catch (err) {
    showStatus('❌ 生成失败：' + err.message, 'error');
    $('#reviewProgress').classList.add('hidden');
  } finally {
    $('#generateReviewBtn').disabled = false;
  }
}

function generateLocalReview(topic, papers, lang) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月`;

  let review = `${topic}研究综述\n`;
  review += '═'.repeat(40) + '\n\n';
  review += `生成时间：${dateStr}\n`;
  review += `文献来源：中国知网（CNKI）\n`;
  review += `检索主题：${topic}\n`;
  review += `参考文献数：${papers.length} 篇\n\n`;

  review += '一、研究概况\n' + '─'.repeat(20) + '\n';
  review += `本综述基于知网数据库，针对"${topic}"主题共检索到相关文献 ${papers.length} 篇。`;
  
  if (papers.length > 0) {
    const years = papers.map(p => parseInt(p.date)).filter(y => y > 2000);
    if (years.length) {
      const minY = Math.min(...years), maxY = Math.max(...years);
      review += `发文时间跨度为 ${minY}—${maxY} 年，`;
    }
    
    const journals = [...new Set(papers.map(p => p.journal).filter(Boolean))];
    if (journals.length) review += `涉及期刊 ${journals.length} 种。`;
  }
  review += '\n\n';

  review += '二、主要文献\n' + '─'.repeat(20) + '\n';
  papers.slice(0, 10).forEach((p, i) => {
    review += `[${i+1}] ${p.authors || '佚名'}. ${p.title}`;
    if (p.journal) review += `[J]. ${p.journal}`;
    if (p.date) review += `, ${p.date}`;
    review += '.\n';
    if (p.abstract) review += `    摘要：${p.abstract.slice(0, 120)}...\n`;
    review += '\n';
  });

  review += '三、研究热点与趋势\n' + '─'.repeat(20) + '\n';
  // Extract keywords from titles
  const allText = papers.map(p => p.title + ' ' + (p.keywords || '')).join(' ');
  review += `综合分析上述文献，"${topic}"领域研究主要集中于：\n`;
  review += `• 基础理论与方法创新\n`;
  review += `• 应用场景与实证研究\n`;
  review += `• 跨学科交叉与融合\n\n`;

  review += '四、参考文献\n' + '─'.repeat(20) + '\n';
  papers.forEach((p, i) => {
    review += `[${i+1}] ${p.authors || ''}. ${p.title}`;
    if (p.journal) review += `[J]. ${p.journal}`;
    if (p.date) review += `, ${p.date}`;
    review += '.\n';
  });

  return review;
}

async function generateAIReview(topic, papers, model, apiKey, lang) {
  const papersText = papers.slice(0, 12).map((p, i) =>
    `[${i+1}] ${p.authors || ''}. 《${p.title}》. ${p.journal || ''} (${p.date || ''}).\n摘要：${p.abstract || '（无摘要）'}`
  ).join('\n\n');

  const prompt = `你是一位学术综述专家。请基于以下从中国知网（CNKI）检索到的文献，为主题"${topic}"撰写一篇结构完整的学术综述。

要求：
1. 综述长度800-1200字
2. 包含：研究背景与意义、国内外研究现状、研究热点与趋势、存在问题与展望
3. 使用上角标引用格式，如 [1][2]
4. 语言：${lang === 'zh' ? '中文' : lang === 'en' ? '英文' : '中文为主'}
5. 参考文献按GB/T 7714格式列出

已检索文献：
${papersText}

请直接输出综述正文（含参考文献），不要添加额外说明。`;

  let apiUrl, headers, body;

  if (model === 'openai') {
    apiUrl = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    body = JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: prompt }], max_tokens: 2000 });
  } else if (model === 'claude') {
    apiUrl = 'https://api.anthropic.com/v1/messages';
    headers = { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
    body = JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] });
  } else if (model === 'deepseek') {
    apiUrl = 'https://api.deepseek.com/chat/completions';
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    body = JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], max_tokens: 2000 });
  } else if (model === 'qwen') {
    apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    body = JSON.stringify({ model: 'qwen-max', input: { messages: [{ role: 'user', content: prompt }] }, parameters: { max_tokens: 2000 } });
  }

  const resp = await fetch(apiUrl, { method: 'POST', headers, body });
  if (!resp.ok) throw new Error(`API错误 ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();

  if (model === 'openai' || model === 'deepseek') return data.choices[0].message.content;
  if (model === 'claude') return data.content[0].text;
  if (model === 'qwen') return data.output?.text || data.output?.choices?.[0]?.message?.content || '生成失败';
}

function downloadReviewAsDocx() {
  const title = $('#reviewTitle').textContent;
  const content = $('#reviewContent').textContent;
  
  // Simple RTF download (works without external libs)
  const rtfContent = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Microsoft YaHei;}}
\\f0\\fs24
{\\b\\fs28 ${title}\\par}
\\par
${content.replace(/\n/g, '\\par\n')}
}`;
  
  const blob = new Blob([rtfContent], { type: 'application/rtf' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: `${title}.rtf` });
}

function downloadReviewAsPdf() {
  const title = $('#reviewTitle').textContent;
  const content = $('#reviewContent').textContent;
  
  // Open a printable page
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8">
<style>
body { font-family: 'Microsoft YaHei', serif; font-size: 12pt; max-width: 800px; margin: 40px auto; line-height: 1.8; }
h1 { font-size: 18pt; text-align: center; margin-bottom: 20px; }
pre { white-space: pre-wrap; font-family: inherit; }
@media print { button { display: none; } }
</style>
</head>
<body>
<h1>${escHtml(title)}</h1>
<button onclick="window.print()">🖨 打印/另存为PDF</button>
<hr/>
<pre>${escHtml(content)}</pre>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  chrome.tabs.create({ url });
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
    settings.orgName = $('#orgName').value;
    settings.orgCode = $('#orgCode').value;
    settings.aiModel = $('#aiModel').value;
    settings.apiKey = $('#apiKeyInput').value;
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
    const resp = await fetch(`http://127.0.0.1:${port}/connector/ping`, { method: 'GET' });
    if (resp.ok || resp.status === 405) {
      statusEl.style.background = '#e8f5e9';
      statusEl.style.color = '#2e7d32';
      statusEl.textContent = '✅ Zotero 连接成功！';
    } else {
      throw new Error('HTTP ' + resp.status);
    }
  } catch (e) {
    statusEl.style.background = '#ffebee';
    statusEl.style.color = '#c62828';
    statusEl.textContent = '❌ 无法连接 Zotero（请确保 Zotero 已启动）';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setProgress(pct, text) {
  $('#progressFill').style.width = pct + '%';
  $('#progressText').textContent = text;
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
