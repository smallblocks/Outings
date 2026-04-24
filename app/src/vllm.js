// src/vllm.js
// vLLM exposes an OpenAI-compatible /v1/chat/completions endpoint.
const fetch = require('node-fetch');

async function chat(vllmCfg, messages, { temperature = 0.2, maxTokens = 2048, responseFormat } = {}) {
  if (!vllmCfg?.url) throw new Error('vLLM URL not configured');
  if (!vllmCfg?.model) throw new Error('vLLM model not configured');

  const url = new URL('/v1/chat/completions', vllmCfg.url);
  const headers = { 'Content-Type': 'application/json' };
  if (vllmCfg.apiKey) headers['Authorization'] = `Bearer ${vllmCfg.apiKey}`;

  const body = {
    model: vllmCfg.model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (responseFormat) body.response_format = responseFormat;

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    timeout: 120000,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`vLLM ${res.status}: ${txt.slice(0, 500)}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}

module.exports = { chat };
