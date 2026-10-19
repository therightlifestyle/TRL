# TRL API

The optional backend for the TRL website. It is **not required** for the site to work — every browser-side module has a local fallback — but when it is deployed the site upgrades to server-backed behaviour automatically.

## What it adds

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Liveness, version, engine version, lead count |
| `/api/triage` | POST | Runs the enquiry triage engine (the same file the browser uses) |
| `/api/leads` | POST | Creates an enquiry, with automatic classification attached |
| `/api/leads` | GET | Lists enquiries *(requires `ADMIN_TOKEN`)* |
| `/api/leads/:id` | PATCH | Updates stage, note or value *(requires `ADMIN_TOKEN`)* |
| `/api/metrics` | GET | Pipeline metrics *(requires `ADMIN_TOKEN`)* |
| `/api/services` | GET | The service catalogue |
| `/api/insights` | GET | Published insights |
| `/api/knowledge` | GET | The assistant knowledge base |
| `/api/work` | GET | The demonstrations index |
| `/api/config` | GET | Canonical brand, contact and commercial facts |
| `/api/faq` | GET | The published questions and answers |
| `/api/pipeline` | GET | The engagement stages and pipeline metrics |

## Design rules

- **Zero npm dependencies.** Node's standard library only, so there is no install step, no lockfile drift and no supply-chain surface.
- **One engine, two runtimes.** `assets/js/engines/triage.js` is imported unchanged by the browser, the API and the test suite, so the three can never disagree.
- **Honest storage.** Enquiries are written to a single JSON file with atomic writes. Swap `server/src/store.mjs` for a database adapter when the volume justifies it — nothing else needs to change.
- **Safe by default.** Path traversal protection, strict CSP, CORS allow-listing, per-IP rate limiting, input validation and bounded request bodies.

## Run it

```bash
# from the repository root
npm run dev            # http://localhost:8080 — static site + API together

# or explicitly
PORT=8080 node server/src/index.mjs
```

```bash
curl -s localhost:8080/api/health

curl -s -X POST localhost:8080/api/triage \
  -H 'Content-Type: application/json' \
  -d '{"text":"Hi, my name is Ayesha and I need a website quote. Budget PKR 200,000."}'
```

## Connect the website to it

The site looks for a base URL in `window.TRL_CONFIG`. Add this before the module script on each page, or set it in one place:

```html
<script>window.TRL_CONFIG = { apiBase: 'https://trl-api.onrender.com' };</script>
<script type="module" src="assets/js/main.js"></script>
```

Without it, the site stays entirely local and reports **“Local engine”** in the Console status chip. With it, the status chip reports **“API connected”**.

## Deploy

| Platform | How |
|---|---|
| Render | `server/render.yaml` — blueprint, free plan, persistent disk for `DATA_DIR` |
| Railway | `server/railway.json` — Dockerfile build |
| Any Docker host | `docker build -f server/Dockerfile -t trl-api .` then `docker run -p 8080:8080 trl-api` |
| Fly.io / Heroku-ish | `server/Procfile` — `web: node server/src/index.mjs` |

Set `ADMIN_TOKEN` in every environment. Without it, the lead-listing endpoints are open — acceptable for a local trial, not for production.
