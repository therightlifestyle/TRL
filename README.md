# TRL — The Right Lifestyle

Public company portfolio for **TRL — The Right Lifestyle**, a founder-led service company
based in Islamabad, Pakistan.

This is a **static site**. No build step, no dependencies, no backend, no tracking,
no analytics, no cookies, and no third-party scripts.

---

## What is in this repository

| File | Purpose |
|---|---|
| `index.html` | Home — positioning, capabilities, demonstrations, process, founder, contact |
| `about.html` | Company purpose, how we scope work, commitments, founder |
| `services.html` | The seven service categories + the Rapid AI Opportunity Audit |
| `portfolio.html` | Demonstrations and sample deliverables, clearly labelled |
| `how-we-work.html` | Six-stage engagement process, commercial terms, boundaries |
| `contact.html` | Two WhatsApp enquiry paths, email, response window |
| `demo/lead-triage.html` | Working, in-browser demonstration prototype |
| `privacy.html` | Privacy notice (starter — needs local legal review) |
| `terms.html` | Terms of engagement (starter — needs local legal review) |
| `assets/css/style.css` | Hand-written design system |
| `assets/js/main.js` | Minimal progressive enhancement (menu, year, reveal) |
| `assets/img/` | Favicon (SVG) and social share image (PNG) |

---

## Design system

- **Foundation:** dark navy (`#050F1D` → `#17375F`)
- **Accents:** restrained gold (`#C9A227`) and blue (`#4C8DF6`)
- **Type:** system UI font stack — no external font requests
- **Layout:** mobile-first, single breakpoint set at 1000 / 820 / 520 px
- **Motion:** subtle and disabled entirely under `prefers-reduced-motion`

No template, no page builder, no CSS framework.

---

## Run it locally

Any static server works. From the repository root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Opening the files directly (`file://`) also works, because every asset path is relative.

---

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the step-by-step GitHub Pages guide.

Two things to get right:

1. **All internal links and asset paths are relative** (`assets/css/style.css`, not
   `/assets/css/style.css`). This is what lets the site work unchanged at
   `https://<user>.github.io/TRL/` *and* at a custom domain root.
2. `.nojekyll` is included so GitHub Pages serves the files as-is.

---

## Before going live — required checks

| Check | Status |
|---|---|
| Founder public name confirmed (`Rashid Muhammad`) | ✅ Confirmed by owner |
| Public location line confirmed (`Islamabad, Pakistan`) | ✅ Confirmed by owner |
| Founder title (`Founder` vs `Founder & CEO`) | ⚠️ **Unconfirmed** — currently `Founder` |
| Founder portrait | ⚠️ **None used** — none supplied or approved |
| WhatsApp number in two CTA links | ⚠️ **Not end-to-end tested** — owner must tap both |
| Email address | ⚠️ **Not tested** |
| Founding-rate promotion | ⚠️ **Deliberately omitted** — see below |
| Legal pages | ⚠️ **Starter only** — local legal review recommended |

### The founding rate is intentionally not published

The build specification allows publishing a PKR 1,500 founding rate only after five
verification checks pass (authorisation, eligibility clarity, remaining paid-audit count,
delivery capacity, and correct deadline/payment terms).

The approved standard price of **PKR 3,000** is published. The founding-rate snippet sits
commented in `services.html` under `FOUNDING-OFFER-TOGGLE`, with the exact conditions
attached. Enable it only once the checks above are confirmed in writing.

---

## Content rules enforced

- No invented clients, testimonials, case studies, awards, team members or results.
- No fabricated metrics, counters, ratings or review data.
- No business street address in content or structured data.
- Every demonstration is labelled `Demonstration` or `Sample deliverable`.
- Structured data contains only verified facts (name, URL, email, phone, country served,
  opening hours, founder).
- No API keys, tokens or credentials anywhere in the source.

---

## Maintenance

Edit the HTML directly — there is no build output to regenerate. `build.py` is the
generator used to produce these pages and can be re-run, but it is not required for
hosting; the generated HTML is the source of truth in the repository.

Keep internal links relative. Keep new images in `assets/img/` and optimised.
