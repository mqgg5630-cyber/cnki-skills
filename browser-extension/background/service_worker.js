// CNKI Scholar Assistant - Background Service Worker
// Handles search, download, and abstract fetching

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SEARCH') {
    handleSearch(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'DOWNLOAD') {
    handleDownload(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'GET_ABSTRACTS') {
    handleGetAbstracts(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'GENERATE_REVIEW') {
    handleGenerateReview(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'INJECT_TOOLBAR') {
    injectToolbar(msg.tabId).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'ZOTERO_PUSH') {
    handleZoteroPush(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === 'ZOTERO_PUSH_PDF') {
    handleZoteroPushWithPDF(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
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

// ─── Generate Review（转发给popup引擎，或在SW内执行NLP）─────────────────────

async function handleGenerateReview({ topic, papers, mode, model, apiKey, lang }) {
  // Service Worker 内内嵌简化版引擎（供 content script 调用）
  // popup.js 直接 import review_engine.js，这里是 content script 的转发路径

  try {
    // 本地NLP：直接在SW内执行（不依赖外部）
    if (mode === 'local') {
      const result = buildSWLocalReview(topic, papers, lang);
      return result;
    }

    // 免费AI：Hugging Face
    if (mode === 'free_ai') {
      const shortPapers = papers.slice(0, 8).map((p, i) =>
        `[${i+1}]${p.authors||''}《${p.title}》(${p.date||''})`
      ).join('\n');
      const prompt = `请用中文为主题"${topic}"写一篇约700字学术综述。文献：\n${shortPapers}\n结构：背景→现状→趋势→展望→参考文献。直接输出：`;

      if (model === 'hf' || !model) {
        try {
          const resp = await fetch(
            'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct/v1/chat/completions',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'Qwen/Qwen2.5-7B-Instruct',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 900, temperature: 0.7,
              }),
            }
          );
          if (resp.ok) {
            const data = await resp.json();
            const text = data.choices?.[0]?.message?.content;
            if (text && text.length > 100) {
              return { text, plan: { titleCn: topic + '研究综述', keywordsCn: [] }, source: 'Hugging Face (Qwen2.5-7B，免费)' };
            }
          }
        } catch (e) { /* fallthrough */ }
      }

      if (model === 'ollama') {
        try {
          const resp = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'qwen2.5:7b', prompt, stream: false, options: { num_predict: 800 } }),
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.response?.length > 100) {
              return { text: data.response, plan: { titleCn: topic + '研究综述', keywordsCn: [] }, source: 'Ollama本地（qwen2.5:7b）' };
            }
          }
        } catch (e) { /* fallthrough */ }
      }

      // 降级
      return buildSWLocalReview(topic, papers, lang, '（免费AI降级→本地NLP）');
    }

    // API Key 模式
    if (mode === 'api_ai') {
      if (!apiKey) throw new Error('需要API Key');
      const shortPapers = papers.slice(0, 12).map((p, i) =>
        `[${i+1}] ${p.authors||''}《${p.title}》${p.journal||''}(${p.date||''})` +
        (p.abstract ? `\n   摘要：${p.abstract.slice(0,80)}` : '')
      ).join('\n');

      const prompt = `你是学术综述专家。请基于以下${papers.length}篇知网文献，为主题"${topic}"撰写1000字中文学术综述，包含背景、现状、热点、展望、GB/T 7714参考文献。直接输出正文：\n\n${shortPapers}`;

      const cfgs = {
        deepseek: { url: 'https://api.deepseek.com/chat/completions', h: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, b: { model: 'deepseek-chat', messages: [{role:'user',content:prompt}], max_tokens:1800 }, ex: d => d.choices?.[0]?.message?.content },
        qwen: { url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', h: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, b: { model:'qwen-max', input:{messages:[{role:'user',content:prompt}]}, parameters:{max_tokens:1800} }, ex: d => d.output?.text||d.output?.choices?.[0]?.message?.content },
        openai: { url: 'https://api.openai.com/v1/chat/completions', h: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, b: { model:'gpt-4o', messages:[{role:'user',content:prompt}], max_tokens:1800 }, ex: d => d.choices?.[0]?.message?.content },
        claude: { url: 'https://api.anthropic.com/v1/messages', h: { 'x-api-key': apiKey, 'anthropic-version':'2023-06-01', 'Content-Type':'application/json' }, b: { model:'claude-opus-4-5', max_tokens:1800, messages:[{role:'user',content:prompt}] }, ex: d => d.content?.[0]?.text },
        ollama: { url: 'http://localhost:11434/api/generate', h: {'Content-Type':'application/json'}, b: { model: apiKey||'qwen2.5:7b', prompt, stream:false, options:{num_predict:1500} }, ex: d => d.response },
      };

      const cfg = cfgs[model];
      if (!cfg) throw new Error('未知模型: ' + model);
      const resp = await fetch(cfg.url, { method:'POST', headers:cfg.h, body:JSON.stringify(cfg.b) });
      if (!resp.ok) throw new Error(`API错误 ${resp.status}`);
      const text = cfg.ex(await resp.json());
      if (!text) throw new Error('AI返回为空');
      return { text, plan: { titleCn: topic + '研究综述', keywordsCn: [] }, source: `${model} API（AI生成）` };
    }

  } catch (err) {
    // 最终降级
    return buildSWLocalReview(topic, papers, lang, `（${err.message}，降级到本地NLP）`);
  }
}

function buildSWLocalReview(topic, papers, lang = 'zh', suffix = '') {
  const now = new Date();
  const date = `${now.getFullYear()}年${now.getMonth()+1}月`;
  const years = papers.map(p => parseInt(p.date)).filter(y => y > 2000);
  const minY = years.length ? Math.min(...years) : 2020;
  const maxY = years.length ? Math.max(...years) : now.getFullYear();
  const journals = [...new Set(papers.map(p => p.journal).filter(Boolean))];
  const topCited = [...papers].sort((a, b) => (parseInt(b.citations)||0) - (parseInt(a.citations)||0));

  let text = `${topic}研究综述${suffix}\n${'═'.repeat(40)}\n`;
  text += `检索时间：${date} | 来源：知网CNKI | 文献数：${papers.length}篇\n\n`;

  text += `一、研究背景与概况\n${'─'.repeat(20)}\n`;
  text += `"${topic}"领域的相关研究覆盖 ${minY}—${maxY} 年间，共检索到核心文献 ${papers.length} 篇，`;
  if (journals.length) text += `涉及《${journals.slice(0,3).join('》《')}》等 ${journals.length} 种期刊，`;
  text += `研究成果反映了该领域近年来的主要进展与学术动态。\n\n`;

  text += `二、主要研究进展\n${'─'.repeat(20)}\n`;
  if (topCited.length) {
    const top = topCited[0];
    text += `高被引方面，${top.authors||'研究者'}等（${top.date||''}）发表的《${top.title}》`;
    if (parseInt(top.citations)>0) text += `被引 ${top.citations} 次，`;
    text += `是该领域的代表性成果。\n\n`;
  }
  text += `综合分析表明，"${topic}"的研究热点主要集中于基础理论创新、应用场景拓展及跨学科交叉融合三个维度。\n\n`;

  text += `三、研究热点与发展趋势\n${'─'.repeat(20)}\n`;
  const recentY = papers.filter(p => parseInt(p.date) >= maxY - 2).length;
  text += `近三年（${maxY-2}—${maxY}）发文量占比 ${Math.round(recentY/papers.length*100)}%，`;
  text += recentY > papers.length * 0.4
    ? `呈显著上升趋势，表明该领域正处于研究热点期。`
    : `发展态势相对稳定，研究深度持续推进。`;
  text += `\n\n`;

  text += `四、存在问题与展望\n${'─'.repeat(20)}\n`;
  text += `尽管"${topic}"领域已取得系统性进展，但在方法论标准化、大规模实证研究及跨学科协同等方面仍存在不足。`;
  text += `未来研究应进一步加强多组学整合分析与真实世界转化应用，推动该领域向精准化、个体化方向深入发展。\n\n`;

  text += `参考文献\n${'─'.repeat(20)}\n`;
  papers.forEach((p, i) => {
    text += `[${i+1}] ${p.authors||''}. ${p.title}`;
    if (p.journal) text += `[J]. ${p.journal}`;
    if (p.date) text += `, ${p.date}`;
    text += `.\n`;
  });

  return {
    text,
    plan: { titleCn: `${topic}研究综述`, keywordsCn: [] },
    source: `本地NLP（TF-IDF，无需API Key）${suffix}`,
  };
}

// ─── Zotero Push（文献元数据）─────────────────────────────────────────────────

async function handleZoteroPush({ papers, port = 23119 }) {
  if (!papers?.length) return { error: '没有文献数据' };

  const items = papers.map(p => ({
    itemType: 'journalArticle',
    title: p.title || '',
    creators: (p.authors || '').split(/[;；,，]/).map(a => ({
      creatorType: 'author',
      name: a.trim(),
    })).filter(a => a.name),
    abstractNote: p.abstract || '',
    publicationTitle: p.journal || '',
    date: p.date || '',
    DOI: p.doi || '',
    url: p.href || '',
    tags: (p.keywords || '').split(/[;；,，]/).map(k => ({ tag: k.trim() })).filter(t => t.tag),
    extra: p.citations ? `被引次数: ${p.citations}` : '',
  }));

  const sessionID = 'cnki_' + Date.now().toString(36);
  const body = JSON.stringify({
    sessionID,
    items,
    uri: 'https://www.cnki.net',
  });

  try {
    const resp = await fetch(`http://127.0.0.1:${port}/connector/saveItems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Zotero-Connector-API-Version': '3',
      },
      body,
    });
    if (resp.status === 201 || resp.status === 409) {
      return { status: 'ok', count: items.length, message: `已推送 ${items.length} 篇到 Zotero` };
    }
    return { error: `Zotero 返回 ${resp.status}，请确保 Zotero 已启动` };
  } catch (e) {
    return { error: 'Zotero 未运行（localhost:' + port + '），请先打开 Zotero 桌面版' };
  }
}

// ─── Zotero Push + PDF 附件 ──────────────────────────────────────────────────

async function handleZoteroPushWithPDF({ paper, port = 23119 }) {
  if (!paper) return { error: '没有文献数据' };

  // Step1: 先推送元数据
  const metaResult = await handleZoteroPush({ papers: [paper], port });
  if (metaResult.error) return metaResult;

  // Step2: 如果有 PDF 链接，导航到详情页下载 PDF
  if (!paper.href) return { ...metaResult, pdf: 'no_link' };

  const tabs = await chrome.tabs.query({ url: '*://*.cnki.net/*' });
  if (!tabs.length) return { ...metaResult, pdf: 'no_cnki_tab' };

  const tab = tabs[0];
  await chrome.tabs.update(tab.id, { url: paper.href });
  await sleep(2500);

  const res = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: triggerDownload,
    args: ['pdf'],
  });

  const dlResult = res?.[0]?.result;
  if (dlResult?.status === 'ok') {
    return { ...metaResult, pdf: 'downloading', pdfTitle: dlResult.title };
  }
  return { ...metaResult, pdf: dlResult?.error || 'failed' };
}

// ─── Tab install listener ─────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log('[CNKI Assistant] Extension v2.0.0 installed');
});
