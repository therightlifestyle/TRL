# Development & Quality Assurance Guide

How to work on the TRL platform, and how the quality gates run.

---

## Stack

- **Front end:** HTML5, modern CSS (custom properties, layers, container-aware layout), vanilla JavaScript as ES modules.
- **Back end (optional):** Node.js standard library only — `node:http`, `node:fs`, `node:path`. No npm dependencies anywhere in the runtime.
- **Data:** JSON files in `assets/data/`, one JSON store in `server/data/`.
- **Hosting:** GitHub Pages (static only) or any Node host (static + API).

There is no bundler, no transpiler, no framework and no lockfile to drift. What is in the repository is what runs.

---

## Prerequisites

- Node.js 20 or newer (22 recommended) — only for the API, the tests and the audit scripts
- Python 3.8+ or any static server — optional, for previewing the front end alone
- Git 2.30+
- A modern browser (Chromium, Firefox, Safari)

Nothing needs to be installed: `npm install` is not required and there are no dependencies to fetch.

---

## Local development

```bash
git clone https://github.com/therightlifestyle/TRL.git
cd TRL
npm run dev
```

Open `http://localhost:8080`. The same process serves the site and the API.

| Command | What it does |
|---|---|
| `npm run dev` | Site + API on port 8080 (`PORT=8081 npm run dev` to change) |
| `npm run lint` | Syntax-checks every `.js`/`.mjs` file with Node's own parser |
| `npm run check` | Site integrity audit: links, assets, page metadata, third-party requests |
| `npm test` | Unit tests for every engine plus the site audit |
| `npm run smoke` | Browser simulation — loads every page in JSDOM and drives the real UI (install dev tools once with `npm install`) |
| `npm run verify` | lint → check → test, the same sequence CI runs |

> A server is required for preview. The front end uses ES modules, which browsers refuse to load over `file://`.

---

## The site integrity audit

`scripts/check-site.mjs` is the automated guard on the site's core promises.

```bash
npm run check
```

It verifies that:

1. every local `href`/`src` in every page resolves to a real file;
2. every `url()` in every stylesheet resolves to a real file;
3. every page has a `<title>`, a meta description, a `lang` attribute and an `<h1>`;
4. no page loads a script, style, font or image from a third-party origin;
5. every relative `import` in every module resolves.

The same audit runs inside the test suite (`tests/pipeline.test.mjs`), so a broken link fails `npm test` as well as CI.

---

## Test suite

```bash
npm test
```

| File | Covers |
|---|---|
| `tests/triage.test.mjs` | Name, business, budget and reference extraction; intent classification; urgency and escalation; routing; drafts; determinism; empty input |
| `tests/roi.test.mjs` | Automatable share; ranking; internal consistency of totals; the honesty disclaimer; hostile input |
| `tests/assistant.test.mjs` | Tokenisation; retrieval for pricing and ownership; refusing to guess; the scope brief builder |
| `tests/pipeline.test.mjs` | Stage order and transitions; sample-data labelling; metrics; blueprint completeness; the site audit |
| `tests/data.test.mjs` | The data layer and the honesty policy: seven disciplines with boundaries, every demonstration labelled, insights publishable, the knowledge base searchable, the commercial facts consistent across files |

The engines are pure functions, so the tests need no browser, no DOM shim and no network.

---

## The browser simulation

`scripts/smoke-dom.mjs` loads every page in a JSDOM window, runs the real ES modules against the real DOM, fails on any console error, and then drives the interface: it renders the capability grid, filters the work index, searches the insights hub, runs the triage engine in the Console, checks the pipeline board, computes the opportunity model and triggers the live routing readout on the contact form.

```bash
npm install --no-save --no-audit --no-fund jsdom
npm run smoke
```

JSDOM is intentionally **not** a project dependency — the runtime and the committed `package.json` stay dependency-free. CI installs it for the duration of one step.

---

## Coding standards

**JavaScript**

- ES modules only. One responsibility per file, named for what it does (`engines/triage.js`, not `utils.js`).
- No dependencies. If something needs a library, write the thirty lines instead.
- Engines must stay pure: no `document`, no `window`, no `fetch`, no timers. That is what lets the API and the tests reuse them.
- JSDoc on every exported function, with `@param` / `@returns` where the contract is not obvious.
- Comments explain *why*, not *what*.

**CSS**

- Every value comes from a token. No raw hex codes or pixel sizes in component layers.
- Dark theme is the default; light theme overrides tokens in `tokens.css` only.
- One component per block, named `.block__element--modifier`. BEM-ish, not enforced by tooling.
- Respect `prefers-reduced-motion` — the global reset already neutralises transitions and animations.

**HTML**

- Semantic elements first: `header`, `nav`, `main`, `section`, `article`, `footer`.
- One `<h1>` per page, in document order. Headings never skip a level.
- Landmarks, `aria-current`, `aria-expanded` and `aria-controls` where they apply.
- Visible focus is never removed — the `:focus-visible` outline in `base.css` is the standard.
- Every image has meaningful `alt` text, or `alt=""` if it is purely decorative.

**Content**

- Never fabricate a client, a testimonial, a metric or a result.
- Label prototypes `Working prototype`, sample documents `Sample deliverable`, and running site features `Live in this site`.
- Any figure produced by a model states that it is modelled from the visitor's own numbers.

---

## Adding content

| To publish… | Edit |
|---|---|
| A service | `assets/data/services.json` + the matching section in `services.html` + a knowledge entry |
| An insight | `assets/data/insights.json` |
| A demonstration | `assets/data/work.json` |
| An assistant answer | `assets/data/knowledge.json` (add `keywords` — they drive retrieval) |

The home page, the Console, the assistant and the API all read from those files, so one edit propagates everywhere.

---

## Adding a Console module

1. Write the view function in `assets/js/apps/console.js` returning an HTML string.
2. Register it in the `views` map.
3. Add a button to `console/index.html` with `data-view="your-module"`.
4. Wire any interactivity in a `wireYourModule()` function called from `mountView()`.

The hash router handles navigation, document titles and the active state.

---

## Adding an API endpoint

```js
// server/src/routes.mjs
'POST /api/example': async (req, res) => {
  sendJson(res, 200, { ok: true });
}
```

`GET /api/example/:id` is matched automatically. Validation goes in `server/src/validate.mjs`; anything that reaches the filesystem goes through `safeResolve` in `server/src/http.mjs`.

---

## Accessibility checklist

- [ ] Keyboard-only pass: every control reachable, no traps, Escape closes overlays
- [ ] Visible focus ring on every interactive element
- [ ] Contrast meets AA in both themes
- [ ] `prefers-reduced-motion` honoured
- [ ] `aria-live` regions announce async results (the form status, the console readout)
- [ ] Images have `alt` text; decorative images have `alt=""`
- [ ] No horizontal overflow between 320px and 1440px

---

## Performance checklist

- [ ] No request leaves the domain (verify with `npm run check`)
- [ ] Fonts are self-hosted `.woff2` with `font-display: swap`
- [ ] Images are sized in markup (`width`/`height`) to avoid layout shift
- [ ] No render-blocking third-party code
- [ ] JavaScript modules are loaded with `type="module"` (deferred by default)
