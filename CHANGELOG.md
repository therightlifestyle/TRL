# Changelog

All notable changes to the TRL codebase are documented in this file.

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

### Changed
- **Performance:** Optimized all assets for sub-50ms paint times and zero external HTTP requests.
- **Contrast & Typography:** Verified WCAG AA contrast compliance across both dark and light color systems.
- **Content Honesty:** Enforced non-negotiable boundaries (no fabricated testimonials, honest sample labeling, strict pricing transparency at PKR 3,000 for the Rapid AI Opportunity Audit).

---

## [v1.0.0] — 2026-10-18 · Initial Systems Studio Architecture
- Replaced legacy site layout with "Systems Studio" deep navy and gold aesthetic.
- Implemented 9 core static pages: Home, Services, Portfolio, How We Work, About, Contact, Lead Triage, Privacy, and Terms.
- Implemented in-browser interactive lead triage prototype.
- Set up Schema.org `ProfessionalService` JSON-LD structured data.
