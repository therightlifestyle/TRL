# Deployment Manual

Two supported shapes. Pick one.

- **Shape A — static only.** The repository is served as files. The Console runs entirely in the browser. No server, no cost, no runtime to maintain.
- **Shape B — static + API.** The site is served statically and a Node API runs separately, storing enquiries and serving the engines server-side.

---

## Shape A — GitHub Pages (the current setup)

1. Push to the `main` branch.
2. Repository → **Settings** → **Pages** → Source: *Deploy from a branch* → `main` / `/ (root)`.
3. The site is published at `https://therightlifestyle.github.io/TRL/`.

`.nojekyll` is present, so GitHub serves the files raw — no Jekyll processing, no underscore stripping.

**What is deployed:** the whole repository. To keep the public surface small, the API can be excluded by the host; the `robots.txt` already disallows `/server/`.

**Post-deploy checklist**

- [ ] `https://therightlifestyle.github.io/TRL/` loads
- [ ] `https://therightlifestyle.github.io/TRL/console/index.html` loads and the modules open
- [ ] `https://therightlifestyle.github.io/TRL/assets/js/main.js` returns 200
- [ ] Fonts load from `assets/fonts/` (no requests to fonts.googleapis.com in the network tab)
- [ ] The enquiry form on `contact.html` shows the live routing readout
- [ ] `sitemap.xml` lists the new pages
- [ ] The theme toggle persists across a refresh

---

## Shape B — API deployment

### Render (blueprint)

`server/render.yaml` is included. In Render: **New → Blueprint** → point at the repository. It creates a `trl-api` service with a 1 GB disk mounted at `/var/data` and an `ADMIN_TOKEN` generated automatically.

### Railway

`server/railway.json` builds from `server/Dockerfile`:

```bash
railway up
```

### Docker (any host)

```bash
docker build -f server/Dockerfile -t trl-api .
docker run -d --name trl-api \
  -p 8080:8080 \
  -e ADMIN_TOKEN="$(openssl rand -hex 24)" \
  -e CORS_ORIGINS="https://therightlifestyle.github.io" \
  -e DATA_DIR=/var/data \
  -v trl-data:/var/data \
  trl-api
```

### Any Node host

```bash
npm start            # node server/src/index.mjs
```

Environment variables: see `server/.env.example`. `ADMIN_TOKEN` is required in production — without it the lead-listing endpoints are open.

### Verify

```bash
curl -fsS https://your-api-host/api/health
curl -fsS -X POST https://your-api-host/api/triage \
  -H 'Content-Type: application/json' \
  -d '{"text":"Hi, I am Bilal from Sattar Textiles and I need to automate 300 enquiries a day."}' | head -c 300
```

### Connect the site

Add before the module script on every page (or inject it once in the page head):

```html
<script>window.TRL_CONFIG = { apiBase: 'https://your-api-host' };</script>
```

Then confirm the Console status chip reads **API connected** and the contact form returns a reference number.

---

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | Listen port |
| `HOST` | `0.0.0.0` | Bind address |
| `DATA_DIR` | `./server/data` | Where enquiry records are written |
| `ADMIN_TOKEN` | *(empty)* | Protects `/api/leads` and `/api/metrics` |
| `CORS_ORIGINS` | localhost defaults | Comma-separated allowed origins |
| `RATE_LIMIT` | `120` | Requests per IP per minute |
| `LOG_LEVEL` | `info` | `debug` · `info` · `warn` · `error` |
| `LOG_FORMAT` | `json` | `json` or `pretty` |

---

## Backups

Enquiry records live in `server/data/leads.json`. On a platform with a persistent disk, that disk *is* the backup. To snapshot it:

```bash
cp server/data/leads.json "backups/leads-$(date +%F).json"
```

Records are excluded from git (`.gitignore`), so they never end up in a public repository.

---

## Rollback

The site is static: redeploy the previous commit. The API is stateless apart from the JSON file, so roll the container back and the data file is untouched.

```bash
git log --oneline -5
git revert <commit> && git push origin main
```

---

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request:

1. `npm run lint` — syntax check on every module
2. `npm run check` — link, asset and third-party-request audit
3. `npm test` — engine, data-layer and site test suites
4. API smoke test — boots the server and calls `/api/health` and `/api/triage`

The workflow is the release gate. A red build should not be deployed.
