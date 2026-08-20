// CNKI Scholar Assistant - Content Script
// Injects floating toolbar into CNKI pages

(function () {
  'use strict';
  if (window.__cnkiAssistantInjected) return;
  window.__cnkiAssistantInjected = true;

  // ─── State ────────────────────────────────────────────────────────────────

  let selectedPapers = [];
  let floatingBar = null;
  let miniPanel = null;

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    injectFloatingBar();
    observePageChanges();
    enhanceResultRows();
    detectPageType();
  }

  function detectPageType() {
    const url = window.location.href;
    if (url.includes('/kns8s/search') || url.includes('/search/result')) {
      enhanceSearchPage();
    } else if (url.includes('/kcms') || url.includes('/detail/')) {
      enhanceDetailPage();
    } else if (url.includes('cnki.net') && (url === 'https://www.cnki.net/' || url.endsWith('cnki.net'))) {
      enhanceHomePage();
    }
  }

  // ─── Floating Bar ─────────────────────────────────────────────────────────

  function injectFloatingBar() {
    if (document.getElementById('cnki-assistant-bar')) return;

    floatingBar = document.createElement('div');
    floatingBar.id = 'cnki-assistant-bar';
    floatingBar.innerHTML = `
      <div class="cab-inner">
        <div class="cab-logo">
          <span>📚</span>
          <span class="cab-title">知网助手</span>
        </div>
        <div class="cab-actions">
          <button class="cab-btn" id="cab-search" title="搜索面板">🔍</button>
          <button class="cab-btn" id="cab-collect" title="批量收藏选中">⭐</button>
          <button class="cab-btn" id="cab-export" title="导出引用">📋</button>
          <button class="cab-btn highlight" id="cab-download" title="批量PDF下载">📄</button>
          <button class="cab-btn" id="cab-review" title="生成综述">✍️</button>
          <span class="cab-count hidden" id="cab-selected-count">0</span>
        </div>
        <button class="cab-toggle" id="cab-toggle" title="最小化">─</button>
      </div>
    `;

    document.body.appendChild(floatingBar);
    makeDraggable(floatingBar);
    bindBarEvents();
  }

  function bindBarEvents() {
    document.getElementById('cab-toggle')?.addEventListener('click', () => {
      floatingBar.classList.toggle('minimized');
    });
    document.getElementById('cab-search')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
      // Fallback: open extension popup
      showMiniPanel('search');
    });
    document.getElementById('cab-collect')?.addEventListener('click', collectSelected);
    document.getElementById('cab-export')?.addEventListener('click', exportSelected);
    document.getElementById('cab-download')?.addEventListener('click', downloadSelected);
    document.getElementById('cab-review')?.addEventListener('click', () => showMiniPanel('review'));
  }

  function updateSelectedCount(n) {
    const el = document.getElementById('cab-selected-count');
    if (!el) return;
    if (n > 0) { el.textContent = n; el.classList.remove('hidden'); }
    else el.classList.add('hidden');
  }

  // ─── Result Row Enhancement ───────────────────────────────────────────────

  function enhanceSearchPage() {
    // Add "全选" enhancement
    const toolbar = document.querySelector('.sort-list, .result-toolbar');
    if (toolbar && !toolbar.querySelector('.cnki-ext-toolbar')) {
      const extBar = document.createElement('div');
      extBar.className = 'cnki-ext-toolbar';
      extBar.innerHTML = `
        <button class="cnki-btn" id="cnki-sel-all">☑ 全选当页</button>
        <button class="cnki-btn primary" id="cnki-batch-dl">⬇ 批量PDF</button>
        <button class="cnki-btn" id="cnki-batch-cite">📋 导出引用</button>
        <button class="cnki-btn success" id="cnki-gen-review">✍️ 生成综述</button>
      `;
      toolbar.appendChild(extBar);

      document.getElementById('cnki-sel-all')?.addEventListener('click', () => {
        document.querySelectorAll('input.cbItem').forEach(cb => {
          cb.checked = true;
          cb.closest('tr')?.classList.add('cnki-selected');
        });
        updateSelectedFromPage();
      });
      document.getElementById('cnki-batch-dl')?.addEventListener('click', batchDownloadFromPage);
      document.getElementById('cnki-batch-cite')?.addEventListener('click', batchExportFromPage);
      document.getElementById('cnki-gen-review')?.addEventListener('click', () => showMiniPanel('review'));
    }

    enhanceResultRows();
  }

  function enhanceResultRows() {
    const rows = document.querySelectorAll('.result-table-list tbody tr:not(.cnki-enhanced)');
    rows.forEach(row => {
      row.classList.add('cnki-enhanced');

      // Add quick action buttons to each row
      const nameCell = row.querySelector('td.name');
      if (!nameCell) return;

      const btnGroup = document.createElement('div');
      btnGroup.className = 'cnki-row-actions';
      btnGroup.innerHTML = `
        <button class="cnki-row-btn" data-action="save" title="收藏">⭐</button>
        <button class="cnki-row-btn primary" data-action="download" title="PDF">📄</button>
        <button class="cnki-row-btn" data-action="cite" title="复制引用">📋</button>
      `;
      nameCell.appendChild(btnGroup);

      btnGroup.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        const titleLink = row.querySelector('td.name a.fz14');
        const paper = extractRowPaper(row);

        if (btn.dataset.action === 'save') {
          savePaperToStorage(paper);
          btn.textContent = '✅';
          setTimeout(() => btn.textContent = '⭐', 2000);
        } else if (btn.dataset.action === 'download') {
          triggerDownloadForPaper(paper);
          btn.textContent = '⏳';
        } else if (btn.dataset.action === 'cite') {
          const cite = `${paper.authors}. ${paper.title}[J]. ${paper.journal}, ${paper.date}.`;
          navigator.clipboard.writeText(cite);
          showToast('✅ 引用已复制');
        }
      });

      // Track selection
      const cb = row.querySelector('input.cbItem');
      if (cb) {
        cb.addEventListener('change', () => {
          row.classList.toggle('cnki-selected', cb.checked);
          updateSelectedFromPage();
        });
      }
    });
  }

  function extractRowPaper(row) {
    const titleLink = row.querySelector('td.name a.fz14');
    const authors = Array.from(row.querySelectorAll('td.author a')).map(a => a.innerText?.trim()).filter(Boolean).join('; ');
    const journal = row.querySelector('td.source a')?.innerText?.trim() || '';
    const date = row.querySelector('td.date')?.innerText?.trim() || '';
    const citations = row.querySelector('td.quote')?.innerText?.trim() || '0';
    const exportId = row.querySelector('input.cbItem')?.value || '';
    return {
      title: titleLink?.innerText?.trim() || '',
      href: titleLink?.href || '',
      authors, journal, date, citations, exportId,
    };
  }

  function updateSelectedFromPage() {
    const selected = document.querySelectorAll('input.cbItem:checked');
    updateSelectedCount(selected.length);
  }

  // ─── Detail Page Enhancement ──────────────────────────────────────────────

  function enhanceDetailPage() {
    const downloadArea = document.querySelector('.download-btns, .btn-dls, .download-btn-wrap');
    if (downloadArea && !downloadArea.querySelector('.cnki-ext-dl')) {
      const extPanel = document.createElement('div');
      extPanel.className = 'cnki-ext-dl';
      extPanel.innerHTML = `
        <button class="cnki-btn primary" id="cnki-quick-pdf">📄 快速下载PDF</button>
        <button class="cnki-btn" id="cnki-quick-save">⭐ 收藏文献</button>
        <button class="cnki-btn" id="cnki-quick-cite">📋 复制引用</button>
      `;
      downloadArea.appendChild(extPanel);

      document.getElementById('cnki-quick-pdf')?.addEventListener('click', () => {
        const pdfLink = document.querySelector('#pdfDown, .btn-dlpdf a');
        if (pdfLink) { pdfLink.click(); showToast('✅ PDF下载已触发'); }
        else showToast('❌ 无PDF链接，请确认已登录');
      });

      document.getElementById('cnki-quick-save')?.addEventListener('click', () => {
        const paper = extractDetailPaper();
        savePaperToStorage(paper);
        showToast('⭐ 已收藏: ' + paper.title.slice(0, 20));
      });

      document.getElementById('cnki-quick-cite')?.addEventListener('click', () => {
        const paper = extractDetailPaper();
        const cite = `${paper.authors}. ${paper.title}[J]. ${paper.journal}, ${paper.date}.`;
        navigator.clipboard.writeText(cite);
        showToast('📋 GB/T 7714 引用已复制');
      });
    }
  }

  function extractDetailPaper() {
    const title = document.querySelector('.brief h1, #chTitle')?.innerText?.trim() || '';
    const authors = Array.from(document.querySelectorAll('.author a, .brief .author')).map(a => a.innerText?.trim()).join('; ');
    const journal = document.querySelector('.top-tip a, .source a')?.innerText?.trim() || '';
    const date = document.querySelector('.top-tip .year, [class*="year"]')?.innerText?.trim() || '';
    const abstract = document.querySelector('#ChDivSummary, .abstract-text')?.innerText?.trim() || '';
    const keywords = Array.from(document.querySelectorAll('.keywords a')).map(a => a.innerText?.trim()).join('; ');
    return { title, authors, journal, date, abstract, keywords, href: window.location.href };
  }

  // ─── Home Page Enhancement ────────────────────────────────────────────────

  function enhanceHomePage() {
    const searchBox = document.querySelector('.search-box, #searchInput-wrapper, .search-input-wrapper');
    if (searchBox && !searchBox.querySelector('.cnki-ext-home')) {
      const extRow = document.createElement('div');
      extRow.className = 'cnki-ext-home';
      extRow.innerHTML = `
        <span class="cnki-ext-label">📚 助手快捷功能：</span>
        <button class="cnki-btn" id="cnki-home-review">✍️ 一键生成综述</button>
        <button class="cnki-btn" id="cnki-home-export">📋 批量导出引用</button>
      `;
      searchBox.after(extRow);

      document.getElementById('cnki-home-review')?.addEventListener('click', () => showMiniPanel('review'));
    }
  }

  // ─── Batch Actions ────────────────────────────────────────────────────────

  async function batchDownloadFromPage() {
    const selected = Array.from(document.querySelectorAll('input.cbItem:checked'));
    if (!selected.length) { showToast('⚠️ 请先勾选要下载的文献'); return; }

    showToast(`⏳ 开始下载 ${selected.length} 篇文献...`, 3000);
    for (const cb of selected) {
      const row = cb.closest('tr');
      const paper = extractRowPaper(row);
      if (paper.href) {
        await triggerDownloadForPaper(paper);
        await sleep(1200);
      }
    }
    showToast(`✅ 已触发 ${selected.length} 篇下载`);
  }

  async function batchExportFromPage() {
    const rows = Array.from(document.querySelectorAll('.result-table-list tbody tr'));
    const selected = rows.filter(r => r.querySelector('input.cbItem:checked'));
    if (!selected.length) { showToast('⚠️ 请先勾选文献'); return; }

    const citations = selected.map((row, i) => {
      const p = extractRowPaper(row);
      return `[${i+1}] ${p.authors}. ${p.title}[J]. ${p.journal}, ${p.date}.`;
    }).join('\n');

    await navigator.clipboard.writeText(citations);
    showToast(`✅ 已复制 ${selected.length} 条 GB/T 7714 引用`);
  }

  async function collectSelected() {
    const rows = Array.from(document.querySelectorAll('.result-table-list tbody tr'));
    const selected = rows.filter(r => r.querySelector('input.cbItem:checked'));
    if (!selected.length) { showToast('⚠️ 请先勾选文献'); return; }
    for (const row of selected) savePaperToStorage(extractRowPaper(row));
    showToast(`⭐ 已收藏 ${selected.length} 篇文献`);
  }

  async function exportSelected() {
    await batchExportFromPage();
  }

  async function downloadSelected() {
    await batchDownloadFromPage();
  }

  // ─── Mini Panel (in-page review generator) ────────────────────────────────

  function showMiniPanel(mode = 'review') {
    if (miniPanel) { miniPanel.remove(); miniPanel = null; }

    miniPanel = document.createElement('div');
    miniPanel.id = 'cnki-mini-panel';

    if (mode === 'review') {
      miniPanel.innerHTML = `
        <div class="cmp-header">
          <span>✍️ 快速生成综述</span>
          <button class="cmp-close">✕</button>
        </div>
        <div class="cmp-body">
          <input type="text" id="cmp-topic" placeholder="综述主题，如：人工智能医学影像" />
          <div class="cmp-row">
            <select id="cmp-count">
              <option value="10">10篇</option>
              <option value="20" selected>20篇</option>
              <option value="30">30篇</option>
            </select>
            <select id="cmp-source">
              <option value="">不限来源</option>
              <option value="CSSCI">CSSCI</option>
              <option value="北大核心">北大核心</option>
            </select>
          </div>
          <select id="cmp-model">
            <option value="none">仅整理文献摘要</option>
            <option value="deepseek">DeepSeek（需API Key）</option>
            <option value="qwen">通义千问（需API Key）</option>
            <option value="openai">OpenAI GPT-4（需API Key）</option>
          </select>
          <input type="password" id="cmp-apikey" placeholder="API Key（选择AI模型时填写）" class="hidden"/>
          <button class="cnki-btn primary full" id="cmp-generate">✍️ 生成综述</button>
        </div>
        <div class="cmp-progress hidden" id="cmp-progress">
          <div class="cmp-prog-bar"><div class="cmp-prog-fill" id="cmp-prog-fill"></div></div>
          <div id="cmp-prog-text">检索中...</div>
        </div>
        <div class="cmp-output hidden" id="cmp-output">
          <div class="cmp-out-header">
            <strong id="cmp-out-title"></strong>
            <div>
              <button class="cnki-btn" id="cmp-copy">📋 复制</button>
              <button class="cnki-btn primary" id="cmp-print">🖨 打印/PDF</button>
            </div>
          </div>
          <div class="cmp-out-content" id="cmp-out-content"></div>
        </div>
      `;

      document.body.appendChild(miniPanel);
      makeDraggable(miniPanel);

      miniPanel.querySelector('.cmp-close').addEventListener('click', () => { miniPanel.remove(); miniPanel = null; });
      miniPanel.querySelector('#cmp-model').addEventListener('change', function() {
        const keyInput = miniPanel.querySelector('#cmp-apikey');
        if (this.value !== 'none') keyInput.classList.remove('hidden');
        else keyInput.classList.add('hidden');
      });
      miniPanel.querySelector('#cmp-generate').addEventListener('click', runMiniReview);
      miniPanel.querySelector('#cmp-copy')?.addEventListener('click', () => {
        navigator.clipboard.writeText(miniPanel.querySelector('#cmp-out-content').textContent);
        showToast('✅ 综述已复制');
      });
      miniPanel.querySelector('#cmp-print')?.addEventListener('click', () => {
        const content = miniPanel.querySelector('#cmp-out-content').textContent;
        const title = miniPanel.querySelector('#cmp-out-title').textContent;
        const win = window.open('', '_blank');
        win.document.write(`<html><head><meta charset="UTF-8"><title>${title}</title>
<style>body{font-family:'Microsoft YaHei',serif;max-width:800px;margin:40px auto;line-height:1.8;font-size:12pt;}
pre{white-space:pre-wrap;font-family:inherit;}</style></head>
<body><h2>${title}</h2><button onclick="window.print()">打印/PDF</button><hr/><pre>${content}</pre></body></html>`);
        win.document.close();
      });
    }
  }

  async function runMiniReview() {
    const topic = miniPanel.querySelector('#cmp-topic').value.trim();
    if (!topic) { showToast('请输入综述主题'); return; }

    const count = parseInt(miniPanel.querySelector('#cmp-count').value);
    const source = miniPanel.querySelector('#cmp-source').value;
    const model = miniPanel.querySelector('#cmp-model').value;
    const apiKey = miniPanel.querySelector('#cmp-apikey').value.trim();

    const progress = miniPanel.querySelector('#cmp-progress');
    const output = miniPanel.querySelector('#cmp-output');
    progress.classList.remove('hidden');
    output.classList.add('hidden');

    const setProgress = (pct, text) => {
      miniPanel.querySelector('#cmp-prog-fill').style.width = pct + '%';
      miniPanel.querySelector('#cmp-prog-text').textContent = text;
    };

    try {
      setProgress(20, `检索"${topic}"...`);

      const searchResp = await chrome.runtime.sendMessage({
        type: 'SEARCH',
        query: topic,
        source,
        page: 1,
        count,
      });

      const papers = searchResp.results?.slice(0, count) || [];
      setProgress(70, `已获取 ${papers.length} 篇，生成综述...`);

      let reviewText;
      if (model === 'none') {
        reviewText = buildLocalReview(topic, papers);
      } else {
        reviewText = await callAIForReview(topic, papers, model, apiKey);
      }

      setProgress(100, '完成！');
      progress.classList.add('hidden');
      miniPanel.querySelector('#cmp-out-title').textContent = `《${topic}》综述`;
      miniPanel.querySelector('#cmp-out-content').textContent = reviewText;
      output.classList.remove('hidden');

    } catch (err) {
      setProgress(0, '❌ 失败: ' + err.message);
    }
  }

  function buildLocalReview(topic, papers) {
    const now = new Date();
    let text = `${topic} — 研究综述\n${'='.repeat(35)}\n`;
    text += `检索时间：${now.toLocaleDateString('zh-CN')} | 文献来源：中国知网CNKI\n\n`;
    text += `一、综述概况\n${'─'.repeat(20)}\n`;
    text += `针对主题"${topic}"检索到 ${papers.length} 篇相关文献。\n\n`;
    text += `二、主要文献\n${'─'.repeat(20)}\n`;
    papers.slice(0, 15).forEach((p, i) => {
      text += `[${i+1}] ${p.authors || '佚名'}. ${p.title}`;
      if (p.journal) text += `[J]. ${p.journal}`;
      if (p.date) text += `, ${p.date}`;
      text += `.\n`;
    });
    return text;
  }

  async function callAIForReview(topic, papers, model, apiKey) {
    const papersText = papers.slice(0, 10).map((p, i) =>
      `[${i+1}] ${p.authors || ''}《${p.title}》${p.journal || ''}(${p.date || ''})`
    ).join('\n');

    const prompt = `请为主题"${topic}"撰写一篇800-1000字的学术综述，基于以下文献，包含研究背景、现状、趋势、展望，末尾附参考文献（GB/T 7714格式）：\n\n${papersText}`;

    const configs = {
      openai: { url: 'https://api.openai.com/v1/chat/completions', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: { model: 'gpt-4o', messages: [{ role: 'user', content: prompt }], max_tokens: 1500 }, extract: d => d.choices[0].message.content },
      deepseek: { url: 'https://api.deepseek.com/chat/completions', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: { model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], max_tokens: 1500 }, extract: d => d.choices[0].message.content },
      qwen: { url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: { model: 'qwen-max', input: { messages: [{ role: 'user', content: prompt }] } }, extract: d => d.output?.text || '' },
    };

    const cfg = configs[model];
    if (!cfg) throw new Error('未知模型');
    const resp = await fetch(cfg.url, { method: 'POST', headers: cfg.headers, body: JSON.stringify(cfg.body) });
    if (!resp.ok) throw new Error('API错误 ' + resp.status);
    return cfg.extract(await resp.json());
  }

  // ─── Storage Helpers ──────────────────────────────────────────────────────

  async function savePaperToStorage(paper) {
    const data = await chrome.storage.local.get(['library', 'stats']);
    const library = data.library || [];
    const stats = data.stats || { downloads: 0, saved: 0, reviews: 0 };
    library.unshift({ ...paper, savedAt: Date.now() });
    stats.saved = library.length;
    await chrome.storage.local.set({ library, stats });
  }

  async function triggerDownloadForPaper(paper) {
    if (!paper.href) { showToast('❌ 无下载链接'); return; }
    chrome.runtime.sendMessage({
      type: 'DOWNLOAD',
      url: paper.href,
      title: paper.title,
      format: 'pdf',
    });
  }

  // ─── UI Helpers ───────────────────────────────────────────────────────────

  function showToast(msg, duration = 2500) {
    const toast = document.createElement('div');
    toast.className = 'cnki-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }, duration);
  }

  function makeDraggable(el) {
    let startX, startY, startLeft, startTop, dragging = false;
    const handle = el.querySelector('.cab-inner, .cmp-header') || el;
    handle.style.cursor = 'move';
    handle.addEventListener('mousedown', e => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = el.getBoundingClientRect();
      startLeft = rect.left; startTop = rect.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      el.style.left = (startLeft + e.clientX - startX) + 'px';
      el.style.top = (startTop + e.clientY - startY) + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  }

  // ─── Observe Page Changes ─────────────────────────────────────────────────

  function observePageChanges() {
    const observer = new MutationObserver(() => {
      enhanceResultRows();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ─── Run ──────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
