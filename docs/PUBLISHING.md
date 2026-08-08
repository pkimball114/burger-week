# Publishing Burger Week

Burger Week is currently a static app: `index.html`, `styles.css`, `app.js`, assets, and files under `data/`. That makes GitHub Pages a good fit as long as you are comfortable with the current local-only prototype behavior.

Important: `data/burger-week-2026.csv` is still incomplete event data. The app pads the Burger Week board to 124 burgers, so a full-looking deployment does not mean the data is official or complete.

## What GitHub Pages Will And Will Not Do

GitHub Pages will host the app at a URL like:

```text
https://pkimball114.github.io/burger-week/
```

It will serve your latest committed static files after each Pages deployment finishes. That includes:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `assets/`
- `data/burger-week-2026.csv`
- `data/photos/`

It will not share local reviews, wants, hidden burgers, or local login state between friends. Those are stored in each browser with `localStorage` until a backend such as Supabase is connected.

## First-Time Publish

1. Create a new GitHub repository named `burger-week` under the `pkimball114` account.
2. Keep the repository public unless you plan to use a paid/private Pages setup.
3. In this project folder, connect the local repo to GitHub:

```bash
git remote add origin git@github.com:pkimball114/burger-week.git
git branch -M main
git add .
git commit -m "Initial Burger Week static app"
git push -u origin main
```

4. In GitHub, open the repo settings:

```text
Settings -> Pages -> Build and deployment
```

5. Set:

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

6. Save. GitHub will publish after the first Pages build finishes, usually within a minute or two.
7. Visit:

```text
https://pkimball114.github.io/burger-week/
```

## Updating The Live App

Yes, after the repository and Pages settings exist, normal updates are mostly as simple as committing and pushing the latest files.

For app, CSV, and photo updates:

```bash
git status --short
git add index.html styles.css app.js manifest.webmanifest sw.js assets data docs README.md
git commit -m "Update Burger Week data"
git push
```

Then wait for the GitHub Pages deployment to finish. You can check it from:

```text
GitHub repo -> Actions
```

or:

```text
GitHub repo -> Settings -> Pages
```

## Data And Photo Update Checklist

When you add more official details:

1. Add or update rows in `data/burger-week-2026.csv`.
2. Put local restaurant photos in `data/photos/`, or paste the direct source image URL into `restaurant_photo`.
3. Reference local photos from the CSV using a relative path like:

```text
data/photos/example-burger.jpg
```

4. Make sure the photo filename casing exactly matches the CSV path. GitHub Pages runs on a case-sensitive filesystem.
5. Commit both the CSV and the photo files.
6. Bump the service-worker cache name in `sw.js`.

Example:

```js
const cacheName = "burger-week-v10";
```

The cache bump matters because the app currently registers a service worker that precaches `data/burger-week-2026.csv`. Without a new cache name, returning visitors may keep seeing an older CSV even after GitHub Pages has deployed the newest files.

If you want newly added restaurant photos to be available offline after install, also add their paths to the `assets` array in `sw.js`. For normal online browsing, it is enough that the CSV references committed files in `data/photos/`.

## Local Verification Before Pushing

Use a fresh localhost port so an older service-worker cache does not hide changes:

```bash
node --check app.js
python3 -m json.tool manifest.webmanifest
node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.csv':'text/csv','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.webmanifest':'application/manifest+json'};http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let file=decodeURIComponent(url.pathname);if(file==='/')file='/index.html';const full=path.join(root,file);if(!full.startsWith(root)){res.writeHead(403);res.end();return;}fs.readFile(full,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'content-type':types[path.extname(full).toLowerCase()]||'application/octet-stream'});res.end(data);});}).listen(4297,'127.0.0.1',()=>console.log('serving http://127.0.0.1:4297'))"
```

Then open:

```text
http://127.0.0.1:4297
```

Check that:

- The app loads without console errors.
- The Burger Board renders 124 rows.
- New CSV details appear in cards and rows.
- New `data/photos/` images load where referenced.
- Mobile width around 390px has no horizontal scrolling.

## After Deploy Verification

After GitHub Pages finishes deploying:

1. Open the live URL in a private/incognito window.
2. Confirm the updated CSV details appear.
3. Confirm new photos load.
4. If an ordinary browser tab still shows stale data, refresh once or close/reopen the tab. If it is still stale, the most likely cause is an unchanged `cacheName` in `sw.js`.
