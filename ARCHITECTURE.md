# TRL — Architecture

How the TRL platform is put together, and why each decision was made.

---

## 1. Principles

| Principle | Consequence |
|---|---|
| **Static-first** | The site is plain HTML/CSS/JS served as files. No framework, no bundler, no runtime dependency to install. It works on GitHub Pages, on a CDN, or from a folder. |
| **The server is optional** | Every browser module has a local fallback. Deploying the API is an upgrade, never a requirement. |
| **One implementation per rule** | Business logic lives in `assets/js/engines/`. The browser, the API and the tests import the same files. |
| **Explainable, not magical** | Every classification returns the phrase that produced it, the runner-up option, and the gaps it could not resolve. |
| **Honest labelling** | Demonstrations, sample deliverables and modelled figures are labelled as such everywhere they appear. |
| **Privacy by construction** | No third-party assets, no cookies, no analytics, no trackers. Enforced by an automated audit, not by intention. |

---

## 2. Layers

### Presentation — `assets/css/`

Five files, loaded in order, each with one job:

| File | Responsibility |
|---|---|
| `tokens.css` | Every colour, size, radius, easing and type step, for both themes. No component may invent a value. |
| `base.css` | Reset, typography, layout primitives, reveal animations, skip link, print rules. |
| `components.css` | Reusable interface: navigation, buttons, cards, hero, tabs, accordions, forms, tables, toasts, footer. |
| `pages.css` | Page-level compositions: insight grids, drawers, service blocks, blueprint, calculator, timelines. |
| `console.css` | The Console application shell: rail, panels, kanban, chat, KPI rows. |

### Application — `assets/js/`

```
core/       infrastructure with no opinion about the business
  dom.js      element creation, delegation, clipboard, downloads
  store.js    observable state with localStorage persistence
  api.js      fetch wrapper, timeouts, status tracking, fallbacks
  config.js   runtime configuration (window.TRL_CONFIG)
  data.js     JSON data loading with caching
  events.js   tiny pub/sub bus
  router.js   hash router used by the Console
  format.js   numbers, PKR, dates, relative time

engines/    pure business logic — no DOM, no network, no timers
  triage.js     enquiry classification, routing, drafting
  roi.js        automation opportunity model
  blueprint.js  reference system architecture
  assistant.js  retrieval over the knowledge base
  brief.js      scope brief builder
  pipeline.js   engagement stages, transitions, metrics

components/ reusable UI behaviour
  theme · nav · reveal · tabs · accordion · counters · toast · chat · icons

apps/       page-level composition
  home · services · work · insights · contact · console
```

`main.js` boots the shared components, reads `document.body.dataset.page` and dynamically imports the matching app. A page that fails to initialise degrades to its static content and shows a toast — it never breaks the document.

### Data — `assets/data/`

JSON rather than hard-coded markup, so content changes do not require touching the UI:

- `services.json` — the seven disciplines, their deliverables, tools, outcomes and boundaries
- `work.json` — demonstrations and sample deliverables, with their honest status label
- `insights.json` — published articles
- `knowledge.json` — the assistant's retrieval corpus
- `faq.json` — the published questions and answers rendered on the home page
- `config.json` — the canonical brand, contact, audit-pricing and engagement facts

The pipeline stages live in `engines/pipeline.js` rather than in a data file, because the engine must stay pure and synchronous. The API serves the same definition at `/api/pipeline`, so there is exactly one source of truth for the stages.

### API — `server/`

```
index.mjs    boot, routing, rate limiting, graceful shutdown
http.mjs     static file serving, MIME types, caching, ETags, body parsing
routes.mjs   the endpoints, importing the shared engines
store.mjs    JSON file store with atomic writes (swappable for a database)
security.mjs CSP, CORS allow-listing, rate limiter
validate.mjs input validation and normalisation
logger.mjs   structured logging
```

---

## 3. The engines

### Triage engine (`engines/triage.js`)

Pipeline: **parse → extract → classify → route → draft → explain**.

- **Extraction** — sender name, business, email, phone, order reference, budget (with currency and scale), quantity, timeline. Each extractor works sentence-by-sentence so a name is never read out of a later clause.
- **Classification** — weighted phrase matching across nine intents. Every intent returns a score, a confidence and its runner-up.
- **Urgency** — weighted markers plus escalation signals, each with the phrase that triggered it.
- **Routing** — a desk, a priority and an SLA, derived from intent and urgency.
- **Drafting** — a reply composed from the extracted fields, including the questions that must be asked before work can start.
- **Explanation** — `signals[]` lists every field and the pattern that produced it, so a human can check the machine's reasoning in one glance.

It is deterministic: the same message always produces the same record, which is what makes it testable and auditable.

### Opportunity model (`engines/roi.js`)

Turns the visitor's own numbers into a prioritised shortlist:

```
automatable share = repetitiveness × 0.88 − (complexity − 1) × 0.09
annual benefit     = recovered hours × cost + error saving
payback months     = build cost ÷ monthly benefit
quadrant           = impact × effort  → automate now | plan and phase | quick win | leave alone
```

The fourth quadrant is the point: a model that never says "leave this alone" is a sales tool, not a tool.

### Assistant (`engines/assistant.js`)

Weighted term retrieval over `knowledge.json`, with stop-word removal, synonym-free keyword matching and a confidence threshold. When the best match is below the threshold it refuses to answer and offers better questions — the honest failure mode.

---

## 4. Data flow

**Browser → local engine**

```
user input → engines/triage.js → render
```

No network. No storage beyond the browser's own localStorage.

**Browser → API (when configured)**

```
user input → api.js → POST /api/triage
                         │
                         ├─ validate → engines/triage.js (same file)
                         └─ respond
```

If the call fails or times out, `api.js` falls back to the local engine and the UI reports "Local engine" rather than an error.

**Form → lead**

```
contact form → api.js → POST /api/leads
                             │
                             ├─ validate
                             ├─ engines/triage.js  (classification attached to the record)
                             └─ store.createLead() → server/data/leads.json
```

Without an API, the enquiry is queued in localStorage and a pre-filled WhatsApp message is offered instead — the visitor is never left with a dead button.

---

## 5. Security and privacy

| Control | Where |
|---|---|
| No third-party assets | Enforced by `scripts/check-site.mjs` in CI |
| Strict CSP | `server/src/security.mjs` |
| CORS allow-list | `server/src/security.mjs`, configured by `CORS_ORIGINS` |
| Per-IP rate limiting | `server/src/security.mjs` (120 req/min default) |
| Path traversal protection | `server/src/http.mjs` (`safeResolve`) |
| Input validation and bounded bodies | `server/src/validate.mjs`, `server/src/http.mjs` |
| Admin endpoints protected | `ADMIN_TOKEN` — required for `/api/leads` and `/api/metrics` |
| Enquiry records excluded from git | `.gitignore` → `server/data/*.json` |

---

## 6. Deployment shapes

**Shape A — static only (default)**
GitHub Pages or any static host serves the repository as-is. The Console runs locally in the browser. No server, no cost, no attack surface beyond a CDN.

**Shape B — static + API**
The site is hosted statically; the API runs on Render, Railway, Fly or any Docker host. `window.TRL_CONFIG.apiBase` points the browser at it. Enquiries persist server-side.

**Shape C — one process**
`npm run dev` (or the Docker image) serves the site and the API from the same Node process on one port — simplest to operate, and how the CI smoke test runs.

---

## 7. Extension points

| To add… | Do this |
|---|---|
| A service | Add an entry to `assets/data/services.json`, a section to `services.html`, and a knowledge entry so the assistant knows about it. |
| An insight | Append to `assets/data/insights.json`. The hub, the home page preview and the sitemap pick it up. |
| A triage intent | Extend `INTENTS` in `engines/triage.js` with phrases, a queue and an SLA — then add the opener and next step to `buildDraft`. |
| A Console module | Add a view function in `apps/console.js`, register it in the `views` map and add a button to `console/index.html`. |
| A database | Replace `server/src/store.mjs` behind the same interface (`listLeads`, `getLead`, `createLead`, `updateLead`, `metrics`). Nothing else changes. |
| An API endpoint | Add a key to `createRoutes()` in `server/src/routes.mjs` — the router matches `METHOD /path` and `METHOD /path/:param` automatically. |
