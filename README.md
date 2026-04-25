# Local Outings for StartOS

A kid-friendly calendar of local events — plays, concerts, baseball games,
festivals, museums, family events — for the cities you care about, powered
entirely by your own LAN infrastructure.

Searches the web through your self-hosted **SearXNG** and uses your local
**vLLM** server to extract clean, dated event listings. No third-party APIs,
no accounts, no tracking.

## How it works

```
   ┌──────────────────────────────────────────────────────────┐
   │  Every Sunday 06:00 (or "Refresh Now" action)            │
   │                                                          │
   │   for each (city × category):                            │
   │     1. Query your SearXNG  →  top 10 results             │
   │     2. Feed results to your vLLM with a strict prompt    │
   │     3. Parse JSON array of events back                   │
   │     4. Upsert into SQLite (deduped by stable hash)       │
   │                                                          │
   │  →  Events render on a friendly month / week calendar    │
   │     with city + category filter chips at the top         │
   └──────────────────────────────────────────────────────────┘
```

## First-time setup (via the StartOS UI)

After install, the service creates critical and high-priority tasks that
walk you through setup. In order:

1. **Configure vLLM + SearXNG** — paste the URLs of your LAN vLLM server
   (OpenAI-compatible) and your SearXNG instance (with JSON format enabled).
2. **Manage Cities** — add the cities to search. Include state/region so the
   results are accurate: `"Evansville, IN"` not just `"Evansville"`.
3. **Manage Categories** (optional) — the defaults are fine for most people.
4. **Set Refresh Schedule** (optional) — defaults to Sunday 06:00 local.
5. **Refresh Now** — populate the calendar immediately.
6. **View Status** — peek at current configuration.

Then open the **Web UI** and browse the calendar. Use the filter chips at
the top to narrow by city or category, and toggle Month/Week in the header.

## SearXNG requirements

None! Outings scrapes SearXNG's standard HTML output, which works on every
SearXNG install out of the box — including the StartOS SearXNG package,
which does not expose JSON format settings. If your SearXNG uses a
self-signed TLS cert (e.g. it's the StartOS SearXNG package on another
StartOS server), turn on the **"Allow self-signed TLS certs (SearXNG only)"**
toggle in the **Configure vLLM + SearXNG** action.

## vLLM requirements

Any OpenAI-compatible chat-completions endpoint works. Run with something
like:

```bash
vllm serve meta-llama/Llama-3.1-8B-Instruct \
  --host 0.0.0.0 \
  --port 8000
```

Then in the StartOS action, set the Base URL to `http://<lan-ip>:8000` and
the Model to `meta-llama/Llama-3.1-8B-Instruct`. An 8B instruction-tuned
model is plenty for this task.

## Building

### On GitHub (recommended)

Push the repo to GitHub and this builds automatically. See **[GITHUB.md](./GITHUB.md)** for the one-time setup (adding your `DEV_KEY` secret) and how to cut a release with `git tag v1.0.0 && git push --tags`. The built `.s9pk` files are attached to the GitHub Release.

### Locally

```bash
npm install
make                          # builds local-outings.s9pk for all arches
make arch/x86_64              # or just one arch
make install                  # sideload to the server in ~/.startos/config.yaml
```

## Project layout

```
.
├── Dockerfile               # builds the Node.js app container
├── Makefile / s9pk.mk       # start-cli s9pk pack
├── icon.svg
├── LICENSE
├── app/                     # the actual service (Node + SQLite + Express)
│   ├── src/
│   │   ├── server.js        # HTTP API + static UI + weekly cron
│   │   ├── refresh.js       # SearXNG → vLLM → upsert pipeline
│   │   ├── searxng.js
│   │   ├── vllm.js
│   │   ├── db.js            # better-sqlite3 store
│   │   └── config.js        # reads /data/config.json
│   └── public/              # the calendar UI (HTML + CSS + vanilla JS)
│       ├── index.html
│       ├── style.css
│       └── app.js
└── startos/                 # StartOS SDK package wrapper
    ├── manifest/
    ├── actions/             # setEndpoints, manageCities, manageCategories,
    │                        #   setSchedule, refreshNow, viewStatus
    ├── fileModels/store.json.ts
    ├── init/
    ├── versions/
    ├── i18n/
    ├── interfaces.ts
    ├── backups.ts
    ├── dependencies.ts
    ├── main.ts              # bridges store.json → /data/config.json
    ├── sdk.ts
    ├── utils.ts
    └── index.ts
```

## Notes on privacy & safety

- Everything runs on your LAN. No data leaves your network except the
  outbound SearXNG queries that SearXNG itself makes to upstream engines.
- The LLM never sees your personal data — only public search snippets.
- The extracted event JSON is validated before being stored. Events without
  a concrete date, or dated more than 120 days out, are dropped.

## License

MIT
