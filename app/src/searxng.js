// src/searxng.js
const fetch = require('node-fetch');

// SearXNG has a JSON endpoint if the instance has `formats: [json]` enabled.
// Most self-hosted setups do. We request JSON and fall back on failure.
async function search(searxngUrl, query, { limit = 10 } = {}) {
  if (!searxngUrl) throw new Error('SearXNG URL not configured');
  const url = new URL('/search', searxngUrl);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('language', 'en-US');
  url.searchParams.set('safesearch', '1');
  // Prefer general + news engines for event pages
  url.searchParams.set('categories', 'general,news');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'LocalOutings/1.0 (StartOS)' },
    timeout: 20000,
  });
  if (!res.ok) throw new Error(`SearXNG ${res.status}: ${await res.text()}`);
  const body = await res.json();
  const results = (body.results || []).slice(0, limit).map(r => ({
    title: r.title,
    url: r.url,
    snippet: r.content || '',
    engine: r.engine,
  }));
  return results;
}

module.exports = { search };
