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
          <!-- 模式选择 -->
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <label style="flex:1;min-width:80px;display:flex;align-items:center;gap:4px;font-size:11px;background:#e8f0fe;border:1.5px solid #90caf9;border-radius:5px;padding:5px 7px;cursor:pointer">
              <input type="radio" name="cmp-mode" value="local" checked/> 🧠 本地NLP<br><small style="color:#666">无需Key</small>
            </label>
            <label style="flex:1;min-width:80px;display:flex;align-items:center;gap:4px;font-size:11px;background:#f3e5f5;border:1.5px solid #ce93d8;border-radius:5px;padding:5px 7px;cursor:pointer">
              <input type="radio" name="cmp-mode" value="free_ai"/> 🤖 免费AI<br><small style="color:#666">HF/Ollama</small>
            </label>
            <label style="flex:1;min-width:80px;display:flex;align-items:center;gap:4px;font-size:11px;background:#fff3e0;border:1.5px solid #ffcc02;border-radius:5px;padding:5px 7px;cursor:pointer">
              <input type="radio" name="cmp-mode" value="api_ai"/> ⚡ API模式<br><small style="color:#666">需Key</small>
            </label>
          </div>
          <div id="cmp-api-opts" class="hidden" style="display:none;flex-direction:column;gap:5px">
            <select id="cmp-model">
              <option value="deepseek">DeepSeek（推荐，最便宜）</option>
              <option value="qwen">通义千问</option>
              <option value="openai">OpenAI GPT-4o</option>
              <option value="claude">Claude</option>
            </select>
            <input type="password" id="cmp-apikey" placeholder="粘贴 API Key..."/>
          </div>
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
      // 模式切换
      miniPanel.querySelectorAll('input[name="cmp-mode"]').forEach(r => {
        r.addEventListener('change', () => {
          const apiOpts = miniPanel.querySelector('#cmp-api-opts');
          if (r.value === 'api_ai') { apiOpts.style.display = 'flex'; }
          else { apiOpts.style.display = 'none'; }
        });
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
    const cmpMode = miniPanel.querySelector('input[name="cmp-mode"]:checked')?.value || 'local';
    const model = miniPanel.querySelector('#cmp-model')?.value || 'deepseek';
    const apiKey = miniPanel.querySelector('#cmp-apikey')?.value.trim() || '';

    if (cmpMode === 'api_ai' && !apiKey) { showToast('请填写 API Key'); return; }

    const progress = miniPanel.querySelector('#cmp-progress');
    const output = miniPanel.querySelector('#cmp-output');
    progress.classList.remove('hidden');
    output.classList.add('hidden');

    const setProgress = (pct, text) => {
      miniPanel.querySelector('#cmp-prog-fill').style.width = pct + '%';
      miniPanel.querySelector('#cmp-prog-text').textContent = text;
    };

    try {
      setProgress(15, `检索"${topic}"（${count}篇）...`);

      const searchResp = await chrome.runtime.sendMessage({
        type: 'SEARCH', query: topic, source, page: 1, count,
      });
      const papers = searchResp.results?.slice(0, count) || [];
      if (!papers.length) throw new Error('未检索到文献');

      setProgress(45, `已获取 ${papers.length} 篇，提取摘要...`);
      const absResp = await chrome.runtime.sendMessage({
        type: 'GET_ABSTRACTS',
        papers: papers.slice(0, cmpMode === 'local' ? 15 : 10),
      });
      const enriched = absResp?.papers || papers;

      setProgress(70, '生成综述中...');

      // 调用后台的综述引擎
      const reviewResp = await chrome.runtime.sendMessage({
        type: 'GENERATE_REVIEW',
        topic, papers: enriched,
        mode: cmpMode, model, apiKey, lang: 'zh',
      });

      if (reviewResp.error) throw new Error(reviewResp.error);

      setProgress(100, '完成！');
      progress.classList.add('hidden');
      miniPanel.querySelector('#cmp-out-title').textContent =
        `《${reviewResp.plan?.titleCn || topic}》综述 [${reviewResp.source || cmpMode}]`;
      miniPanel.querySelector('#cmp-out-content').textContent = reviewResp.text;
      output.classList.remove('hidden');

    } catch (err) {
      setProgress(0, '❌ 失败: ' + err.message);
    }
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
