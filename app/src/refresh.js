// src/refresh.js
// The scheduled worker: for each (city × category), search SearXNG, feed results
// to vLLM, ask it to return a strict JSON array of events, dedupe, and upsert.
//
// Run once via `node src/refresh.js` (also callable from the HTTP API).

const crypto = require('crypto');
const config = require('./config');
const db = require('./db');
const searxng = require('./searxng');
const vllm = require('./vllm');

function todayISO() { return new Date().toISOString().slice(0, 10); }
function plusDaysISO(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildQuery(city, category) {
  const windowLabel = 'next 60 days';
  return `"${city}" ${category} events ${windowLabel} schedule tickets`;
}

const EXTRACTION_SYSTEM = `You extract public-event listings from web search results.
Return ONLY a JSON array. Each element must be an object with these exact keys:
title (string), start_date (YYYY-MM-DD), start_time (HH:mm or null),
end_date (YYYY-MM-DD or null), venue (string or null), address (string or null),
description (string, <=280 chars), url (string), price (string or null).
Rules:
- Only include events with a concrete, specific start_date. If a date is vague
  ("this weekend", "every Tuesday"), skip it.
- Only include events taking place within the next 90 days.
- Skip anything that is not a real public event (e.g. merch pages, generic
  venue info, articles about past events).
- Do NOT invent details. If a field is unknown, use null.
- Do not return any text outside the JSON array.`;

function userPrompt(city, category, results) {
  const lines = results.map((r, i) =>
    `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}\n`
  ).join('\n');
  return `City: ${city}
Category: ${category}
Today is ${todayISO()}.

Search results:
${lines}

Return the JSON array now.`;
}

function safeParseJsonArray(text) {
  // Some models wrap JSON in ```json fences or add prose — strip defensively.
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  // Find first "[" and last "]"
  const a = t.indexOf('[');
  const b = t.lastIndexOf(']');
  if (a === -1 || b === -1 || b < a) return [];
  try {
    const arr = JSON.parse(t.slice(a, b + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function stableId(ev, city, category) {
  const key = `${city}|${category}|${ev.title}|${ev.start_date}|${ev.venue || ''}`;
  return crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
}

function validateAndNormalize(ev, city, category) {
  if (!ev || typeof ev !== 'object') return null;
  if (!ev.title || !ev.start_date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.start_date)) return null;

  const today = todayISO();
  const cutoff = plusDaysISO(120);
  if (ev.start_date < today || ev.start_date > cutoff) return null;

  return {
    id: stableId(ev, city, category),
    title: String(ev.title).slice(0, 240),
    city,
    category,
    start_date: ev.start_date,
    start_time: ev.start_time && /^\d{1,2}:\d{2}$/.test(ev.start_time) ? ev.start_time : null,
    end_date: ev.end_date && /^\d{4}-\d{2}-\d{2}$/.test(ev.end_date) ? ev.end_date : null,
    venue: ev.venue ? String(ev.venue).slice(0, 200) : null,
    address: ev.address ? String(ev.address).slice(0, 300) : null,
    description: ev.description ? String(ev.description).slice(0, 400) : null,
    url: ev.url ? String(ev.url).slice(0, 1000) : null,
    price: ev.price ? String(ev.price).slice(0, 100) : null,
    source: 'searxng+vllm',
    fetched_at: new Date().toISOString(),
  };
}

async function processPair(cfg, city, category) {
  const query = buildQuery(city, category);
  const results = await searxng.search(cfg.searxng.url, query, { limit: 10 });
  if (!results.length) return { city, category, found: 0, reason: 'no search results' };

  const messages = [
    { role: 'system', content: EXTRACTION_SYSTEM },
    { role: 'user', content: userPrompt(city, category, results) },
  ];

  const raw = await vllm.chat(cfg.vllm, messages, {
    temperature: 0.1,
    maxTokens: 2048,
  });

  const parsed = safeParseJsonArray(raw);
  const normalized = parsed
    .map(ev => validateAndNormalize(ev, city, category))
    .filter(Boolean);

  if (normalized.length) db.upsertEvents(normalized);
  return { city, category, found: normalized.length };
}

async function runRefresh() {
  const cfg = config.load();
  const logId = db.beginRefresh();
  const summary = [];
  let hadError = false;

  try {
    if (!cfg.vllm.url || !cfg.vllm.model) throw new Error('vLLM not configured');
    if (!cfg.searxng.url) throw new Error('SearXNG not configured');
    if (!cfg.cities.length) throw new Error('No cities configured');
    if (!cfg.categories.length) throw new Error('No categories configured');

    for (const cityObj of cfg.cities) {
      const city = typeof cityObj === 'string' ? cityObj : cityObj.name;
      for (const category of cfg.categories) {
        try {
          const r = await processPair(cfg, city, category);
          summary.push(r);
          console.log(`[refresh] ${city} / ${category}: ${r.found} events`);
        } catch (err) {
          hadError = true;
          summary.push({ city, category, error: err.message });
          console.error(`[refresh] FAILED ${city} / ${category}:`, err.message);
        }
      }
    }

    const pruned = db.pruneOld();
    console.log(`[refresh] pruned ${pruned} stale events`);

    db.endRefresh(logId, hadError ? 'partial' : 'ok', JSON.stringify(summary));
    return { status: hadError ? 'partial' : 'ok', summary };
  } catch (err) {
    db.endRefresh(logId, 'error', err.message);
    throw err;
  }
}

module.exports = { runRefresh };

if (require.main === module) {
  runRefresh()
    .then((r) => { console.log('[refresh] done:', r.status); process.exit(0); })
    .catch((e) => { console.error('[refresh] fatal:', e); process.exit(1); });
}
