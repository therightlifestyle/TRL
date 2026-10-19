# Changelog

All notable changes to the TRL codebase are documented in this file.

## [v3.1.0] — 2026-10-19 · The Motion & Interface Release

A dedicated animation layer, a site-wide command palette, and an API that exposes every engine rather than only triage. Every effect is opt-in, token-driven and disabled under `prefers-reduced-motion`.

### Added

**Design system**
- **Motion and optics tokens** — a duration scale (`--dur-instant` → `--dur-scene`), six named easing curves including a spring and an expo-out house curve, a blur scale, gradient and elevation tokens, focus-ring tokens and four new z-index steps. Both themes are covered, so no effect layer declares a literal value.
- **New layer `assets/css/motion.css`** — the whole effect system in one place: scroll progress, cursor spotlight, 3D tilt, parallax, magnetic buttons, ripple, sheen sweep, six reveal variants, automatic stagger, line-mask and per-character headline reveals, film grain, aurora mesh, shimmer skeletons, animated gradient text, conic edge glow, Ken Burns hero, the palette, the modal, the toast stack and the back-to-top ring.

**Interface**
- **⌘K command palette** (`components/palette.js`) — one input reaching every page, all seven services, the demonstrations, the insights, the FAQ, the knowledge base and a set of actions (theme, WhatsApp, copy email, book the audit). Keyboard-navigable, focus-managed, with live result counts and query timing.
- **Unified search engine** (`engines/search.js`) — pure and deterministic: field-weighted scoring, term coverage, ordered-subsequence fuzzy matching and HTML-escaping highlighting. The browser palette and `GET /api/search` run this one file, so they cannot rank differently.
- **Back-to-top control** with a scroll-progress ring driven by the same `--scroll` variable as the top progress bar.
- **Accessible modal primitive** (`components/modal.js`) — focus trap, Escape, focus restore.
- **Theme system upgraded** — three states (`dark` / `light` / `auto`) with the OS preference followed live, long-press on the toggle to opt into auto, and a `trl:theme` event for anything that needs to react.
- **Toast system upgraded** — per-type icons, manual dismissal, an inline action button, a drain bar and a bounded stack, behind the call signature the site already used.
- **Newsletter signup** in every page footer, posting to `POST /api/newsletter`, with an honest on-device fallback and a warning toast when no API is connected.

**API**
- **Every engine is now reachable** — `POST /api/assistant`, `POST /api/roi`, `POST /api/brief`, `GET /api/blueprint`, `GET /api/brief/questions`, `GET /api/assistant/starters`.
- **Search endpoints** — `GET|POST /api/search` over a corpus cached in memory and rebuilt only when a data file changes on disk.
- **Lead lifecycle completed** — `GET /api/leads/:id`, `DELETE /api/leads/:id`, and stage changes now append to an auditable, capped history instead of overwriting.
- **Newsletter** — `POST /api/newsletter` (idempotent per address) and `GET /api/subscribers`.
- **Self-describing API** — `GET /api` lists every route and the version of every engine; `GET /api/engines` returns the version manifest alone.
- **Conditional requests** — data endpoints answer `304 Not Modified` from a weak ETag, which is most of the bandwidth the API serves.

### Fixed

- **Late-rendered content was invisible.** `initReveals()` scanned the document once at boot, so every card an app module rendered afterwards kept `opacity: 0` — the home page's work section was present in the DOM and never shown. Reveals now track nodes added later through a document-bound `MutationObserver`, in both the animated and reduced-motion paths. A smoke check asserts this cannot regress.
- **The smoke harness hid that bug twice over** — it stubbed `MutationObserver` to a no-op and never exposed it on `globalThis`. It now uses JSDOM's real implementation, so the tests observe actual DOM behaviour.
- **`/api` was unreachable** — the server only treated paths beginning `/api/` as API routes, so the bare index fell through to the static handler and 404'd.
- **Knowledge entries leaked a boolean into the UI** — `starter` is a "show as starter question" flag, not text; the index now uses the entry's phrased question as the subtitle.
- **Stage history was persisted but not returned** — `PATCH /api/leads/:id` replied with the pre-history record; it now returns the updated one.
- **`scrollIntoView` and focus-restore selectors could throw** — the palette guards both, so a missing method or an id-less trigger cannot break the page.

### Changed

- `assets/js/main.js` mounts the progress bar, grain overlay and ⌘K trigger itself, so the HTML stays meaningful with scripts disabled.
- The browser API client (`core/api.js`) exposes the full endpoint surface.
- Verification grew from 42 to 68 unit assertions, plus six new browser-simulation interaction checks.

## [v3.0.0] — 2026-10-19 · The Platform Release

The site moves from a static brochure to a working company platform: a live application surface (the TRL Console), a shared engine layer, an optional API, and an automated quality gate.

### Added

**The TRL Console — `console/index.html`**
- **Enquiry triage engine** — a real rules engine that turns unstructured messages into a structured record: intent with confidence and runner-up, urgency with the phrases that triggered it, extracted order references, budget, quantity and timeline, the gaps still missing, a routing decision with an SLA, and a reply draft for human approval. Records can be copied or downloaded as JSON and pushed into the pipeline.
- **Enquiry pipeline** — a drag-and-drop board across the real engagement stages (Intake → Discovery → Scoped → Audit → Proposal → Active → Handover) with live metrics, local persistence and clearly-labelled sample records.
- **System blueprint** — the five-layer reference architecture (capture, route, automate, document, review) with components, signals, tooling and failure modes, plus the design principles.
- **Automation opportunity model** — converts the visitor's own hours, cost and error rates into annual benefit, effort, payback period and a four-quadrant prioritisation that includes *leave alone*.
- **Scope brief builder** — eight structured questions producing a written brief, a recommended route and an estimated duration.
- **Assistant** — local retrieval over the published knowledge base, with an honest "I do not know" failure mode.

**Architecture**
- **Layered design system** — `assets/css/` split into tokens, base, components, pages and console layers, with a shared token file driving both themes.
- **Application layer** — `assets/js/core/` (dom, store, api, config, data, events, router, format), `components/` (theme, nav, reveal, tabs, accordion, counters, toast, chat, icons) and `apps/` (home, services, work, insights, contact, console).
- **Pure engine layer** — `assets/js/engines/` holds the business logic with no DOM, no network and no timers, so the browser, the API and the tests all run the same implementation.
- **Data layer** — `assets/data/services.json`, `work.json`, `insights.json` and `knowledge.json` now drive the home page, the Console, the assistant and the API.
- **ES module bootstrap** — `assets/js/main.js` dispatches on `data-page` and degrades gracefully when a page-level app fails.

**Platform**
- **TRL API** (`server/`) — a zero-dependency Node service serving the site and an optional API: health, triage, leads, metrics, catalogue, insights and knowledge endpoints, with validation, CORS allow-listing, per-IP rate limiting, a strict CSP and a file-backed store with atomic writes.
- **Deployment targets** — `server/Dockerfile`, `server/render.yaml`, `server/railway.json`, `server/Procfile` and `server/.env.example`.
- **Automated quality gate** — `npm run lint`, `npm run check` (link, asset, metadata and third-party-request audit), `npm test` (42 assertions across every engine, the data layer and the API's safety primitives) and `npm run smoke` (a JSDOM browser simulation that loads every page and drives the real interface), wired into `.github/workflows/ci.yml` with an API smoke test.
- **Data layer completed** — `assets/data/faq.json` (the published questions and answers, rendered on the home page) and `assets/data/config.json` (the canonical brand, contact, audit-pricing and engagement facts), plus new API endpoints for `/api/config`, `/api/faq` and `/api/pipeline`.
- **Architecture documentation** — `ARCHITECTURE.md` covering the layers, data flows, security model and extension points.

**Content & pages**
- **New `insights.html`** — a searchable, filterable insights hub with a detail drawer.
- **New `work.html`** — the demonstrations index with status filters, replacing `portfolio.html`.
- **Rewritten `services.html`** — all seven disciplines with deliverables, tooling, outcomes and explicit "not for" boundaries, plus engagement models and a scroll-spy index.
- **Working enquiry form** on `contact.html` with a live readout showing how the message will be classified, routed and answered before it is sent.
- **Rewritten `how-we-work.html`** with a six-stage timeline, the support model and commercial terms.
- **Rewritten `about.html`** with the five-layer architecture and an honest statement of company size and limits.
- **Updated `privacy.html`** documenting exactly what the browser-side tools store locally, and `terms.html` covering ownership, availability and modelled figures.

**Design**
- Cinematic hero with architectural photography, a live system readout and a glass navigation bar.
- Feature band, capability grid, interactive architecture strip, marquee of the tools we work with, FAQ accordion, insight previews and a photographic call-to-action.
- New photography in `assets/img/` and the self-hosted fonts moved to `assets/fonts/`.

### Changed
- **Design tokens** now live in one file and drive both the dark and light themes, so no component invents a value.
- **Navigation** extended to Home, Services, Work, Insights, Process, Console and About, with an active-state indicator.
- **Footer** updated across every page with the new structure, a system status indicator and direct contact routes.
- **Sitemap** updated for the new pages; `robots.txt` now disallows `/server/`.
- **`package.json`** added with `dev`, `lint`, `check`, `test` and `verify` scripts — no runtime dependencies.

### Removed
- **`style.css` and `main.js`** (root) — replaced by the layered stylesheets and `assets/js/main.js`.
- **`lead-triage.html`** — the prototype now lives in the Console, where it is faster, richer and testable.
- **`portfolio.html`** — replaced by `work.html`.
- **`triage-demo.gif`** — a recorded GIF of a prototype has been replaced by the live engine.

### Kept
- The honesty policy that defined the company: no fabricated clients, testimonials, logos or results; every demonstration and sample deliverable is labelled; ownership transfers completely at handover.
- Zero external network requests, self-hosted fonts, no trackers, no cookies, light/dark themes, `prefers-reduced-motion` support, WCAG AA contrast and full keyboard operability.

---

## [v2.0.0] — 2026-10-19 · Systems Studio Final Release & Optimization

### Added
- **Self-Hosted WOFF2 Fonts:** Packaged and subset variable fonts for `Newsreader` (display serif) and `Manrope` (interface sans) directly in the repository root to guarantee zero external network requests and complete offline readiness.
- **Theme Mode Switcher:** Added an accessible, fluid theme toggle (Light / Dark) with persistent `localStorage` support and no-flicker head initialization script.
- **Interactive Triage Demo Integration:** Shipped and integrated `triage-demo.gif` showcasing the working browser prototype across `index.html`, `portfolio.html`, and `README.md`.
- **Animated Hero Banner:** Designed and integrated `trl-banner.gif` with responsive radar rings, connecting nodes, and brand typography.
- **Full Repository Standards:** Added `.editorconfig`, `.gitattributes`, `.gitignore`, `LICENSE`, `CHANGELOG.md`, and upgraded `DEVELOPMENT.md`.
- **Pages Deployment Flag:** Added `.nojekyll` to prevent GitHub Pages from ignoring font or static files.

### Fixed
- **Navigation Text Bug:** Corrected malformed `<a href="...">` attributes where link labels had been placed inside tags rather than as child text nodes.
- **Asset Resolution:** Resolved broken `assets/` subfolder paths on flat root deployment across all 9 HTML pages.
- **Mobile Menu Accessibility:** Fixed ARIA attributes (`aria-expanded`, `aria-label`, `aria-controls`) and added escape key handling and focus management.
- **Sitemap Crawling:** Uncommented canonical `Sitemap` directive in `robots.txt`.
