# Development & Quality Assurance Guide

This guide covers local development, quality standards, and automated verification checks for the **TRL — The Right Lifestyle** website repository.

---

## Technical Stack & Architecture

- **Format:** Static HTML5, modern CSS3, and Vanilla JavaScript (ES6+).
- **Zero Dependencies:** No Node.js build process, no bundler, no package manager, no server runtime, and no database required.
- **Privacy-First:** Zero third-party trackers, zero cookies, zero external API requests, and zero font CDN calls. All fonts, styles, scripts, and imagery are self-hosted within this repository.
- **Hosting Target:** GitHub Pages (`main` branch, `/` root directory) or any static file host.

---

## Local Development Setup

### 1. Requirements

- Python 3.8+ (for local HTTP preview)
- Git 2.30+
- Any modern web browser (Chromium, Firefox, Safari)

### 2. Preview Locally

Start a local static server from the repository root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

> **Note:** Because all internal paths and references are strictly relative, you can also open any `.html` file directly using `file://` protocols.

---

## Quality Assurance & Verification Script

Run the automated internal link and asset integrity test:

```bash
python3 -c '
import urllib.request, re, http.server, socketserver, threading

PORT = 8089
httpd = socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{PORT}"

html_files = [
    "index.html", "about.html", "services.html", "portfolio.html",
    "how-we-work.html", "contact.html", "lead-triage.html",
    "privacy.html", "terms.html"
]

checked, errors = set(), []
for hf in html_files:
    content = urllib.request.urlopen(f"{base}/{hf}").read().decode("utf-8")
    for ref in re.findall(r"""(?:src|href)=["\x27]([^"\x27#]+)["\x27]""", content):
        if ref.startswith(("http://", "https://", "mailto:", "tel:")): continue
        full = f"{base}/{ref}"
        if full not in checked:
            checked.add(full)
            try:
                if urllib.request.urlopen(full).status != 200:
                    errors.append(f"{hf} -> {ref}")
            except Exception as e:
                errors.append(f"{hf} -> {ref}: {e}")

httpd.shutdown()
print(f"Checked {len(checked)} internal assets. Errors: {len(errors)}")
for err in errors: print("  FAILED:", err)
assert len(errors) == 0, "Broken assets detected!"
'
```

---

## Design System Guidelines — "Systems Studio"

1. **Colors & Tokens:**
   - Foundation: Deep Navy `--n-1000` (`#040B14`), `--n-950` (`#061120`), `--n-900` (`#0A1830`).
   - Light Mode: Luminous Canvas `--n-1000` (`#F8F9FA`), Card Surfaces `--n-950` (`#FFFFFF`).
   - Accents: Restrained Gold `--gold` (`#C9A227` dark / `#9A7314` light) and Technical Blue `--blue` (`#5B9DFF` dark / `#1A62D2` light).
   - Use CSS custom properties exclusively. Never hardcode inline hex values for surfaces or typography.

2. **Typography:**
   - Display: Self-hosted `Newsreader` variable font in WOFF2 format (`--serif`).
   - Interface / Body: Self-hosted `Manrope` variable font in WOFF2 format (`--sans`).
   - Font loading uses `font-display: swap` with preloaded regular cuts in `<head>`.

3. **Motion:**
   - Subtle scroll reveals via `.rv` and `.rv.in`.
   - All animations must respect `@media (prefers-reduced-motion: reduce)` by disabling transitions and rendering in place immediately.

---

## Content Honesty Rules

- **No invented social proof:** Never invent testimonials, logos, ratings, or team members.
- **Label clearly:** All mockups, demos, and sample deliverables must be explicitly labelled `Demonstration` or `Sample deliverable`.
- **Verified pricing only:** The Rapid AI Opportunity Audit is fixed at **PKR 3,000**. Do not publish unapproved discounts or retired packages.
- **Privacy protection:** Never commit personal street addresses, internal client registers, or private communication transcripts to the public git repository.
