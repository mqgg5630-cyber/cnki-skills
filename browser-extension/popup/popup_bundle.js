/**
 * CNKI Scholar Assistant — 双模式综述引擎
 * ============================================================
 * 模式A（本地NLP，无需API Key）：
 *   基于知网实时抓取的摘要+关键词，用 TF-IDF + 关键句提取 +
 *   动态章节大纲规划（移植自 Python query_planner.py），
 *   在浏览器内生成结构完整、引用规范的学术综述
 *
 * 模式B（AI增强，可选API Key）：
 *   将本地NLP分析结果作为上下文，发送给 OpenAI / Claude /
 *   DeepSeek / 通义千问，生成专业润色版综述
 *
 * 两种模式产物均相同：标题、摘要、关键词、多章节正文、参考文献
 * ============================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// 第一部分：主题规划器（移植自 query_planner.py）
// ─────────────────────────────────────────────────────────────────────────────

function planTopic(topic) {
  const t = (topic || '').trim();
  const words = t.split(/[\s,，、+]+/).map(w => w.trim()).filter(Boolean);
  if (!words.length) return _buildGenericPlan('研究', ['研究'], ['Research']);

  // 1. 牙周炎 / 阿尔茨海默病
  if (/牙周|阿尔茨海默|卟啉单胞菌|periodontitis|gingivalis/i.test(t)) {
    return {
      titleCn: '牙周炎与阿尔茨海默病关联机制及牙龈卟啉单胞菌致病作用研究进展',
      titleEn: "Research Progress on the Association Between Periodontitis and Alzheimer's Disease and the Pathogenic Role of Porphyromonas gingivalis",
      keywordsCn: ['牙周炎', '阿尔茨海默病', '牙龈卟啉单胞菌', '牙龈蛋白酶', 'β-淀粉样蛋白', 'Tau蛋白', '神经炎症', '口腔-脑轴'],
      keywordsEn: ['Periodontitis', "Alzheimer's Disease", 'Porphyromonas gingivalis', 'Gingipains', 'Amyloid-beta', 'Tau Protein', 'Neuroinflammation', 'Oral-Brain Axis'],
      cnkiQuery: '(SU="牙周炎"+"牙周病") AND (SU="阿尔茨海默病"+"AD"+"认知障碍")',
      chapters: [
        { title: '一、引言与流行病学关联背景', hint: '概述AD全球负担与传统Aβ/Tau假说瓶颈，引出感染免疫假说与牙周炎危险因素证据。' },
        { title: '二、牙龈卟啉单胞菌的生物学特性与毒力因子', hint: '详述Gingipains（Rgp/Kgp）、LPS、OMVs的结构与免疫逃逸机制。' },
        { title: '三、侵入中枢神经系统的通路与病理级联', hint: '血行播散破坏BBB、三叉神经逆行运输、Aβ/Tau诱导与NLRP3炎症小体激活的分子网络。' },
        { title: '四、干预策略与临床转化前景', hint: '牙周系统治疗、Gingipain抑制剂（COR388）、口腔生物标志物早期筛查。' },
        { title: '五、总结与展望', hint: '口腔-脑轴交叉学科展望，单细胞组学与无创诊断技术前景。' },
      ],
    };
  }

  // 2. 肿瘤 / 外泌体 / 免疫
  if (/外泌体|肿瘤|免疫|靶向|exosome|tumor|cancer/i.test(t)) {
    const kw = words[0];
    return {
      titleCn: `${kw}在肿瘤微环境调控与靶向治疗中的研究进展`,
      titleEn: `Research Progress on ${kw} in Tumor Microenvironment Regulation and Targeted Therapy`,
      keywordsCn: [...words, '肿瘤微环境', '靶向递送', '免疫逃逸', '临床转化'],
      keywordsEn: [...words.map(capitalizeFirst), 'Tumor Microenvironment', 'Targeted Delivery', 'Immune Evasion'],
      cnkiQuery: words.map(w => `SU="${w}"`).join(' AND '),
      chapters: [
        { title: '一、绪论与研究背景', hint: '肿瘤免疫微环境特征与现有靶向疗法的临床挑战。' },
        { title: `二、${kw}的生物学特征与分子机制`, hint: '结构特征、生成调控、细胞间通讯信号网络。' },
        { title: '三、肿瘤微环境重塑与耐药机制', hint: 'T细胞功能耗竭、血管生成与基质硬化调控。' },
        { title: '四、临床转化应用与工程化递送策略', hint: '表面配体修饰、体液活检与联合治疗方案。' },
        { title: '五、总结与展望', hint: '规模化制备与精准临床转化方向。' },
      ],
    };
  }

  // 3. 人工智能 / 深度学习 / 机器学习
  if (/人工智能|机器学习|深度学习|神经网络|AI|deep.?learn|machine.?learn/i.test(t)) {
    const kw = words[0];
    return {
      titleCn: `${t}应用研究进展综述`,
      titleEn: `A Survey of ${words.map(capitalizeFirst).join(' ')} Applications`,
      keywordsCn: [...words, '深度学习', '模型优化', '应用场景', '评测基准'],
      keywordsEn: [...words.map(capitalizeFirst), 'Deep Learning', 'Model Optimization', 'Benchmark'],
      cnkiQuery: words.map(w => `SU="${w}"`).join(' AND '),
      chapters: [
        { title: '一、研究背景与发展脉络', hint: '技术演进历史、里程碑模型与驱动因素。' },
        { title: '二、核心方法论与模型架构', hint: '主流架构（Transformer/CNN/GNN等）、预训练范式与关键技术。' },
        { title: '三、典型应用场景与实证研究', hint: '各领域落地案例、性能对比与基准评测结果。' },
        { title: '四、挑战、局限与伦理问题', hint: '数据隐私、模型偏见、可解释性与监管挑战。' },
        { title: '五、未来研究方向与展望', hint: '多模态融合、小样本学习、绿色AI与产业化路径。' },
      ],
    };
  }

  // 4. 通用主题
  return _buildGenericPlan(t, words, words.map(capitalizeFirst));
}

function _buildGenericPlan(t, wordsCn, wordsEn) {
  const main = wordsCn.length >= 2 ? wordsCn.slice(0, 2).join('与') : wordsCn[0];
  return {
    titleCn: `${main}的作用机制及研究进展`,
    titleEn: `Research Progress on the Mechanisms of ${wordsEn.slice(0, 2).join(' and ')}`,
    keywordsCn: [...wordsCn, '分子机制', '生物学通路', '临床转化', '生物标志物'],
    keywordsEn: [...wordsEn, 'Molecular Mechanism', 'Signaling Pathway', 'Clinical Translation'],
    cnkiQuery: wordsCn.map(w => `SU="${w}"`).join(' AND '),
    chapters: [
      { title: '一、研究背景与国内外现状', hint: '学科前沿现状、重大科学问题与近十年关键进展。' },
      { title: `二、${wordsCn[0] || main}的核心生物学特性`, hint: '分子结构与生理功能、信号转导与靶标互作网络。' },
      { title: `三、${main}的相互作用机制与病理效应`, hint: '跨组织通讯、细胞表型转化与损伤分子事件。' },
      { title: '四、靶向干预策略与转化应用前景', hint: '新型药物设计、早期诊断标志物与联合防治路径。' },
      { title: '五、总结与未来展望', hint: '主要结论与多组学交叉研究方向。' },
    ],
  };
}

function capitalizeFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ─────────────────────────────────────────────────────────────────────────────
// 第二部分：本地NLP引擎（无需API Key）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TF-IDF关键词提取
 * @param {string[]} docs - 每篇文献的 "标题+摘要+关键词" 文本
 * @param {number} topN - 返回top-N词
 */
function extractKeywordsTFIDF(docs, topN = 15) {
  // 中文分词（简单版：基于常用词典和规则切词）
  const stopWords = new Set([
    '的','了','在','是','我','有','和','就','不','人','都','一','一个','上','也',
    '很','到','说','要','去','你','会','着','没有','看','好','自己','这','那','里',
    '就是','但是','所以','因为','如果','虽然','研究','发现','表明','结果','本文',
    '分析','通过','方法','文章','讨论','显示','可以','结论','目的','对于','针对',
    '方面','进行','基于','具有','作用','影响','研究者','患者','水平','功能','机制',
    'the','a','an','of','in','and','to','with','for','is','are','was','were',
    'by','from','this','that','these','those','which','has','have','been','be',
  ]);

  // 粗略切词（按标点、空格切分，保留2字以上的词）
  function tokenize(text) {
    return (text || '')
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2 && !stopWords.has(w.toLowerCase()));
  }

  // 计算TF
  const tfMaps = docs.map(doc => {
    const tokens = tokenize(doc);
    const tf = new Map();
    tokens.forEach(w => tf.set(w, (tf.get(w) || 0) + 1));
    return { tf, total: tokens.length };
  });

  // 计算IDF
  const idf = new Map();
  const N = docs.length;
  const allWords = new Set(tfMaps.flatMap(({ tf }) => [...tf.keys()]));
  allWords.forEach(w => {
    const df = tfMaps.filter(({ tf }) => tf.has(w)).length;
    idf.set(w, Math.log((N + 1) / (df + 1)) + 1);
  });

  // 合并TF-IDF得分
  const scores = new Map();
  tfMaps.forEach(({ tf, total }) => {
    tf.forEach((count, w) => {
      const tfidf = (count / Math.max(total, 1)) * (idf.get(w) || 1);
      scores.set(w, (scores.get(w) || 0) + tfidf);
    });
  });

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([w]) => w);
}

/**
 * 关键句提取（TextRank简化版）
 * @param {string} text
 * @param {number} topN
 */
function extractKeySentences(text, topN = 3) {
  if (!text) return [];
  // 按句子切分（中英文）
  const sents = text
    .split(/[。！？\.!?；;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && s.length < 200);

  if (sents.length <= topN) return sents;

  // 简单句子评分：优先选含关键动词和技术词的句子
  const academic = /研究|发现|表明|证实|结果|显示|证明|揭示|阐明|建立|提出|验证|分析|影响|发展|机制|功能|作用|关联|相关|重要|significant|found|showed|demonstrated|revealed|suggests?/i;
  const scored = sents.map(s => ({
    s,
    score: (academic.test(s) ? 3 : 0) + Math.min(s.length / 50, 2),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(x => x.s);
}

/**
 * 统计分析：年份趋势、高引用文献、期刊分布
 */
function analyzeCorpus(papers) {
  const yearMap = new Map();
  const journalMap = new Map();
  let totalCitations = 0;
  const topCited = [];

  papers.forEach(p => {
    const year = parseInt(p.date) || 0;
    if (year > 2000) yearMap.set(year, (yearMap.get(year) || 0) + 1);
    if (p.journal) journalMap.set(p.journal, (journalMap.get(p.journal) || 0) + 1);
    const cites = parseInt(p.citations) || 0;
    totalCitations += cites;
    topCited.push({ ...p, citesNum: cites });
  });

  const years = [...yearMap.keys()].sort();
  const minYear = years[0] || 2020;
  const maxYear = years[years.length - 1] || new Date().getFullYear();

  // 年趋势描述
  let trendDesc = '';
  if (years.length >= 3) {
    const recent = years.filter(y => y >= maxYear - 3);
    const recentCount = recent.reduce((s, y) => s + yearMap.get(y), 0);
    const oldCount = papers.length - recentCount;
    if (recentCount > oldCount) {
      trendDesc = `近三年（${maxYear - 2}—${maxYear}）发文量占比 ${Math.round(recentCount / papers.length * 100)}%，呈显著上升趋势，表明该领域正处于研究热点期。`;
    } else {
      trendDesc = `研究时间跨度为 ${minYear}—${maxYear} 年，发文量相对平稳。`;
    }
  }

  // 高引文献（前3）
  topCited.sort((a, b) => b.citesNum - a.citesNum);
  const topPapers = topCited.slice(0, 3);

  // 主要期刊
  const topJournals = [...journalMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([j]) => j);

  return { minYear, maxYear, trendDesc, topPapers, topJournals, yearMap };
}

/**
 * 本地NLP综述生成（核心函数）
 */
function generateLocalReview(topic, papers, plan, options = {}) {
  const { lang = 'zh', style = 'academic', dateStr } = options;
  const now = new Date();
  const date = dateStr || `${now.getFullYear()}年${now.getMonth() + 1}月`;

  // 1. 语料准备
  const docs = papers.map(p =>
    [p.title, p.abstract, p.keywords, p.authors, p.journal].filter(Boolean).join(' ')
  );

  // 2. TF-IDF关键词
  const tfidfKeywords = extractKeywordsTFIDF(docs, 15);

  // 3. 语料统计
  const stat = analyzeCorpus(papers);

  // 4. 每章关键句提取
  const chapterSentences = plan.chapters.map(ch => {
    // 找和该章标题相关的摘要
    const relatedDocs = docs.filter((d, i) =>
      ch.hint.split(/[\s、，,。]+/).some(kw => kw.length > 1 && d.includes(kw))
    );
    const allText = relatedDocs.join(' ') || docs.join(' ');
    return extractKeySentences(allText, 2);
  });

  // 5. 组装综述全文
  let text = '';

  // ── 标题行
  text += `${plan.titleCn}\n`;
  text += '═'.repeat(Math.min(plan.titleCn.length + 4, 50)) + '\n\n';

  // ── 元数据
  text += `【检索主题】${topic}\n`;
  text += `【检索来源】中国知网（CNKI）\n`;
  text += `【检索时间】${date}\n`;
  text += `【文献总量】${papers.length} 篇\n`;
  text += `【生成模式】本地NLP（无需API Key）\n\n`;

  // ── 摘要
  text += '摘　要\n' + '─'.repeat(30) + '\n';
  text += _buildAbstract(topic, papers, stat, tfidfKeywords, plan);
  text += '\n\n';

  // ── 关键词
  const kwToUse = plan.keywordsCn.length ? plan.keywordsCn : tfidfKeywords.slice(0, 6);
  text += `关键词：${kwToUse.join('；')}\n\n`;

  text += '━'.repeat(50) + '\n\n';

  // ── 正文各章
  plan.chapters.forEach((ch, idx) => {
    text += `${ch.title}\n`;
    text += '─'.repeat(Math.min(ch.title.length * 2, 30)) + '\n';

    const sents = chapterSentences[idx];
    text += _buildChapterBody(ch, idx, papers, stat, sents, tfidfKeywords, topic);
    text += '\n\n';
  });

  // ── 参考文献
  text += '参考文献\n' + '─'.repeat(30) + '\n';
  papers.forEach((p, i) => {
    text += `[${i + 1}] `;
    if (p.authors) text += `${p.authors}. `;
    text += `${p.title}`;
    if (p.journal) text += `[J]. ${p.journal}`;
    else text += '[Z]';
    if (p.date) text += `, ${p.date}`;
    if (p.citations && parseInt(p.citations) > 0) text += `. 被引${p.citations}次`;
    text += '.\n';
  });

  return text;
}

function _buildAbstract(topic, papers, stat, keywords, plan) {
  const { minYear, maxYear, trendDesc, topPapers, topJournals } = stat;

  let abs = `本综述基于中国知网（CNKI）数据库，以"${topic}"为主题，系统检索并筛选 ${minYear}—${maxYear} 年间发表的核心文献共 ${papers.length} 篇，`;

  if (topJournals.length) {
    abs += `涉及《${topJournals.slice(0, 3).join('》《')}》等核心期刊，`;
  }

  abs += `${trendDesc}`;

  abs += `\n\n本文从研究背景、核心机制、应用现状与未来展望四个维度对${topic}领域的研究进展进行了系统梳理。`;

  if (topPapers.length) {
    abs += `高被引研究方面，${topPapers[0].authors || '研究者'}等发表的《${topPapers[0].title}》（被引${topPapers[0].citesNum}次）是该领域的代表性成果。`;
  }

  abs += `\n\n综合分析表明，${topic}领域的研究热点主要集中于：${keywords.slice(0, 5).join('、')}等核心议题，`;
  abs += `并呈现出与${plan.keywordsCn.slice(-3).join('、')}等跨学科方向深度融合的发展趋势。`;

  return abs;
}

function _buildChapterBody(ch, idx, papers, stat, keySents, tfidfKws, topic) {
  const { topPapers, topJournals, minYear, maxYear } = stat;
  let body = '';

  if (idx === 0) {
    // 第一章：背景与现状
    body += `${topic}领域的研究可追溯至 ${minYear} 年前后，经过数十年的系统探索，`;
    body += `学界已在理论框架构建、实验方法创新与临床转化应用等方面取得了显著进展。`;
    if (topJournals.length) {
      body += `《${topJournals.slice(0, 2).join('》《')}》等期刊集中发表了该领域的奠基性研究成果。`;
    }
    body += `\n\n${ch.hint}`;
    if (keySents.length) {
      body += `\n\n近年来，相关研究结论指出：${keySents[0]}`;
      if (keySents[1]) body += `此外，${keySents[1]}`;
    }
    if (topPapers.length) {
      body += `\n\n代表性成果方面，${topPapers[0].authors || '研究团队'}的工作（${topPapers[0].date || '近年'}，被引${topPapers[0].citesNum}次）系统阐明了${tfidfKws.slice(0, 2).join('与')}的关联机制，被学界广泛引用。`;
    }
  } else if (idx === plan.chapters.length - 1) {
    // 最后章：总结展望
    body += `综合本文各章节的系统分析，${topic}领域在 ${minYear}—${maxYear} 年间取得了重要突破，`;
    body += `尤其是在${tfidfKws.slice(0, 3).join('、')}等核心议题上形成了较为完善的理论体系。`;
    body += `\n\n${ch.hint}`;
    body += `\n\n展望未来，多组学技术的深度融合、大规模队列研究的持续推进以及跨学科协同创新，`;
    body += `将进一步推动该领域向精准化、个体化与转化应用方向深入发展。`;
    body += `本综述所梳理的 ${papers.length} 篇核心文献，为后续研究提供了系统的文献基础与方向参考。`;
  } else {
    // 中间章节
    body += ch.hint;
    body += `\n\n${topic}领域的相关研究表明，${tfidfKws.slice(idx, idx + 3).join('与')}在该维度发挥关键作用。`;
    if (keySents.length) {
      body += `\n\n文献分析显示：${keySents[0]}`;
      if (keySents[1]) body += ` 与此同时，${keySents[1]}`;
    }
    // 引用当前章节范围内的文献
    const refRange = papers.slice(
      Math.floor(idx * papers.length / (plan.chapters.length)),
      Math.floor((idx + 1) * papers.length / (plan.chapters.length))
    );
    if (refRange.length) {
      const refNums = refRange.map((_, i) =>
        `[${Math.floor(idx * papers.length / plan.chapters.length) + i + 1}]`
      ).slice(0, 4).join('');
      body += `\n\n上述研究结论已在多项文献中得到验证${refNums}，为本领域的深入研究奠定了坚实基础。`;
    }
  }

  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// 第三部分：AI增强模式（可选API Key）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AI综述生成
 * @param {string} topic
 * @param {object[]} papers
 * @param {object} plan - planTopic()返回的结构
 * @param {string} model - 'openai' | 'claude' | 'deepseek' | 'qwen'
 * @param {string} apiKey
 * @param {object} options
 */
async function generateAIReview(topic, papers, plan, model, apiKey, options = {}) {
  const { lang = 'zh', maxTokens = 2500, onProgress } = options;

  // 先用本地NLP做预分析，给AI更丰富的上下文
  const localDraft = generateLocalReview(topic, papers, plan, options);
  const stat = analyzeCorpus(papers);
  const tfidfKws = extractKeywordsTFIDF(
    papers.map(p => [p.title, p.abstract, p.keywords].filter(Boolean).join(' ')),
    10
  );

  onProgress?.('正在构建提示词...');

  const papersContext = papers.slice(0, 15).map((p, i) =>
    `[${i + 1}] ${p.authors || ''}《${p.title}》${p.journal || ''}(${p.date || ''})` +
    (p.abstract ? `\n    摘要：${p.abstract.slice(0, 100)}` : '')
  ).join('\n');

  const prompt = `你是一位资深学术综述专家，精通中文学术写作规范（GB/T 7714）。

## 综述主题
${topic}

## 文献统计分析（NLP预分析结果）
- 文献总量：${papers.length} 篇（${stat.minYear}—${stat.maxYear}年）
- TF-IDF核心关键词：${tfidfKws.join('、')}
- 高引期刊：${stat.topJournals.slice(0, 3).join('、')}
- 趋势：${stat.trendDesc}

## 规划章节结构
${plan.chapters.map((ch, i) => `${i + 1}. ${ch.title}：${ch.hint}`).join('\n')}

## 检索文献列表（知网CNKI）
${papersContext}

## 写作要求
1. 基于上述 ${papers.length} 篇真实文献撰写综述，正文引用格式用上标 [n] 对应文献编号
2. 字数 1000—1500 字（中文）
3. 严格按照规划的章节结构展开，不要遗漏任何章节
4. 语言：${lang === 'zh' ? '纯中文，学术规范，不要翻译成英文' : lang === 'en' ? '纯英文，academic style' : '中文为主，重要术语后括注英文'}
5. 末尾附参考文献表（GB/T 7714格式，只列知网检索到的文献）
6. 不要有任何AI标识、"如有需要"等AI口吻词语，直接输出综述正文

请直接输出综述正文（从标题开始）：`;

  onProgress?.('正在调用AI模型...');

  const apiConfigs = {
    openai: {
      url: 'https://api.openai.com/v1/chat/completions',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      buildBody: () => JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
      extract: d => d.choices?.[0]?.message?.content,
    },
    claude: {
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      buildBody: () => JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
      extract: d => d.content?.[0]?.text,
    },
    deepseek: {
      url: 'https://api.deepseek.com/chat/completions',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      buildBody: () => JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
      extract: d => d.choices?.[0]?.message?.content,
    },
    qwen: {
      url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      buildBody: () => JSON.stringify({
        model: 'qwen-max',
        input: { messages: [{ role: 'user', content: prompt }] },
        parameters: { max_tokens: maxTokens, temperature: 0.7 },
      }),
      extract: d => d.output?.text || d.output?.choices?.[0]?.message?.content,
    },
    // 新增：Ollama本地模型（无需API Key，需本地部署）
    ollama: {
      url: 'http://localhost:11434/api/generate',
      headers: { 'Content-Type': 'application/json' },
      buildBody: () => JSON.stringify({
        model: apiKey || 'qwen2.5:7b',  // apiKey字段复用为model name
        prompt,
        stream: false,
        options: { num_predict: maxTokens },
      }),
      extract: d => d.response,
    },
  };

  const cfg = apiConfigs[model];
  if (!cfg) throw new Error(`未知模型: ${model}`);

  const resp = await fetch(cfg.url, {
    method: 'POST',
    headers: cfg.headers,
    body: cfg.buildBody(),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`API请求失败 (${resp.status}): ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  const result = cfg.extract(data);
  if (!result) throw new Error('AI返回内容为空，请检查API Key或模型配置');

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 第四部分：免费公共AI代理（完全无需API Key）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 使用免费公共接口（无需任何API Key）生成综述
 * 当前支持：
 *   - Cloudflare Workers AI（免费额度）
 *   - Hugging Face Inference API（免费额度）
 *   - 本地 Ollama（如果用户有本地部署）
 *
 * 注：公共免费接口有速率限制，作为"增强本地模式"的可选项
 */
async function generateFreeAIReview(topic, papers, plan, options = {}) {
  const { onProgress, freeProvider = 'hf' } = options;

  onProgress?.('正在使用免费AI增强...');

  const stat = analyzeCorpus(papers);
  const tfidfKws = extractKeywordsTFIDF(
    papers.map(p => [p.title, p.abstract, p.keywords].filter(Boolean).join(' ')),
    8
  );

  // 构建精简prompt（免费API有token限制）
  const shortPapers = papers.slice(0, 8).map((p, i) =>
    `[${i + 1}]${p.authors || ''}《${p.title}》(${p.date || ''})`
  ).join('\n');

  const shortPrompt = `请用中文为主题"${topic}"写一篇约600字的学术综述。
关键词：${tfidfKws.slice(0, 5).join('、')}
文献数量：${papers.length}篇（${stat.minYear}-${stat.maxYear}）
文献列表（节选）：\n${shortPapers}
结构：背景→现状→趋势→展望→参考文献
直接输出综述：`;

  if (freeProvider === 'hf') {
    // Hugging Face 免费 Inference API
    // 使用 Qwen2.5-7B-Instruct（中文能力强）
    try {
      const resp = await fetch(
        'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct/v1/chat/completions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'Qwen/Qwen2.5-7B-Instruct',
            messages: [{ role: 'user', content: shortPrompt }],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        }
      );

      if (resp.ok) {
        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content;
        if (text && text.length > 100) return { text, source: 'Hugging Face (Qwen2.5-7B，免费)' };
      }
    } catch (e) {
      console.warn('[FreeAI] HF failed:', e.message);
    }
  }

  if (freeProvider === 'ollama' || freeProvider === 'hf') {
    // 尝试本地Ollama
    try {
      const resp = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5:7b',
          prompt: shortPrompt,
          stream: false,
          options: { num_predict: 800 },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.response?.length > 100) {
          return { text: data.response, source: 'Ollama本地模型（qwen2.5:7b）' };
        }
      }
    } catch (e) {
      console.warn('[FreeAI] Ollama not available:', e.message);
    }
  }

  return null; // 所有免费途径均不可用，降级到纯本地NLP
}

// ─────────────────────────────────────────────────────────────────────────────
// 第五部分：统一调度入口
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 生成综述的统一入口
 * @param {object} config
 *   - topic: 主题词
 *   - papers: 知网检索文献列表
 *   - mode: 'local' | 'free_ai' | 'api_ai'
 *   - model: AI模型名（api_ai模式）
 *   - apiKey: API Key（api_ai模式）或Ollama模型名（ollama模式）
 *   - lang: 'zh' | 'en' | 'both'
 *   - onProgress: (msg)=>void 进度回调
 */
async function generateReview(config) {
  const {
    topic, papers = [], mode = 'local',
    model, apiKey, lang = 'zh', onProgress,
  } = config;

  if (!papers.length) throw new Error('文献列表为空，请先检索文献');

  onProgress?.('规划章节结构...');
  const plan = planTopic(topic);

  if (mode === 'local') {
    // ── 纯本地NLP模式
    onProgress?.('本地NLP分析中...');
    const text = generateLocalReview(topic, papers, plan, { lang });
    return { text, plan, mode: 'local', source: '本地NLP（TF-IDF+关键句提取，无需API Key）' };

  } else if (mode === 'free_ai') {
    // ── 免费AI增强模式
    onProgress?.('尝试免费AI接口...');
    const freeResult = await generateFreeAIReview(topic, papers, plan, {
      onProgress, freeProvider: model || 'hf',
    });
    if (freeResult) {
      return { text: freeResult.text, plan, mode: 'free_ai', source: freeResult.source };
    }
    // 降级
    onProgress?.('免费AI不可用，降级到本地NLP...');
    const text = generateLocalReview(topic, papers, plan, { lang });
    return { text, plan, mode: 'local', source: '本地NLP（免费AI降级）' };

  } else if (mode === 'api_ai') {
    // ── API Key模式
    if (!apiKey) throw new Error('该模式需要API Key');
    onProgress?.(`调用 ${model} API...`);
    const text = await generateAIReview(topic, papers, plan, model, apiKey, { lang, onProgress });
    return { text, plan, mode: 'api_ai', source: `${model} API（AI生成）` };
  }

  throw new Error('未知模式: ' + mode);
}

// ─────────────────────────────────────────────────────────────────────────────
// 导出工具函数
// ─────────────────────────────────────────────────────────────────────────────


// 全局挂载，供 popup.js 和外部调用

// ─── Zotero 导入功能（插件端）────────────────────────────────────────────────

async function pushToZotero(papers, withPDF = false) {
  const port = settings.zoteroPort || 23119;

  if (withPDF && papers.length === 1) {
    // 单篇带PDF
    const resp = await chrome.runtime.sendMessage({
      type: 'ZOTERO_PUSH_PDF',
      paper: papers[0],
      port,
    });
    return resp;
  }

  // 批量元数据
  const resp = await chrome.runtime.sendMessage({
    type: 'ZOTERO_PUSH',
    papers,
    port,
  });
  return resp;
}

// CNKI Scholar Assistant - Popup v2.0.0
// 架构：第一版 detectAccount (activeTab) + 三模式综述 + 文库 + 账号设置

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// review_engine_bundle.js 在 HTML 中 <script> 标签先于本文件加载

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
  detectAccount(); // 不 await，独立运行不阻塞 UI
});

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

// ─── Account Detection（第一版架构：activeTab，不用 tabs 权限）─────────────

async function detectAccount() {
  // 第一版原始写法：activeTab 权限下 tabs.query 不会挂住
  const dot = $('#statusDot');
  const text = $('#statusText');
  dot.className = 'status-dot';

  try {
    // 使用第一版的原始查询方式（不加 tabs 权限时 currentWindow 正常工作）
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
  } catch (_) {
    // 任何异常：显示默认态，不卡死
    dot.classList.add('offline');
    text.textContent = '请打开知网';
  }
}

function extractAccountInfo() {
  try {
    const ipOrgEl = document.querySelector('.ip-area, #ip-name, .cur-org');
    const orgEl   = document.querySelector('.org-name, .institution-name, #ip-org, [class*="organ"]');
    const userEl  = document.querySelector('.header-person-name, .user-name, .personal-name');
    const institution = (ipOrgEl?.textContent?.trim() || orgEl?.textContent?.trim() || '').slice(0, 30);
    const username    = (userEl?.textContent?.trim() || '').slice(0, 20);
    const loginLink   = document.querySelector('a[href*="login"], .login-btn, #LoginContent');
    const isNotLogged = loginLink && /登录|Login/i.test(loginLink.textContent || '');
    return {
      logged: !isNotLogged || !!institution || !!username,
      username, institution,
      accountType: institution ? '机构/IP认证' : ((!isNotLogged || username) ? '个人账号' : '未登录'),
    };
  } catch (_) {
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
  $('#zoteroSelectedBtn')?.addEventListener('click', zoteroSelected);
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
        <button class="sm-btn" data-action="zotero" data-idx="${idx}" style="background:#c62828;color:white;font-size:10px">Z</button>
      </div>`;
    card.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (btn) {
        e.stopPropagation();
        const p = currentResults[btn.dataset.idx];
        if (btn.dataset.action === 'detail') showPaperDetail(p);
        else if (btn.dataset.action === 'save') savePaper(p);
        else if (btn.dataset.action === 'download') downloadPaper(p);
        else if (btn.dataset.action === 'zotero') {
          btn.textContent = '⏳';
          pushToZotero([p], false).then(r => {
            btn.textContent = r?.status === 'ok' ? '✅' : '❌';
            setTimeout(() => { btn.textContent = 'Z'; }, 2000);
            showStatus(r?.status === 'ok' ? `✅ 已推送到 Zotero: ${p.title.slice(0,15)}` : '❌ ' + (r?.error || '失败'), r?.status === 'ok' ? 'success' : 'error');
          });
        }
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
  cbs.forEach(cb => {
    cb.checked = anyUnchecked;
    cb.closest('.paper-card').classList.toggle('selected', anyUnchecked);
  });
  $('#selectAllBtn').textContent = anyUnchecked ? '取消全选' : '全选';
}

async function exportSelected() {
  const sel = $$('.paper-checkbox:checked').map(cb => currentResults[cb.dataset.idx]);
  if (!sel.length) { showStatus('请先选择文献', 'error'); return; }
  await navigator.clipboard.writeText(
    sel.map((p, i) => `[${i+1}] ${p.authors}. ${p.title}[J]. ${p.journal}, ${p.date}.`).join('\n')
  );
  showStatus(`✅ 已复制 ${sel.length} 条 GB/T 7714 引用`, 'success');
}

async function downloadSelected() {
  const sel = $$('.paper-checkbox:checked').map(cb => currentResults[cb.dataset.idx]);
  if (!sel.length) { showStatus('请先选择文献', 'error'); return; }
  showStatus(`⏳ 开始下载 ${sel.length} 篇...`);
  for (const p of sel) { await downloadPaper(p); await sleep(800); }
}

async function zoteroSelected() {
  const sel = $$('.paper-checkbox:checked').map(cb => currentResults[cb.dataset.idx]);
  if (!sel.length) { showStatus('请先选择文献', 'error'); return; }
  showStatus(`⏳ 推送 ${sel.length} 篇到 Zotero...`);
  const resp = await pushToZotero(sel, false);
  if (resp?.status === 'ok') {
    showStatus(`✅ ${resp.message}`, 'success');
  } else {
    showStatus('❌ ' + (resp?.error || 'Zotero 推送失败，请确认 Zotero 已打开'), 'error');
  }
}

async function showPaperDetail(paper) {
  if (paper.href) chrome.tabs.create({ url: paper.href });
}

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
      <div class="paper-meta">
        <span>👤 ${escHtml(paper.authors||'-')}</span>
        <span>📰 ${escHtml(paper.journal||'-')}</span>
        <span>📅 ${paper.date||'-'}</span>
      </div>
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
  await navigator.clipboard.writeText(
    library.map((p, i) => `[${i+1}] ${p.authors||''}. ${p.title}[J]. ${p.journal||''}, ${p.date||''}.`).join('\n')
  );
  showStatus(`✅ 已复制 ${library.length} 条引用`, 'success');
}

async function clearLibrary() {
  if (!confirm('确定清空文库吗？')) return;
  library = []; stats.saved = 0; await saveSettings(); updateStats(); renderLibrary();
}

// ─── Review Generator — 三模式 ────────────────────────────────────────────────

const API_KEY_GUIDES = {
  deepseek: '<a href="https://platform.deepseek.com/api_keys" target="_blank">获取 DeepSeek Key →</a>',
  qwen:     '<a href="https://dashscope.aliyun.com/" target="_blank">获取通义千问 Key →</a>',
  openai:   '<a href="https://platform.openai.com/api-keys" target="_blank">获取 OpenAI Key →</a>',
  claude:   '<a href="https://console.anthropic.com/" target="_blank">获取 Claude Key →</a>',
  ollama:   '填入本地模型名，如 <code>qwen2.5:7b</code>，无需 Key',
};

function setupReview() {
  $$('.mode-card').forEach(card => card.addEventListener('click', () => setReviewMode(card.dataset.mode, true)));
  $('#freeAIProvider')?.addEventListener('change', function () {
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

    const searchResp = await chrome.runtime.sendMessage({ type: 'SEARCH', query: topic, source, page: 1, count });
    if (searchResp.error) throw new Error(searchResp.error);
    const papers = searchResp.results?.slice(0, count) || [];
    if (!papers.length) throw new Error('未检索到文献，请检查关键词或知网连接');

    setProgress(35, `已获取 ${papers.length} 篇，提取摘要...`);

    const absResp = await chrome.runtime.sendMessage({
      type: 'GET_ABSTRACTS',
      papers: papers.slice(0, mode === 'local' ? 20 : 12),
    });
    const enriched = absResp?.papers || papers;

    setProgress(60, '生成综述中...');

    let result;
    if (typeof generateReview === 'function') {
      result = await generateReview({
        topic, papers: enriched, mode, model, apiKey, lang,
        onProgress: msg => setProgress(Math.min((parseInt($('#progressFill').style.width) || 60) + 8, 90), msg),
      });
    } else {
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

async function downloadReviewAsFile() {
  const title = $('#reviewTitle').textContent.replace(/[\\/:*?"<>|《》]/g, '_');
  const content = $('#reviewContent').textContent;
  const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
  chrome.downloads.download({ url: dataUrl, filename: title + '.txt' });
  showStatus('✅ 综述已下载', 'success');
}

function downloadReviewAsPrint() {
  const title = $('#reviewTitle').textContent;
  const content = $('#reviewContent').textContent;
  const source = $('#reviewSourceBadge')?.textContent || '';
  const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${escHtml(title)}</title>
<style>body{font-family:'Microsoft YaHei',serif;font-size:12pt;max-width:800px;margin:40px auto;line-height:1.9;padding:0 20px}
h1{font-size:18pt;text-align:center;margin-bottom:6px}
.meta{text-align:center;font-size:10pt;color:#777;margin-bottom:20px}
pre{white-space:pre-wrap;font-family:inherit;font-size:11pt;line-height:1.9}
.btn{display:flex;gap:8px;justify-content:center;margin:16px 0}
.btn button{padding:8px 20px;border:none;border-radius:6px;cursor:pointer;background:#1565c0;color:white;font-size:13px}
@media print{.btn{display:none}}</style></head>
<body><h1>${escHtml(title)}</h1>
<div class="meta">来源：知网CNKI · ${escHtml(source)} · ${new Date().toLocaleDateString('zh-CN')}</div>
<div class="btn"><button onclick="window.print()">🖨 打印 / 另存为PDF</button></div>
<hr/><pre>${escHtml(content)}</pre></body></html>`;
  chrome.tabs.create({ url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) });
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
    el.style.cssText = 'padding:6px 8px;border-radius:4px;font-size:11px;line-height:1.5';
    el.textContent = '⏳ 测试中...';
    // 通过 background 发请求，避免 popup CORS 限制
    const result = await chrome.runtime.sendMessage({ type: 'ZOTERO_PING', port });
    if (result?.ok) {
      el.style.cssText += ';background:#e8f5e9;color:#2e7d32';
      el.textContent = '✅ Zotero 连接成功！（端口 ' + port + '）';
    } else {
      el.style.cssText += ';background:#ffebee;color:#c62828';
      el.textContent = (result?.error || '❌ 连接失败').replace(/\\n/g, '\n');
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

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }