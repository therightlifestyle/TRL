# Deploying the TRL Website

The TRL website is entirely static, meaning deployment consists of publishing the flat root files to any static web host. This guide covers GitHub Pages.

> **Note on Existing Sites:** The older site at `therightlifestyle.github.io/TheRightLifestyle/` is an independent repository and remains completely untouched by changes here.

---

## Production Deployment on GitHub Pages

The repository `therightlifestyle/TRL` is pre-configured for automated GitHub Pages hosting.

### 1. Repository Configuration

1. In GitHub, navigate to **Settings** → **Pages** (in the left navigation).
2. Under **Build and deployment**:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main`
   - **Folder:** `/ (root)`
3. Click **Save**.

### 2. Critical Files for GitHub Pages

- **`.nojekyll`**: An empty dotfile placed in the repository root. This instructs GitHub Pages to bypass Jekyll processing, ensuring font files (`.woff2`) and assets are served directly without filtering.
- **Root-level file references**: All assets (`style.css`, `main.js`, fonts, images) reside at the repository root and use flat relative paths. This ensures the site renders identically whether hosted at a subpath (`https://therightlifestyle.github.io/TRL/`) or a custom root domain (`https://www.therightlifestyle.com/`).

### 3. Verification Post-Deployment

Wait 60–90 seconds after pushing to `main`, then verify:

- [ ] Homepage loads at `https://therightlifestyle.github.io/TRL/` with full styling (Dark navy background, Newsreader serif headings).
- [ ] Theme toggle switches between Dark and Light mode without layout shift or missing styles.
- [ ] Navigation drawer works smoothly on mobile screens (<820px).
- [ ] `triage-demo.gif` plays properly in the demonstration sections.
- [ ] Interactive triage prototype loads and functions at `https://therightlifestyle.github.io/TRL/lead-triage.html`.
- [ ] WhatsApp CTA buttons open WhatsApp with the approved prefilled messages.
- [ ] 0 console errors and 0 missing assets in browser DevTools.

---

## Custom Domain Configuration (Optional)

To connect a custom domain:

1. Add a `CNAME` file at the repository root containing your custom domain (e.g. `therightlifestyle.com`).
2. In your DNS provider, configure:
   - For apex domain: `A` records pointing to GitHub's IPs (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`).
   - For `www` subdomain: `CNAME` pointing to `therightlifestyle.github.io`.
3. In GitHub **Settings** → **Pages**, enter the custom domain and enforce HTTPS.
4. Because all links within this project use clean relative paths, no codebase adjustments are needed.
