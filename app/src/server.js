// src/server.js
const express = require('express');
const path = require('path');
const config = require('./config');
const db = require('./db');
const { runRefresh } = require('./refresh');

const PORT = parseInt(process.env.PORT || '8787', 10);
const app = express();
app.use(express.json({ limit: '256kb' }));

// ---- API ----

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/config', (req, res) => {
  // Return only non-sensitive fields to the browser.
  const cfg = config.load();
  res.json({
    cities: cfg.cities,
    categories: cfg.categories,
    schedule: cfg.schedule,
    vllm: { configured: !!(cfg.vllm.url && cfg.vllm.model), model: cfg.vllm.model || null },
    searxng: { configured: !!cfg.searxng.url },
  });
});

app.get('/api/events', (req, res) => {
  const from = req.query.from || new Date().toISOString().slice(0, 10);
  const to = req.query.to || new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  const rows = db.getEvents({ from, to });
  res.json({
    from, to,
    events: rows,
    cities: db.distinctCities(),
    categories: db.distinctCategories(),
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    last_refresh: db.lastRefresh() || null,
  });
});

// Manual refresh trigger — handy for testing and for a "Refresh Now" action.
let refreshing = false;
app.post('/api/refresh', async (req, res) => {
  if (refreshing) return res.status(409).json({ error: 'refresh already running' });
  refreshing = true;
  res.json({ started: true });
  try {
    await runRefresh();
  } catch (err) {
    console.error('[refresh] manual failed:', err.message);
  } finally {
    refreshing = false;
  }
});

// ---- Static UI ----

app.use(express.static(path.join(__dirname, '..', 'public')));

// ---- Scheduler (weekly, Sunday 6am local) ----
// We use a light internal ticker that checks every 5 minutes whether the
// current local time matches the configured cron expression. For a weekly
// "Sunday 6am" schedule, a cron parser would be overkill — we hand-roll a
// minimal matcher that supports "M H * * D" style.

function matchCron(expr, date) {
  // Supports: minute hour day-of-month month day-of-week
  // Each field: "*" or integer or comma list.
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  const m = date.getMinutes();
  const h = date.getHours();
  const dom = date.getDate();
  const mon = date.getMonth() + 1;
  const dow = date.getDay();
  const vals = [m, h, dom, mon, dow];
  return fields.every((f, i) => {
    if (f === '*') return true;
    return f.split(',').map(x => parseInt(x, 10)).includes(vals[i]);
  });
}

let lastTickKey = '';
async function tick() {
  try {
    const cfg = config.load();
    const cron = cfg.schedule?.cron || '0 6 * * 0';
    const now = new Date();
    // Round to the minute so we only fire once per matching minute.
    const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    if (key !== lastTickKey && matchCron(cron, now)) {
      lastTickKey = key;
      if (!refreshing) {
        refreshing = true;
        console.log('[cron] scheduled refresh starting');
        try { await runRefresh(); } catch (e) { console.error('[cron] refresh failed:', e.message); }
        refreshing = false;
      }
    }
  } catch (e) {
    console.error('[cron] tick error:', e.message);
  }
}
setInterval(tick, 30 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[local-outings] listening on :${PORT}`);
  console.log(`[local-outings] config: ${config.CONFIG_PATH}`);
  console.log(`[local-outings] db: ${db.DB_PATH}`);
});
