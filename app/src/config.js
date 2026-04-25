// src/config.js
// Reads /data/config.json which is written by the StartOS actions.
// The service restarts (or re-reads) whenever config changes.

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = process.env.CONFIG_PATH || '/data/config.json';

const DEFAULTS = {
  vllm: {
    url: '',          // e.g. http://192.168.1.50:8000
    apiKey: '',       // optional (vLLM usually runs without auth on LAN)
    model: ''         // e.g. meta-llama/Llama-3.1-8B-Instruct
  },
  searxng: {
    url: '',           // e.g. http://192.168.1.51:8080
    allowSelfSigned: false  // bypass TLS cert verification — for self-hosted SearXNG with a self-signed cert
  },
  cities: [],         // [{ name: "Evansville, IN", radiusMiles: 30 }, ...]
  categories: [
    'Plays & Musicals',
    'Concerts & Entertainers',
    'Baseball & Sports',
    'Festivals & Fairs',
    'Family & Kids Events',
    'Museums & Exhibits'
  ],
  schedule: {
    // Default: once a week on Sunday at 6am local server time
    cron: '0 6 * * 0'
  }
};

function deepMerge(base, overlay) {
  if (overlay === null || overlay === undefined) return base;
  if (typeof base !== 'object' || Array.isArray(base)) return overlay;
  const out = { ...base };
  for (const k of Object.keys(overlay)) {
    out[k] = deepMerge(base[k], overlay[k]);
  }
  return out;
}

function load() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return { ...DEFAULTS };
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return deepMerge(DEFAULTS, parsed);
  } catch (err) {
    console.error('[config] Failed to read', CONFIG_PATH, err.message);
    return { ...DEFAULTS };
  }
}

function save(cfg) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

module.exports = { load, save, CONFIG_PATH, DEFAULTS };
