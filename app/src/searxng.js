// src/searxng.js
// SearXNG client.
//
// We scrape SearXNG's HTML response rather than requesting the JSON API,
// because the StartOS SearXNG package ships with the upstream defaults
// (`search.formats: [html]`) and provides no UI to add `json` to that
// list. Asking SearXNG for JSON returns a 403. SearXNG's HTML output is
// extremely consistent across versions — each result is an
// `<article class="result">` with a heading anchor, the URL, and a
// snippet — so parsing it is reliable and avoids requiring users to
// edit a file they cannot reach.

const fetch = require('node-fetch');
const https = require('https');

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

function decodeHtmlEntities(s) {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function stripTags(s) {
  return decodeHtmlEntities(String(s || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse SearXNG's HTML results page.
 * Returns [{ title, url, snippet, engine }]
 */
function parseSearxngHtml(html, limit) {
  const results = [];
  // Each result is wrapped in <article class="result ...">…</article>
  const articleRe = /<article\b[^>]*class="[^"]*\bresult\b[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  let m;
  while ((m = articleRe.exec(html)) && results.length < limit) {
    const inner = m[1];

    // The result's main link is the first <a class="url_header" href="...">,
    // or fallback: any <h3>...<a href="...">
    let url = null;
    const urlMatch =
      inner.match(/<a\b[^>]*class="[^"]*url_header[^"]*"[^>]*href="([^"]+)"/i) ||
      inner.match(/<h3[^>]*>\s*<a\b[^>]*href="([^"]+)"/i) ||
      inner.match(/<a\b[^>]*href="([^"]+)"[^>]*class="[^"]*url[^"]*"/i);
    if (urlMatch) url = decodeHtmlEntities(urlMatch[1]);

    // Title is inside the <h3>...<a>...</a></h3>
    let title = '';
    const titleMatch = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    if (titleMatch) title = stripTags(titleMatch[1]);

    // Snippet: <p class="content">…</p> or fallback <p>...
    let snippet = '';
    const snippetMatch =
      inner.match(/<p\b[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
      inner.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    if (snippetMatch) snippet = stripTags(snippetMatch[1]);

    // Engine label: <div class="engines">…</div> contains spans like "google"
    let engine = '';
    const engineMatch = inner.match(/<div[^>]*class="[^"]*engines[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (engineMatch) engine = stripTags(engineMatch[1]);

    if (url && title) {
      results.push({ title, url, snippet, engine });
    }
  }
  return results;
}

async function search(searxngUrl, query, { limit = 10, allowSelfSigned = false } = {}) {
  if (!searxngUrl) throw new Error('SearXNG URL not configured');
  const url = new URL('/search', searxngUrl);
  url.searchParams.set('q', query);
  // Request HTML — works on every SearXNG install without configuration.
  url.searchParams.set('format', 'html');
  url.searchParams.set('language', 'en-US');
  url.searchParams.set('safesearch', '1');
  url.searchParams.set('categories', 'general,news');

  // agent function so the choice applies to redirects too (if we follow any)
  const agentFn = (parsedUrl) => {
    if (parsedUrl.protocol === 'https:' && allowSelfSigned) return insecureAgent;
    return null;
  };

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LocalOutings/1.0; StartOS)',
      'Accept': 'text/html',
    },
    timeout: 20000,
    agent: agentFn,
    redirect: 'follow', // HTML endpoint is fine to follow redirects on
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SearXNG ${res.status}: ${body.slice(0, 300)}`);
  }
  const html = await res.text();
  const parsed = parseSearxngHtml(html, limit);
  return parsed;
}

module.exports = { search, parseSearxngHtml };
