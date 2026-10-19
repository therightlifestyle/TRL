<p align="center">
  <img src="trl-banner.gif" alt="TRL — The Right Lifestyle: The right system changes everything." width="100%">
</p>

<p align="center">
  <strong>Founder-led business systems, AI automation &amp; digital services · Islamabad, Pakistan</strong>
</p>

<p align="center">
  <a href="https://therightlifestyle.github.io/TRL/">🌐 Live Website</a>
  &nbsp;·&nbsp;
  <a href="https://therightlifestyle.github.io/TRL/services.html">Services</a>
  &nbsp;·&nbsp;
  <a href="https://therightlifestyle.github.io/TRL/work.html">Demonstrations</a>
  &nbsp;·&nbsp;
  <a href="https://therightlifestyle.github.io/TRL/insights.html">Insights</a>
  &nbsp;·&nbsp;
  <a href="https://therightlifestyle.github.io/TRL/console/index.html">⚙️ TRL Console</a>
  &nbsp;·&nbsp;
  <a href="https://wa.me/923190091457">💬 WhatsApp</a>
</p>

---

## What this repository is

A **static-first company platform**, not a brochure site. Two halves that share one source of truth:

1. **The website** — a fast, self-hosted, tracker-free marketing and content site. No build step, no framework, no external requests.
2. **The TRL Console** — a working application surface running in the browser: an enquiry triage engine, an enquiry pipeline, the reference system architecture, an automation opportunity model, a scope brief builder and an assistant that answers from our own published content.
3. **The TRL API** *(optional)* — a zero-dependency Node service that serves the same files, stores enquiries and runs the same engines server-side.

The site works with **no backend at all**. Every module has a local fallback, and the interface says honestly which mode is running.

---

## The system, end to end

```
Browser                          Node API (optional)            Data layer
────────                          ──────────────────            ──────────
index / services / work           GET  /api/health              assets/data/*.json
insights / about / contact        POST /api/triage              ├─ services.json
console/index.html                POST /api/leads               ├─ work.json
⌘K command palette                GET  /api/search              ├─ insights.json
      │                           POST /api/assistant           ├─ faq.json
      │  shared engines ──────────►POST /api/roi                ├─ knowledge.json
      ├─ engines/triage.js        POST /api/brief               └─ config.json
      ├─ engines/roi.js           GET  /api/blueprint
      ├─ engines/blueprint.js     POST /api/newsletter
      ├─ engines/assistant.js     DEL  /api/leads/:id
      ├─ engines/brief.js                 │
      ├─ engines/pipeline.js              ▼
      └─ engines/search.js  ◄───── server/data/leads.json
```

`assets/js/engines/*.js` are **pure modules** — no DOM, no network, no timers. The browser imports them, the API imports the *same files*, and the test suite asserts on them. The triage engine cannot behave one way on the site and another way in production, because there is only one implementation. The same holds for search: the ⌘K palette and `GET /api/search` both run `engines/search.js`, so they cannot rank differently.

---

## Motion and the command palette

The interface has a dedicated effect layer (`assets/css/motion.css` + `components/motion.js`) that is opt-in, token-driven and switched off entirely under `prefers-reduced-motion`.

- **⌘K / Ctrl-K** opens a command palette that searches every page, all seven services, the demonstrations, the insights, the FAQ and the knowledge base, and runs actions (theme, WhatsApp, copy email, book the audit). `/` works too.
- **Pointer and scroll effects** — cursor spotlight, 3D tilt, parallax, magnetic buttons, ripple, scroll progress, back-to-top ring. JavaScript writes CSS custom properties; CSS does the drawing, so the listeners stay on `document` regardless of how many elements opt in.
- **Reveals** — six variants plus automatic stagger, line-mask and per-character headline reveals, all disabled for reduced motion.
- **Three-state theme** — dark, light, or follow the operating system. Long-press the toggle for auto.

---

## The TRL Console

Open `console/index.html` (or `/TRL/console/` on the live site) and you get six working modules:

| Module | What it does |
|---|---|
| **Triage engine** | Turns an unstructured enquiry into a structured record: intent with confidence and runner-up, urgency with the phrases that triggered it, extracted order references, budget and timeline, the gaps still missing, a routing decision with an SLA, and a reply draft for a human to approve. Copy or download the record as JSON. |
| **Enquiry pipeline** | A drag-and-drop board across the real engagement stages (Intake → Discovery → Scoped → Audit → Proposal → Active → Handover), with live metrics and local persistence. Seeded with clearly-labelled sample records. |
| **System blueprint** | The five-layer reference architecture — capture, route, automate, document, review — with what we implement, the signals we measure, the tools we reach for and the failure modes we design against. |
| **Opportunity model** | Enter your real hours, cost and error rates; get annual hours recovered, annual benefit, build effort, payback period and a four-quadrant prioritisation — including the quadrant labelled *leave alone*. |
| **Scope brief** | Eight structured questions that produce a written brief, a recommended route and an estimated duration you can send to any firm, including us. |
| **Assistant** | Retrieval over the published knowledge base. It answers about services, pricing, timelines, ownership and boundaries, and says plainly when it does not know. |

Nothing typed into the Console is transmitted or stored on a server. Records live in your own browser's local storage.

---

## What TRL builds

| Discipline | What we deliver |
|---|---|
| **01 · AI & Automation** | Enquiry intake with automatic classification, routing and SLA clocks; AI-assisted drafting with human approval; workflow automation; scheduled background jobs; runbooks and monitoring. |
| **02 · Websites & Digital Products** | Company websites, landing pages, client portals and scoped digital products — fast, self-hosted, no tracking, fully handed over. |
| **03 · Research & Market Intelligence** | Competitor audits, market mapping, tooling evaluations and feasibility briefs with the raw files included. |
| **04 · Business Strategy & Documentation** | As-is process maps, standard operating procedures, decision logs, ownership matrices and handover packs. |
| **05 · Marketing, Branding & Content** | Message frameworks, brand assets, publishing workflows, landing pages and follow-up sequences. |
| **06 · Software & Integrations** | API connectors, webhooks, spreadsheet automations and one-off scripts — with error handling, logging and rollback. |
| **07 · Consultation & Direction** | Structured diagnostics, written recommendations with options and trade-offs, vendor shortlists, fractional systems leadership. |

---

## Rapid AI Opportunity Audit

The introductory fixed-scope engagement:

- **Price:** PKR 3,000, published, no tiers
- **Turnaround:** within 72 hours of confirmed payment
- **Deliverables:** an operational friction map, a prioritised automation matrix, an implementation roadmap with tooling and estimated ROI, a 30-minute walkthrough, and a 15-minute question call
- **Seven-day adjustment window** for anything factually wrong about your business
- **No obligation to proceed**, and the audit fee is not credited against a later build

---

## How we work — four stages

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 01 CONVERSATION │ ──> │  02 DEFINITION  │ ──> │    03 BUILD     │ ──> │   04 HANDOVER   │
│ Honest problem  │     │ Written scope & │     │ Staged build in │     │ Complete docs,  │
│ exploration     │     │ clear deliverables│   │ visible phases  │     │ assets & control│
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

1. **Conversation** — an honest discussion about the friction, not a pitch.
2. **Definition** — scope, deliverables, timeline and success criteria in writing before any build.
3. **Build** — staged execution with visible demos, no black-box surprises.
4. **Handover** — deliverable, documentation, accounts, credentials and a walkthrough. You keep everything.

---

## Honest by default — non-negotiable boundaries

- **No fabricated credibility.** No invented testimonials, fictitious clients, fake logos or inflated results.
- **Labelled honestly.** Prototypes and mockups are marked `Working prototype`, `Sample deliverable` or `Live in this site` — never as client work.
- **Modelled figures are labelled as models.** The opportunity model states plainly that its outputs are estimates from the visitor's own numbers, not measured client results.
- **Complete client ownership.** Source, accounts, credentials and documentation transfer at handover. No lock-in.
- **Security & privacy.** No passwords in chats, no unsolicited bulk messages, no third-party trackers on this site.
- **Pragmatic advice.** If a free tool solves the problem, we say so before you pay us.

---

## Repository architecture

```
TRL/
├── index.html                    # Homepage: hero, capabilities, architecture, work, audit, insights, FAQ
├── services.html                 # Seven disciplines, engagement models, the audit, boundaries
├── work.html                     # Demonstrations & sample deliverables (filterable, with detail drawer)
├── insights.html                 # Searchable, filterable insights hub
├── how-we-work.html              # Six-stage engagement lifecycle, support model, commercial terms
├── about.html                    # Purpose, founder, scoping principles, commitments
├── contact.html                  # Working enquiry form, live routing readout, WhatsApp & email routes
├── privacy.html / terms.html     # Privacy notice and terms of engagement
├── console/
│   └── index.html                # The TRL Console application shell
├── assets/
│   ├── css/                      # Layered design system
│   │   ├── tokens.css            #   1 · Design tokens, themes, type scale
│   │   ├── base.css              #   2 · Reset, typography, layout primitives
│   │   ├── components.css        #   3 · Reusable components
│   │   ├── pages.css             #   4 · Page compositions
│   │   └── console.css           #   5 · Console application
│   ├── js/
│   │   ├── main.js               # Site bootstrap (page dispatch)
│   │   ├── core/                 # dom · store · api · config · data · events · router · format
│   │   ├── engines/              # Pure business logic (shared with the API and tests)
│   │   ├── components/           # theme · nav · reveal · tabs · accordion · counters · chat · toast · icons
│   │   └── apps/                 # home · work · insights · services · contact · console
│   ├── data/                     # JSON data layer (services, work, insights, knowledge, faq, config)
│   ├── fonts/                    # Self-hosted Newsreader + Manrope woff2
│   └── img/                      # Photography and brand imagery
├── server/                       # Optional zero-dependency Node API
│   ├── src/                      # index · http · routes · store · security · validate · logger
│   ├── Dockerfile, render.yaml, railway.json, Procfile, .env.example, README.md
├── scripts/                      # check-site.mjs (integrity audit) · lint-js.mjs (syntax) · smoke-dom.mjs (browser simulation)
├── tests/                        # node:test suites for every engine, the data layer, the API and the site audit
├── .github/workflows/ci.yml      # Lint → site audit → unit tests → API smoke test
├── package.json                  # Scripts only — no runtime dependencies
└── sitemap.xml · robots.txt · favicon.svg · og-image.png
```

---

## Run it locally

No install step — the server uses only the Node standard library.

```bash
git clone https://github.com/therightlifestyle/TRL.git
cd TRL
npm run dev          # http://localhost:8080 — static site + API together
```

```bash
npm run lint         # syntax-check every JS module
npm run check        # link, asset and third-party-request audit
npm test             # engine, data-layer and site test suites
npm run verify       # all three
```

Any static server works for the front end alone (`python3 -m http.server 8000`). A server is required to preview the ES modules — `file://` will not load them.

---

## Connecting a deployed API

```html
<script>window.TRL_CONFIG = { apiBase: 'https://your-api-host' };</script>
<script type="module" src="assets/js/main.js"></script>
```

With it, the Console and the contact form call the API and the status chip reads **API connected**. Without it, everything runs locally and the chip reads **Local engine**. See `server/README.md` for deployment (Render, Railway, Docker, or any Node host).

---

## Quality assurance

| Check | Status | How |
|---|---|---|
| Zero external requests | ✅ PASS | `npm run check` — no third-party asset, font or script references |
| Link & asset integrity | ✅ PASS | `npm run check` — every local reference resolves |
| Page metadata | ✅ PASS | Title, description, `lang` and a single `h1` on every page |
| JavaScript syntax | ✅ PASS | `npm run lint` — 55 modules parsed by Node's own parser |
| Engine unit tests | ✅ PASS | `npm test` — 68 assertions across triage, ROI, assistant, brief, pipeline, blueprint, search, the data layer, the store and the API's safety primitives |
| Browser simulation | ✅ PASS | `npm run smoke` — every page loaded in JSDOM, every module executed, 13 interactions driven (palette, theme, newsletter, reveals, triage, pipeline, ROI, forms) |
| API smoke test | ✅ PASS | CI boots the server and exercises `/api/health` and `/api/triage` |
| Responsive & accessible | ✅ | Fluid from 320px, keyboard-operable tabs/accordions/drawers, `prefers-reduced-motion` honoured, AA contrast in both themes |
| Privacy | ✅ | No cookies, no analytics, no trackers, no CDN fonts — enforced by the site audit |

---

## Connect with TRL

- **Website:** [therightlifestyle.github.io/TRL](https://therightlifestyle.github.io/TRL/)
- **WhatsApp:** [+92 319 0091457](https://wa.me/923190091457)
- **Email:** [officialtrlservice@gmail.com](mailto:officialtrlservice@gmail.com)
- **Hours:** Monday – Saturday, 10:30 to 18:30 PKT
- **Location:** Islamabad, Pakistan · serving clients online internationally

<br>
<p align="center">
  <strong>The right system changes everything. 🤝</strong><br>
  <sub>© 2026 Rashid Muhammad · TRL — The Right Lifestyle. All rights reserved.</sub>
</p>
