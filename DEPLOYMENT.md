# Deploying the TRL portfolio

The site is static, so deployment is just "put these files on a host that serves HTML".
This guide covers GitHub Pages, because the repository is on GitHub and it is free.

**The existing site at `therightlifestyle.github.io/TheRightLifestyle/` is untouched by
anything in this repository.** It stays live as a fallback until you choose otherwise.

---

## Option A — Upload through the GitHub web interface (no command line)

Use this if you do not want to use git at all.

### 1. Create the repository

1. Go to <https://github.com/new>
2. Owner: `therightlifestyle`
3. Repository name: **`TRL`**
4. Visibility: **Public** (required for free GitHub Pages)
5. **Do not** tick "Add a README", "Add .gitignore" or "Choose a license" — the repository
   must be completely empty so the upload is clean
6. Click **Create repository**

### 2. Upload the files

1. Download `TRL-portfolio-source.zip` (provided alongside this repository)
2. Unzip it on your computer
3. On the new empty repository page, click **uploading an existing file**
   (or drag files straight onto the page)
4. Drag in **all** files and folders — including `assets/` and `demo/`
5. **Important:** make sure you upload the *contents*, not the wrapper folder. `index.html`
   must sit at the top level of the repository
6. Commit message: `Initial TRL portfolio` → **Commit changes**

> GitHub's web uploader does **not** upload files or folders whose names begin with a dot
> (like `.nojekyll`) in some browsers. If `.nojekyll` is missing after upload, create it:
> **Add file → Create new file**, name it `.nojekyll`, leave it empty, and commit.
> Without it, GitHub Pages runs the site through Jekyll, which can ignore some paths.

### 3. Turn on GitHub Pages

1. Repository → **Settings** → **Pages** (left sidebar)
2. Under **Source**: choose **Deploy from a branch**
3. Branch: **`main`**, folder: **`/ (root)`**
4. Click **Save**
5. Wait about 60 seconds, then open:
   `https://therightlifestyle.github.io/TRL/`

### 4. Verify

- [ ] The home page loads and the navy/gold styling is applied (if it looks unstyled, `assets/css/style.css` did not upload — check the path)
- [ ] Navigation links work on every page
- [ ] Open on a phone and tap **both** contact buttons — WhatsApp should open with the prefilled message
- [ ] The email link opens your mail app
- [ ] `https://therightlifestyle.github.io/TRL/demo/lead-triage.html` loads and the demo runs

---

## Option B — Push with git

```bash
# in the folder containing these files
git init
git add .
git commit -m "Initial TRL portfolio"
git branch -M main
git remote add origin https://github.com/therightlifestyle/TRL.git
git push -u origin main
```

Then follow step 3 above.

---

## Option C — Another free host

The site is plain static files, so Cloudflare Pages, Netlify Drop and Vercel all work:

- **Cloudflare Pages** — *Create application → Pages → Upload assets*, drag the folder
- **Netlify Drop** — drag the folder onto <https://app.netlify.com/drop>

No build command and no output directory are needed on any of them.

---

## Using a custom domain later

1. Add a `CNAME` file at the repository root containing just the domain, e.g. `www.therightlifestyle.com`
2. Point the domain's DNS at GitHub Pages as instructed in **Settings → Pages → Custom domain**
3. Because all internal links are **relative**, nothing else needs to change

---

## Rollback

Every commit is a restore point. To undo a change:

- **Web:** repository → **Commits** → open the previous commit → **Browse files** (or revert)
- **Git:** `git revert <commit>` then push

The old site is a completely separate repository, so it remains a live fallback throughout.
