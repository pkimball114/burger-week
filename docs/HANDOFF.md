# Burger Week Handoff

This project lives at `/Users/parkerkimball/Documents/Burger Week`.

## Product Intent

Burger Week is a small mobile-friendly review app for about a dozen friends during Portland Mercury Burger Week 2026. It should feel like a stripped-down social Yelp for the group: users log in, review burgers, rate them from 0 to 5, upload burger photos, leave notes, and quickly see where friends are eating.

The visual direction is warm, playful, and burger-counter inspired, with colors and chunky outlines that nod toward Bob's Burgers without copying characters, logos, or protected assets.

Official event page:

https://everout.com/portland/events/the-portland-mercurys-burger-week-2026/e222750/

Known event assumptions currently represented in the app:

- Portland, OR
- August 10-16, 2026
- $10 burgers
- 124 participating restaurants

## Current Implementation

The app is currently a static frontend with no build step:

- `index.html` - app shell, hero, filters, tab views, review modal, login modal.
- `styles.css` - responsive Bob's-Burgers-inspired visual system.
- `app.js` - all state, data loading, rendering, login, review posting, filtering, photo toggling, and tabs.
- `manifest.webmanifest` and `sw.js` - PWA metadata/cache.
- `assets/burger-counter-hero.png` - original generated hero artwork.
- `assets/icon.svg` - app icon.

Implemented UX:

- Local login using `localStorage`.
- Add Review flow requires login, then reopens the composer.
- Reviews have friend name, burger selection, 0-5 rating in 0.25 increments, optional uploaded photo, and notes.
- Friend Feed cards default to the user's uploaded photo when present.
- If a restaurant-posted photo exists, a top-right image button toggles between friend photo and restaurant photo.
- Friend names on cards are clickable and set the Friend filter.
- Cards include quick links for maps and the EverOut listing.
- Burger Board rows include a Want button for wishing for burgers.
- The Burger Board includes a Hype List showing the most wished-for burgers from local want data.
- Burger Board rows include a Hide button. Hidden burgers are removed from that user's Burger Board and Hype List.
- The login/profile modal includes a Hidden Burgers list with Unhide buttons.
- Filters: search, area, friend, minimum rating, and sort.
- Views: Friend Feed, Burger Board, Map Preview, Week Calendar.
- Burger Board accommodates 124 burgers. If the editable event CSV has fewer rows, `app.js` pads generated placeholders to 124.

Important limitation:

- Login, reviews, wants, and hidden burgers are local to each browser. They are not shared between friends yet. Supabase is the planned backend path.

## Data Files

The app currently reads one listing file when served over HTTP:

- `data/burger-week-2026.csv`

The event metadata for Burger Week 2026 lives in `eventDefinitions` in `app.js` so the app remains static and only needs one CSV data file for the event listing rows.

The most important file to edit first is `data/burger-week-2026.csv`. Each row can include:

- `id`
- `event_id`
- `restaurant`
- `burger`
- `description`
- `neighborhood`
- `address`
- `latitude`
- `longitude`
- `hours_monday`
- `hours_tuesday`
- `hours_wednesday`
- `hours_thursday`
- `hours_friday`
- `hours_saturday`
- `hours_sunday`
- `tags`
- `restaurant_photo`
- `maps_url`
- `everout_url`

Hours should be entered exactly as listed on the source page. A blank `hours_<day>` cell means the burger is not available on that event day. `app.js` preserves the raw hours text and parses simple ranges into minute spans for future calendar planning.

`restaurant_photo` can be a direct source image URL. The local `data/photos/restaurant-placeholder.svg` remains the fallback image.

## Backend Plan

Supabase is the intended shared backend. Existing files:

- `docs/supabase-schema.sql`
- `config/supabase.example.js`

Recommended backend work:

1. Create or select a Supabase project.
2. Apply `docs/supabase-schema.sql`.
3. Create a private-ish Storage bucket for review photos and restaurant photos.
4. Replace local login with Supabase Auth, likely invite-only magic links.
5. Replace `localStorage` review storage with Supabase `reviews`.
6. Preserve RLS behavior: friends can read shared event data/reviews, but users only edit/delete their own reviews.

Do not create paid/cloud resources without explicit user confirmation.

## Run And Verify

Recommended local server:

```bash
node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.csv':'text/csv','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let file=decodeURIComponent(url.pathname);if(file==='/')file='/index.html';const full=path.join(root,file);if(!full.startsWith(root)){res.writeHead(403);res.end();return;}fs.readFile(full,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'content-type':types[path.extname(full)]||'application/octet-stream'});res.end(data);});}).listen(4180,'127.0.0.1',()=>console.log('serving 4180'));"
```

Then open:

http://127.0.0.1:4180

Validation commands:

```bash
node --check app.js
python3 -m json.tool manifest.webmanifest
python3 -m json.tool manifest.webmanifest
rg -n "Burger Week Table|burger-week-table|BWT|Burger Table"
```

Recent browser verification confirmed:

- App title and hero say "Burger Week".
- Official EverOut link appears in the top nav.
- Burger Board renders 124 burger rows.
- Feed cards render maps/listing quick links.
- Local login works.
- Add Review resumes after login.
- Rating control renders 21 choices and accepts 4.25.
- Posting a review works.
- Clicking a feed-card reviewer name filters the feed to that friend.
- Wanting a burger updates Burger Board counts and the Hype List.
- Hiding a burger trims it from the Burger Board and adds it to the profile Hidden Burgers list.
- Mobile viewport around 390px has no horizontal overflow.

## Known Quirks

- `localhost:4173` may show an older service-worker-cached version from early prototyping. Use a fresh port such as `127.0.0.1:4180` while developing.
- The current local login is only a scaffold. It stores a display name/email locally and is not secure authentication.
- Want counts are currently local-only, so they are useful for prototype behavior but not a real group-wide hype signal until Supabase is connected.
- Hidden burgers are currently local-only and should become private per-user backend data when Supabase is connected.
- `data/burger-week-2026.csv` currently has only a small number of manually written rows; generated placeholders fill out the 124-burger interface.
- EverOut could not be reliably fetched by automation in the prior work session, so do not assume the local data is complete or official.
- The Map view is still schematic. Real map work is Phase 2.

## Best Next Tasks

Highest value next steps:

1. Replace placeholder Burger Week data with the real 124 restaurants and burgers from EverOut/manual entry.
2. Continue replacing generated placeholders with real rows in `data/burger-week-2026.csv`.
3. Connect Supabase Auth and shared reviews/photos.
4. Improve the rating control UX. Twenty-one buttons works, but a slider plus numeric stepper may feel better on mobile.
5. Add edit/delete review actions for the logged-in user's reviews.
6. Replace the schematic map with Leaflet or a maps deep-link list.

## Suggested Prompt For The Next Conversation

Use this:

> Continue development of the Burger Week app in `/Users/parkerkimball/Documents/Burger Week`. First read `docs/HANDOFF.md`, `README.md`, `app.js`, `index.html`, and `styles.css`. Do not assume the current data is official; `data/burger-week-2026.csv` is incomplete event data that pads to 124 burgers. Keep the app static/GitHub-Pages-compatible unless I explicitly ask for a backend. Preserve the current Bob's-Burgers-inspired visual direction without using copyrighted characters/logos. After inspecting the code, propose the smallest safe implementation plan for my requested change, then implement it and verify with `node --check app.js`, JSON validation, and browser checks on a fresh localhost port to avoid service-worker cache.

If the next task is Supabase:

> I want to connect Supabase for shared login, reviews, and burger photo storage. Read `docs/HANDOFF.md` and `docs/supabase-schema.sql` first. Ask before creating cloud resources or applying migrations. Keep GitHub Pages compatibility and make the local-only mode still usable as a fallback.

If the next task is data entry:

> I want to replace placeholders with real Burger Week restaurant data. Read `docs/HANDOFF.md` and inspect `data/burger-week-2026.csv`. Help me update the data model/import path so manually entered locations, day-specific hours, EverOut links, and restaurant photos stay in the event CSV cleanly.
