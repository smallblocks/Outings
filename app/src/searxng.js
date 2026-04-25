// src/searxng.js
const fetch = require('node-fetch');
const https = require('https');

// Insecure agent that skips TLS verification. We only attach this when the
// user has explicitly opted in via the "Allow self-signed TLS certs" toggle,
// and only for the SearXNG host they configured.
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Search a SearXNG instance.
 *
 * IMPORTANT — protocol handling:
 * - We do NOT follow redirects (`redirect: 'manual'`). SearXNG running on
 *   StartOS issues an HTTP→HTTPS redirect, and silently following it
 *   defeats the user's protocol choice and produces TLS errors that look
 *   like config bugs. If we get a redirect, we surface it and tell the
 *   user to update their configured URL to the destination.
 * - When the user has opted into self-signed certs, the agent is provided
 *   as a function so it applies whether the request is HTTP or HTTPS, and
 *   correctly carries to any same-protocol redirects we choose to follow
 *   in the future.
 */
async function search(searxngUrl, query, { limit = 10, allowSelfSigned = false } = {}) {
  if (!searxngUrl) throw new Error('SearXNG URL not configured');
  const url = new URL('/search', searxngUrl);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('language', 'en-US');
  url.searchParams.set('safesearch', '1');
  // Prefer general + news engines for event pages
  url.searchParams.set('categories', 'general,news');

  // Use a function for `agent` so the choice is reapplied on every connection
  // (including same-protocol redirects, if we ever opt back into following).
  const agentFn = (parsedUrl) => {
    if (parsedUrl.protocol === 'https:' && allowSelfSigned) return insecureAgent;
    if (parsedUrl.protocol === 'https:') return null; // node-fetch default https agent
    return null; // http:// — node-fetch default http agent
  };

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'LocalOutings/1.0 (StartOS)' },
    timeout: 20000,
    agent: agentFn,
    redirect: 'manual',
  });

  // If SearXNG redirected us (typically HTTP→HTTPS), refuse to silently
  // follow. Tell the user exactly what the destination was.
  if (res.status >= 300 && res.status < 400) {
    const dest = res.headers.get('location') || '(no Location header)';
    throw new Error(
      `SearXNG redirected ${url.toString()} -> ${dest}. ` +
      `Update your configured SearXNG Base URL to match the destination ` +
      `(it likely changed protocol or port).`
    );
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SearXNG ${res.status}: ${body.slice(0, 300)}`);
  }
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
